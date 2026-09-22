const crypto=require("crypto");
const{GoogleGenAI}=require("@google/genai");
const{initializeApp,cert,getApps}=require("firebase-admin/app");
const{getAuth}=require("firebase-admin/auth");
let initialized=false,geminiClient=null;
const buckets=new Map();
function firebaseAuth(){if(!initialized){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw Object.assign(new Error("KatLearn server auth chưa được cấu hình"),{status:503});let serviceAccount;try{serviceAccount=JSON.parse(raw)}catch(_){throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ"),{status:503})}if(!getApps().length)initializeApp({credential:cert(serviceAccount)});initialized=true}return getAuth()}
function gemini(){if(!geminiClient){const key=String(process.env.GEMINI_API_KEY||"").trim();if(!key)throw Object.assign(new Error("GEMINI_API_KEY chưa được cấu hình trên server"),{status:503});geminiClient=new GoogleGenAI({apiKey:key})}return geminiClient}
async function generateGemini({contents,systemInstruction,responseSchema,maxOutputTokens}){try{const config={maxOutputTokens:maxOutputTokens||1200,...(systemInstruction?{systemInstruction}:{}),...(responseSchema?{responseMimeType:"application/json",responseSchema}:{})};return await gemini().models.generateContent({model:process.env.GEMINI_MODEL||"gemini-2.5-flash",contents,config})}catch(error){const status=Number(error?.status||error?.statusCode||0);if(status===429||String(error?.message||"").includes("429"))error.status=429;throw error}}
async function requireUser(req){const header=req.headers?.authorization||"";const match=/^Bearer\s+(.+)$/i.exec(header);if(!match)throw Object.assign(new Error("Bạn cần đăng nhập để dùng Kat AI."),{status:401});try{return await firebaseAuth().verifyIdToken(match[1])}catch(_){throw Object.assign(new Error("Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại."),{status:401})}}
function rateLimit(uid,bucket,limit,windowMs=60000){const now=Date.now(),key=uid+":"+bucket,old=buckets.get(key)||[],fresh=old.filter(t=>now-t<windowMs);if(fresh.length>=limit){const retryAfter=Math.max(1,Math.ceil((windowMs-(now-fresh[0]))/1000));throw Object.assign(new Error("Bạn dùng Kat AI hơi nhanh. Thử lại sau "+retryAfter+" giây nhé."),{status:429,retryAfter})}fresh.push(now);buckets.set(key,fresh)}
function safetyIdentifier(uid){return crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0,64)}
function jsonHeaders(extra={}){return{"Content-Type":"application/json","Cache-Control":"no-store",...extra}}
function send(res,status,body,extra={}){return res.status(status).set(jsonHeaders(extra)).json(body)}
function method(res,allowed="POST"){if(res.req.method!==allowed){send(res,405,{error:"Method Not Allowed"});return false}return true}
module.exports={requireUser,rateLimit,safetyIdentifier,generateGemini,jsonHeaders,send,method};