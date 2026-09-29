const{requireUser,rateLimit,send,method}=require("./_kat-ai");
const{init}=require("./_admin");
let db;
function firestore(){
  if(!db)db=init().db;
  return db;
}
module.exports=async(req,res)=>{
  if(!method(res,"GET"))return;
  try{
    const user=await requireUser(req);rateLimit(user.uid,"assigned",30);
    const snap=await firestore().collection("packAssignments").where("studentUids","array-contains",user.uid).get();
    const ids=[...new Set(snap.docs.map(d=>String(d.data()?.packId||"")).filter(Boolean))];
    const packs=[];
    for(const id of ids){
      const pack=await firestore().collection("publicPacks").doc(id).get();
      if(pack.exists){
        const data=pack.data()||{};
        packs.push({id:pack.id,name:String(data.name||"Bộ từ"),words:Array.isArray(data.words)?data.words:[],assigned:true});
      }
    }
    return send(res,200,{packs});
  }catch(error){
    return send(res,error.status||500,{error:"Không thể tải bài được giao: "+String(error.message||error)});
  }
};
