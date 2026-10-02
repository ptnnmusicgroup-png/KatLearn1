const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

function clean(value,max=200){
  return String(value??"").trim().slice(0,max);
}
function corsHeaders(origin){
  const h={"Content-Type":"application/json","Cache-Control":"no-store"};
  if(["https://teacher-katlearn.vercel.app","https://lms-katlearn.vercel.app","http://localhost:3000","http://localhost:5173"].includes(origin)){
    h["Access-Control-Allow-Origin"]=origin;
    h["Access-Control-Allow-Methods"]="GET,POST,OPTIONS";
    h["Access-Control-Allow-Headers"]="authorization,content-type,accept";
    h["Vary"]="Origin";
  }
  return h;
}
function writeJson(res,status,body,origin=""){
  const headers=corsHeaders(origin);
  const payload=JSON.stringify(body);
  if(res&&typeof res.setHeader==="function"){
    for(const[key,value]of Object.entries(headers))res.setHeader(key,value);
    res.statusCode=Number(status)||200;
    if(typeof res.end==="function")return res.end(payload);
  }
  return new Response(payload,{status:Number(status)||200,headers});
}

const LIMITS={users:300,teachers:300,classes:300,packs:300,privatePacks:300,schools:300,pending:100,activity:100};
const DATA_DIR=path.join(__dirname,"../data/national-catalog");
const VOCAB_DIR=path.join(__dirname,"../data/vocabulary");
const TOTAL_SCHOOLS=22850;
const PROVINCES=[
  ["01","Thành phố Hà Nội",2828,"province-01.json"],["04","Tỉnh Cao Bằng",150,"province-04.json"],["08","Tỉnh Tuyên Quang",300,"province-08.json"],
  ["11","Tỉnh Điện Biên",182,"province-11.json"],["12","Tỉnh Lai Châu",137,"province-12.json"],["14","Tỉnh Sơn La",278,"province-14.json"],
  ["15","Tỉnh Lào Cai",216,"province-15.json"],["19","Tỉnh Thái Nguyên",261,"province-19.json"],["20","Tỉnh Lạng Sơn",200,"province-20.json"],
  ["22","Tỉnh Quảng Ninh",266,"province-22.json"],["24","Tỉnh Bắc Ninh",1039,"province-24.json"],["25","Tỉnh Phú Thọ",759,"province-25.json"],
  ["31","Thành phố Hải Phòng",1041,"province-31.json"],["33","Tỉnh Hưng Yên",548,"province-33.json"],["37","Tỉnh Ninh Bình",1178,"province-37.json"],
  ["38","Tỉnh Thanh Hóa",2002,"province-38.json"],["40","Tỉnh Nghệ An",372,"province-40.json"],["42","Tỉnh Hà Tĩnh",444,"province-42.json"],
  ["44","Tỉnh Quảng Trị",290,"province-44.json"],["46","Thành phố Huế",383,"province-46.json"],["48","Thành phố Đà Nẵng",550,"province-48.json"],
  ["51","Tỉnh Quảng Ngãi",127,"province-51.json"],["52","Tỉnh Gia Lai",261,"province-52.json"],["56","Tỉnh Khánh Hòa",296,"province-56.json"],
  ["66","Tỉnh Đắk Lắk",616,"province-66.json"],["68","Tỉnh Lâm Đồng",1021,"province-68.json"],["75","Tỉnh Đồng Nai",691,"province-75.json"],
  ["79","Thành phố Hồ Chí Minh",2382,"province-79.json"],["80","Tỉnh Tây Ninh",406,"province-80.json"],["82","Tỉnh Đồng Tháp",275,"province-82.json"],
  ["86","Tỉnh Vĩnh Long",723,"province-86.json"],["91","Tỉnh An Giang",1322,"province-91.json"],["92","Thành phố Cần Thơ",713,"province-92.json"],
  ["96","Tỉnh Cà Mau",593,"province-96.json"]
];
const PROVINCE_MAP=new Map(PROVINCES.map(([code,name,total,file])=>[code,{code,name,total,file}]));
const USER_FIELDS=["uid","displayName","name","email","role","schoolName","className","accountCode","coins","energy","streak","province","ward","teacherVerification","createdAt","updatedAt","disabled","schoolId","classIds","catalogClassId","studentAccountType"];
const CLASS_FIELDS=["name","grade","description","teacherEmail","teacherUid","schoolName","schoolId","joinCode","studentCount","createdAt","updatedAt","province","ward","catalogClassId","deletingAt"];
const PACK_FIELDS=["name","createdBy","createdByEmail","createdByUid","createdAt","updatedAt","wordCount"];
const SCHOOL_FIELDS=["name","province","ward","schoolId","schoolLevel","createdAt","updatedAt","source","provinceId","wardId"];
const ADMIN_SYNC_COLLECTION="KatLearn_ADMIN_SYNC_1";
const SYNC_CONFIG={
  users:{source:"users",limit:200,fields:USER_FIELDS},
  classes:{source:"classes",limit:200,fields:CLASS_FIELDS},
  packs:{source:"publicPacks",limit:20,fields:null}
};

async function syncAuthAccounts(db,auth,decoded){
  const authUsers=await listAllAuthUsers(auth);
  const [profilesSnap,accountsSnap]=await Promise.all([
    db.collection("users").get(),
    db.collection("accounts").select("uid","email","accountCode","displayName","loginName","createdAt").get()
  ]);

  const profiles=new Map(profilesSnap.docs.map(doc=>[doc.id,{id:doc.id,...(doc.data()||{})}]));
  const accountsByUid=new Map();
  const accountsByEmail=new Map();

  for(const doc of accountsSnap.docs){
    const data=doc.data()||{};
    const accountCode=String(data.accountCode||doc.id||"").trim();
    if(!accountCode)continue;
    const uid=String(data.uid||"").trim();
    const email=String(data.email||"").trim().toLowerCase();
    const item={id:doc.id,...serialize(data)};
    if(uid&&!accountsByUid.has(uid))accountsByUid.set(uid,item);
    if(email&&!accountsByEmail.has(email))accountsByEmail.set(email,item);
  }

  const accountCodeOwner=new Map();
  accountsSnap.docs.forEach(doc=>{
    const data=doc.data()||{};
    const code=String(data.accountCode||doc.id||"").trim();
    const uid=String(data.uid||"").trim();
    if(code&&uid)accountCodeOwner.set(code,uid);
  });

  function prefixFor(user){
    const strip=value=>String(value||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"");
    const part=(value,fallback)=>strip(value).trim().replace(/[^a-zA-Z0-9.@_-]+/g,"")||fallback;
    const displayPart=(value,fallback)=>strip(value).trim().replace(/[^a-zA-Z0-9]+/g,"")||fallback;
    const login=part(String(user?.email||"").split("@")[0],"katlearn");
    const display=displayPart(user?.displayName||String(user?.email||"").split("@")[0]||"student","Student");
    return{login,display};
  }

  async function allocateAccountCode(user){
    const sequenceRef=db.collection("system").doc("accountSequence");
    return db.runTransaction(async tx=>{
      const seqSnap=await tx.get(sequenceRef);
      const next=Number(seqSnap.exists?seqSnap.data()?.lastIssued:0)+1;
      const prefix=prefixFor(user);
      const code=prefix.login+"_"+prefix.display+"_"+String(next).padStart(3,"0");
      tx.set(sequenceRef,{lastIssued:next,updatedAt:new Date()},{merge:true});
      return code;
    });
  }

  const mirror=db.collection(ADMIN_SYNC_COLLECTION).doc("users").collection("items");
  const now=Date.now();
  const stats={total:authUsers.length,processed:0,accountsCreated:0,uidsRepaired:0,profilesCreated:0,profilesUpdated:0,skipped:0};

  for(const user of authUsers){
    const uid=String(user.uid||"").trim();
    if(!uid){stats.skipped++;continue;}
    const email=String(user.email||"").trim().toLowerCase();
    const existingProfile=profiles.get(uid)||{};
    let accountCode=String(existingProfile.accountCode||"").trim();
    let existingAccount=null;

    if(accountCode){
      existingAccount=accountsSnap.docs.find(doc=>String(doc.id)===accountCode)?.data()||null;
      const accountOwner=String(existingAccount?.uid||"").trim();
      if(accountOwner&&accountOwner!==uid){
        // Never reassign an account namespace that already belongs to another
        // Firebase Auth UID. Fall back to UID/email matching or allocate a new code.
        accountCode="";
        existingAccount=null;
      }
    }
    if(!existingAccount){
      existingAccount=accountsByUid.get(uid)||null;
      if(!accountCode&&existingAccount)accountCode=String(existingAccount.accountCode||existingAccount.id||"").trim();
    }
    if(!existingAccount&&email){
      const candidate=accountsByEmail.get(email);
      const candidateUid=String(candidate?.uid||"").trim();
      if(candidate&&(!candidateUid||candidateUid===uid)){
        existingAccount=candidate;
        if(!accountCode)accountCode=String(candidate.accountCode||candidate.id||"").trim();
      }
    }

    if(!accountCode){
      accountCode=await allocateAccountCode(user);
      stats.accountsCreated++;
    }else if(String(existingAccount?.uid||"")!==uid){
      stats.uidsRepaired++;
    }

    const profileRef=db.collection("users").doc(uid);
    const roleFromAuth=String(
      email==="katlearn.admin@gmail.com" ? "admin" :
      user.customClaims?.teacherAccess===true ? "teacher" :
      existingProfile.role || ""
    ).trim();

    const profilePatch={
      uid,
      accountCode,
      email:String(user.email||existingProfile.email||""),
      displayName:String(user.displayName||existingProfile.displayName||existingProfile.name||""),
      updatedAt:new Date()
    };
    if(roleFromAuth&&!existingProfile.role)profilePatch.role=roleFromAuth;
    if(!existingProfile.createdAt)profilePatch.createdAt=new Date();
    await profileRef.set(profilePatch,{merge:true});

    const accountRef=db.collection("accounts").doc(accountCode);
    await accountRef.set({
      accountCode,
      uid,
      email:String(user.email||existingProfile.email||""),
      displayName:String(user.displayName||existingProfile.displayName||existingProfile.name||""),
      loginName:prefixFor(user).login,
      createdAt:existingAccount?.createdAt||existingProfile.createdAt||new Date(),
      updatedAt:new Date()
    },{merge:true});

    await accountRef.collection("memory").doc("meta").set({
      accountCode,uid,
      email:String(user.email||existingProfile.email||""),
      displayName:String(user.displayName||existingProfile.displayName||existingProfile.name||""),
      updatedAt:new Date()
    },{merge:true});

    const authRow=authUserRow(user);
    const mirrorData={
      ...serialize(existingProfile),
      ...authRow,
      uid,
      accountCode,
      email:String(user.email||existingProfile.email||""),
      displayName:String(user.displayName||existingProfile.displayName||existingProfile.name||""),
      name:String(existingProfile.name||user.displayName||user.email||"")
    };
    await mirror.doc(uid).set({
      sourceId:uid,
      sourceCollection:"users + firebase_auth",
      data:serialize(mirrorData),
      syncedAt:now
    },{merge:true});

    if(profiles.has(uid))stats.profilesUpdated++;else stats.profilesCreated++;
    stats.processed++;
  }

  await db.collection(ADMIN_SYNC_COLLECTION).doc("users").set({
    sourceCollection:"firebase_auth + users",
    total:authUsers.length,
    processed:stats.processed,
    accountsCreated:stats.accountsCreated,
    uidsRepaired:stats.uidsRepaired,
    profilesCreated:stats.profilesCreated,
    profilesUpdated:stats.profilesUpdated,
    skipped:stats.skipped,
    done:true,
    updatedAt:now
  },{merge:true});

  await audit(db,decoded,"sync.complete","users",{
    source:"firebase_auth",
    total:stats.total,
    processed:stats.processed,
    accountsCreated:stats.accountsCreated,
    uidsRepaired:stats.uidsRepaired,
    profilesCreated:stats.profilesCreated
  });

  return{entity:"users",...stats,done:true};
}

