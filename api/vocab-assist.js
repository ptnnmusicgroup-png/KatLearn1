const{requireUser,rateLimit,generateGemini,parseJson,send,method}=require("./_kat-ai");
function clean(v,m=500){return String(v??"").trim().slice(0,m)}
const SCHEMA={type:"object",additionalProperties:false,properties:{meaning:{type:"string"},pronunciation:{type:"string"}},required:["meaning","pronunciation"]};
module.exports=async(req,res)=>{
  if(!method(req,res))return;
  try{
    const user=await requireUser(req);rateLimit(user.uid,"assist",30);
    const word=clean(req.body?.word,80);
    if(!word)throw Object.assign(new Error("Thiếu từ tiếng Anh"),{status:400,code:"word_missing"});
    const r=await generateGemini({maxOutputTokens:220,temperature:.2,systemInstruction:"Bạn là từ điển Anh–Việt lớp 8. Nghĩa phải ngắn gọn. IPA phải là IPA Anh-Anh chính xác.",contents:"Tra từ: "+word,responseSchema:SCHEMA});
    return send(res,200,parseJson(r?.text));
  }catch(e){return send(res,e.status||500,{error:String(e.message||"Kat AI không thể xử lý từ này"),code:e.code||"ai_assist_failed"},e.retryAfter?{"Retry-After":String(e.retryAfter)}:{})}
};