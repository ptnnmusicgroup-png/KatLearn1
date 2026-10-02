const{requireUser,rateLimit,generateGemini,parseJson,modelText,send,method}=require("./_kat-ai");
function clean(value,max=1000){return String(value??"").trim().slice(0,max)}
const PACK_INSTRUCTIONS=`Bạn là Kat AI, trợ lý tạo bộ từ vựng tiếng Anh cho học sinh Việt Nam.
Tạo toàn bộ bộ từ trong một lần. Không lặp từ, không bịa từ hoặc IPA. Ưu tiên từ thực sự liên quan đến chủ đề và trình độ.`;
const WORD_PROPERTIES={word:{type:"string"},meaning_vi:{type:"string"},part_of_speech:{type:"string"},ipa:{type:"string"},example:{type:"string"},notes:{type:"string"}};
const REQUIRED_WORD=["word","meaning_vi","part_of_speech","ipa","example","notes"];
const WORD_SCHEMA={type:"object",additionalProperties:false,properties:WORD_PROPERTIES,required:REQUIRED_WORD};
const SCHEMA={type:"object",additionalProperties:false,properties:{pack:{type:"object",additionalProperties:false,properties:{suggested_title:{type:"string"},description:{type:"string"},topic:{type:"string"},difficulty:{type:"string"},purpose:{type:"string"}},required:["suggested_title","description","topic","difficulty","purpose"]},words:{type:"array",items:WORD_SCHEMA}},required:["pack","words"]};
const RETRY_SCHEMA={type:"object",additionalProperties:false,properties:{words:{type:"array",items:WORD_SCHEMA}},required:["words"]};
const ENRICH_PROPERTIES={inputIndex:{type:"integer"},word:{type:"string"},meaning_vi:{type:"string"},part_of_speech:{type:"string"},ipa:{type:"string"},example:{type:"string"},notes:{type:"string"}};
const ENRICH_ITEM={type:"object",additionalProperties:false,properties:ENRICH_PROPERTIES,required:["inputIndex","word","meaning_vi","part_of_speech","ipa","example","notes"]};
const ENRICH_SCHEMA={type:"object",additionalProperties:false,properties:{words:{type:"array",items:ENRICH_ITEM}},required:["words"]};
module.exports=async(req,res)=>{
  if(!method(req,res))return;
  try{
    const user=await requireUser(req);rateLimit(user.uid,"pack",5);
    const body=req.body||{},prompt=clean(body.prompt,600),instructions=clean(body.instructions,1000);
    const suppliedWords=Array.isArray(body.words)
      ?body.words.map(value=>String(value??"").trim().replace(/\\s+/g," ")).filter(Boolean).slice(0,100)
      :[];
    if(suppliedWords.length){
      const uniqueWords=[];
      const seen=new Set();
      for(const word of suppliedWords){
        const key=word.toLowerCase();
        if(seen.has(key))continue;
        seen.add(key);
        uniqueWords.push(word);
      }
      if(!uniqueWords.length)throw Object.assign(new Error("Hãy nhập ít nhất một từ tiếng Anh."),{status:400,code:"input_words_missing"});
      const difficulty=clean(body.difficulty,40)||"intermediate";
      const contents="Danh sách từ tiếng Anh do học sinh tự nhập (KHÔNG tự thêm từ mới):\\n"+JSON.stringify(uniqueWords)+"\\nCấp độ: "+difficulty+"\\n\\nYÊU CẦU: Trả về đúng "+uniqueWords.length+" mục, theo đúng thứ tự. Giữ nguyên từng từ trong trường word, chỉ bổ sung nghĩa tiếng Việt, từ loại, IPA Anh-Anh, một câu ví dụ tự nhiên và ghi chú ngắn. Không bỏ sót, không gộp, không đổi chính tả và không giải thích ngoài JSON.";
      const response=await generateGemini({
        maxOutputTokens:Math.min(16000,Math.max(3500,uniqueWords.length*125)),
        temperature:.2,
        systemInstruction:"Bạn là Kat AI, trợ lý hoàn thiện bộ từ vựng tiếng Anh cho học sinh Việt Nam. Nhiệm vụ là BỔ SUNG THÔNG TIN cho các từ người dùng đã nhập, không được tự sinh thêm từ ngoài danh sách.",
        contents,
        responseSchema:ENRICH_SCHEMA
      });
      const result=parseJson(modelText(response));
      const returned=Array.isArray(result.words)?result.words:[];
      const byIndex=new Map(returned.map(item=>[Number(item?.inputIndex),item]));
      const words=uniqueWords.map((original,index)=>{
        const item=byIndex.get(index);
        if(!item)return null;
        return{
          word:original,
          meaning_vi:String(item.meaning_vi||"").trim(),
          part_of_speech:String(item.part_of_speech||"").trim(),
          ipa:String(item.ipa||"").trim(),
          example:String(item.example||"").trim(),
          notes:String(item.notes||"").trim(),
          translation_vi:String(item.meaning_vi||"").trim(),
          synonyms:[],antonyms:[],difficulty,topic:"personal vocabulary"
        };
      });
      if(words.some(item=>!item||!item.meaning_vi||!item.ipa||!item.example)){
        throw Object.assign(new Error("Kat AI chưa hoàn thiện đủ danh sách từ trong một lần gọi. Bạn có thể bấm Generate AI lại sau."),{status:502,code:"gemini_incomplete_enrichment"});
      }
      return send(res,200,{pack:{suggested_title:"",description:"Bộ từ do bạn nhập và Kat AI hoàn thiện.",topic:"personal vocabulary",difficulty,purpose:"personal vocabulary pack"},words});
    }
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