async function syncDirectoryChunk(db,decoded,entity,cursor,requestedLimit){
  const config=SYNC_CONFIG[String(entity||"").toLowerCase()];
  if(!config)throw fail(new Error("Loại dữ liệu đồng bộ không hợp lệ."),400,"bad_sync_entity");

  const stateRef=db.collection(ADMIN_SYNC_COLLECTION).doc(entity);
  const stateSnap=await stateRef.get();
  let total=Number(stateSnap.exists?stateSnap.data()?.total:0)||0;
  if(!total)total=await count("đồng bộ "+entity,db.collection(config.source));

  const safeLimit=Math.max(1,Math.min(config.limit,Number(requestedLimit)||config.limit));
  let query=db.collection(config.source).orderBy("__name__").limit(safeLimit);
  const safeCursor=clean(cursor,160);
  if(safeCursor)query=query.startAfter(safeCursor);

  const snapshot=await query.get();
  const mirror=stateRef.collection("items");
  const now=Date.now();

  if(snapshot.empty){
    await stateRef.set({sourceCollection:config.source,total,lastCursor:safeCursor,done:true,updatedAt:now},{merge:true});
    return{entity,total,processed:0,nextCursor:safeCursor,done:true};
  }

  const batch=db.batch();
  for(const doc of snapshot.docs){
    const raw=doc.data()||{};
    const data=config.fields
      ? Object.fromEntries(config.fields.filter(key=>Object.prototype.hasOwnProperty.call(raw,key)).map(key=>[key,serialize(raw[key])]))
      : serialize(raw);
    if(String(entity||"").toLowerCase()==="users"){
      data.uid=String(data.uid||doc.id);
    }
    batch.set(mirror.doc(doc.id),{
      sourceId:doc.id,
      sourceCollection:config.source,
      data,
      syncedAt:now
    },{merge:true});
  }
  await batch.commit();

  const nextCursor=snapshot.docs[snapshot.docs.length-1].id;
  const done=snapshot.size<safeLimit;
  await stateRef.set({
    sourceCollection:config.source,
    total,
    lastCursor:nextCursor,
    lastProcessed:snapshot.size,
    done,
    updatedAt:now
  },{merge:true});

  if(done)await audit(db,decoded,"sync.complete",entity,{total,mirror:ADMIN_SYNC_COLLECTION+"/"+entity});
  return{entity,total,processed:snapshot.size,nextCursor,done};
}

async function syncAllPersonalPacks(db,decoded){
  const usersSnap=await db.collection("users").select("accountCode","email","displayName").get();
  const accountByUid=new Map();
  const accountByCode=new Map();
  usersSnap.docs.forEach(doc=>{
    const data=doc.data()||{};
    const accountCode=clean(data.accountCode||"",180);
    if(accountCode){
      accountByUid.set(doc.id,accountCode);
      accountByCode.set(accountCode,{uid:doc.id,email:String(data.email||""),displayName:String(data.displayName||data.name||"")});
    }
  });

  const userPacksSnap=await db.collectionGroup("personalPacks").get();
  const writes=[];
  const mirrorWrites=[];
  const seen=new Set();
  let skipped=0;
  let totalWords=0;

  function queuePack({docId,data,ownerUid,accountCode,accountInfo,source}){
    const payload={
      ...serialize(data),
      kind:"personalPack",
      ownerUid,
      ownerAccountCode:accountCode,
      ownerEmail:String(data.ownerEmail||accountInfo?.email||""),
      ownerDisplayName:String(data.ownerDisplayName||accountInfo?.displayName||""),
      words:Array.isArray(data.words)?data.words.map(serialize):[],
      wordCount:Array.isArray(data.words)?data.words.length:Number(data.wordCount||0)||0
    };
    const key="account:"+accountCode+"/"+docId;
    if(seen.has(key))return false;
    seen.add(key);

    writes.push({
      ref:db.collection("accounts").doc(accountCode).collection("memory").doc(docId),
      data:payload
    });

    // The Admin Sync Vault keeps the COMPLETE learning payload, not just
    // pack metadata, so the synced pack can be inspected/recovered intact.
    mirrorWrites.push({
      ref:db.collection(ADMIN_SYNC_COLLECTION).doc("personalPacks").collection("items").doc(accountCode+"__"+docId),
      data:{
        sourceId:docId,
        sourceCollection:source,
        accountCode,
        ownerUid,
        ownerEmail:payload.ownerEmail,
        ownerDisplayName:payload.ownerDisplayName,
        name:String(payload.name||""),
        description:String(payload.description||""),
        kind:"personalPack",
        words:payload.words,
        wordCount:payload.wordCount,
        syncedAt:Date.now()
      }
    });

    totalWords+=payload.wordCount;
    return true;
  }

  for(const doc of userPacksSnap.docs){
    const data=doc.data()||{};
    if(data.kind&&data.kind!=="personalPack")continue;
    const ownerUid=String(data.ownerUid||"").trim();
    if(!ownerUid){skipped++;continue;}
    const accountCode=clean(data.ownerAccountCode||accountByUid.get(ownerUid)||"",180);
    if(!accountCode){skipped++;continue;}
    const accountInfo=accountByCode.get(accountCode)||{};
    queuePack({docId:doc.id,data,ownerUid,accountCode,accountInfo,source:"users/{uid}/personalPacks"});
  }

  // Repair legacy account-only packs back into the user's canonical namespace.
  let accountOnlySnap={docs:[]};
  try{
    accountOnlySnap=await db.collectionGroup("memory").where("kind","==","personalPack").get();
  }catch(error){
    console.warn("[KatLearn admin personal-pack reverse sync]",messageOf(error));
  }

  let reverseRepaired=0;
  for(const doc of accountOnlySnap.docs){
    const data=doc.data()||{};
    const ownerUid=String(data.ownerUid||"").trim();
    const accountCode=clean(data.ownerAccountCode||"",180);
    if(!ownerUid||!accountCode||String(accountByUid.get(ownerUid)||"")!==accountCode)continue;

    const userKey="user:"+ownerUid+"/"+doc.id;
    if(seen.has(userKey))continue;
    seen.add(userKey);

    const payload={
      ...serialize(data),
      kind:"personalPack",
      ownerUid,
      ownerAccountCode:accountCode,
      words:Array.isArray(data.words)?data.words.map(serialize):[],
      wordCount:Array.isArray(data.words)?data.words.length:Number(data.wordCount||0)||0
    };

    writes.push({
      ref:db.collection("users").doc(ownerUid).collection("personalPacks").doc(doc.id),
      data:payload
    });
    mirrorWrites.push({
      ref:db.collection(ADMIN_SYNC_COLLECTION).doc("personalPacks").collection("items").doc(accountCode+"__"+doc.id),
      data:{
        sourceId:doc.id,
        sourceCollection:"accounts/{accountCode}/memory",
        accountCode,
        ownerUid,
        ownerEmail:String(payload.ownerEmail||""),
        ownerDisplayName:String(payload.ownerDisplayName||""),
        name:String(payload.name||""),
        description:String(payload.description||""),
        kind:"personalPack",
        words:payload.words,
        wordCount:payload.wordCount,
        syncedAt:Date.now()
      }
    });
    totalWords+=payload.wordCount;
    reverseRepaired++;
  }

  // Write canonical account mirrors and the complete Admin Sync Vault in
  // chunks so a larger personal-pack library does not exceed one batch.
  const allWrites=[
    ...writes.map(item=>({target:"data",...item})),
    ...mirrorWrites.map(item=>({target:"mirror",...item}))
  ];
  for(let i=0;i<allWrites.length;i+=400){
    const chunk=allWrites.slice(i,i+400);
    if(!chunk.length)continue;
    const batch=db.batch();
    chunk.forEach(item=>batch.set(item.ref,item.data,{merge:true}));
    await batch.commit();
  }

  const now=Date.now();
  await db.collection(ADMIN_SYNC_COLLECTION).doc("personalPacks").set({
    sourceCollectionGroup:"personalPacks",
    reverseSourceCollectionGroup:"memory",
    mirrorCollection:"personalPacks/items",
    totalUserPacks:userPacksSnap.size,
    totalAccountPacks:accountOnlySnap.size,
    totalPacks:mirrorWrites.length,
    totalWords,
    totalCanonicalWrites:writes.length,
    totalWrites:writes.length+mirrorWrites.length,
    reverseRepaired,
    skipped,
    processed:mirrorWrites.length,
    done:true,
    updatedAt:now
  },{merge:true});

  await audit(db,decoded,"sync.complete","personalPacks",{
    totalUserPacks:userPacksSnap.size,
    totalAccountPacks:accountOnlySnap.size,
    totalPacks:mirrorWrites.length,
    totalWords,
    totalCanonicalWrites:writes.length,
    totalWrites:writes.length+mirrorWrites.length,
    reverseRepaired,
    skipped,
    mirror:ADMIN_SYNC_COLLECTION+"/personalPacks/items",
    learningPayload:"full pack + words[]",
    userNamespace:"users/{uid}/personalPacks/{packId}",
    accountNamespace:"accounts/{accountCode}/memory/{packId}"
  });

  return{
    entity:"personalPacks",
    total:userPacksSnap.size,
    totalPacks:mirrorWrites.length,
    totalWords,
    processed:mirrorWrites.length,
    canonicalWrites:writes.length,
    totalWrites:writes.length+mirrorWrites.length,
    skipped,
    reverseRepaired,
    done:true
  };
}

