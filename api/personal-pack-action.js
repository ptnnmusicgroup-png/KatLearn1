const{requireUser,send,method}=require("./_kat-ai");
const{init,serialize}=require("./_admin");

function clean(value,max=500){return String(value??"").trim().slice(0,max)}
function sanitizeWords(input){
  const out=[],seen=new Set();
  for(const value of Array.isArray(input)?input:[]){
    const word=clean(value?.word,80);
    const mean=clean(value?.mean||value?.meaning_vi,200);
    if(!word||!mean)continue;
    const key=word.toLowerCase().replace(/\s+/g," ");
    if(seen.has(key))continue;
    seen.add(key);
    out.push({
      word,
      pron:clean(value?.pron||value?.ipa,120),
      mean,
      type:clean(value?.type||value?.part_of_speech,60),
      example:clean(value?.example,400),
      note:clean(value?.note||value?.notes,300),
      emoji:clean(value?.emoji,16)||"📚"
    });
    if(out.length>=100)break;
  }
  return out;
}

async function findPack(db,uid,packId){
  const profileSnap=await db.collection("users").doc(uid).get();
  const accountCode=String(profileSnap.data()?.accountCode||"").trim();

  if(accountCode){
    const accountRef=db.collection("accounts").doc(accountCode).collection("memory").doc(packId);
    const accountSnap=await accountRef.get();
    if(accountSnap.exists&&accountSnap.data()?.kind==="personalPack"
      &&String(accountSnap.data()?.ownerUid||uid)===uid
      &&(!accountSnap.data()?.ownerAccountCode||String(accountSnap.data()?.ownerAccountCode)===accountCode)){
      return {ref:accountRef,snap:accountSnap,source:"accounts",accountCode};
    }
  }

  // Backward-compatible reader for legacy packs created in users/{uid}/personalPacks.
  const userRef=db.collection("users").doc(uid).collection("personalPacks").doc(packId);
  const userSnap=await userRef.get();
  if(userSnap.exists&&(!userSnap.data()?.ownerUid||String(userSnap.data()?.ownerUid)===uid)){
    return {ref:userRef,snap:userSnap,source:"users",accountCode};
  }
  return null;
}

module.exports=async(req,res)=>{
  if(!method(req,res,"POST"))return;
  try{
    const user=await requireUser(req);
    const{db:guardDb}=init();
    const guardProfile=await guardDb.collection("users").doc(user.uid).get();
    if(String(guardProfile.data()?.studentAccountType||"free").toLowerCase()==="class")throw Object.assign(new Error("Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân."),{status:403,code:"personal_pack_forbidden_class"});
    const body=req.body||{};
    const action=String(body.action||"").trim().toLowerCase();
    const packId=clean(body.id,180);
    if(!packId)throw Object.assign(new Error("Không tìm thấy bộ từ cần cập nhật."),{status:400,code:"pack_id_missing"});
    const{db}=init();
    const found=await findPack(db,String(user.uid),packId);
    if(!found)throw Object.assign(new Error("Bộ từ không còn tồn tại hoặc không thuộc tài khoản này."),{status:404,code:"personal_pack_not_found"});

    if(action==="delete"){
      await found.ref.delete();
      return send(res,200,{ok:true,id:packId,action:"delete"});
    }

    if(action!=="update")throw Object.assign(new Error("Thao tác bộ từ không hợp lệ."),{status:400,code:"personal_pack_action_invalid"});

    const update={updatedAt:new Date()};
    if(Object.prototype.hasOwnProperty.call(body,"name")){
      const name=clean(body.name,80);
      if(!name)throw Object.assign(new Error("Tên bộ từ không được để trống."),{status:400,code:"pack_name_missing"});
      update.name=name;
    }
    if(Object.prototype.hasOwnProperty.call(body,"words")){
      const words=sanitizeWords(body.words);
      if(!words.length)throw Object.assign(new Error("Bộ từ cần ít nhất một từ có nghĩa."),{status:400,code:"pack_words_missing"});
      update.words=words;
    }
    if(Object.keys(update).length===1)throw Object.assign(new Error("Không có dữ liệu nào để cập nhật."),{status:400,code:"pack_update_empty"});
    await found.ref.update(update);
    const snap=await found.ref.get();
    return send(res,200,{ok:true,id:packId,action:"update",source:found.source,accountCode:found.accountCode||String(snap.data()?.ownerAccountCode||""),...serialize(snap.data()||{})});
  }catch(error){
    return send(res,error.status||500,{
      ok:false,
      error:String(error.message||"Không thể cập nhật bộ từ."),
      code:error.code||"personal_pack_action_failed"
    });
  }
};