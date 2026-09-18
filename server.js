// KatLearn server proxy: keeps OPENAI_API_KEY out of browser code.
require('dotenv').config();
const express=require('express');
const OpenAI=require('openai');
const app=express();
app.use(express.json({limit:'1mb'}));
app.use(express.static(__dirname));

function aiClient(){
  if(!process.env.OPENAI_API_KEY) throw Object.assign(new Error('Kat AI chưa được cấu hình trên server'),{status:503});
  return new OpenAI({apiKey:process.env.OPENAI_API_KEY});
}
function clean(value,max=500){return String(value??'').trim().slice(0,max)}
async function jsonAI(instructions,input){
  const client=aiClient();
  const response=await client.responses.create({
    model:process.env.OPENAI_MODEL||'gpt-5.6-luna',
    reasoning:{effort:'none'},
    max_output_tokens:12000,
    instructions,
    input,
    text:{format:{type:'json_object'}}
  });
  return JSON.parse(response.output_text||'{}');
}

app.post('/api/context-example',async(req,res)=>{
  const word=clean(req.body?.word,80),meaning=clean(req.body?.meaning,160);
  if(!word||!meaning) return res.status(400).json({error:'Thiếu từ vựng'});
  try{
    const client=aiClient();
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||'gpt-5.6-luna',
      reasoning:{effort:'none'},
      max_output_tokens:120,
      instructions:'Bạn là giáo viên tiếng Anh lớp 8 Việt Nam. Trả lời thật ngắn, chỉ một câu tiếng Anh tự nhiên có dùng đúng từ được yêu cầu, sau đó xuống dòng ghi "Nghĩa: " và một bản dịch tiếng Việt.',
      input:`Tạo ví dụ cho từ "${word}" (nghĩa: ${meaning}).`
    });
    res.json({text:response.output_text||''});
  }catch(error){res.status(error.status||500).json({error:'Không tạo được câu ngữ cảnh AI: '+String(error.message||error)})}
});

app.post('/api/vocab-assist',async(req,res)=>{
  const word=clean(req.body?.word,80);
  if(!word) return res.status(400).json({error:'Thiếu từ tiếng Anh'});
  try{
    const result=await jsonAI(
      'Bạn là từ điển Anh–Việt dành cho học sinh lớp 8. Chỉ trả lời json hợp lệ có đúng hai khóa: meaning (nghĩa tiếng Việt ngắn gọn) và pronunciation (phiên âm IPA Anh-Anh đặt giữa dấu /). Không thêm markdown hay giải thích.',
      `Tra từ tiếng Anh: ${word}. Hãy trả về kết quả dưới dạng json.`
    );
    res.json({meaning:String(result.meaning||''),pronunciation:String(result.pronunciation||'')});
  }catch(error){res.status(error.status||500).json({error:'Kat AI không thể xử lý từ này: '+String(error.message||error)})}
});

const PACK_INSTRUCTIONS=`Bạn là chuyên gia thiết kế từ vựng tiếng Anh cho học sinh Việt Nam. Tạo dữ liệu học tập chính xác, tự nhiên, không bịa IPA. Trả về JSON object duy nhất với cấu trúc:
{"pack":{"suggested_title":"...","description":"...","topic":"...","difficulty":"...","purpose":"..."},"words":[{"word":"...","meaning_vi":"...","part_of_speech":"...","ipa":"/.../","example":"...","translation_vi":"...","synonyms":["..."],"antonyms":["..."],"notes":"...","difficulty":"...","topic":"..."}]}
Không markdown. Số lượng words phải đúng wordCount nếu có thể. Không lặp từ. Ưu tiên từ thực sự hữu ích cho chủ đề và trình độ.`;

app.post('/api/ai-pack',async(req,res)=>{
  const topic=clean(req.body?.topic,160);
  const wordCount=Math.min(100,Math.max(5,Number(req.body?.wordCount)||30));
  const difficulty=clean(req.body?.difficulty,40)||'intermediate';
  const purpose=clean(req.body?.purpose,60)||'general';
  const wordTypes=clean(req.body?.wordTypes,80)||'mixed';
  const instructions=clean(req.body?.instructions,1000);
  if(!topic) return res.status(400).json({error:'Vui lòng nhập chủ đề'});
  try{
    const prompt=`Chủ đề: ${topic}
Số lượng: ${wordCount}
Cấp độ: ${difficulty}
Mục đích: ${purpose}
Loại từ: ${wordTypes}
Hướng dẫn thêm: ${instructions||'Không có'}`;
    const result=await jsonAI(PACK_INSTRUCTIONS,prompt);
    result.pack=result.pack||{};
    result.pack.topic=topic;
    result.pack.difficulty=difficulty;
    result.pack.purpose=purpose;
    result.words=Array.isArray(result.words)?result.words.slice(0,wordCount):[];
    res.json(result);
  }catch(error){res.status(error.status||500).json({error:'Không tạo được pack AI: '+String(error.message||error)})}
});

app.post('/api/ai-regenerate-word',async(req,res)=>{
  const word=clean(req.body?.word,100),topic=clean(req.body?.topic,160),difficulty=clean(req.body?.difficulty,40)||'intermediate';
  if(!word) return res.status(400).json({error:'Thiếu từ cần tạo lại'});
  try{
    const result=await jsonAI(PACK_INSTRUCTIONS,`Tạo lại đúng một mục từ cho từ "${word}". Chủ đề: ${topic||'general'}. Cấp độ: ${difficulty}. JSON phải có khóa words là mảng đúng 1 phần tử.`);
    const item=Array.isArray(result.words)?result.words[0]:result.word;
    if(!item) throw new Error('AI không trả về dữ liệu từ vựng');
    res.json(item);
  }catch(error){res.status(error.status||500).json({error:'Không tạo lại được từ: '+String(error.message||error)})}
});

app.get('/api/health',(req,res)=>res.json({ok:true,ai:!!process.env.OPENAI_API_KEY}));
app.listen(process.env.PORT||3000,()=>console.log('KatLearn: http://localhost:'+String(process.env.PORT||3000)));