async function updatePublicPack(db,decoded,packId,name,words){
  packId=clean(packId,160);
  name=clean(name,200);
  if(!packId)throw fail(new Error("Thiếu ID bộ từ."),400,"missing_pack_id");
  if(!name)throw fail(new Error("Tên bộ từ không được để trống."),400,"invalid_pack_name");
  if(!Array.isArray(words))throw fail(new Error("Danh sách từ của bộ phải là một mảng."),400,"invalid_pack_words");
  if(words.length>2000)throw fail(new Error("Bộ từ không được vượt quá 2.000 mục từ."),400,"pack_words_too_many");

  const ref=db.collection("publicPacks").doc(packId);
  const snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy bộ từ."),404,"pack_not_found");

  const normalized=words.map((word,index)=>{
    if(!word||typeof word!=="object")throw fail(new Error("Mục từ #"+(index+1)+" không hợp lệ."),400,"invalid_pack_word");
    return serialize(word);
  });
  const now=Date.now();
  const patch={name,words:normalized,wordCount:normalized.length,updatedAt:now};
  await ref.set(patch,{merge:true});

  const mirrorRef=db.collection(ADMIN_SYNC_COLLECTION).doc("packs").collection("items").doc(packId);
  await mirrorRef.set({
    sourceId:packId,
    sourceCollection:"publicPacks",
    data:serialize({...snap.data(),...patch}),
    syncedAt:now
  },{merge:true});

  await audit(db,decoded,"pack.update",packId,{name,wordCount:normalized.length});
  return{packId,name,wordCount:normalized.length,updatedAt:now};
}

function codePublicPackId(id,file){
  const base=clean(id||String(file||"").replace(/\.json$/,""),120).replace(/[^a-zA-Z0-9_-]+/g,"_");
  return "code_"+(base||"pack");
}
function readCodePublicPacks(){
  let files=[];
  try{files=fs.readdirSync(VOCAB_DIR).filter(name=>name.toLowerCase().endsWith(".json")).sort()}catch(error){throw fail(new Error("Không đọc được kho bộ từ trong code: "+messageOf(error)),500,"code_pack_source_unavailable")}
  const out=[];
  for(const file of files){
    try{
      const raw=fs.readFileSync(path.join(VOCAB_DIR,file),"utf8");
      const data=JSON.parse(raw)||{};
      const words=Array.isArray(data.words)?data.words.map(serialize):[];
      if(!words.length)continue;
      const sourceId=clean(data.id||String(file).replace(/\.json$/,""),120);
      out.push({id:codePublicPackId(sourceId,file),sourceId,sourceFile:"data/vocabulary/"+file,sourceHash:crypto.createHash("sha256").update(raw).digest("hex"),name:clean(data.name||sourceId,200),description:clean(data.description||"",500),words,wordCount:words.length});
    }catch(error){throw fail(new Error("Không đọc được bộ từ code "+file+": "+messageOf(error)),500,"code_pack_read_failed")}
  }
  return out;
}
async function syncCodePublicPacks(db,decoded){
  const packs=readCodePublicPacks();
  if(!packs.length)throw fail(new Error("Kho bộ từ trong code đang trống."),500,"code_pack_source_empty");
  const stateRef=db.collection(ADMIN_SYNC_COLLECTION).doc("codePublicPacks");
  const mirror=stateRef.collection("items");
  const batch=db.batch();
  const now=Date.now();
  for(const pack of packs)batch.set(mirror.doc(pack.id),{sourceId:pack.sourceId,sourceFile:pack.sourceFile,sourceHash:pack.sourceHash,source:"code:data/vocabulary",name:pack.name,description:pack.description,words:pack.words,wordCount:pack.wordCount,syncedAt:now},{merge:true});
  await batch.commit();
  const totalWords=packs.reduce((sum,p)=>sum+p.wordCount,0);
  await stateRef.set({source:"code:data/vocabulary",total:packs.length,totalWords,processed:packs.length,done:true,updatedAt:now},{merge:true});
  await audit(db,decoded,"sync.complete","codePublicPacks",{total:packs.length,totalWords,mirror:ADMIN_SYNC_COLLECTION+"/codePublicPacks"});
  return{entity:"codePublicPacks",total:packs.length,totalWords,processed:packs.length,done:true};
}


function messageOf(error,fallback="Lỗi Admin"){
  if(error==null)return fallback;
  if(typeof error==="string")return error;
  if(error instanceof Error&&error.message)return error.message;
  if(typeof error?.message==="string"&&error.message)return error.message;
  if(typeof error?.error==="string")return error.error;
  if(typeof error?.error?.message==="string")return error.error.message;
  try{
    const value=JSON.stringify(error);
    if(value&&value!=="{}")return value;
  }catch(_){}
  return String(error);
}
function serialize(value){
  if(value&&typeof value.toMillis==="function")return value.toMillis();
  if(Array.isArray(value))return value.map(serialize);
  if(value&&typeof value==="object"){
    const out={};
    for(const[k,v]of Object.entries(value))out[k]=serialize(v);
    return out;
  }
  return value;
}
function rows(snapshot){return snapshot.docs.map(doc=>({id:doc.id,...serialize(doc.data()||{})}))}

