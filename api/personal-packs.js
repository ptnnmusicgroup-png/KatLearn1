const{requireUser,send,method}=require("./_kat-ai");
const{init,serialize}=require("./_admin");

function packData(id,data,source){
  const value=data||{};
  return {
    id:String(id),
    ...serialize(value),
    source
  };
}

module.exports=async(req,res)=>{
  if(!method(req,res,"GET"))return;
  try{
    const user=await requireUser(req);
    const{db}=init();
    const uid=String(user.uid);
    const merged=[];
    const seen=new Set();
    const profileSnap=await db.collection("users").doc(uid).get();
    const profile=profileSnap.data()||{};
    const accountCode=String(profile.accountCode||"").trim();

    // Canonical personal-pack storage: users/{uid}/personalPacks/{packId}
    const userSnap=await db.collection("users").doc(uid).collection("personalPacks").limit(100).get();
    for(const doc of userSnap.docs){
      const data=doc.data()||{};
      if(data.kind&&data.kind!=="personalPack")continue;
      if(data.ownerUid&&String(data.ownerUid)!==uid)continue;
      if(data.ownerAccountCode&&accountCode&&String(data.ownerAccountCode)!==accountCode)continue;
      seen.add(doc.id);
      merged.push(packData(doc.id,{...data,ownerAccountCode:accountCode},"users"));
    }

    // Keep compatibility with the account namespace and transparently backfill
    // any older account-only pack into the user's own namespace.
    if(accountCode){
      try{
        const memorySnap=await db.collection("accounts").doc(accountCode).collection("memory").where("kind","==","personalPack").limit(100).get();
        const backfill=batch=db.batch();
        let backfillCount=0;
        for(const doc of memorySnap.docs){
          const data=doc.data()||{};
          if(String(data.kind)!=="personalPack")continue;
          if(data.ownerUid&&String(data.ownerUid)!==uid)continue;
          if(data.ownerAccountCode&&String(data.ownerAccountCode)!==accountCode)continue;
          if(seen.has(doc.id))continue;
          seen.add(doc.id);
          const payload={...data,ownerUid:uid,ownerAccountCode:accountCode};
          const userRef=db.collection("users").doc(uid).collection("personalPacks").doc(doc.id);
          backfill.set(userRef,payload,{merge:true});
          backfillCount++;
          merged.push(packData(doc.id,payload,"users"));
        }
        if(backfillCount)await backfill.commit();
      }catch(accountError){
        console.warn("[KatLearn] Account-memory personal packs unavailable:",accountError?.message||accountError);
      }
    }


    merged.sort((a,b)=>{
      const ta=Number(a.createdAt?.seconds||a.createdAt||0);
      const tb=Number(b.createdAt?.seconds||b.createdAt||0);
      return tb-ta;
    });

    return send(res,200,{ok:true,uid,accountCode,packs:merged.slice(0,100)});
  }catch(error){
    return send(res,error.status||500,{
      ok:false,
      error:String(error.message||"Không thể tải bộ từ của tài khoản."),
      code:error.code||"personal_packs_load_failed"
    });
  }
};