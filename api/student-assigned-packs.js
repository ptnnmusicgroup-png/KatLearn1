const{requireUser,send,method}=require("./_kat-ai");
const{initializeApp,cert,getApps}=require("firebase-admin/app");
const{getFirestore}=require("firebase-admin/firestore");
let db;
function firestore(){
  if(!db){
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!raw)throw Object.assign(new Error("KatLearn server auth chưa được cấu hình"),{status:503});
    let serviceAccount;
    try{serviceAccount=JSON.parse(raw)}catch(_){throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ"),{status:503})}
    if(!getApps().length)initializeApp({credential:cert(serviceAccount)});
    db=getFirestore();
  }
  return db;
}
module.exports=async(req,res)=>{
  if(!method(res,"GET"))return;
  try{
    const user=await requireUser(req);
    const snap=await firestore().collection("packAssignments").where("studentUids","array-contains",user.uid).limit(50).get();
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
