const OpenAI = require("openai");
const { requireUser, rateLimit, safetyIdentifier, jsonHeaders } = require("./_kat-ai");
function clean(value,max=1000){return String(value??"").trim().slice(0,max)}
const PACK_INSTRUCTIONS=`Bạn là Kat AI, trợ lý tạo bộ từ vựng tiếng Anh cho học sinh Việt Nam.
Tạo toàn bộ bộ từ trong một lần. Không lặp từ, không bịa từ hoặc IPA. Ưu tiên từ thực sự liên quan đến chủ đề và trình độ.
`;
const SCHEMA={
  "type":"object","additionalProperties":false,
  "properties":{
    "pack":{"type":"object","additionalProperties":false,"properties":{
      "suggested_title":{"type":"string"},"description":{"type":"string"},"topic":{"type":"string"},"difficulty":{"type":"string"},"purpose":{"type":"string"}
    },"required":["suggested_title","description","topic","difficulty","purpose"]},
    "words":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{
      "word":{"type":"string"},"meaning_vi":{"type":"string"},"part_of_speech":{"type":"string"},"ipa":{"type":"string"},"example":{"type":"string"},"translation_vi":{"type":"string"},"synonyms":{"type":"array","items":{"type":"string"}},"antonyms":{"type":"array","items":{"type":"string"}},"notes":{"type":"string"},"difficulty":{"type":"string"},"topic":{"type":"string"}
    },"required":["word","meaning_vi","part_of_speech","ipa","example","translation_vi","synonyms","antonyms","notes","difficulty","topic"]}}
  },"required":["pack","words"]
};
exports.handler=async(event)=>{
 if(event.httpMethod!=="POST")return{statusCode:405,headers:jsonHeaders(),body:JSON.stringify({error:"Method Not Allowed"})};
 try{
  const user=await requireUser(event); rateLimit(user.uid,"pack",5);
  const body=JSON.parse(event.body||"{}"),prompt=clean(body.prompt,600);
  const wordCount=Math.min(100,Math.max(5,Number(body.wordCount)||50)),difficulty=clean(body.difficulty,40)||"intermediate",purpose=clean(body.purpose,60)||"general",wordTypes=clean(body.wordTypes,80)||"mixed";
  if(!prompt)throw Object.assign(new Error("Hãy nhập chủ đề hoặc yêu cầu cho Kat AI."),{status:400});
  const response=await new OpenAI({apiKey:process.env.OPENAI_API_KEY}).responses.create({
   model:process.env.OPENAI_MODEL||"gpt-5.6-luna",reasoning:{effort:"none"},max_output_tokens:12000,
   prompt_cache_key:"katlearn-ai-pack-v1",prompt_cache_options:{mode:"implicit",ttl:"30m"},
   safety_identifier:safetyIdentifier(user.uid),instructions:PACK_INSTRUCTIONS,
   input:`Yêu cầu: ${prompt}\nSố lượng: ${wordCount}\nTrình độ: ${difficulty}\nMục đích: ${purpose}\nLoại từ: ${wordTypes}`,
   text:{format:{type:"json_schema",name:"katlearn_vocab_pack",strict:true,schema:SCHEMA}}
  });
  const result=JSON.parse(response.output_text||"{}");
  const words=Array.isArray(result.words)?result.words.filter(w=>w&&w.word).slice(0,wordCount):[];
  if(words.length<Math.min(5,wordCount))throw Object.assign(new Error("AI trả về bộ từ không đủ dữ liệu."),{status:502});
  result.pack=result.pack||{};result.pack.topic=prompt;result.pack.difficulty=difficulty;result.pack.purpose=purpose;result.words=words;
  return{statusCode:200,headers:jsonHeaders(),body:JSON.stringify(result)};
 }catch(error){console.error("ai-pack:",error);return{statusCode:error.status||500,headers:jsonHeaders(error.retryAfter?{"Retry-After":String(error.retryAfter)}:{}),body:JSON.stringify({error:"Kat AI không thể tạo bộ từ: "+String(error.message||error)})}}
};