async function activeClassProfile(db,ids){
 let active=null;const teacherUids=[];
 for(const id of Array.isArray(ids)?ids.slice(0,50):[]){
  const classId=clean(id,160);
  if(!classId)continue;
  const classSnap=await db.collection("classes").doc(classId).get();
  if(!classSnap.exists)continue;
  const cls=classSnap.data()||{},teacherUid=clean(cls.teacherUid,160);
  if(teacherUid&&!teacherUids.includes(teacherUid))teacherUids.push(teacherUid);
  if(active)continue;
  let teacher={};
  if(teacherUid){
   const teacherSnap=await db.collection("users").doc(teacherUid).get();
   teacher=teacherSnap.exists?teacherSnap.data()||{}:{};
  }
  active={
   classId,
   className:clean(cls.name),
   schoolId:clean(cls.schoolId),
   schoolName:clean(cls.schoolName)||clean(teacher.schoolName),
   province:clean(cls.province)||clean(teacher.province),
   ward:clean(cls.ward)||clean(teacher.ward),
   teacherUid,
   teacherName:clean(teacher.displayName)||clean(cls.teacherName),
   teacherEmail:clean(teacher.email,320).toLowerCase()||clean(cls.teacherEmail,320).toLowerCase()
  };
 }
 return active?{...active,teacherUids}:{classId:"",className:"",schoolId:"",schoolName:"",province:"",ward:"",teacherUid:"",teacherName:"",teacherEmail:"",teacherUids:[]};
}
function fail(error,status=502,code="admin_backend_error"){
  const out=new Error(messageOf(error));
  out.status=Number(error?.status||error?.statusCode)||status;
  out.code=error?.code||code;
  out.details=typeof error==="object"&&error!==null?serialize(error):undefined;
  return out;
}
async function count(label,query){
  try{return Number((await query.count().get()).data()?.count||0)}
  catch(error){const e=fail(error,502,"count_failed");e.label=label;throw e}
}
async function list(label,query){
  try{return rows(await query.get())}
  catch(error){const e=fail(error,502,"query_failed");e.label=label;throw e}
}
async function safeCount(label,query,warnings){
  try{return await count(label,query)}
  catch(error){warnings.push({type:"count",label,message:messageOf(error)});return null}
}
async function safeList(label,query,warnings){
  try{return await list(label,query)}
  catch(error){warnings.push({type:"query",label,message:messageOf(error)});return []}
}
function plan(){
  return{
    provinces:PROVINCES.map(([code,name,total])=>({code,name,total})),
    totalSchools:TOTAL_SCHOOLS,
    totalProvinces:PROVINCES.length,
    version:"2026-09-27"
  };
}
function readProvince(code){
  const meta=PROVINCE_MAP.get(String(code));
  if(!meta)throw fail(new Error("Mã tỉnh/thành không hợp lệ."),400,"bad_province");
  try{
    const value=JSON.parse(fs.readFileSync(path.join(DATA_DIR,meta.file),"utf8"));
    if(!Array.isArray(value))throw new Error("Tệp danh mục không phải mảng.");
    return value;
  }catch(error){throw fail(new Error("Không đọc được danh mục "+meta.name+": "+messageOf(error)),500,"catalog_read_failed")}
}
function catalogSchoolId(value){
  return "sch_"+crypto.createHash("sha256").update(String(value)).digest("hex").slice(0,28);
}
const gradeTemplates={
  primary:["1","2","3","4","5"],
  middle:["6","7","8","9"],
  high:["10","11","12"],
  combined:["1","2","3","4","5","6","7","8","9","10","11","12"]
};
async function writeCatalogChunk(db,items){
  if(!items.length)return{writes:0,schools:0};
  const writer=db.bulkWriter();
  let writes=0;
  writer.onWriteResult(()=>{writes++});
  writer.onWriteError(error=>{
    console.error("[KatLearn admin catalog]",error);
    return error.failedAttempts<3;
  });
  const meta=PROVINCE_MAP.get(String(items[0].provinceCode));
  if(meta)writer.set(db.collection("KatLearn_TINHTHANH_1").doc(meta.code),{
    provinceId:meta.code,code:meta.code,name:meta.name,schoolCount:meta.total,
    source:"national_catalog_2026",updatedAt:Date.now()
  },{merge:true});
  const now=Date.now();
  for(const row of items){
    const id=catalogSchoolId(row.provinceCode+"|"+row.sourceSchoolId+"|"+String(row.name||"").trim().toLowerCase());
    const school={
      name:row.name,schoolId:id,province:row.provinceName,provinceId:row.provinceCode,
      ward:row.wardName,wardId:row.wardId,sourceSchoolId:row.sourceSchoolId,
      schoolLevel:row.level,source:"thanhtungct7/data-school-in-ward",
      sourceType:"community_national_school_tree",updatedAt:now
    };
    writer.set(db.collection("KatLearn_TRUONGHOC_1").doc(id),school,{merge:true});
    writer.set(db.collection("schools").doc(id),{...school,createdAt:now},{merge:true});
    for(const grade of gradeTemplates[row.level]||gradeTemplates.combined){
      const classId=id+"-"+grade;
      const cls={
        classId,name:"Lớp "+grade,grade:String(grade),schoolId:id,schoolName:row.name,
        province:row.provinceName,provinceId:row.provinceCode,ward:row.wardName,
        schoolLevel:row.level,isTemplate:true,source:"national_catalog_template",updatedAt:now
      };
      writer.set(db.collection("KatLearn_LOPHOC_1").doc(classId),cls,{merge:true});
      writer.set(db.collection("schools").doc(id).collection("classes").doc(classId),cls,{merge:true});
    }
  }
  try{await writer.close()}
  catch(error){throw fail(error,502,"catalog_write_failed")}
  return{writes,schools:items.length};
}
async function audit(db,decoded,action,target,extra={}){
  try{
    const id=Date.now()+"_"+crypto.randomBytes(5).toString("hex");
    await db.collection("adminAudit").doc(id).set({
      action,target,adminUid:decoded.uid,adminEmail:String(decoded.email||"").toLowerCase(),
      at:Date.now(),...serialize(extra)
    });
  }catch(error){console.error("[KatLearn admin audit]",messageOf(error))}
}
async function teacherChange(db,decoded,uid,mode){
 uid=clean(uid,160);
 if(!uid)throw fail(new Error("Thiếu UID giáo viên."),400,"missing_uid");
 const ref=db.collection("users").doc(uid);
 const snapshot=await ref.get();
 if(!snapshot.exists)throw fail(new Error("Không tìm thấy hồ sơ giáo viên."),404,"teacher_not_found");
 const profile=snapshot.data()||{};
 const verification=profile.teacherVerification||{};
 if(String(profile.role||"")!=="pending_teacher_verification"){
  throw fail(new Error("Chỉ hồ sơ đang chờ xác minh mới có thể được duyệt hoặc từ chối."),409,"teacher_not_pending");
 }
 if(mode==="reject"){
  if(String(profile.role||"")!=="pending_teacher_verification"){
    throw fail(new Error("Chỉ hồ sơ đang chờ xác minh mới có thể bị từ chối."),409,"teacher_not_pending");
  }
  await ref.set({
   role:"teacher_rejected",
   teacherVerification:{...verification,status:"rejected",rejectedAt:Date.now(),rejectedBy:decoded.uid},
   updatedAt:Date.now()
  },{merge:true});
  await audit(db,decoded,"teacher.reject",uid);
  return{uid,status:"rejected"};
 }

 let schoolId=clean(profile.schoolId),schoolName=clean(profile.schoolName);
 const province=clean(profile.province),ward=clean(profile.ward);
 const requestedSchoolName=clean(verification.requestedSchoolName);
 const requestedClassName=clean(verification.requestedClassName);

 if(schoolId){
  const school=await db.collection("schools").doc(schoolId).get();
  if(!school.exists||clean(school.data()?.province)!==province||clean(school.data()?.ward)!==ward){
   schoolId="";
  }else{
   schoolName=clean(school.data()?.name)||schoolName;
  }
 }
 if(!schoolId&&requestedSchoolName){
  const same=await db.collection("schools").where("name","==",requestedSchoolName).limit(20).get();
  const existing=same.docs.map(d=>({id:d.id,...d.data()})).find(x=>clean(x.province)===province&&clean(x.ward)===ward);
  if(existing){
   schoolId=existing.id;
   schoolName=clean(existing.name)||requestedSchoolName;
  }else{
   const created=await db.collection("schools").add({
    name:requestedSchoolName,province,ward,createdBy:uid,createdAt:Date.now(),updatedAt:Date.now()
   });
   schoolId=created.id;
   schoolName=requestedSchoolName;
  }
 }
 if(!schoolId)throw fail(new Error("Hồ sơ chưa có trường hợp lệ."),400,"teacher_school_missing");

 await db.collection("KatLearn_Teacher_Schools").doc(schoolId).set({
  name:schoolName,schoolId,province,ward,source:"teacher_verification",updatedAt:Date.now()
 },{merge:true});

 const classIds=Array.isArray(profile.classIds)
  ?[...new Set(profile.classIds.map(x=>clean(x,160)).filter(Boolean))].slice(0,20)
  :[];
 const valid=[];
 const classData=new Map();

 for(const classId of classIds){
  const topRef=db.collection("classes").doc(classId);
  const top=await topRef.get();
  if(top.exists){
   const data=top.data()||{};
   if(clean(data.schoolId)===schoolId){
    const owner=clean(data.teacherUid,160);
    if(owner&&owner!==uid)throw fail(new Error("Một lớp trong hồ sơ này đã thuộc giáo viên khác."),409,"teacher_class_conflict");
    valid.push(classId);
    classData.set(classId,{...data});
   }else{
    const nestedRef=db.collection("schools").doc(schoolId).collection("classes").doc(classId);
    const nested=await nestedRef.get();
    if(nested.exists&&clean(nested.data()?.schoolId||schoolId)===schoolId){
     const nestedData=nested.data()||{},owner=clean(nestedData.teacherUid,160);
     if(owner&&owner!==uid)throw fail(new Error("Một lớp trong hồ sơ này đã thuộc giáo viên khác."),409,"teacher_class_conflict");
     valid.push(classId);
     classData.set(classId,{...nestedData});
    }
   }
   continue;
  }
  const nestedRef=db.collection("schools").doc(schoolId).collection("classes").doc(classId);
  const nested=await nestedRef.get();
  if(nested.exists&&clean(nested.data()?.schoolId||schoolId)===schoolId){
   const nestedData=nested.data()||{},owner=clean(nestedData.teacherUid,160);
   if(owner&&owner!==uid)throw fail(new Error("Một lớp trong hồ sơ này đã thuộc giáo viên khác."),409,"teacher_class_conflict");
   valid.push(classId);
   classData.set(classId,{...nestedData});
  }
 }

 if(!valid.length&&requestedClassName){
  const topMatches=await db.collection("classes").where("name","==",requestedClassName).limit(20).get();
  const topExisting=topMatches.docs.map(d=>({id:d.id,...d.data()}))
   .find(x=>clean(x.schoolId)===schoolId);
  if(topExisting){
   const owner=clean(topExisting.teacherUid,160);
   if(owner&&owner!==uid)throw fail(new Error("Lớp này đã thuộc một giáo viên khác."),409,"teacher_class_conflict");
   valid.push(topExisting.id);
   classData.set(topExisting.id,{...topExisting});
  }else{
   const sameClass=await db.collection("schools").doc(schoolId).collection("classes")
    .where("name","==",requestedClassName).limit(5).get();
   if(sameClass.docs[0]){
    const d=sameClass.docs[0],data=d.data()||{},owner=clean(data.teacherUid,160);
    if(owner&&owner!==uid)throw fail(new Error("Lớp này đã thuộc một giáo viên khác."),409,"teacher_class_conflict");
    valid.push(d.id);
    classData.set(d.id,{...data});
   }else{
    const created=await db.collection("schools").doc(schoolId).collection("classes").add({
     name:requestedClassName,
     createdBy:uid,
     teacherUid:uid,
     schoolId,
     schoolName,
     province,
     ward,
     createdAt:Date.now(),
     updatedAt:Date.now()
    });
    valid.push(created.id);
    classData.set(created.id,{
     name:requestedClassName,createdBy:uid,teacherUid:uid,schoolId,schoolName,province,ward,
     createdAt:Date.now(),updatedAt:Date.now()
    });
   }
  }
 }

 if(!valid.length)throw fail(new Error("Hồ sơ chưa có lớp hợp lệ."),400,"teacher_class_missing");

 const catalogClassId=clean(
  valid.includes(profile.catalogClassId)?profile.catalogClassId:valid[0]
 );

 for(const classId of valid){
  const now=Date.now();
  const base=classData.get(classId)||{};
  const classRecord={
   ...base,
   classId,
   schoolId,
   schoolName,
   province,
   ward,
   teacherUid:uid,
   teacherEmail:clean(profile.email,320),
   updatedAt:now
  };
  await db.collection("schools").doc(schoolId).collection("classes").doc(classId)
   .set(classRecord,{merge:true});
  await db.collection("classes").doc(classId).set(classRecord,{merge:true});
 }

 await ref.set({
  role:"teacher",
  schoolId,
  schoolName,
  province,
  ward,
  classIds:valid,
  catalogClassId,
  teacherVerification:{
   ...verification,
   status:"verified",
   verifiedAt:Date.now(),
   verifiedBy:decoded.uid
  },
  updatedAt:Date.now()
 },{merge:true});

 await audit(db,decoded,"teacher.verify",uid,{schoolId,classIds:valid});
 return{uid,status:"verified",schoolId,schoolName,province,ward,classIds:valid,catalogClassId};
}
async function deletePack(db,decoded,packId){
 packId=clean(packId,160);
 if(!packId)throw fail(new Error("Thiếu ID bộ từ."),400,"missing_pack_id");
 const ref=db.collection("publicPacks").doc(packId);
 const snap=await ref.get();
 if(!snap.exists)throw fail(new Error("Không tìm thấy bộ từ."),404,"pack_not_found");

 let deletedAssignments=0;
 for(let pass=0;pass<10000;pass++){
  const assignments=await db.collection("packAssignments")
   .where("packId","==",packId)
   .limit(400)
   .get();
  if(assignments.empty)break;
  const batch=db.batch();
  for(const doc of assignments.docs)batch.delete(doc.ref);
  await batch.commit();
  deletedAssignments+=assignments.size;
  if(assignments.size<400)break;
  if(pass===9999)throw fail(new Error("Không thể dọn hết assignment của bộ từ trong giới hạn an toàn."),504,"pack_assignment_cleanup_limit");
 }

 await db.recursiveDelete(ref);
 await audit(db,decoded,"pack.delete",packId,{
  name:snap.data()?.name||"",
  deletedAssignments
 });
 return{packId,deletedAssignments};
}

