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

    const userSnap=await db.collection("users").doc(uid).collection("personalPacks").limit(100).get();
    for(const doc of userSnap.docs){
      const data=doc.data()||{};
      if(data.kind&&data.kind!=="personalPack")continue;
      seen.add(doc.id);
      merged.push(packData(doc.id,data,"users"));
    }

    try{
      const profileSnap=await db.collection("users").doc(uid).get();
      const accountCode=String(profileSnap.data()?.accountCode||"").trim();
      if(accountCode){
        const memorySnap=await db.collection("accounts").doc(accountCode).collection("memory").limit(100).get();
        for(const doc of memorySnap.docs){
          const data=doc.data()||{};
          if(data.kind!=="personalPack"||seen.has(doc.id))continue;
          seen.add(doc.id);
          merged.push(packData(doc.id,data,"accounts"));
        }
      }
    }catch(accountError){
      console.warn("[KatLearn] Account-memory personal packs unavailable:",accountError?.message||accountError);
    }

    merged.sort((a,b)=>{
      const ta=Number(a.createdAt?.seconds||a.createdAt||0);
      const tb=Number(b.createdAt?.seconds||b.createdAt||0);
      return tb-ta;
    });

    return send(res,200,{ok:true,uid,packs:merged.slice(0,100)});
  }catch(error){
    return send(res,error.status||500,{
      ok:false,
      error:String(error.message||"Không thể tải bộ từ của tài khoản."),
      code:error.code||"personal_packs_load_failed"
    });
  }
};