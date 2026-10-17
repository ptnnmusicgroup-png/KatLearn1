const{init}=require("./_admin");
const{FieldValue}=require("firebase-admin/firestore");
const buckets=new Map();
const VALID_GOALS=new Set([7,10,20,30,50]);

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
function missedStudyDays(lastDay,currentDay){
  const last=Date.parse(String(lastDay||"")+"T00:00:00Z"),current=Date.parse(String(currentDay||"")+"T00:00:00Z");
  if(!Number.isFinite(last)||!Number.isFinite(current)||current<=last)return 0;
  return Math.max(0,Math.round((current-last)/86400000)-1);
}
function nextStreak(profile,currentDay){
  const lastDay=String(profile.lastStudyDay||""),currentStreak=Math.max(0,Number(profile.streak||0));
  const freezeStreak=Math.max(0,Math.floor(Number(profile.freezeStreak||0)));
  if(lastDay===currentDay)return{streak:currentStreak,freezeStreak,freezeUsed:0,revived:false};
  if(lastDay===previousStudyDay(currentDay))return{streak:currentStreak+1,freezeStreak,freezeUsed:0,revived:false};
  const missed=missedStudyDays(lastDay,currentDay);
  if(lastDay&&missed>0&&freezeStreak>=missed)return{streak:currentStreak+missed+1,freezeStreak:freezeStreak-missed,freezeUsed:missed,revived:true};
  return{streak:1,freezeStreak,freezeUsed:0,revived:false};
}
function profileDefaults(token){
  return{
    displayName:String(token.name||token.email?.split("@")[0]||"KatLearn Student").slice(0,80),
    email:String(token.email||"").slice(0,200),
    photoURL:String(token.picture||"").slice(0,1000),
    provider:"firebase-auth",role:"student",coins:0,energy:0,streak:0,lastStudyDay:"",freezeStreak:0,
    dailyQuestions:0,dailyCorrect:0,questionsAnswered:0,correctAnswers:0,
    ownedThemes:[],joinedClassIds:[],teacherUid:"",teacherUids:[],totalWords:0,vocab:[],
    createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
  };
}
function goalState(challenge={}){
  const target=VALID_GOALS.has(Number(challenge.target))?Number(challenge.target):0;
  const progress=target?Math.max(0,Math.min(target,Math.floor(Number(challenge.progress)||0))):0;
  const completed=Boolean(challenge.completedAt);
  return{target,progress,completed,remaining:target?Math.max(0,target-progress):0,rewarded:Boolean(challenge.rewardedAt)};
}
module.exports=async(req,res)=>{
  if(req.method!=="POST")return send(res,405,{ok:false,error:"Method Not Allowed"});
  try{
    const token=await verifyUser(req);
    limit(token.uid);
    const body=req.body||{},action=String(body.action||"");
    const{db}=init();
    const userRef=db.doc("users/"+token.uid);
    // This collection is intentionally server-only (default-deny Firestore rules).
    // Client-editable user profile fields are never trusted for streak rewards.
    const challengeRef=db.doc("streakChallenges/"+token.uid);

    if(action==="get-goal"){
      const [challengeSnap,profileSnap]=await Promise.all([challengeRef.get(),userRef.get()]);
      const profile=profileSnap.exists?profileSnap.data()||{}:{};
      return send(res,200,{
        ok:true,uid:token.uid,goal:goalState(challengeSnap.exists?challengeSnap.data()||{}:{}),
        streak:Math.max(0,Math.floor(Number(profile.streak)||0)),
        coins:Math.max(0,Math.floor(Number(profile.coins||0))),
        freezeStreak:Math.max(0,Math.floor(Number(profile.freezeStreak||0)))
      });
    }

    if(action==="set-goal"){
      const target=Number(body.goal);
      if(!VALID_GOALS.has(target))return send(res,400,{ok:false,error:"Hãy chọn mục tiêu 7, 10, 20, 30 hoặc 50 ngày."});
      const result=await db.runTransaction(async transaction=>{
        const [challengeSnap,profileSnap]=await Promise.all([transaction.get(challengeRef),transaction.get(userRef)]);
        const challenge=challengeSnap.exists?challengeSnap.data()||{}:{};
        const profile=profileSnap.exists?profileSnap.data()||{}:{};
        const activeTarget=VALID_GOALS.has(Number(challenge.target))?Number(challenge.target):0;
        const started=Number(challenge.progress||0)>0||Boolean(challenge.lastStudyDay);
        const completed=Boolean(challenge.completedAt);
        if(activeTarget&&!completed&&started){
          throw Object.assign(new Error("Bạn đang chinh phục mục tiêu hiện tại. Hãy hoàn thành trước khi chọn mục tiêu mới nhé!"),{status:409});
        }
        const currentDay=studyDay();
        const next={
          uid:token.uid,target,progress:0,startDay:currentDay,lastStudyDay:"",
          completedAt:"",rewardedAt:"",
          createdAt:challenge.createdAt||FieldValue.serverTimestamp(),
          updatedAt:FieldValue.serverTimestamp()
        };
        transaction.set(challengeRef,next,{merge:false});
        return{ok:true,uid:token.uid,goal:goalState(next),coins:Math.max(0,Math.floor(Number(profile.coins||0)))};
      });
      return send(res,200,result);
    }

    if(action!=="study")return send(res,400,{ok:false,error:"Hành động học không hợp lệ."});
    const result=await db.runTransaction(async transaction=>{
      const [snap,challengeSnap]=await Promise.all([transaction.get(userRef),transaction.get(challengeRef)]);
      const profile=snap.exists?snap.data()||{}:profileDefaults(token);
      const challenge=challengeSnap.exists?challengeSnap.data()||{}:{};
      const currentDay=studyDay(),lastDay=String(profile.lastStudyDay||"");
      const streakState=nextStreak(profile,currentDay);
      const streak=streakState.streak;
      transaction.set(userRef,{
        ...(snap.exists?{}:profileDefaults(token)),
        streak,lastStudyDay:currentDay,lastStudyAt:FieldValue.serverTimestamp(),
        ...(streakState.freezeUsed?{freezeStreak:streakState.freezeStreak}:{}),
        ...(lastDay!==currentDay?{dailyQuestions:0,dailyCorrect:0}:{}),
        updatedAt:FieldValue.serverTimestamp()
      },{merge:true});
      return{
        ok:true,uid:token.uid,streak,lastStudyDay:currentDay,
        goal:goalState(challenge),
        coins:Math.max(0,Math.floor(Number(profile.coins||0))),
        freezeStreak:streakState.freezeStreak,freezeUsed:streakState.freezeUsed,streakRevived:streakState.revived
      };
    });
    return send(res,200,result);
  }catch(error){
    const status=Number(error?.status)||500;
    return send(res,status,{ok:false,error:error?.message||"Không thể cập nhật chuỗi học."});
  }
};