async function migrateFirestoreUid(db,auth,decoded,oldUid,newUid){
  oldUid=clean(oldUid,128);
  newUid=clean(newUid,128);
  if(!oldUid)throw fail(new Error("Thiếu UID hiện tại."),400,"missing_old_uid");
  if(!newUid)throw fail(new Error("Thiếu UID Firebase mới."),400,"missing_new_uid");
  if(oldUid===newUid)return{oldUid,newUid,status:"unchanged"};

  const sourceRef=db.collection("users").doc(oldUid);
  const sourceSnap=await sourceRef.get();
  if(!sourceSnap.exists)throw fail(new Error("Không tìm thấy hồ sơ users/{uid} hiện tại."),404,"user_not_found");
  const sourceProfile=sourceSnap.data()||{};
  const profileEmail=String(sourceProfile.email||"").trim().toLowerCase();
  if(profileEmail==="katlearn.admin@gmail.com"||oldUid===decoded.uid)
    throw fail(new Error("Không thể đổi UID của tài khoản Admin hiện tại."),403,"admin_protected");

  let sourceAuth=null;
  try{sourceAuth=await auth.getUser(oldUid)}catch(error){
    if(String(error?.code||"")!=="auth/user-not-found")throw fail(error,502,"auth_source_lookup_failed");
  }

  let targetAuth;
  try{targetAuth=await auth.getUser(newUid)}
  catch(error){throw fail(error,404,"target_auth_user_not_found")}

  const sourceEmail=String(sourceAuth?.email||profileEmail).trim().toLowerCase();
  const targetEmail=String(targetAuth?.email||"").trim().toLowerCase();
  if(!targetEmail)throw fail(new Error("UID Firebase đích chưa có email, không thể xác minh tài khoản."),409,"target_auth_email_missing");
  if(sourceEmail&&sourceEmail!==targetEmail){
    throw fail(new Error("UID Firebase đích thuộc email khác ("+targetEmail+"). Email hồ sơ hiện tại là "+sourceEmail+"."),409,"uid_email_mismatch");
  }

  const targetRef=db.collection("users").doc(newUid);
  const existingTarget=await targetRef.get();
  const targetData=existingTarget.exists?existingTarget.data()||{}:{};
  const resumable=existingTarget.exists&&String(targetData.uidMigrationFrom||"")===oldUid;
  if(existingTarget.exists&&!resumable){
    throw fail(new Error("UID đích đã có hồ sơ users/{uid}. Không ghi đè tài khoản đang tồn tại."),409,"target_profile_exists");
  }

  const stamp=Date.now();
  const migratedProfile={
    ...sourceProfile,
    uid:newUid,
    email:sourceProfile.email||targetAuth.email||"",
    displayName:sourceProfile.displayName||targetAuth.displayName||"",
    name:sourceProfile.name||sourceProfile.displayName||targetAuth.displayName||"",
    uidMigrationFrom:oldUid,
    uidMigrationAt:stamp,
    uidMigratedBy:decoded.uid,
    updatedAt:stamp
  };

  async function copySubtree(sourceNode,targetNode){
    const collections=await sourceNode.listCollections();
    for(const collectionRef of collections){
      const docs=await collectionRef.get();
      for(let i=0;i<docs.docs.length;i+=400){
        const batch=db.batch();
        const chunk=docs.docs.slice(i,i+400);
        for(const docSnap of chunk){
          batch.set(targetNode.collection(collectionRef.id).doc(docSnap.id),docSnap.data(),{merge:true});
        }
        if(chunk.length)await batch.commit();
      }
      for(const docSnap of docs.docs){
        await copySubtree(docSnap.ref,targetNode.collection(collectionRef.id).doc(docSnap.id));
      }
    }
  }

  if(!resumable){
    await targetRef.set(migratedProfile,{merge:false});
  }else{
    await targetRef.set(migratedProfile,{merge:true});
  }

  try{
    await copySubtree(sourceRef,targetRef);

    const userWrites=[];
    const queueBatchWrites=async changes=>{
      for(let i=0;i<changes.length;i+=400){
        const batch=db.batch();
        const chunk=changes.slice(i,i+400);
        chunk.forEach(change=>change.type==="delete"?batch.delete(change.ref):batch.set(change.ref,change.data,{merge:true}));
        if(chunk.length)await batch.commit();
      }
    };

    const members=await db.collectionGroup("members").where("uid","==",oldUid).get();
    const memberChanges=[];
    for(const member of members.docs){
      const newMemberRef=member.ref.parent.doc(newUid);
      const data={...member.data(),uid:newUid,uidMigrationFrom:oldUid,updatedAt:stamp};
      memberChanges.push({type:"set",ref:newMemberRef,data},{type:"delete",ref:member.ref});
    }
    await queueBatchWrites(memberChanges);

    const usersTeacher=await db.collection("users").where("teacherUid","==",oldUid).get();
    await queueBatchWrites(usersTeacher.docs.map(d=>({type:"set",ref:d.ref,data:{teacherUid:newUid,updatedAt:stamp}})));

    const usersTeacherArray=await db.collection("users").where("teacherUids","array-contains",oldUid).get();
    await queueBatchWrites(usersTeacherArray.docs.map(d=>{
      const data=d.data()||{},oldList=Array.isArray(data.teacherUids)?data.teacherUids:[],teacherUids=[...new Set(oldList.map(x=>String(x)===oldUid?newUid:String(x)))];
      return{type:"set",ref:d.ref,data:{teacherUids,updatedAt:stamp}};
    }));

    const classes=await db.collection("classes").where("teacherUid","==",oldUid).get();
    await queueBatchWrites(classes.docs.map(d=>({type:"set",ref:d.ref,data:{teacherUid:newUid,updatedAt:stamp}})));

    const nestedClasses=await db.collectionGroup("classes").where("teacherUid","==",oldUid).get();
    await queueBatchWrites(nestedClasses.docs.map(d=>({type:"set",ref:d.ref,data:{teacherUid:newUid,updatedAt:stamp}})));

    const invites=await db.collection("classInvites").where("teacherUid","==",oldUid).get();
    await queueBatchWrites(invites.docs.map(d=>({type:"set",ref:d.ref,data:{teacherUid:newUid,updatedAt:stamp}})));

    const packs=await db.collection("publicPacks").where("createdByUid","==",oldUid).get();
    await queueBatchWrites(packs.docs.map(d=>({type:"set",ref:d.ref,data:{createdByUid:newUid,updatedAt:stamp}})));

    const assignmentsTeacher=await db.collection("packAssignments").where("teacherUid","==",oldUid).get();
    await queueBatchWrites(assignmentsTeacher.docs.map(d=>({type:"set",ref:d.ref,data:{teacherUid:newUid,updatedAt:stamp}})));

    const assignmentsStudent=await db.collection("packAssignments").where("studentUids","array-contains",oldUid).get();
    await queueBatchWrites(assignmentsStudent.docs.map(d=>{
      const data=d.data()||{},list=Array.isArray(data.studentUids)?data.studentUids:[],studentUids=[...new Set(list.map(x=>String(x)===oldUid?newUid:String(x)))];
      return{type:"set",ref:d.ref,data:{studentUids,updatedAt:stamp}};
    }));

    const accountDocs=await db.collection("accounts").where("uid","==",oldUid).get();
    await queueBatchWrites(accountDocs.docs.map(d=>({type:"set",ref:d.ref,data:{uid:newUid,updatedAt:stamp}})));

    const memoryOwner=await db.collectionGroup("memory").where("ownerUid","==",oldUid).get();
    await queueBatchWrites(memoryOwner.docs.map(d=>({type:"set",ref:d.ref,data:{ownerUid:newUid,updatedAt:stamp}})));

    const memoryUid=await db.collectionGroup("memory").where("uid","==",oldUid).get();
    await queueBatchWrites(memoryUid.docs.map(d=>({type:"set",ref:d.ref,data:{uid:newUid,updatedAt:stamp}})));

    const oldLeaderboardId=crypto.createHash("sha256").update(String(oldUid)).digest("hex").slice(0,32);
    const newLeaderboardId=crypto.createHash("sha256").update(String(newUid)).digest("hex").slice(0,32);
    if(oldLeaderboardId!==newLeaderboardId){
      const oldLeaderboard=db.collection("leaderboard").doc(oldLeaderboardId);
      const oldBoardSnap=await oldLeaderboard.get();
      if(oldBoardSnap.exists){
        await db.collection("leaderboard").doc(newLeaderboardId).set(oldBoardSnap.data()||{},{merge:true});
        await oldLeaderboard.delete();
      }
    }

    const mirrorOld=db.collection("KatLearn_ADMIN_SYNC_1").doc("users").collection("items").doc(oldUid);
    const mirrorSnap=await mirrorOld.get();
    if(mirrorSnap.exists){
      await db.collection("KatLearn_ADMIN_SYNC_1").doc("users").collection("items").doc(newUid).set({
        ...(mirrorSnap.data()||{}),
        sourceId:newUid,
        data:{...((mirrorSnap.data()||{}).data||{}),uid:newUid,uidMigrationFrom:oldUid,updatedAt:stamp},
        syncedAt:stamp
      },{merge:true});
      await mirrorOld.delete();
    }

    await targetRef.set({uid:newUid,uidMigrationStatus:"complete",uidMigrationFrom:oldUid,uidMigrationAt:stamp,uidMigratedBy:decoded.uid,updatedAt:stamp},{merge:true});
    await db.recursiveDelete(sourceRef);
    await audit(db,decoded,"user.uid_migrate",oldUid,{newUid,sourceEmail,targetEmail,members:members.size,teacherProfiles:usersTeacher.size,teacherArrays:usersTeacherArray.size,classes:classes.size,nestedClasses:nestedClasses.size,invites:invites.size,packs:packs.size,teacherAssignments:assignmentsTeacher.size,studentAssignments:assignmentsStudent.size,accounts:accountDocs.size,memoryOwner:memoryOwner.size,memoryUid:memoryUid.size});
    return{oldUid,newUid,status:"migrated",email:targetEmail,members:members.size};
  }catch(error){
    if(!resumable){
      try{await db.recursiveDelete(targetRef)}catch(rollbackError){console.warn("[KatLearn admin UID migration rollback]",messageOf(rollbackError))}
    }
    throw error;
  }
}

async function renameUser(db,auth,decoded,uid,name){
  uid=clean(uid,160);
  name=clean(name,120);
  if(!uid)throw fail(new Error("Thiếu UID tài khoản."),400,"missing_uid");
  if(!name)throw fail(new Error("Tên hiển thị không được để trống."),400,"invalid_display_name");
  const ref=db.collection("users").doc(uid),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy tài khoản."),404,"user_not_found");
  const profile=snap.data()||{};
  if(String(profile.email||"").toLowerCase()==="katlearn.admin@gmail.com")throw fail(new Error("Không thể sửa tài khoản Admin hệ thống bằng thao tác này."),403,"admin_protected");
  let authUser;
  try{authUser=await auth.getUser(uid)}
  catch(error){throw fail(error,502,"auth_lookup_failed")}
  const previousAuthName=authUser.displayName||"";
  try{
   await auth.updateUser(uid,{displayName:name});
   await ref.set({displayName:name,name,updatedAt:Date.now()},{merge:true});
  }catch(error){
   try{await auth.updateUser(uid,{displayName:previousAuthName||null})}catch(_){}
   throw fail(error,502,"user_rename_failed");
  }
  let syncedMembers=0;
  try{
   const memberDocs=await db.collectionGroup("members").where("uid","==",uid).get();
   for(let i=0;i<memberDocs.docs.length;i+=400){
    const batch=db.batch();
    memberDocs.docs.slice(i,i+400).forEach(doc=>batch.set(doc.ref,{displayName:name,updatedAt:Date.now()},{merge:true}));
    const chunkSize=memberDocs.docs.slice(i,i+400).length;
    if(chunkSize){await batch.commit();syncedMembers+=chunkSize}
   }
  }catch(error){
   console.warn("[KatLearn admin rename-user member sync]",messageOf(error));
  }
  await audit(db,decoded,"user.rename",uid,{displayName:name,syncedMembers});
  return{uid,displayName:name,syncedMembers};
}

