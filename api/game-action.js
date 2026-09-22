const crypto=require("crypto");
const{initializeApp,cert,getApps}=require("firebase-admin/app");
const{getAuth}=require("firebase-admin/auth");
const{getFirestore,FieldValue}=require("firebase-admin/firestore");
let db,auth;

function init(){
  if(!getApps().length){
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!raw)throw Object.assign(new Error("Firebase server chưa được cấu hình"),{status:503});
    let serviceAccount;try{serviceAccount=JSON.parse(raw)}catch(_){throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ"),{status:503})}
    initializeApp({credential:cert(serviceAccount)});
  }
  auth=getAuth();db=getFirestore();return{auth,db};
}
const buckets=new Map();
function headers(){return{"Content-Type":"application/json","Cache-Control":"no-store"}}
function send(res,status,body){return res.status(status).set(headers()).json(body)}
async function user(req){
  const match=/^Bearer\s+(.+)$/i.exec(req.headers?.authorization||"");
  if(!match)throw Object.assign(new Error("Bạn cần đăng nhập."),{status:401});
  try{return await init().auth.verifyIdToken(match[1])}catch(_){throw Object.assign(new Error("Phiên đăng nhập không hợp lệ."),{status:401})}
}
function limit(uid,key,count=60){
  const now=Date.now(),id=uid+":"+key,items=(buckets.get(id)||[]).filter(time=>now-time<60000);
  if(items.length>=count)throw Object.assign(new Error("Bạn thao tác quá nhanh, thử lại sau một chút nhé."),{status:429});
  items.push(now);buckets.set(id,items);
}
function leaderboardId(uid){return crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0,32)}
function publicScore(displayName,coins,xp){return{displayName:String(displayName||"KatLearner").trim().slice(0,80)||"KatLearner",coins:Math.max(0,Number(coins)||0),xp:Math.max(0,Number(xp)||0),updatedAt:FieldValue.serverTimestamp()}}

module.exports=async(req,res)=>{
  if(req.method!=="POST")return send(res,405,{error:"Method Not Allowed"});
  try{
    const token=await user(req);limit(token.uid,"game",60);
    const body=req.body||{},action=String(body.action||""),{db}=init();
    const userRef=db.doc("users/"+token.uid),leaderboardRef=db.doc("leaderboard/"+leaderboardId(token.uid));

    if(action==="answer"){
      const word=String(body.word||"").trim().slice(0,100),meaning=String(body.meaning||"").trim().slice(0,200),correct=body.correct===true;
      if(!word||!meaning)return send(res,400,{error:"Thiếu dữ liệu câu trả lời."});
      const result=await db.runTransaction(async transaction=>{
        const snap=await transaction.get(userRef);
        if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
        const profile=snap.data()||{},vocab=Array.isArray(profile.vocab)?profile.vocab:[];
        const knownWord=vocab.some(item=>String(item?.word||"").trim().toLowerCase()===word.toLowerCase()&&String(item?.mean||item?.meaning_vi||"").trim()===meaning);
        if(!knownWord)throw Object.assign(new Error("Câu hỏi không khớp bộ từ của bạn."),{status:400});
        const coins=Number(profile.coins||0)+(correct?10:0),xp=Number(profile.energy||0)+(correct?10:0);
        const updates={questionsAnswered:FieldValue.increment(1),lastStudyAt:FieldValue.serverTimestamp()};
        if(correct){updates.coins=FieldValue.increment(10);updates.energy=FieldValue.increment(10);updates.correctAnswers=FieldValue.increment(1)}
        transaction.set(userRef,updates,{merge:true});
        transaction.set(leaderboardRef,publicScore(profile.displayName,coins,xp),{merge:true});
        return{coinsDelta:correct?10:0,xpDelta:correct?10:0};
      });
      return send(res,200,{ok:true,...result});
    }

    if(action==="purchase"){
      const itemId=String(body.itemId||"").trim().slice(0,80),price=Math.max(0,Math.min(100000,Number(body.price)||0)),name=String(body.name||"").trim().slice(0,120);
      if(!itemId||!price)return send(res,400,{error:"Giao dịch không hợp lệ."});
      const result=await db.runTransaction(async transaction=>{
        const snap=await transaction.get(userRef);
        if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
        const profile=snap.data()||{},coins=Number(profile.coins||0),xp=Number(profile.energy||0),itemRef=db.doc("users/"+token.uid+"/items/"+itemId);
        const itemSnap=await transaction.get(itemRef);
        if(itemSnap.exists)throw Object.assign(new Error("Vật phẩm này đã được mua."),{status:409});
        if(coins<price)throw Object.assign(new Error("Không đủ KatCoin."),{status:400});
        transaction.update(userRef,{coins:coins-price,ownedThemes:FieldValue.arrayUnion(itemId)});
        transaction.set(itemRef,{id:itemId,name,price,boughtAt:FieldValue.serverTimestamp()});
        transaction.set(leaderboardRef,publicScore(profile.displayName,coins-price,xp),{merge:true});
        return{coins:coins-price};
      });
      return send(res,200,{ok:true,...result});
    }
    return send(res,400,{error:"Action không được hỗ trợ."});
  }catch(error){return send(res,error.status||500,{error:error.message||"Server error"})}
};