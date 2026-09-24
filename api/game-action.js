const crypto=require("crypto");
const fs=require("fs");
const path=require("path");
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
const CORE_TOPICS=new Set(['daily-life','family','home','food','cooking','shopping','clothes-fashion','school-education','work-career','technology','internet-social-media','health-medicine','sports-fitness','travel-tourism','transport','weather-seasons','environment','animals-nature','feelings-personality','entertainment-culture','city-community','money-finance','communication','people-relationships','places']);
const SHOP_ITEMS={
  'theme-night':{name:'Night Study',price:120},
  'theme-sky':{name:'Sky Day',price:150},
  'theme-pink':{name:'Pink Mood',price:180},
  'theme-ocean':{name:'Ocean Calm',price:220},
  'theme-lavender':{name:'Lavender Dream',price:260}
};
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
function norm(v){return String(v??"").trim().toLowerCase()}
function findWord(words,word,meaning){
  const w=norm(word),m=norm(meaning);
  return (Array.isArray(words)?words:[]).some(item=>norm(item?.word)===w&&norm(item?.mean??item?.meaning_vi)===m);
}
function loadCoreWords(topicId){
  if(!CORE_TOPICS.has(topicId))throw Object.assign(new Error("Topic KatLearn không hợp lệ."),{status:400});
  const file=path.join(__dirname,"..","data","vocabulary",topicId+".json");
  try{const data=JSON.parse(fs.readFileSync(file,"utf8"));return Array.isArray(data.words)?data.words:[]}catch(_){throw Object.assign(new Error("Không tải được kho từ KatLearn."),{status:503})}
}
async function validateQuizSource(db,uid,source,word,meaning,profile){
  const kind=norm(source?.kind);
  if(kind==="core"){if(findWord(loadCoreWords(norm(source?.id)),word,meaning))return "core";throw Object.assign(new Error("Câu hỏi không khớp kho từ KatLearn."),{status:400})}
  if(kind==="assigned"||kind==="public"){
    const packId=String(source?.id||"").trim().slice(0,160);
    if(!packId)throw Object.assign(new Error("Thiếu bộ từ."),{status:400});
    const snap=await db.collection("publicPacks").doc(packId).get();
    if(snap.exists&&findWord(snap.data()?.words,word,meaning))return kind;
    throw Object.assign(new Error("Câu hỏi không khớp bộ từ."),{status:400});
  }
  if(findWord(profile.vocab,word,meaning))return "personal";
  throw Object.assign(new Error("Câu hỏi không khớp bộ từ của bạn."),{status:400});
}
module.exports=async(req,res)=>{
  if(req.method!=="POST")return send(res,405,{error:"Method Not Allowed"});
  try{
    const token=await user(req);limit(token.uid,"game",60);
    const body=req.body||{},action=String(body.action||""),{db}=init();
    const userRef=db.doc("users/"+token.uid),leaderboardRef=db.doc("leaderboard/"+leaderboardId(token.uid));

    if(action==="answer"){
      const word=String(body.word||"").trim().slice(0,100),meaning=String(body.meaning||"").trim().slice(0,200),correct=body.correct===true,mode=String(body.mode||"").trim().slice(0,40)||"engvi",source=body.source||{};
      if(!word||!meaning)return send(res,400,{error:"Thiếu dữ liệu câu trả lời."});
      const profileSnap=await userRef.get();
      if(!profileSnap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
      const sourceKind=await validateQuizSource(db,token.uid,source,word,meaning,profileSnap.data()||{});
      const result=await db.runTransaction(async transaction=>{
        const snap=await transaction.get(userRef);
        if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
        const profile=snap.data()||{};
        const now=Date.now();
        const attemptRef=db.collection("users").doc(token.uid).collection("attempts").doc();
        const updates={questionsAnswered:FieldValue.increment(1),lastStudyAt:FieldValue.serverTimestamp()};
        let coins=Number(profile.coins||0),xp=Number(profile.energy||0);
        if(correct){
          updates.coins=FieldValue.increment(10);updates.energy=FieldValue.increment(10);updates.correctAnswers=FieldValue.increment(1);
          coins+=10;xp+=10;
        }
        transaction.set(userRef,updates,{merge:true});
        transaction.set(attemptRef,{word,meaning,mode,correct,sourceKind,sourceId:String(source?.id||"").slice(0,160),createdAt:FieldValue.serverTimestamp(),reviewDueAt:now+30*24*60*60*1000},{merge:false});
        transaction.set(leaderboardRef,publicScore(profile.displayName,coins,xp),{merge:true});
        return{ok:true,coins,xp};
      });
      return send(res,200,result);
    }

    if(action==="purchase"){
      const itemId=String(body.itemId||"").trim().slice(0,80),item=SHOP_ITEMS[itemId];
      if(!item)return send(res,400,{error:"Vật phẩm không hợp lệ."});
      const result=await db.runTransaction(async transaction=>{
        const snap=await transaction.get(userRef);
        if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
        const profile=snap.data()||{},coins=Number(profile.coins||0),xp=Number(profile.energy||0),itemRef=db.doc("users/"+token.uid+"/items/"+itemId);
        const itemSnap=await transaction.get(itemRef);
        if(itemSnap.exists)throw Object.assign(new Error("Vật phẩm này đã được mua."),{status:409});
        if(coins<item.price)throw Object.assign(new Error("Không đủ KatCoin."),{status:400});
        transaction.update(userRef,{coins:coins-item.price,ownedThemes:FieldValue.arrayUnion(itemId)});
        transaction.set(itemRef,{id:itemId,name:item.name,price:item.price,boughtAt:FieldValue.serverTimestamp()});
        transaction.set(leaderboardRef,publicScore(profile.displayName,coins-item.price,xp),{merge:true});
        return{ok:true,coins:coins-item.price,item:{id:itemId,name:item.name,price:item.price}};
      });
      return send(res,200,result);
    }
    return send(res,400,{error:"Action không được hỗ trợ."});
  }catch(error){return send(res,error.status||500,{error:error.message||"Server error"})}
};