async function setUserDisabled(db,auth,decoded,uid,disabled){
  uid=clean(uid,160);
  if(!uid)throw fail(new Error("Thiếu UID tài khoản."),400,"missing_uid");
  const ref=db.collection("users").doc(uid),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy tài khoản."),404,"user_not_found");
  const profile=snap.data()||{},email=String(profile.email||"").toLowerCase();
  if(email==="katlearn.admin@gmail.com")throw fail(new Error("Không thể khóa tài khoản Admin hệ thống."),403,"admin_protected");
  const nextDisabled=Boolean(disabled);
  let authUser;
  try{authUser=await auth.getUser(uid)}
  catch(error){throw fail(error,502,"auth_lookup_failed")}
  const previousDisabled=Boolean(authUser.disabled);
  try{await auth.updateUser(uid,{disabled:nextDisabled})}
  catch(error){throw fail(error,502,"auth_update_failed")}
  try{
   await ref.set({disabled:nextDisabled,updatedAt:Date.now()},{merge:true});
  }catch(error){
   try{await auth.updateUser(uid,{disabled:previousDisabled})}catch(_){}
   throw fail(error,502,"user_status_sync_failed");
  }
  await audit(db,decoded,nextDisabled?"user.disable":"user.enable",uid,{email});
  return{uid,disabled:nextDisabled};
}

async function resetUserStats(db,decoded,uid){
  uid=clean(uid,160);
  if(!uid)throw fail(new Error("Thiếu UID tài khoản."),400,"missing_uid");
  const ref=db.collection("users").doc(uid),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy tài khoản."),404,"user_not_found");
  const email=String(snap.data()?.email||"").toLowerCase();
  if(email==="katlearn.admin@gmail.com")throw fail(new Error("Không thể reset tài khoản Admin hệ thống."),403,"admin_protected");
  await ref.set({
    coins:0,energy:0,streak:0,lastStudyDay:"",
    dailyQuestions:0,dailyCorrect:0,questionsAnswered:0,correctAnswers:0,
    updatedAt:Date.now()
  },{merge:true});
  await audit(db,decoded,"user.reset_stats",uid);
  return{uid};
}

async function deleteUser(db,auth,decoded,uid){
  uid=clean(uid,160);
  if(!uid)throw fail(new Error("Thiếu UID tài khoản."),400,"missing_uid");
  const ref=db.collection("users").doc(uid),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy hồ sơ tài khoản."),404,"user_not_found");
  const profile=snap.data()||{},email=String(profile.email||"").toLowerCase();
  if(uid===decoded.uid||email==="katlearn.admin@gmail.com")throw fail(new Error("Không thể xóa tài khoản Admin hiện tại."),403,"admin_protected");
  if(String(profile.role||"").toLowerCase()==="teacher"){
   const [ownedClasses,ownedPacks,ownedNestedClasses]=await Promise.all([
    db.collection("classes").where("teacherUid","==",uid).limit(1).get(),
    db.collection("publicPacks").where("createdByUid","==",uid).limit(1).get(),
    db.collectionGroup("classes").where("teacherUid","==",uid).limit(1).get()
   ]);
   if(!ownedClasses.empty||!ownedPacks.empty||!ownedNestedClasses.empty){
    throw fail(new Error("Không thể xóa giáo viên khi tài khoản vẫn còn lớp học hoặc bộ từ do tài khoản này quản lý. Hãy xử lý các tài nguyên đó trước."),409,"teacher_owns_resources");
   }
  }
  const classIds=Array.isArray(profile.joinedClassIds)?[...new Set(profile.joinedClassIds.map(x=>clean(x,160)).filter(Boolean))]:[];
  for(let i=0;i<classIds.length;i+=150){
    const batch=db.batch();
    for(const classId of classIds.slice(i,i+150)){
      batch.delete(db.collection("classes").doc(classId).collection("members").doc(uid));
    }
    await batch.commit();
  }
  const memberDocs=[];
  try{
   const group=await db.collectionGroup("members").where("uid","==",uid).get();
   for(const doc of group.docs)memberDocs.push(doc);
  }catch(error){
   console.warn("[KatLearn admin delete-user member lookup]",messageOf(error));
  }
  const memberPaths=new Set(memberDocs.map(doc=>doc.ref.path));
  for(const classId of classIds){
   const refPath=db.collection("classes").doc(classId).collection("members").doc(uid);
   if(!memberPaths.has(refPath.path))memberDocs.push({ref:refPath,id:uid,__fallback:true});
  }
  const memberClassIds=[...new Set(memberDocs.map(doc=>doc.ref.parent.parent?.id).filter(Boolean))];
  for(let i=0;i<memberDocs.length;i+=400){
   const batch=db.batch();
   memberDocs.slice(i,i+400).forEach(doc=>batch.delete(doc.ref));
   if(memberDocs.slice(i,i+400).length)await batch.commit();
  }
  for(const memberClassId of memberClassIds){
   const classRef=db.collection("classes").doc(memberClassId);
   const classSnap=await classRef.get();
   if(!classSnap.exists)continue;
   const countSnap=await classRef.collection("members").count().get();
   await classRef.set({studentCount:Number(countSnap.data()?.count||0),updatedAt:Date.now()},{merge:true});
  }

  let updatedAssignments=0;
  for(let pass=0;pass<10000;pass++){
   const assignmentSnap=await db.collection("packAssignments").where("studentUids","array-contains",uid).limit(400).get();
   if(assignmentSnap.empty)break;
   const batch=db.batch();
   for(const doc of assignmentSnap.docs){
    const data=doc.data()||{};
    const studentUids=Array.isArray(data.studentUids)?data.studentUids.filter(x=>x!==uid):[];
    batch.set(doc.ref,{studentUids,studentCount:studentUids.length,updatedAt:Date.now()},{merge:true});
   }
   await batch.commit();
   updatedAssignments+=assignmentSnap.size;
   if(assignmentSnap.size<400)break;
   if(pass===9999)throw fail(new Error("Không thể dọn hết assignment của tài khoản trong giới hạn an toàn."),504,"user_assignment_cleanup_limit");
  }
  try{await auth.deleteUser(uid)}
  catch(error){
    const code=String(error?.code||"");
    if(code!=="auth/user-not-found")throw fail(error,502,"auth_delete_failed");
  }
  await db.recursiveDelete(ref);
  let deletedAccounts=0;
  for(let pass=0;pass<10000;pass++){
   const accountSnap=await db.collection("accounts").where("uid","==",uid).limit(400).get();
   if(accountSnap.empty)break;
   const batch=db.batch();
   for(const doc of accountSnap.docs)batch.delete(doc.ref);
   await batch.commit();
   deletedAccounts+=accountSnap.size;
   if(accountSnap.size<400)break;
   if(pass===9999)throw fail(new Error("Không thể dọn hết account liên kết trong giới hạn an toàn."),504,"account_cleanup_limit");
  }
  await audit(db,decoded,"user.delete",uid,{email,removedClassMemberships:memberDocs.length,updatedAssignments,deletedAccounts});
  return{uid,removedClassMemberships:memberDocs.length,updatedAssignments,deletedAccounts};
}

async function renameClass(db,decoded,classId,name,grade,description){
  classId=clean(classId,160);
  name=clean(name,160);
  grade=clean(grade,30);
  description=clean(description,500);
  if(!classId)throw fail(new Error("Thiếu ID lớp."),400,"missing_class_id");
  if(!name)throw fail(new Error("Tên lớp không được để trống."),400,"invalid_class_name");
  const ref=db.collection("classes").doc(classId),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy lớp."),404,"class_not_found");
  const current=snap.data()||{};
  if(current.deletingAt)throw fail(new Error("Lớp đang được xóa, không thể chỉnh sửa."),409,"class_deleting");
  const patch={name,grade,description,updatedAt:Date.now()};
  await ref.set(patch,{merge:true});
  if(current.schoolId){
    await db.collection("schools").doc(String(current.schoolId)).collection("classes").doc(classId).set(patch,{merge:true});
  }
  const catalogRef=db.collection("KatLearn_LOPHOC_1").doc(classId),catalogSnap=await catalogRef.get();
  if(catalogSnap.exists&&catalogSnap.data()?.isTemplate!==true)await catalogRef.set(patch,{merge:true});

  const members=await ref.collection("members").get();
  for(let offset=0;offset<members.docs.length;offset+=150){
   const chunk=members.docs.slice(offset,offset+150);
   const profiles=await Promise.all(chunk.map(async member=>{
    const studentRef=db.collection("users").doc(member.id);
    const studentSnap=await studentRef.get();
    return{member,studentRef,student:studentSnap.exists?studentSnap.data()||{}:null};
   }));
   const batch=db.batch();
   for(const x of profiles){
    batch.set(x.member.ref,{className:name,grade,schoolName:clean(current.schoolName),province:clean(current.province),ward:clean(current.ward),updatedAt:Date.now()},{merge:true});
    if(x.student&&clean(x.student.classId)===classId){
     batch.set(x.studentRef,{className:name,updatedAt:Date.now()},{merge:true});
    }
   }
   if(profiles.length)await batch.commit();
  }
  await audit(db,decoded,"class.update",classId,{name,grade});
  return{classId,name,grade,description};
}

async function deleteClass(db,decoded,classId){
  classId=clean(classId,160);
  if(!classId)throw fail(new Error("Thiếu ID lớp."),400,"missing_class_id");
  const ref=db.collection("classes").doc(classId),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy lớp."),404,"class_not_found");
  const current=snap.data()||{};
  const schoolId=clean(current.schoolId,160),teacherUid=clean(current.teacherUid,160);
  const members=await ref.collection("members").get();
  for(let offset=0;offset<members.docs.length;offset+=150){
    const chunk=members.docs.slice(offset,offset+150),batch=db.batch();
    const profiles=await Promise.all(chunk.map(async member=>{
      const studentRef=db.collection("users").doc(member.id);
      const s=await studentRef.get();
      return{ref:member.ref,studentRef,data:s.exists?s.data()||{}:null};
    }));
    for(const x of profiles){
      batch.delete(x.ref);
      if(x.data){
       const ids=Array.isArray(x.data.joinedClassIds)?x.data.joinedClassIds.filter(id=>id!==classId):[];
       const active=await activeClassProfile(db,ids);
       batch.set(x.studentRef,{joinedClassIds:ids,studentAccountType:ids.length?"class":"free",...active,updatedAt:Date.now()},{merge:true});
      }
    }
    await batch.commit();
  }
  const invites=await db.collection("classInvites").where("classId","==",classId).get();
  const assignments=await db.collection("packAssignments").where("classId","==",classId).get();
  for(let i=0;i<Math.max(invites.size,assignments.size);i+=200){
    const batch=db.batch();
    invites.docs.slice(i,i+200).forEach(x=>batch.delete(x.ref));
    assignments.docs.slice(i,i+200).forEach(x=>batch.delete(x.ref));
    if(i===0){
      batch.delete(ref);
      if(schoolId)batch.delete(db.collection("schools").doc(schoolId).collection("classes").doc(classId));
      const catalogRef=db.collection("KatLearn_LOPHOC_1").doc(classId);
      if((await catalogRef.get()).data()?.isTemplate!==true)batch.delete(catalogRef);
      if(teacherUid){
        const teacherRef=db.collection("users").doc(teacherUid),teacherSnap=await teacherRef.get();
        if(teacherSnap.exists){
          const teacher=teacherSnap.data()||{},ids=Array.isArray(teacher.classIds)?teacher.classIds.filter(id=>id!==classId):[];
          const nextCatalog=clean(teacher.catalogClassId,160)===classId?(ids[0]||""):clean(teacher.catalogClassId,160);
          batch.set(teacherRef,{classIds:ids,catalogClassId:nextCatalog,updatedAt:Date.now()},{merge:true});
        }
      }
    }
    await batch.commit();
  }
  if(invites.empty&&assignments.empty){
    const batch=db.batch();
    batch.delete(ref);
    if(schoolId)batch.delete(db.collection("schools").doc(schoolId).collection("classes").doc(classId));
    const catalogRef=db.collection("KatLearn_LOPHOC_1").doc(classId);
    if((await catalogRef.get()).data()?.isTemplate!==true)batch.delete(catalogRef);
    if(teacherUid){
      const teacherRef=db.collection("users").doc(teacherUid),teacherSnap=await teacherRef.get();
      if(teacherSnap.exists){
        const ids=Array.isArray(teacherSnap.data()?.classIds)?teacherSnap.data().classIds.filter(id=>id!==classId):[];
        batch.set(teacherRef,{classIds:ids,updatedAt:Date.now()},{merge:true});
      }
    }
    await batch.commit();
  }
  await audit(db,decoded,"class.delete",classId,{schoolId,teacherUid,members:members.size,assignments:assignments.size});
  return{classId,deletedMembers:members.size,deletedAssignments:assignments.size};
}

