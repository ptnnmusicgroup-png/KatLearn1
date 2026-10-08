const{init}=require("./_admin");
const{FieldValue}=require("firebase-admin/firestore");
const buckets=new Map();

function send(res,status,body){
  const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
  if(typeof res?.set==="function")return res.status(status).set(headers).json(body);
  if(typeof res?.setHeader==="function")for(const[k,v]of Object.entries(headers))res.setHeader(k,v);
  if(typeof res?.status==="function"&&typeof res?.json==="function")return res.status(status).json(body);
  return new Response(JSON.stringify(body),{status,headers});
}
async function verifyUser(req){
  const match=/^Bearer\s+(.+)$/i.exec(req.headers?.authorization||"");
  if(!match)throw Object.assign(new Error("Bạn cần đăng nhập."),{status:401});
  try{return await init().auth.verifyIdToken(match[1])}
  catch(_){throw Object.assign(new Error("Phiên đăng nhập không hợp lệ."),{status:401})}
}
function limit(uid){
  const now=Date.now(),id=String(uid)+":study",items=(buckets.get(id)||[]).filter(t=>now-t<60000);
  if(items.length>=30)throw Object.assign(new Error("Bạn thao tác quá nhanh, thử lại sau một chút nhé."),{status:429});
  items.push(now);buckets.set(id,items);
}
function studyDay(date=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function previousStudyDay(day){
  const d=new Date(String(day)+"T00:00:00Z");
  d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
module.exports=async(req,res)=>{
  if(req.method!=="POST")return send(res,405,{ok:false,error:"Method Not Allowed"});
  try{
    const token=await verifyUser(req);
    limit(token.uid);
    const body=req.body||{};
    if(String(body.action||"")!=="study")return send(res,400,{ok:false,error:"Hành động học không hợp lệ."});
    const{db}=init();
    const userRef=db.doc("users/"+token.uid);
    const result=await db.runTransaction(async transaction=>{
      const snap=await transaction.get(userRef);
      if(!snap.exists){
        transaction.set(userRef,{
          displayName:String(token.name||token.email?.split("@")[0]||"KatLearn Student").slice(0,80),
          email:String(token.email||"").slice(0,200),
          photoURL:String(token.picture||"").slice(0,1000),
          provider:"firebase-auth",
          role:"student",
          coins:0,energy:0,streak:0,lastStudyDay:"",
          dailyQuestions:0,dailyCorrect:0,questionsAnswered:0,correctAnswers:0,
          ownedThemes:[],joinedClassIds:[],teacherUid:"",teacherUids:[],totalWords:0,vocab:[],
          createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
        },{merge:true});
      }
      const profile=snap.exists()?snap.data()||{}:{
        streak:0,lastStudyDay:""
      };
      const currentDay=studyDay(),lastDay=String(profile.lastStudyDay||"");
      const currentStreak=Math.max(0,Number(profile.streak||0));
      const streak=lastDay===currentDay
        ?currentStreak
        :lastDay===previousStudyDay(currentDay)?currentStreak+1:1;
      transaction.set(userRef,{streak,lastStudyDay:currentDay,lastStudyAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
      return{ok:true,uid:token.uid,streak,lastStudyDay:currentDay};
    });
    return send(res,200,result);
  }catch(error){
    const status=Number(error?.status)||500;
    return send(res,status,{ok:false,error:error?.message||"Không thể cập nhật chuỗi học."});
  }
};
