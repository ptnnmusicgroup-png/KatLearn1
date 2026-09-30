const{requireUser,rateLimit,generateGemini,parseJson,send,method}=require("./_kat-ai");
function clean(v,m=500){return String(v??"").trim().slice(0,m)}
const WORD_PROPERTIES={word:{type:"string"},meaning_vi:{type:"string"},part_of_speech:{type:"string"},ipa:{type:"string"},example:{type:"string"},translation_vi:{type:"string"},synonyms:{type:"array",items:{type:"string"}},antonyms:{type:"array",items:{type:"string"}},notes:{type:"string"},difficulty:{type:"string"},topic:{type:"string"}};
const SCHEMA={type:"object",additionalProperties:false,properties:{words:{type:"array",items:{type:"object",additionalProperties:false,properties:WORD_PROPERTIES,required:["word","meaning_vi","part_of_speech","ipa","example","translation_vi","synonyms","antonyms","notes","difficulty","topic"]}}},required:["words"]};
module.exports=async(req,res)=>{
  if(!method(req,res))return;
  try{
    const user=await requireUser(req);rateLimit(user.uid,"word",30);
    const b=req.body||{},word=clean(b.word,100),topic=clean(b.topic,160),difficulty=clean(b.difficulty,40)||"intermediate";
    if(!word)throw Object.assign(new Error("Thiếu từ cần tạo lại"),{status:400,code:"word_missing"});
    const r=await generateGemini({maxOutputTokens:700,temperature:.25,systemInstruction:"Tạo đúng một mục từ tiếng Anh chính xác, tự nhiên, không bịa IPA.",contents:"Từ: "+word+". Chủ đề: "+(topic||"general")+". Cấp độ: "+difficulty+".",responseSchema:SCHEMA});
    const result=parseJson(r?.text),item=Array.isArray(result.words)?result.words[0]:null;
    if(!item)throw Object.assign(new Error("AI không trả về dữ liệu từ vựng"),{status:502,code:"empty_word_result"});
    return send(res,200,item);
  }catch(e){return send(res,e.status||500,{error:String(e.message||"Không tạo lại được từ"),code:e.code||"ai_word_failed"},e.retryAfter?{"Retry-After":String(e.retryAfter)}:{})}
};