async function updateSchool(db,decoded,schoolId,name,province,ward,schoolLevel){
  schoolId=clean(schoolId,160);name=clean(name,200);province=clean(province,160);ward=clean(ward,160);schoolLevel=clean(schoolLevel,40);
  if(!schoolId)throw fail(new Error("Thiếu ID trường."),400,"missing_school_id");
  if(!name)throw fail(new Error("Tên trường không được để trống."),400,"invalid_school_name");
  const ref=db.collection("schools").doc(schoolId),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy trường."),404,"school_not_found");
  const current=snap.data()||{};
  if(String(current.source||"").startsWith("thanhtungct7")||String(current.sourceType||"").includes("national")){
    throw fail(new Error("Không sửa trực tiếp trường thuộc National Catalog. Hãy cập nhật từ Catalog."),409,"catalog_school_protected");
  }
  const patch={name,province,ward,schoolLevel,updatedAt:Date.now()};
  await ref.set(patch,{merge:true});
  await db.collection("KatLearn_Teacher_Schools").doc(schoolId).set({name,province,ward,schoolLevel,updatedAt:Date.now()},{merge:true});

  const relatedUsers=await db.collection("users").where("schoolId","==",schoolId).get();
  for(let i=0;i<relatedUsers.docs.length;i+=400){
   const batch=db.batch();
   relatedUsers.docs.slice(i,i+400).forEach(doc=>batch.set(doc.ref,{schoolName:name,province,ward,updatedAt:Date.now()},{merge:true}));
   if(relatedUsers.docs.slice(i,i+400).length)await batch.commit();
  }
  const relatedClasses=await db.collection("classes").where("schoolId","==",schoolId).get();
  for(let i=0;i<relatedClasses.docs.length;i+=400){
   const batch=db.batch();
   relatedClasses.docs.slice(i,i+400).forEach(doc=>batch.set(doc.ref,{schoolName:name,province,ward,updatedAt:Date.now()},{merge:true}));
   if(relatedClasses.docs.slice(i,i+400).length)await batch.commit();
  }
  const nestedClasses=await ref.collection("classes").get();
  for(let i=0;i<nestedClasses.docs.length;i+=400){
   const batch=db.batch();
   nestedClasses.docs.slice(i,i+400).forEach(doc=>batch.set(doc.ref,{schoolName:name,province,ward,updatedAt:Date.now()},{merge:true}));
   if(nestedClasses.docs.slice(i,i+400).length)await batch.commit();
  }

  let syncedMembers=0;
  const schoolMemberDocs=await db.collectionGroup("members").where("schoolId","==",schoolId).get();
  for(let i=0;i<schoolMemberDocs.docs.length;i+=400){
   const batch=db.batch();
   const chunk=schoolMemberDocs.docs.slice(i,i+400);
   chunk.forEach(doc=>batch.set(doc.ref,{schoolName:name,province,ward,updatedAt:Date.now()},{merge:true}));
   if(chunk.length){await batch.commit();syncedMembers+=chunk.length}
  }
  for(const classDoc of relatedClasses.docs){
   const memberDocs=await classDoc.ref.collection("members").get();
   for(let i=0;i<memberDocs.docs.length;i+=400){
    const batch=db.batch();
    const chunk=memberDocs.docs.slice(i,i+400);
    chunk.forEach(doc=>batch.set(doc.ref,{schoolName:name,province,ward,updatedAt:Date.now()},{merge:true}));
    if(chunk.length){await batch.commit();syncedMembers+=chunk.length}
   }
  }
  await audit(db,decoded,"school.update",schoolId,{name,province,ward,schoolLevel,updatedUsers:relatedUsers.size,updatedClasses:relatedClasses.size,syncedMembers});
  return{schoolId,...patch};
}

async function deleteSchool(db,decoded,schoolId){
  schoolId=clean(schoolId,160);
  if(!schoolId)throw fail(new Error("Thiếu ID trường."),400,"missing_school_id");
  const ref=db.collection("schools").doc(schoolId),snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy trường."),404,"school_not_found");
  const school=snap.data()||{};
  if(String(school.source||"").startsWith("thanhtungct7")||String(school.sourceType||"").includes("national")){
    throw fail(new Error("Không xóa trực tiếp trường thuộc National Catalog. Hãy xử lý từ Catalog."),409,"catalog_school_protected");
  }
  const [usersSnap,classesSnap,nestedClassesSnap]=await Promise.all([
    db.collection("users").where("schoolId","==",schoolId).limit(1).get(),
    db.collection("classes").where("schoolId","==",schoolId).limit(1).get(),
    db.collectionGroup("classes").where("schoolId","==",schoolId).limit(1).get()
  ]);
  if(!usersSnap.empty||!classesSnap.empty||!nestedClassesSnap.empty)throw fail(new Error("Không thể xóa trường đang có tài khoản hoặc lớp liên kết."),409,"school_in_use");
  const batch=db.batch();
  batch.delete(ref);
  batch.delete(db.collection("KatLearn_Teacher_Schools").doc(schoolId));
  await batch.commit();
  await audit(db,decoded,"school.delete",schoolId,{name:school.name||""});
  return{schoolId};
}

