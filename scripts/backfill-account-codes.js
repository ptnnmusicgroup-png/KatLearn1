#!/usr/bin/env node
/* Backfill stable accountCode values for every Firestore user.
   Existing valid accountCode values are preserved. Missing/conflicting codes
   receive a new sequence-backed code, and the canonical accounts namespace
   is repaired at the same time. */
const { init, clean } = require("../api/_admin");

const MAX_BATCH_WRITES = 450;

function stripVietnamese(value){
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function accountPart(value,fallback){
  const out=stripVietnamese(value).trim().replace(/[^a-zA-Z0-9.@_-]+/g,"");
  return out || fallback;
}
function displayAccountPart(value,fallback){
  const out=stripVietnamese(value).trim().replace(/[^a-zA-Z0-9]+/g,"");
  return out || fallback;
}
function accountPrefix(user){
  const login=String(user?.email||"").split("@")[0] || "katlearn";
  const display=user?.displayName || login || "student";
  return {
    login:accountPart(login,"katlearn"),
    display:displayAccountPart(display,"Student")
  };
}
function formatAccountCode(prefix,number){
  return prefix.login+"_"+prefix.display+"_"+String(number).padStart(3,"0");
}
function numericSuffix(value){
  const m=String(value||"").match(/_(\d{3,})$/);
  return m ? Number(m[1]) : 0;
}
function now(){return new Date()}

async function main(){
  const { db } = init();
  const usersSnap=await db.collection("users").get();
  const accountRefs=await db.collection("accounts").listDocuments();
  const existingAccounts=new Set(accountRefs.map(ref=>String(ref.id)));

  const owners=new Map();
  for(const doc of usersSnap.docs){
    const code=String(doc.data()?.accountCode||"").trim();
    if(code&&!owners.has(code))owners.set(code,doc.id);
  }

  const seqRef=db.collection("system").doc("accountSequence");
  const seqSnap=await seqRef.get();
  let sequence=Number(seqSnap.exists ? seqSnap.data()?.lastIssued : 0) || 0;
  for(const code of existingAccounts)sequence=Math.max(sequence,numericSuffix(code));
  for(const code of owners.keys())sequence=Math.max(sequence,numericSuffix(code));

  const candidates=[];
  let preserved=0;
  let repaired=0;

  for(const doc of usersSnap.docs){
    const data=doc.data()||{};
    const code=String(data.accountCode||"").trim();
    const owner=code ? owners.get(code) : null;
    const valid=!!code && owner===doc.id;
    if(valid){
      preserved++;
      candidates.push({doc,data,code,needsUserUpdate:false});
    }else{
      candidates.push({doc,data,code:"",needsUserUpdate:true});
      if(code)repaired++;
    }
  }

  const missing=candidates.filter(x=>!x.code);
  if(missing.length){
    const oldSequence=sequence;
    // Reserve numbers atomically, then allocate from the committed reservation.
    // Another writer may have advanced accountSequence after the initial reads.
    let reservedAfter=oldSequence;
    await db.runTransaction(async tx=>{
      const snap=await tx.get(seqRef);
      const latest=Number(snap.exists ? snap.data()?.lastIssued : 0) || 0;
      const base=Math.max(latest,oldSequence);
      reservedAfter=base+missing.length;
      tx.set(seqRef,{lastIssued:reservedAfter,updatedAt:now()},{merge:true});
    });
    const reservedStart=reservedAfter-missing.length;
    for(let i=0;i<missing.length;i++){
      sequence=reservedStart+i+1;
      const item=missing[i];
      const prefix=accountPrefix(item.data);
      let code=formatAccountCode(prefix,sequence);
      while(existingAccounts.has(code)||owners.has(code)){
        sequence++;
        code=formatAccountCode(prefix,sequence);
      }
      item.code=code;
      item.isNewAccount=true;
      existingAccounts.add(code);
      owners.set(code,item.doc.id);
    }
  }

  let writes=0,batches=0;
  let assigned=0,accountsCreated=0,profilesUpdated=0;
  let batch=db.batch();

  async function flush(){
    if(!writes)return;
    await batch.commit();
    batches++;
    batch=db.batch();
    writes=0;
  }
  function add(op){
    op();
    writes++;
  }

  for(const item of candidates){
    const {doc,data,code}=item;
    const userRef=db.collection("users").doc(doc.id);
    const accountRef=db.collection("accounts").doc(code);
    const memoryRef=accountRef.collection("memory").doc("meta");
    const timestamp=now();
    const accountData={
      accountCode:code,
      uid:doc.id,
      email:String(data.email||""),
      displayName:String(data.displayName||""),
      loginName:accountPart(String(data.email||"").split("@")[0],"katlearn"),
      createdAt:data.createdAt||timestamp,
      updatedAt:timestamp
    };

    if(item.needsUserUpdate){
      add(()=>batch.set(userRef,{accountCode:code,updatedAt:timestamp},{merge:true}));
      profilesUpdated++;
      assigned++;
    }

    if(item.isNewAccount){
      add(()=>batch.set(accountRef,accountData,{merge:true}));
      accountsCreated++;
    }else{
      add(()=>batch.set(accountRef,accountData,{merge:true}));
    }

    add(()=>batch.set(memoryRef,{
      accountCode:code,
      uid:doc.id,
      updatedAt:timestamp
    },{merge:true}));

    if(writes>=MAX_BATCH_WRITES)await flush();
  }
  await flush();

  console.log(JSON.stringify({
    ok:true,
    projectId:"elp---katlearn",
    scanned:usersSnap.size,
    preserved,
    assigned,
    repaired,
    profilesUpdated,
    accountsCreated,
    batches,
    nextAccountSequence:sequence
  },null,2));
}

main().catch(error=>{
  console.error("[KatLearn] account ID backfill failed:",error?.stack||error);
  process.exit(1);
});
