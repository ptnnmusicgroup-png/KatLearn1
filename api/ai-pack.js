const{requireUser,rateLimit,generateGemini,parseJson,modelText,send,method}=require("./_kat-ai");
function clean(value,max=1000){return String(value??"").trim().slice(0,max)}
const PACK_INSTRUCTIONS=`Bạn là Kat AI, chuyên gia xây dựng bộ từ vựng tiếng Anh chất lượng cao cho học sinh Việt Nam.
Hãy coi mỗi bộ từ là một tài liệu học tập hoàn chỉnh, có chọn lọc, không phải danh sách từ ngẫu nhiên.

QUY TẮC CHẤT LƯỢNG BẮT BUỘC:
1. ĐÚNG CHỦ ĐỀ: mỗi từ phải có liên hệ rõ ràng với topic. Ưu tiên từ thực sự dùng trong ngữ cảnh của topic; loại bỏ từ quá chung chung, từ chỉ “cho đủ số lượng”, hoặc từ lệch chủ đề.
2. ĐỦ ĐỘ PHỦ: phân bố từ trên nhiều khía cạnh/subtopic/collocation quan trọng của chủ đề thay vì dồn vào một ý duy nhất. Nếu topic có process, cause, effect, solution, people, places, objects, actions, problems... thì phủ các nhóm phù hợp.
3. ĐÚNG TRÌNH ĐỘ: bám sát CEFR được yêu cầu. Beginner/elementary dùng từ phổ biến và dễ học; intermediate trở lên có thêm từ học thuật/thực dụng phù hợp. Không nhét từ hiếm chỉ để làm bộ từ “xịn”.
4. KHÔNG TRÙNG: không lặp từ, không lặp biến thể cùng từ một cách vô nghĩa, hạn chế tối đa cùng một word family nếu không có giá trị học tập rõ ràng.
5. ĐÚNG TỪ LOẠI + IPA: xác định part of speech chính xác; IPA phải là IPA Anh-Anh hợp lệ, không bịa.
6. NGHĨA TIẾNG VIỆT: viết nghĩa tự nhiên, ngắn gọn nhưng đủ dùng; nếu có nhiều nghĩa phù hợp topic thì nêu 1–3 nghĩa quan trọng, ngăn cách rõ bằng dấu phẩy hoặc chấm phẩy. Không dùng định nghĩa kiểu máy móc, không lặp lại chính từ tiếng Anh.
7. GHI CHÚ: notes phải hữu ích cho việc học, tối thiểu nêu usage/collocation/common mistake/context/nuance khi phù hợp. Không được dùng filler như “đây là từ vựng hữu ích”, “liên quan đến chủ đề”, “thường được sử dụng” mà không có thông tin cụ thể.
8. VÍ DỤ: example phải là câu tiếng Anh tự nhiên, đúng ngữ pháp, có liên hệ trực tiếp với topic và thể hiện đúng nghĩa của từ. Tránh câu vô nghĩa, quá chung chung hoặc chỉ để nhét từ vào.
9. KHÔNG BỊA: không tự tạo tên riêng, thuật ngữ, collocation hoặc nghĩa không chắc chắn chỉ để đủ số lượng.
10. ĐẦU RA SẠCH: không giải thích ngoài JSON, không markdown, không đánh số ngoài schema, không bỏ trống field bắt buộc.

FORMAT BẮT BUỘC:
- meaning_vi: nghĩa tiếng Việt rõ ràng, tự nhiên, có dấu câu.
- notes: ghi chú cụ thể, hữu ích, có dấu câu đầy đủ; nếu là câu hoàn chỉnh phải kết thúc bằng dấu chấm.
- example: một câu hoàn chỉnh, viết hoa đầu câu và có dấu câu cuối câu.
- Mọi field phải có nội dung có giá trị; tuyệt đối không dùng nội dung mẫu/filler để lấp chỗ trống.`;
const WORD_PROPERTIES={
  word:{type:"string",description:"Từ tiếng Anh."},
  meaning_vi:{type:"string",description:"Nghĩa tiếng Việt rõ ràng, tự nhiên. Nếu có nhiều nghĩa, ngăn cách bằng dấu phẩy hoặc chấm phẩy; kết thúc bằng dấu chấm."},
  part_of_speech:{type:"string",description:"Từ loại bằng tiếng Anh."},
  ipa:{type:"string",description:"IPA Anh-Anh."},
  example:{type:"string",description:"Một câu tiếng Anh hoàn chỉnh, viết hoa đầu câu và có dấu câu cuối câu."},
  notes:{type:"string",description:"Một ghi chú hữu ích bằng tiếng Việt, không được chỉ là vài từ rời rạc; phải có dấu câu đầy đủ và kết thúc bằng dấu chấm."}
};
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
    const contents="Yêu cầu: "+prompt+"\nSố lượng chính xác: "+wordCount+"\nTrình độ: "+difficulty+"\nMục đích: "+purpose+"\nLoại từ: "+wordTypes+(instructions?"\nHướng dẫn bổ sung: "+instructions:"")+
      "\n\nHÃY TUÂN THỦ QUALITY CONTRACT: chọn đúng từ cho topic, phủ nhiều subtopic phù hợp, bám trình độ, không dùng filler để đủ số lượng, không trùng từ/word family vô nghĩa."+
      "\nMỗi mục bắt buộc phải có: word + part_of_speech + IPA Anh-Anh + meaning_vi tự nhiên + notes hữu ích/cụ thể + example tự nhiên đúng ngữ cảnh topic."+
      "\nmeaning_vi phải là nghĩa tiếng Việt dùng được ngay, không được chỉ dịch máy từng chữ."+
      "\nnotes phải nói điều người học thực sự có thể học thêm (cách dùng, collocation, nuance, lỗi hay gặp hoặc context), không được viết câu sáo rỗng."+
      "\nexample phải chứng minh đúng cách dùng của từ trong topic."+
      "\nPhải trả về đúng "+wordCount+" mục chất lượng cao; thà chọn từ ít phổ biến hơn nhưng thật sự phù hợp còn hơn thêm từ vô nghĩa.";
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
    const tidyText=value=>String(value??"").replace(/\s+/g," ").trim();
    const punctuationCount=value=>(String(value??"").match(/[,.!?;:…]/g)||[]).length;
    const ensureSentence=value=>{
      const text=tidyText(value).replace(/^[-–—•]+\s*/,"");
      if(!text)return "";
      if(/[.!?…]$/.test(text))return text;
      return text+".";
    };
    const ensureVietnameseMeaning=value=>{
      let text=tidyText(value).replace(/^[-–—•]+\s*/,"");
      if(!text)return "";
      // Means/definitions should not be a bare label; at minimum close the
      // definition as a complete phrase/sentence for clean UI presentation.
      if(/[.!?…]$/.test(text))return text;
      return text+".";
    };
    const cleanNotes=(value,word)=>{
      const text=ensureSentence(value);
      if(text&&punctuationCount(text)>0)return text;
      return "Ghi chú: “"+word+"” là từ vựng liên quan đến chủ đề này.";
    };
    words=words.slice(0,wordCount).map(item=>{
      const word=tidyText(item.word);
      return {
        ...item,
        word,
        meaning_vi:ensureVietnameseMeaning(item.meaning_vi),
        translation_vi:ensureVietnameseMeaning(item.translation_vi||item.meaning_vi||""),
        notes:cleanNotes(item.notes,word),
        example:ensureSentence(item.example),
        synonyms:Array.isArray(item.synonyms)?item.synonyms:[],
        antonyms:Array.isArray(item.antonyms)?item.antonyms:[],
        difficulty:String(item.difficulty||difficulty),
        topic:String(item.topic||prompt)
      };
    });
    const fillerPattern=/^(?:đây là|đây là một|một từ vựng|từ vựng này|từ này|thường được sử dụng|thường dùng|rất hữu ích|hữu ích trong|liên quan đến chủ đề|được sử dụng trong).*$/i;
    const malformed=words.some(item=>{
      if(!item||!item.word||!item.meaning_vi||!item.notes||!item.example)return true;
      if(!/[.!?…]$/.test(item.meaning_vi)||!/[.!?…]$/.test(item.notes)||!/[.!?…]$/.test(item.example))return true;
      if(fillerPattern.test(tidyText(item.notes))&&tidyText(item.notes).length<90)return true;
      if(tidyText(item.meaning_vi).toLowerCase() ===tidyText(item.word).toLowerCase())return true;
      return false;
    });
    if(malformed)throw Object.assign(new Error("Kat AI trả về bộ từ chưa đạt chất lượng yêu cầu. Hãy thử lại với topic cụ thể hơn."),{status:502,code:"gemini_bad_word_format"});
    result.pack=result.pack||{};result.pack.topic=prompt;result.pack.difficulty=difficulty;result.pack.purpose=purpose;result.words=words;
    return send(res,200,result);
  }catch(error){return send(res,error.status||500,{error:String(error.message||"Kat AI không thể tạo bộ từ."),code:error.code||"ai_pack_failed"},error.retryAfter?{"Retry-After":String(error.retryAfter)}:{})}
};