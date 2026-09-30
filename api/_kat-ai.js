const{GoogleGenAI}=require("@google/genai");
const{init}=require("./_admin");
let geminiClient=null;
let geminiClientKey="";
let workingModel="";
let workingModelKey="";
let workingModelConfig="";
const buckets=new Map();
const DEFAULT_GEMINI_MODEL="gemini-3.5-flash-lite";
const GEMINI_MODEL_FALLBACKS=["gemini-3.5-flash-lite","gemini-3.8-flash","gemini-2.5-flash-lite","gemini-2.5-flash"];
function firebaseAuth(){return init().auth}
function gemini(){
  const key=String(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"").trim();
  if(!key)throw Object.assign(new Error("GEMINI_API_KEY chưa được cấu hình trên server"),{status:503,code:"gemini_key_missing"});
  if(!geminiClient||geminiClientKey!==key){
    geminiClient=new GoogleGenAI({apiKey:key});
    geminiClientKey=key;
    workingModel="";
    workingModelKey="";
    workingModelConfig="";
  }
  return geminiClient;
}
function modelName(){return String(process.env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL).trim()||DEFAULT_GEMINI_MODEL}
function modelCandidates(){
  const configured=modelName();
  return [...new Set([workingModel&&workingModelKey===geminiClientKey&&workingModelConfig===configured?workingModel:"",configured,...GEMINI_MODEL_FALLBACKS].filter(Boolean))];
}
function isModelUnavailable(error){
  const status=Number(error?.status||error?.statusCode||error?.response?.status||0);
  const raw=String(error?.message||"").toLowerCase();
  return status===404||raw.includes("not found")||raw.includes("model_or_resource")||raw.includes("model or resource");
}
function parseJson(text){
  const raw=String(text||"").trim();
  if(!raw)throw Object.assign(new Error("Gemini không trả về nội dung. Hãy thử lại."),{status:502,code:"gemini_empty_response"});
  try{return JSON.parse(raw)}catch(_) {}
  const fenced=raw.replace(/^`{3}(?:json)?\s*/i,"").replace(/\s*`{3}$/,"").trim();
  try{return JSON.parse(fenced)}catch(_) {}
  throw Object.assign(new Error("Gemini trả về dữ liệu không đúng định dạng. Hãy thử lại."),{status:502,code:"gemini_invalid_json"});
}
function modelText(response){return String(typeof response?.text==="function"?response.text():response?.text||"").trim()}
function describeGeminiError(error){
  const status=Number(error?.status||error?.statusCode||error?.response?.status||0);
  const raw=String(error?.message||"").trim(),lower=raw.toLowerCase();
  if(status===401||status===403||(lower.includes("api key")&&lower.includes("invalid")))return Object.assign(new Error("Gemini API key không hợp lệ hoặc không có quyền dùng API."),{status:503,code:"gemini_key_invalid"});
  if(isModelUnavailable(error))return Object.assign(new Error("Không tìm thấy model Gemini khả dụng cho API key hiện tại."),{status:502,code:"gemini_model_not_found"});
  if(status===429||lower.includes("429")||lower.includes("quota")||lower.includes("rate limit"))return Object.assign(new Error("Gemini đang hết quota hoặc bị giới hạn lượt gọi. Thử lại sau nhé."),{status:429,code:"gemini_rate_limited"});
  if(status===400)return Object.assign(new Error("Yêu cầu gửi tới Gemini không hợp lệ. Hãy thử prompt ngắn hoặc cụ thể hơn."),{status:400,code:"gemini_bad_request"});
  if(lower.includes("safety")||lower.includes("blocked"))return Object.assign(new Error("Gemini đã chặn yêu cầu này. Hãy đổi chủ đề hoặc cách diễn đạt."),{status:400,code:"gemini_safety_block"});
  return Object.assign(new Error("Gemini đang gặp lỗi tạm thời. Hãy thử lại sau."),{status:502,code:"gemini_upstream_error"});
}
async function callGemini(client,model,args){
  const config={maxOutputTokens:args.maxOutputTokens||1200,...(args.systemInstruction?{systemInstruction:args.systemInstruction}:{}),...(args.responseSchema?{responseMimeType:"application/json",responseSchema:args.responseSchema}:{})};
  return await client.models.generateContent({model,contents:args.contents,config});
}
async function generateGemini(args){
  const client=gemini();
  const configured=modelName();
  let lastModelError=null;
  for(const model of modelCandidates()){
    try{
      const response=await callGemini(client,model,args);
      workingModel=model;
      workingModelKey=geminiClientKey;
      workingModelConfig=configured;
      return response;
    }catch(error){
      if(!isModelUnavailable(error))throw describeGeminiError(error);
      lastModelError=error;
    }
  }
  throw describeGeminiError(lastModelError||new Error("No Gemini model available"));
}
async function requireUser(req){
  const match=/^Bearer\s+(.+)$/i.exec(String(req.headers?.authorization||""));
  if(!match)throw Object.assign(new Error("Bạn cần đăng nhập để dùng Kat AI."),{status:401,code:"missing_ai_token"});
  let auth;
  try{auth=firebaseAuth()}
  catch(error){throw error}
  try{return await auth.verifyIdToken(match[1])}
  catch(error){
    const code=String(error?.code||"auth_error");
    const raw=String(error?.message||"").toLowerCase();
    if(code==="auth/id-token-expired"||raw.includes("expired"))
      throw Object.assign(new Error("Phiên đăng nhập đã hết hạn. Hãy tải lại trang rồi thử lại."),{status:401,code:"ai_token_expired"});
    if(code==="auth/id-token-revoked"||raw.includes("revoked"))
      throw Object.assign(new Error("Phiên đăng nhập đã bị thu hồi. Hãy đăng nhập lại nhé."),{status:401,code:"ai_token_revoked"});
    if(code==="auth/id-token-project-id-mismatch"||raw.includes("project id")||raw.includes("audience"))
      throw Object.assign(new Error("ID token đang thuộc Firebase project khác với server KatLearn. Kiểm tra Firebase Admin credentials trên Vercel."),{status:503,code:"ai_token_project_mismatch"});
    if(code==="auth/invalid-id-token"||raw.includes("incorrect claim")||raw.includes("invalid id token"))
      throw Object.assign(new Error("ID token Firebase không hợp lệ. Hãy tải lại trang và đăng nhập lại."),{status:401,code:"ai_token_invalid"});
    throw Object.assign(new Error("Server không xác thực được phiên Firebase của bạn ("+code+")."),{status:503,code:"ai_token_verify_failed"});
  }
}
function rateLimit(uid,bucket,limit,windowMs=60000){
  const now=Date.now(),key=uid+":"+bucket,old=buckets.get(key)||[],fresh=old.filter(t=>now-t<windowMs);
  if(fresh.length>=limit){const retryAfter=Math.max(1,Math.ceil((windowMs-(now-fresh[0]))/1000));throw Object.assign(new Error("Bạn dùng Kat AI hơi nhanh. Thử lại sau "+retryAfter+" giây nhé."),{status:429,code:"ai_rate_limited",retryAfter})}
  fresh.push(now);buckets.set(key,fresh);
}
function jsonHeaders(extra={}){return{"Content-Type":"application/json","Cache-Control":"no-store",...extra}}
function send(res,status,body,extra={}){
  const h=jsonHeaders(extra);
  if(typeof res?.set==="function")return res.status(status).set(h).json(body);
  if(typeof res?.setHeader==="function")for(const[key,value]of Object.entries(h))res.setHeader(key,value);
  if(typeof res?.status==="function"&&typeof res?.json==="function")return res.status(status).json(body);
  return new Response(JSON.stringify(body),{status,headers:h});
}
function method(req,res,allowed="POST"){const actual=String(req?.method||res?.req?.method||"").toUpperCase();if(actual!==allowed){send(res,405,{error:"Method Not Allowed",code:"method_not_allowed"});return false}return true}
module.exports={requireUser,rateLimit,generateGemini,parseJson,modelText,modelName,jsonHeaders,send,method};