async function overview(db){
  const users=db.collection("users"),classes=db.collection("classes"),packs=db.collection("publicPacks"),schools=db.collection("schools");
  const warnings=[];
  const [
    userCount,teacherCount,studentCount,pendingCount,classCount,packCount,schoolCount,
    syncedSchoolCount,syncedProvinceCount
  ]=await Promise.all([
    safeCount("tài khoản",users,warnings),
    safeCount("giáo viên",users.where("role","==","teacher"),warnings),
    safeCount("học sinh",users.where("role","==","student"),warnings),
    safeCount("giáo viên chờ xác minh",users.where("role","==","pending_teacher_verification"),warnings),
    safeCount("lớp học",classes,warnings),
    safeCount("bộ từ công khai",packs,warnings),
    safeCount("trường ứng dụng",schools,warnings),
    safeCount("trường đã đồng bộ",db.collection("KatLearn_TRUONGHOC_1"),warnings),
    safeCount("tỉnh/thành đã đồng bộ",db.collection("KatLearn_TINHTHANH_1"),warnings)
  ]);
  const pending=await safeList(
    "hồ sơ giáo viên chờ xác minh",
    users.where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending),
    warnings
  );
  return{
    stats:{
      users:userCount,teachers:teacherCount,students:studentCount,pending:pendingCount,
      classes:classCount,packs:packCount,codePacks:await safeCount("bộ từ trong code",db.collection(ADMIN_SYNC_COLLECTION).doc("codePublicPacks").collection("items"),warnings),schools:schoolCount,
      syncedSchools:syncedSchoolCount,syncedProvinces:syncedProvinceCount
    },
    pending:pending.sort((a,b)=>Number(a.teacherVerification?.submittedAt||a.createdAt||0)-Number(b.teacherVerification?.submittedAt||b.createdAt||0)),
    catalog:plan(),
    warnings,
    degraded:warnings.length>0
  };
}
async function listAllAuthUsers(auth){
  const users=[];
  let pageToken;
  do{
    const page=await auth.listUsers(1000,pageToken);
    users.push(...page.users);
    pageToken=page.pageToken||undefined;
  }while(pageToken);
  return users;
}
function authUserRow(user){
  const createdAt=Date.parse(String(user?.metadata?.creationTime||""))||0;
  const lastSignInAt=Date.parse(String(user?.metadata?.lastSignInTime||""))||0;
  return{
    id:user.uid,
    uid:user.uid,
    email:String(user.email||""),
    displayName:String(user.displayName||""),
    name:String(user.displayName||""),
    photoURL:String(user.photoURL||""),
    disabled:Boolean(user.disabled),
    createdAt,
    lastSignInAt,
    authProviders:Array.isArray(user.providerData)
      ?user.providerData.map(provider=>String(provider?.providerId||"")).filter(Boolean)
      :[],
    authSource:"firebase_auth"
  };
}
async function section(db,key,queryParams={}){
  key=String(key||"overview");
  if(key==="overview")return overview(db);
  if(key==="catalog")return{catalog:plan()};
  if(key==="private-packs"){
    // The filtered collection-group query needs a Firestore collection-group index.
    // Keep a zero-index fallback so the Admin Hub remains usable while that index
    // is being created (or when deployments run against a fresh project).
    const [accountSnap,legacySnap]=await Promise.all([
      (async()=>{
        try{
          return await db.collectionGroup("memory")
            .where("kind","==","personalPack")
            .limit(LIMITS.privatePacks)
            .get();
        }catch(error){
          const message=messageOf(error);
          if(!/requires a COLLECTION_GROUP_.*index|FAILED_PRECONDITION/i.test(message))throw error;
          const fallbackLimit=Math.min(1000,LIMITS.privatePacks*4);
          const snapshot=await db.collectionGroup("memory").limit(fallbackLimit).get();
          const matching=snapshot.docs.filter(doc=>String(doc.data()?.kind||"")==="personalPack");
          return{docs:matching,size:matching.length,empty:matching.length===0};
        }
      })(),
      db.collectionGroup("personalPacks").limit(LIMITS.privatePacks).get()
    ]);
    const merged=new Map();
    for(const doc of accountSnap.docs){
      const data=serialize(doc.data()||{});
      const accountCode=String(doc.ref.parent?.parent?.id||data.ownerAccountCode||"").trim();
      const ownerUid=String(data.ownerUid||"").trim();
      if(!ownerUid||!accountCode)continue;
      merged.set("account:"+doc.ref.path,{id:doc.id,ownerUid,accountCode,source:"accounts",...data,wordCount:Number(data.wordCount)||((Array.isArray(data.words)?data.words.length:0))});
    }
    for(const doc of legacySnap.docs){
      const data=serialize(doc.data()||{});
      const ownerUid=String(doc.ref.parent?.parent?.id||data.ownerUid||"").trim();
      if(!ownerUid)continue;
      const accountCode=String(data.ownerAccountCode||"").trim();
      merged.set("legacy:"+doc.ref.path,{id:doc.id,ownerUid,accountCode,source:"users",...data,wordCount:Number(data.wordCount)||((Array.isArray(data.words)?data.words.length:0))});
    }
    const rows=[...merged.values()].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
    return{rows,total:rows.length,limited:accountSnap.size>=LIMITS.privatePacks||legacySnap.size>=LIMITS.privatePacks};
  }
  if(key==="pack"){
    const packId=clean(queryParams.id,160);
    if(!packId)throw fail(new Error("Thiếu ID bộ từ."),400,"missing_pack_id");
    const snap=await db.collection("publicPacks").doc(packId).get();
    if(!snap.exists)throw fail(new Error("Không tìm thấy bộ từ."),404,"pack_not_found");
    return{pack:{id:snap.id,...serialize(snap.data()||{})}};
  }
  if(key==="packs"){
    const publicRows=await list("bộ từ công khai",db.collection("publicPacks").select(...PACK_FIELDS).limit(LIMITS.packs));
    const codePacks=readCodePublicPacks().map(({words,...meta})=>meta);
    return{rows:publicRows,limited:publicRows.length>=LIMITS.packs,codePacks,codePackCount:codePacks.length,codeWordCount:codePacks.reduce((sum,p)=>sum+Number(p.wordCount||0),0)};
  }
  if(key==="teachers"){
    const [pending,verified,rejected]=await Promise.all([
      list("giáo viên chờ xác minh",db.collection("users").where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending)),
      list("giáo viên",db.collection("users").where("role","==","teacher").select(...USER_FIELDS).limit(LIMITS.teachers)),
      list("giáo viên bị từ chối",db.collection("users").where("role","==","teacher_rejected").select(...USER_FIELDS).limit(LIMITS.pending))
    ]);
    return{
      rows:[
        ...pending.map(x=>({...x,_status:"pending"})),
        ...verified.map(x=>({...x,_status:"verified"})),
        ...rejected.map(x=>({...x,_status:"rejected"}))
      ],
      limited:pending.length>=LIMITS.pending||verified.length>=LIMITS.teachers||rejected.length>=LIMITS.pending
    };
  }
  if(key==="activity"){
    return{rows:await list("nhật ký Admin",db.collection("adminAudit").orderBy("at","desc").limit(LIMITS.activity))};
  }
  if(key==="users"){
    // Firebase Auth is the source of truth for "tài khoản".
    // Enrich every Auth account with its Firestore users/{uid} profile when present,
    // so accounts that somehow missed a profile document still appear in Admin.
    const [authUsers,profileRows]=await Promise.all([
      listAllAuthUsers(queryParams.auth),
      list("hồ sơ tài khoản",db.collection("users").select(...USER_FIELDS))
    ]);
    const profiles=new Map(profileRows.map(row=>[String(row.id),row]));
    const rows=authUsers.map(user=>{
      const authRow=authUserRow(user);
      const profile=profiles.get(String(user.uid))||{};
      return{
        ...profile,
        ...authRow,
        displayName:String(profile.displayName||profile.name||authRow.displayName||authRow.email||"KatLearn User"),
        name:String(profile.name||profile.displayName||authRow.displayName||authRow.email||"KatLearn User"),
        email:String(profile.email||authRow.email||""),
        role:String(profile.role||""),
        accountCode:String(profile.accountCode||""),
        createdAt:Number(profile.createdAt||authRow.createdAt)||0,
        lastSignInAt:authRow.lastSignInAt,
        disabled:Boolean(authRow.disabled),
        profileExists:profiles.has(String(user.uid)),
        authSource:"firebase_auth"
      };
    });
    return{
      rows,
      total:rows.length,
      profileCount:profileRows.length,
      authCount:authUsers.length,
      missingProfiles:rows.filter(row=>!row.profileExists).length,
      limited:false
    };
  }
  const defs={
    classes:["lớp học",db.collection("classes").select(...CLASS_FIELDS).limit(LIMITS.classes)],
    schools:["trường học",db.collection("schools").select(...SCHOOL_FIELDS).limit(LIMITS.schools)]
  };
  if(!defs[key])throw fail(new Error("Khu vực Admin không hợp lệ."),400,"bad_section");
  const[label,query]=defs[key];
  const data=await list(label,query);
  return{rows:data,limited:data.length>=LIMITS[key]};
}
module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS"){
    const h={...corsHeaders(origin),"Content-Length":"0"};
    if(res&&typeof res.setHeader==="function"){
      for(const[key,value]of Object.entries(h))res.setHeader(key,value);
      res.statusCode=204;
      return typeof res.end==="function"?res.end() : new Response(null,{status:204,headers:h});
    }
    return new Response(null,{status:204,headers:h});
  }
  try{
    const authorization=String(req.headers?.authorization||"").trim();
    if(!/^Bearer\s+.+$/i.test(authorization)){
      return writeJson(res,401,{ok:false,error:"Bạn cần đăng nhập Admin.",code:"missing_admin_token"},origin);
    }
    const{requireAdmin}=require("./_admin");
    if(req.method==="GET"){
      const{db,auth}=await requireAdmin(req);
      const value=await section(db,req.query?.section||"overview",{...req.query,auth});
      return writeJson(res,200,{ok:true,...value,limits:LIMITS},origin);
    }
    if(req.method!=="POST")return writeJson(res,405,{ok:false,error:"Method not allowed",code:"method_not_allowed"},origin);
    const{db,auth,decoded}=await requireAdmin(req);
    const body=req.body&&typeof req.body==="object"?req.body:{};
    const action=clean(body.action,50);
    if(action==="migrate-user-uid")return writeJson(res,200,{ok:true,...await migrateFirestoreUid(db,auth,decoded,body.oldUid,body.newUid)},origin);
    if(action==="rename-user")return writeJson(res,200,{ok:true,...await renameUser(db,auth,decoded,body.uid,body.name)},origin);
    if(action==="disable-user")return writeJson(res,200,{ok:true,...await setUserDisabled(db,auth,decoded,body.uid,true)},origin);
    if(action==="enable-user")return writeJson(res,200,{ok:true,...await setUserDisabled(db,auth,decoded,body.uid,false)},origin);
    if(action==="reset-user-stats")return writeJson(res,200,{ok:true,...await resetUserStats(db,decoded,body.uid)},origin);
    if(action==="delete-user")return writeJson(res,200,{ok:true,...await deleteUser(db,auth,decoded,body.uid)},origin);
    if(action==="update-class")return writeJson(res,200,{ok:true,...await renameClass(db,decoded,body.classId,body.name,body.grade,body.description)},origin);
    if(action==="delete-class")return writeJson(res,200,{ok:true,...await deleteClass(db,decoded,body.classId)},origin);
    if(action==="update-school")return writeJson(res,200,{ok:true,...await updateSchool(db,decoded,body.schoolId,body.name,body.province,body.ward,body.schoolLevel)},origin);
    if(action==="delete-school")return writeJson(res,200,{ok:true,...await deleteSchool(db,decoded,body.schoolId)},origin);
    if(action==="verify-teacher")return writeJson(res,200,{ok:true,...await teacherChange(db,decoded,body.uid,"verify")},origin);
    if(action==="reject-teacher")return writeJson(res,200,{ok:true,...await teacherChange(db,decoded,body.uid,"reject")},origin);
    if(action==="delete-pack")return writeJson(res,200,{ok:true,...await deletePack(db,decoded,body.packId)},origin);
    if(action==="update-pack")return writeJson(res,200,{ok:true,...await updatePublicPack(db,decoded,body.packId,body.name,body.words)},origin);
    if(action==="sync-auth-accounts")return writeJson(res,200,{ok:true,...await syncAuthAccounts(db,auth,decoded)},origin);
    if(action==="sync-directory-chunk")return writeJson(res,200,{ok:true,...await syncDirectoryChunk(db,decoded,body.entity,body.cursor,body.limit)},origin);
     if(action==="sync-all-personal-packs")return writeJson(res,200,{ok:true,...await syncAllPersonalPacks(db,decoded)},origin);
    if(action==="sync-code-public-packs")return writeJson(res,200,{ok:true,...await syncCodePublicPacks(db,decoded)},origin);
    if(action==="catalog-plan")return writeJson(res,200,{ok:true,...plan()},origin);
    if(action==="catalog-chunk"){
      const provinceCode=clean(body.provinceCode,10);
      const data=readProvince(provinceCode);
      const offset=Math.max(0,Number(body.offset)||0);
      const limit=Math.max(1,Math.min(60,Number(body.limit)||50));
      const chunk=data.slice(offset,offset+limit);
      const result=await writeCatalogChunk(db,chunk);
      const nextOffset=offset+chunk.length;
      if(offset===0||nextOffset>=data.length){
        await audit(db,decoded,nextOffset>=data.length?"catalog.complete":"catalog.start",provinceCode,{
          offset,nextOffset,processed:chunk.length,provinceTotal:data.length
        });
      }
      return writeJson(res,200,{
        ok:true,provinceCode,provinceTotal:data.length,offset,nextOffset,
        done:nextOffset>=data.length,processed:chunk.length,writes:result.writes
      },origin);
    }
    return writeJson(res,400,{ok:false,error:"Action Admin không hợp lệ.",code:"bad_action"},origin);
  }catch(error){
    const status=Math.min(599,Math.max(400,Number(error?.status||error?.statusCode)||500));
    const code=typeof error?.code==="string"?error.code:"admin_hub_error";
    const details={
      ...(error?.label?{label:error.label}:{}),
      ...(error?.credentialEnv?{credentialEnv:error.credentialEnv}:{}),
      ...(error?.details&&typeof error.details==="object"?{details:error.details}:{})
    };

    console.error("[KatLearn admin hub]",{status,code,error:messageOf(error),details});
    return writeJson(res,status,{ok:false,error:messageOf(error,"Không thể xử lý Admin."),code,details},origin);
  }
};
