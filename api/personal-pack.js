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
    const profileRef=profileDb.collection("users").doc(user.uid);
    const profileSnap=await profileRef.get();
    const profile=profileSnap.data()||{};
    if(String(profile.studentAccountType||"free").toLowerCase()==="class")throw Object.assign(new Error("Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân."),{status:403,code:"personal_pack_forbidden_class"});

    async function ensureAccountCode(){
      const existing=String(profile.accountCode||"").trim();
      if(existing){
        const accountSnap=await profileDb.collection("accounts").doc(existing).get();
        const account=accountSnap.exists?accountSnap.data()||{}:{};
        if(!accountSnap.exists||String(account.uid||"")!==String(user.uid)||String(account.accountCode||"")!==existing){
          throw Object.assign(new Error("Mã namespace của tài khoản không khớp hồ sơ. Hãy liên hệ Admin để đồng bộ lại an toàn."),{status:409,code:"account_namespace_mismatch"});
        }
        return existing;
      }
      const stripVietnamese=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      const part=(value,fallback)=>stripVietnamese(value).trim().replace(/[^a-zA-Z0-9.@_-]+/g,"")||fallback;
      const displayPart=(value,fallback)=>stripVietnamese(value).trim().replace(/[^a-zA-Z0-9]+/g,"")||fallback;
      const login=part(String(user.email||"").split("@")[0],"katlearn");
      const display=displayPart(user.displayName||String(user.email||"").split("@")[0]||"student","Student");
      const sequenceRef=profileDb.collection("system").doc("accountSequence");
      const accountsRef=profileDb.collection("accounts");
      const code=await profileDb.runTransaction(async tx=>{
        const currentProfile=await tx.get(profileRef);
        const currentCode=String(currentProfile.data()?.accountCode||"").trim();
        if(currentCode){
          const currentAccountSnap=await tx.get(accountsRef.doc(currentCode));
          const currentAccount=currentAccountSnap.exists?currentAccountSnap.data()||{}:{};
          if(!currentAccountSnap.exists||String(currentAccount.uid||"")!==String(user.uid)||String(currentAccount.accountCode||"")!==currentCode){
            throw Object.assign(new Error("Mã namespace của tài khoản không khớp hồ sơ. Hãy liên hệ Admin để đồng bộ lại an toàn."),{status:409,code:"account_namespace_mismatch"});
          }
          return currentCode;
        }

        // Recover an older namespace by UID before allocating a new one.
        const legacyQuery=accountsRef.where("uid","==",String(user.uid)).limit(2);
        const legacySnap=await tx.get(legacyQuery);
        if(legacySnap.docs.length>1)throw Object.assign(new Error("Tài khoản đang có nhiều namespace cũ. Hãy liên hệ Admin để đồng bộ dữ liệu an toàn."),{status:409,code:"account_namespace_ambiguous"});
        if(!legacySnap.empty){
          const legacyDoc=legacySnap.docs[0];
          const legacy=legacyDoc.data()||{};
          const legacyCode=String(legacy.accountCode||legacyDoc.id||"").trim();
          if(legacyCode!==legacyDoc.id||String(legacy.uid||"")!==String(user.uid)){
            throw Object.assign(new Error("Namespace cũ của tài khoản không hợp lệ. Hãy liên hệ Admin để kiểm tra."),{status:409,code:"account_namespace_mismatch"});
          }
          const now=new Date();
          const metaRef=legacyDoc.ref.collection("memory").doc("meta");
          const metaSnap=await tx.get(metaRef);
          tx.set(profileRef,{accountCode:legacyCode,updatedAt:now},{merge:true});
          if(!metaSnap.exists)tx.set(metaRef,{accountCode:legacyCode,uid:user.uid,createdAt:now,updatedAt:now},{merge:true});
          return legacyCode;
        }

        const seqSnap=await tx.get(sequenceRef);
        let next=Number(seqSnap.exists?seqSnap.data()?.lastIssued:0)+1;
        let nextCode="",nextAccountRef=null;
        for(let attempts=0;attempts<1000;attempts++,next++){
          const candidate=login+"_"+display+"_"+String(next).padStart(3,"0");
          const candidateRef=accountsRef.doc(candidate);
          const candidateSnap=await tx.get(candidateRef);
          if(!candidateSnap.exists){nextCode=candidate;nextAccountRef=candidateRef;break;}
        }
        if(!nextAccountRef)throw Object.assign(new Error("Không thể cấp mã namespace mới. Hãy thử lại sau."),{status:503,code:"account_namespace_exhausted"});

        const now=new Date();
        tx.set(sequenceRef,{lastIssued:next,updatedAt:now},{merge:true});
        tx.create(nextAccountRef,{
          accountCode:nextCode,uid:user.uid,email:user.email||"",displayName:user.displayName||"",
          loginName:login,createdAt:now,updatedAt:now
        });
        tx.set(nextAccountRef.collection("memory").doc("meta"),{
          accountCode:nextCode,uid:user.uid,createdAt:now,updatedAt:now
        },{merge:true});
        tx.set(profileRef,{accountCode:nextCode,updatedAt:now},{merge:true});
        return nextCode;
      });
      return code;
    }

    const accountCode=await ensureAccountCode();
    const body=req.body||{};
    const name=clean(body.name,80);
    const words=sanitizeWords(body.words);
    if(!name)throw Object.assign(new Error("Hãy đặt tên cho bộ từ nhé."),{status:400,code:"pack_name_missing"});
    if(!words.length)throw Object.assign(new Error("Bộ từ cần ít nhất một từ có nghĩa."),{status:400,code:"pack_words_missing"});
    const{db}=init();
    const now=new Date();
    const ref=db.collection("accounts").doc(accountCode).collection("memory").doc();
    const payload={
      name,
      words,
      kind:"personalPack",
      ownerUid:user.uid,
      ownerAccountCode:accountCode,
      ownerEmail:String(user.email||""),
      ownerDisplayName:String(user.name||user.displayName||user.email?.split("@")[0]||"KatLearn Student"),
      createdAt:now,
      updatedAt:now
    };
    // Keep the user's own Firestore namespace in sync with the account namespace.
    // The same pack id is intentionally used in both locations.
    const userRef=db.collection("users").doc(user.uid).collection("personalPacks").doc(ref.id);
    const batch=db.batch();
    batch.set(ref,payload);
    batch.set(userRef,payload);
    await batch.commit();
    return send(res,200,{id:ref.id,accountCode,source:"users",...serialize(payload)});
  }catch(error){
    return send(res,error.status||500,{
      error:String(error.message||"Không thể lưu bộ từ."),
      code:error.code||"personal_pack_save_failed"
    });
  }
};