const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

let db, auth;
function init(){
  if(!getApps().length){
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!raw) throw Object.assign(new Error("Firebase server chưa được cấu hình"),{status:503});
    let serviceAccount;try{serviceAccount=JSON.parse(raw)}catch(_){throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ"),{status:503})}
    initializeApp({credential:cert(serviceAccount)});
  }
  auth=getAuth();db=getFirestore();return{auth,db};
}
const buckets=new Map();
async function user(event){
  const h=event.headers?.authorization||event.headers?.Authorization||"",m=/^Bearer\s+(.+)$/i.exec(h);
  if(!m)throw Object.assign(new Error("Bạn cần đăng nhập."),{status:401});
  try{return await init().auth.verifyIdToken(m[1])}catch(_){throw Object.assign(new Error("Phiên đăng nhập không hợp lệ."),{status:401})}
}
function limit(uid,key,n=60){const now=Date.now(),k=uid+":"+key,a=(buckets.get(k)||[]).filter(t=>now-t<60000);if(a.length>=n)throw Object.assign(new Error("Bạn thao tác quá nhanh, thử lại sau một chút nhé."),{status:429});a.push(now);buckets.set(k,a)}
function headers(){return{"Content-Type":"application/json","Cache-Control":"no-store"}}
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return{statusCode:405,headers:headers(),body:JSON.stringify({error:"Method Not Allowed"})};
 try{
  const token=await user(event);limit(token.uid,"game",60);
  const b=JSON.parse(event.body||"{}"),action=String(b.action||"");
  const {db}=init(),ref=db.doc("users/"+token.uid);
  if(action==="answer"){
    const word=String(b.word||"").trim().slice(0,100),meaning=String(b.meaning||"").trim().slice(0,200),correct=b.correct===true;
    if(!word||!meaning)return{statusCode:400,headers:headers(),body:JSON.stringify({error:"Thiếu dữ liệu câu trả lời."})};
    const result=await db.runTransaction(async t=>{
      const snap=await t.get(ref);if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
      const d=snap.data()||{},vocab=Array.isArray(d.vocab)?d.vocab:[];
      const knownWord=vocab.some(v=>String(v?.word||"").trim().toLowerCase()===word.toLowerCase()&&String(v?.mean||v?.meaning_vi||"").trim()===meaning);
      if(!knownWord)throw Object.assign(new Error("Câu hỏi không khớp bộ từ của bạn."),{status:400});
      const updates={questionsAnswered:FieldValue.increment(1),lastStudyAt:FieldValue.serverTimestamp()};
      if(correct){updates.coins=FieldValue.increment(10);updates.energy=FieldValue.increment(10);updates.correctAnswers=FieldValue.increment(1)}
      t.set(ref,updates,{merge:true});
      return{coinsDelta:correct?10:0,energyDelta:correct?10:0};
    });
    return{statusCode:200,headers:headers(),body:JSON.stringify({ok:true,...result})};
  }
  if(action==="purchase"){
    const itemId=String(b.itemId||"").trim().slice(0,80),price=Math.max(0,Math.min(100000,Number(b.price)||0)),name=String(b.name||"").trim().slice(0,120);
    if(!itemId||!price)return{statusCode:400,headers:headers(),body:JSON.stringify({error:"Giao dịch không hợp lệ."})};
    const result=await db.runTransaction(async t=>{
      const snap=await t.get(ref);if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
      const d=snap.data()||{},coins=Number(d.coins||0),itemsRef=db.doc("users/"+token.uid+"/items/"+itemId);
      const itemSnap=await t.get(itemsRef);if(itemSnap.exists)throw Object.assign(new Error("Vật phẩm này đã được mua."),{status:409});
      if(coins<price)throw Object.assign(new Error("Không đủ KatCoin."),{status:400});
      t.update(ref,{coins:coins-price});t.set(itemsRef,{id:itemId,name,price,boughtAt:FieldValue.serverTimestamp()});
      return{coins:coins-price};
    });
    return{statusCode:200,headers:headers(),body:JSON.stringify({ok:true,...result})};
  }
  return{statusCode:400,headers:headers(),body:JSON.stringify({error:"Action không được hỗ trợ."})};
 }catch(e){return{statusCode:e.status||500,headers:headers(),body:JSON.stringify({error:e.message||"Server error"})}}
};