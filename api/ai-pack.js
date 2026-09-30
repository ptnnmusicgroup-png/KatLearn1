const{requireUser,rateLimit,generateGemini,parseJson,modelText,send,method}=require("./_kat-ai");
function clean(value,max=1000){return String(value??"").trim().slice(0,max)}
const PACK_INSTRUCTIONS=`Bạn là Kat AI, trợ lý tạo bộ từ vựng tiếng Anh cho học sinh Việt Nam.
Tạo toàn bộ bộ từ trong một lần. Không lặp từ, không bịa từ hoặc IPA. Ưu tiên từ thực sự liên quan đến chủ đề và trình độ.`;
const WORD_PROPERTIES={word:{type:"string"},meaning_vi:{type:"string"},part_of_speech:{type:"string"},ipa:{type:"string"},example:{type:"string"},notes:{type:"string"}};
const REQUIRED_WORD=["word","meaning_vi","part_of_speech","ipa","example","notes"];
const WORD_SCHEMA={type:"object",additionalProperties:false,properties:WORD_PROPERTIES,required:REQUIRED_WORD};
const SCHEMA={type:"object",additionalProperties:false,properties:{pack:{type:"object",additionalProperties:false,properties:{suggested_title:{type:"string"},description:{type:"string"},topic:{type:"string"},difficulty:{type:"string"},purpose:{type:"string"}},required:["suggested_title","description","topic","difficulty","purpose"]},words:{type:"array",items:WORD_SCHEMA}},required:["pack","words"]};
const RETRY_SCHEMA={type:"object",additionalProperties:false,properties:{words:{type:"array",items:WORD_SCHEMA}},required:["words"]};
module.exports=async(req,res)=>{
  if(!method(req,res))return;
  try{
    const user=await requireUser(req);rateLimit(user.uid,"pack",5);
    const body=req.body||{},prompt=clean(body.prompt,600),instructions=clean(body.instructions,1000);
    const wordCount=Math.min(100,Math.max(5,Number(body.wordCount)||50));
    const difficulty=clean(body.difficulty,40)||"intermediate",purpose=clean(body.purpose,60)||"general",wordTypes=clean(body.wordTypes,80)||"mixed";
    if(!prompt)throw Object.assign(new Error("Hãy nhập chủ đề hoặc yêu cầu cho Kat AI."),{status:400,code:"prompt_missing"});
    const contents="Yêu cầu: "+prompt+"\nSố lượng chính xác: "+wordCount+"\nTrình độ: "+difficulty+"\nMục đích: "+purpose+"\nLoại từ: "+wordTypes+(instructions?"\nHướng dẫn bổ sung: "+instructions:"")+"\nPhải trả về đúng "+wordCount+" mục từ, không ít hơn.";
    let response=await generateGemini({maxOutputTokens:Math.min(16000,Math.max(7000,wordCount*140)),temperature:.35,systemInstruction:PACK_INSTRUCTIONS,contents,responseSchema:SCHEMA});
    let result=parseJson(modelText(response));
    const normalizeWord=value=>String(value??"").trim().toLowerCase().replace(/\s+/g," ");
    const uniqueWords=input=>{const seen=new Set(),out=[];for(const item of Array.isArray(input)?input:[]){const key=normalizeWord(item?.word);if(!key||seen.has(key))continue;seen.add(key);out.push(item)}return out};
    let words=uniqueWords(result.words);
    if(words.length<wordCount){
      const missing=wordCount-words.length,existing=words.map(w=>normalizeWord(w.word)).filter(Boolean).slice(0,100).join(", ");
      const retryContents=contents+"\nĐã có các từ: "+existing+". Hãy CHỈ tạo thêm "+missing+" từ mới, không lặp bất kỳ từ nào trong danh sách đã có và không giải thích.";
      response=await generateGemini({maxOutputTokens:Math.min(10000,Math.max(2200,missing*150)),temperature:.3,systemInstruction:PACK_INSTRUCTIONS,contents:retryContents,responseSchema:RETRY_SCHEMA});
      const retryResult=parseJson(modelText(response));words=uniqueWords([...words,...(Array.isArray(retryResult.words)?retryResult.words:[])]);result={...result,pack:result.pack||{}};
    }
    if(words.length<wordCount)throw Object.assign(new Error("Gemini chưa tạo đủ "+wordCount+" từ. Hãy thử lại với topic cụ thể hơn."),{status:502,code:"gemini_not_enough_words"});
    words=words.slice(0,wordCount).map(item=>({...item,translation_vi:String(item.translation_vi||item.meaning_vi||""),synonyms:Array.isArray(item.synonyms)?item.synonyms:[],antonyms:Array.isArray(item.antonyms)?item.antonyms:[],difficulty:String(item.difficulty||difficulty),topic:String(item.topic||prompt)}));result.pack=result.pack||{};result.pack.topic=prompt;result.pack.difficulty=difficulty;result.pack.purpose=purpose;result.words=words;
    return send(res,200,result);
  }catch(error){return send(res,error.status||500,{error:String(error.message||"Kat AI không thể tạo bộ từ."),code:error.code||"ai_pack_failed"},error.retryAfter?{"Retry-After":String(error.retryAfter)}:{})}
};