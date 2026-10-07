const crypto=require("crypto");
const fs=require("fs");
const path=require("path");
const{init}=require("./_admin");
const{FieldValue}=require("firebase-admin/firestore");
const buckets=new Map();
const CORE_PACK_PATHS={
  'daily-life':'TOPICs_KatLearn/Everyday Topics/daily-life.json',
  'family':'TOPICs_KatLearn/Everyday Topics/family.json',
  'home':'TOPICs_KatLearn/Everyday Topics/home.json',
  'food':'TOPICs_KatLearn/Everyday Topics/food.json',
  'cooking':'TOPICs_KatLearn/Everyday Topics/cooking.json',
  'shopping':'TOPICs_KatLearn/Everyday Topics/shopping.json',
  'clothes-fashion':'TOPICs_KatLearn/Everyday Topics/clothes-fashion.json',
  'school-education':'TOPICs_KatLearn/Everyday Topics/school-education.json',
  'work-career':'TOPICs_KatLearn/Everyday Topics/work-career.json',
  'technology':'TOPICs_KatLearn/Everyday Topics/technology.json',
  'internet-social-media':'TOPICs_KatLearn/Everyday Topics/internet-social-media.json',
  'health-medicine':'TOPICs_KatLearn/Everyday Topics/health-medicine.json',
  'sports-fitness':'TOPICs_KatLearn/Everyday Topics/sports-fitness.json',
  'travel-tourism':'TOPICs_KatLearn/Everyday Topics/travel-tourism.json',
  'transport':'TOPICs_KatLearn/Everyday Topics/transport.json',
  'weather-seasons':'TOPICs_KatLearn/Everyday Topics/weather-seasons.json',
  'environment':'TOPICs_KatLearn/Everyday Topics/environment.json',
  'animals-nature':'TOPICs_KatLearn/Everyday Topics/animals-nature.json',
  'feelings-personality':'TOPICs_KatLearn/Everyday Topics/feelings-personality.json',
  'entertainment-culture':'TOPICs_KatLearn/Everyday Topics/entertainment-culture.json',
  'city-community':'TOPICs_KatLearn/Everyday Topics/city-community.json',
  'money-finance':'TOPICs_KatLearn/Everyday Topics/money-finance.json',
  'communication':'TOPICs_KatLearn/Everyday Topics/communication.json',
  'people-relationships':'TOPICs_KatLearn/Everyday Topics/people-relationships.json',
  'places':'TOPICs_KatLearn/Everyday Topics/places.json',
  'ielts-writing-task-1':'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Writing_Task_1.json',
  'ielts-writing-task-2':'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Writing_Task_2.json',
  'ielts-reading':'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Reading.json',
  'ielts-speaking':'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Speaking.json',
  'katlearn-synthesis':'TOPICs_KatLearn/KatLearn_Synthesis_Core.json',
  'katlearn-cefr-builder':'TOPICs_KatLearn/KatLearn_CEFR_Builder.json',
  'katlearn-academic-writing':'TOPICs_KatLearn/KatLearn_Academic_Writing.json',
  'katlearn-collocations-phrasal':'TOPICs_KatLearn/KatLearn_Collocations_Phrasal.json',
  'katlearn-exam-workplace-specialized':'TOPICs_KatLearn/KatLearn_Exam_Workplace_Specialized.json',
  'katlearn-school-english':'TOPICs_KatLearn/KatLearn_School_English.json',
  'katlearn-irregular-verbs':'TOPICs_KatLearn/KatLearn_Irregular_Verbs.json'
};
const SHOP_ITEMS={
  'theme-night':{name:'Night Study',price:120},
  'theme-sky':{name:'Sky Day',price:150},
  'theme-pink':{name:'Pink Mood',price:180},
  'theme-ocean':{name:'Ocean Calm',price:220},
  'theme-lavender':{name:'Lavender Dream',price:260},
  'theme-sen-viet':{name:'Sen Việt',price:320},
  'shop-cat-nap':{name:'Cat Nap',price:3000,image:'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=82'},
  'shop-tabby-cozy':{name:'Cozy Tabby',price:3000,image:'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=82'},
  'shop-sleepy-cat':{name:'Sleepy Kitty',price:3000,image:'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=82'},
  'shop-window-cat':{name:'Window Chill',price:3000,image:'https://images.unsplash.com/photo-1489084917528-a57e68a79a1e?auto=format&fit=crop&w=900&q=82'},
  'shop-soft-cat':{name:'Soft Paws',price:3000,image:'https://images.unsplash.com/photo-1548546738-8509cb246ed3?auto=format&fit=crop&w=900&q=82'},
  'shop-pastel-cat':{name:'Pastel Kitty',price:3000,image:'https://images.unsplash.com/photo-1595752776689-aebef37b5d32?auto=format&fit=crop&w=900&q=82'}
};
function headers(){return{"Content-Type":"application/json","Cache-Control":"no-store"}}
function send(res,status,body){
  const h=headers();
  if(typeof res?.set==="function")return res.status(status).set(h).json(body);
  if(typeof res?.setHeader==="function")for(const[key,value]of Object.entries(h))res.setHeader(key,value);
  if(typeof res?.status==="function"&&typeof res?.json==="function")return res.status(status).json(body);
  return new Response(JSON.stringify(body),{status,headers:h});
}
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
function studyDay(date=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function previousStudyDay(day){
  const d=new Date(day+"T00:00:00Z");
  d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
function findWord(words,word,meaning){
  const w=norm(word),m=norm(meaning);
  return (Array.isArray(words)?words:[]).some(item=>norm(item?.word)===w&&norm(item?.mean??item?.meaning_vi)===m);
}
function rewardClaimId(sourceKind,sourceId,word,meaning,mode,day){return crypto.createHash("sha256").update([sourceKind,sourceId,word,meaning,mode,day].map(norm).join("\0")).digest("hex").slice(0,64)}
function loadCoreWords(topicId){
  const relative=CORE_PACK_PATHS[String(topicId||'').trim()];
  if(!relative)throw Object.assign(new Error("Topic KatLearn không hợp lệ."),{status:400});
  const file=path.join(__dirname,"..","data","vocabulary",relative);
  try{
    const data=JSON.parse(fs.readFileSync(file,"utf8"));
    return Array.isArray(data.words)?data.words:[];
  }catch(_){
    throw Object.assign(new Error("Không tải được kho từ KatLearn."),{status:503});
  }
}
async function validateQuizSource(db,uid,source,word,meaning,profile){
  const kind=norm(source?.kind);
  if(kind==="core"){if(findWord(loadCoreWords(norm(source?.id)),word,meaning))return "core";throw Object.assign(new Error("Câu hỏi không khớp kho từ KatLearn."),{status:400})}
  if(kind==="assigned"||kind==="public"){
    const packId=String(source?.id||"").trim().slice(0,160);
    if(!packId)throw Object.assign(new Error("Thiếu bộ từ."),{status:400});
    if(kind==="assigned"){
      const assignments=await db.collection("packAssignments").where("studentUids","array-contains",uid).get();
      const assigned=assignments.docs.some(d=>String(d.data()?.packId||"")===packId);
      if(!assigned)throw Object.assign(new Error("Bộ từ này chưa được giao cho bạn."),{status:403});
    }
    const snap=await db.collection("publicPacks").doc(packId).get();
    if(snap.exists&&findWord(snap.data()?.words,word,meaning))return kind;
    throw Object.assign(new Error("Câu hỏi không khớp bộ từ."),{status:400});
  }
  if(kind==="personal"){
    const packId=String(source?.id||"").trim().slice(0,160);
    if(packId){
      const legacySnap=await db.collection("users").doc(uid).collection("personalPacks").doc(packId).get();
      if(legacySnap.exists&&findWord(legacySnap.data()?.words,word,meaning))return "personal";
      const accountCode=String(profile?.accountCode||"").trim();
      if(accountCode){
        const memorySnap=await db.collection("accounts").doc(accountCode).collection("memory").doc(packId).get();
        const memoryData=memorySnap.exists?memorySnap.data()||{}:{};
        if(memorySnap.exists&&(!memoryData.ownerUid||String(memoryData.ownerUid)===uid)&&findWord(memoryData.words,word,meaning))return "personal";
      }
    }
    if(findWord(profile.vocab,word,meaning))return "personal";
    throw Object.assign(new Error("Câu hỏi không khớp bộ từ cá nhân."),{status:400});
  }
  if(findWord(profile.vocab,word,meaning))return "legacy";

  throw Object.assign(new Error("Câu hỏi không khớp bộ từ của bạn."),{status:400});
}
module.exports=async(req,res)=>{
  if(req.method!=="POST")return send(res,405,{error:"Method Not Allowed"});
  try{
    const token=await user(req);limit(token.uid,"game",60);
    const body=req.body||{},action=String(body.action||""),{db}=init();
    const userRef=db.doc("users/"+token.uid),leaderboardRef=db.doc("leaderboard/"+leaderboardId(token.uid));

    if(action==="answer"){
      const word=String(body.word||"").trim().slice(0,100),meaning=String(body.meaning||"").trim().slice(0,200),submittedAnswer=String(body.answer||"").trim().slice(0,200),mode=String(body.mode||"").trim().slice(0,40)||"engvi",source=body.source||{};
      if(!word||!meaning||!submittedAnswer)return send(res,400,{error:"Thiếu dữ liệu câu trả lời."});
      if(!["engvi","vieng","context"].includes(mode))return send(res,400,{error:"Chế độ luyện tập không hợp lệ."});
      let profileSnap=await userRef.get();
      // Firebase Auth is authoritative. A newly created student can reach the
      // game before background profile hydration finishes, so provision the
      // minimal user document here instead of rejecting a valid signed-in user.
      if(!profileSnap.exists){
        await userRef.set({
          displayName:String(token.name||token.email?.split('@')[0]||"KatLearn Student").slice(0,80),
          email:String(token.email||"").slice(0,200),
          photoURL:String(token.picture||"").slice(0,1000),
          provider:"firebase-auth",
          role:"student",
          coins:0,energy:0,streak:0,lastStudyDay:"",
          dailyQuestions:0,dailyCorrect:0,questionsAnswered:0,correctAnswers:0,
          ownedThemes:[],joinedClassIds:[],teacherUid:"",teacherUids:[],totalWords:0,vocab:[],
          createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()
        },{merge:true});
        profileSnap=await userRef.get();
      }
      const sourceKind=await validateQuizSource(db,token.uid,source,word,meaning,profileSnap.data()||{});
      const rewardable=sourceKind!=="legacy";
      const expectedAnswer=mode==="vieng"?word:meaning;
      const correct=norm(submittedAnswer)===norm(expectedAnswer);
      const currentStudyDay=studyDay();
      const rewardRef=rewardable?userRef.collection("rewardClaims").doc(rewardClaimId(sourceKind,String(source?.id||""),word,meaning,mode,currentStudyDay)):null;
      const result=await db.runTransaction(async transaction=>{
        const snap=await transaction.get(userRef);
        const rewardSnap=rewardRef?await transaction.get(rewardRef):null;
        if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
        const profile=snap.data()||{};
        const now=Date.now();
        const attemptRef=db.collection("users").doc(token.uid).collection("attempts").doc();
        const sameStudyDay=String(profile.lastStudyDay||"")===currentStudyDay;
        const currentStreak=Math.max(0,Number(profile.streak||0));
        const streak=sameStudyDay?currentStreak:(String(profile.lastStudyDay||"")===previousStudyDay(currentStudyDay)?currentStreak+1:1);
        const dailyQuestions=sameStudyDay?Math.max(0,Number(profile.dailyQuestions||0))+1:1;
        const dailyCorrect=sameStudyDay?Math.max(0,Number(profile.dailyCorrect||0))+(correct?1:0):(correct?1:0);
        const updates={
          questionsAnswered:FieldValue.increment(1),
          lastStudyAt:FieldValue.serverTimestamp(),
          streak,
          lastStudyDay:currentStudyDay,
          dailyQuestions,
          dailyCorrect
        };
        let coins=Number(profile.coins||0),xp=Number(profile.energy||0);
        const grantReward=correct&&rewardable&&!rewardSnap?.exists;
        if(correct){
          updates.correctAnswers=FieldValue.increment(1);
          if(grantReward){
            updates.coins=FieldValue.increment(10);updates.energy=FieldValue.increment(10);
            coins+=10;xp+=10;
            transaction.create(rewardRef,{sourceKind,sourceId:String(source?.id||"").slice(0,160),word,meaning,mode,studyDay:currentStudyDay,createdAt:FieldValue.serverTimestamp()});
          }
        }
        transaction.set(userRef,updates,{merge:true});
        transaction.set(attemptRef,{word,meaning,mode,correct,sourceKind,rewarded:grantReward,sourceId:String(source?.id||"").slice(0,160),createdAt:FieldValue.serverTimestamp(),reviewDueAt:now+30*24*60*60*1000},{merge:false});
        transaction.set(leaderboardRef,publicScore(profile.displayName,coins,xp),{merge:true});
        return{ok:true,correct,rewarded:grantReward,coins,xp,dailyQuestions,dailyCorrect,streak};
      });
      return send(res,200,result);
    }

    if(action==="apply-theme"){
      const itemId=String(body.itemId||"").trim().slice(0,80),item=SHOP_ITEMS[itemId];
      if(!item||!itemId.startsWith("theme-"))return send(res,400,{error:"Theme không hợp lệ."});
      const result=await db.runTransaction(async transaction=>{
        const snap=await transaction.get(userRef);
        if(!snap.exists)throw Object.assign(new Error("Chưa có hồ sơ người dùng."),{status:404});
        const profile=snap.data()||{};
        const owned=Array.isArray(profile.ownedThemes)&&profile.ownedThemes.includes(itemId);
        const itemRef=db.doc("users/"+token.uid+"/items/"+itemId);
        const itemSnap=await transaction.get(itemRef);
        if(!owned&&!itemSnap.exists)throw Object.assign(new Error("Bạn chưa mua theme này."),{status:403});
        transaction.update(userRef,{themeId:itemId,updatedAt:FieldValue.serverTimestamp()});
        return{ok:true,themeId:itemId,coins:Math.max(0,Number(profile.coins||0)),item:{id:itemId,name:item.name,price:item.price}};
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
        const profileUpdate={coins:coins-item.price};
        if(itemId.startsWith('theme-')){profileUpdate.ownedThemes=FieldValue.arrayUnion(itemId);profileUpdate.themeId=itemId;}
        transaction.update(userRef,profileUpdate);
        transaction.set(itemRef,{id:itemId,name:item.name,price:item.price,...(item.image?{image:item.image}:{}),boughtAt:FieldValue.serverTimestamp()});
        transaction.set(leaderboardRef,publicScore(profile.displayName,coins-item.price,xp),{merge:true});
        return{ok:true,coins:coins-item.price,themeId:itemId.startsWith('theme-')?itemId:'',item:{id:itemId,name:item.name,price:item.price}};
      });
      return send(res,200,result);
    }
    return send(res,400,{error:"Action không được hỗ trợ."});
  }catch(error){return send(res,error.status||500,{error:error.message||"Server error"})}
};
