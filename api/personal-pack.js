const{requireUser,send,method}=require("./_kat-ai");
const{init,serialize}=require("./_admin");

function clean(value,max=5000){return String(value??"").trim().slice(0,max)}
function normalizeWord(value){return String(value??"").trim().toLowerCase().replace(/\s+/g," ")}
function sanitizeWords(input){
  const out=[],seen=new Set();
  for(const value of Array.isArray(input)?input:[]){
    const word=clean(value?.word,80),meaning=clean(value?.mean||value?.meaning_vi,200);
    if(!word||!meaning)continue;
    const key=normalizeWord(word);
    if(seen.has(key))continue;
    seen.add(key);
    out.push({
      word,
      pron:clean(value?.pron||value?.ipa,120),
      mean:meaning,
      type:clean(value?.type||value?.part_of_speech,60),
      example:clean(value?.example,400),
      note:clean(value?.note||value?.notes,300),
      emoji:clean(value?.emoji,16)||"📚"
    });
    if(out.length>=100)break;
  }
  return out;
}

module.exports=async(req,res)=>{
  if(!method(req,res))return;
  try{
    const user=await requireUser(req);
    const{db:profileDb}=init();
    const profileSnap=await profileDb.collection("users").doc(user.uid).get();
    if(String(profileSnap.data()?.studentAccountType||"free").toLowerCase()==="class")throw Object.assign(new Error("Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân."),{status:403,code:"personal_pack_forbidden_class"});
    const body=req.body||{};
    const name=clean(body.name,80);
    const words=sanitizeWords(body.words);
    if(!name)throw Object.assign(new Error("Hãy đặt tên cho bộ từ nhé."),{status:400,code:"pack_name_missing"});
    if(!words.length)throw Object.assign(new Error("Bộ từ cần ít nhất một từ có nghĩa."),{status:400,code:"pack_words_missing"});
    const{db}=init();
    const now=new Date();
    const ref=await db.collection("users").doc(user.uid).collection("personalPacks").add({
      name,
      words,
      kind:"personalPack",
      ownerUid:user.uid,
      ownerEmail:String(user.email||""),
      ownerDisplayName:String(user.name||user.email?.split("@")[0]||"KatLearn Student"),
      createdAt:now,
      updatedAt:now
    });
    const snap=await ref.get();
    return send(res,200,{id:ref.id,...serialize(snap.data()||{})});
  }catch(error){
    return send(res,error.status||500,{
      error:String(error.message||"Không thể lưu bộ từ."),
      code:error.code||"personal_pack_save_failed"
    });
  }
};