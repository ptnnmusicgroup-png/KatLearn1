// Server proxy: keeps OPENAI_API_KEY out of browser code.
require('dotenv').config();
const express=require('express');
const OpenAI=require('openai');
const app=express();
app.use(express.json());
app.use(express.static(__dirname));
app.post('/api/context-example',async(req,res)=>{
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'Chưa cấu hình OPENAI_API_KEY trong tệp .env'});
  const {word,meaning}=req.body||{};
  if(!word||!meaning) return res.status(400).json({error:'Thiếu từ vựng'});
  try{
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5-mini',instructions:'Bạn là giáo viên tiếng Anh lớp 8 Việt Nam. Trả lời thật ngắn, chỉ một câu tiếng Anh tự nhiên có dùng đúng từ được yêu cầu, sau đó xuống dòng ghi "Nghĩa: " và một bản dịch tiếng Việt.',input:`Tạo ví dụ cho từ "${word}" (nghĩa: ${meaning}).`});
    res.json({text:response.output_text});
  }catch(error){res.status(500).json({error:'Không tạo được câu ngữ cảnh AI: '+error.message})}
});
app.post('/api/vocab-assist',async(req,res)=>{
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'Kat AI chưa được cấu hình trên server'});
  const word=String(req.body?.word||'').trim();
  if(!word) return res.status(400).json({error:'Thiếu từ tiếng Anh'});
  try{
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5-mini',instructions:'Bạn là từ điển Anh–Việt dành cho học sinh lớp 8. Chỉ trả lời JSON hợp lệ có đúng hai khóa: meaning (nghĩa tiếng Việt ngắn gọn) và pronunciation (phiên âm IPA Anh-Anh đặt giữa dấu /). Không thêm markdown hay giải thích.',input:`Tra từ tiếng Anh: ${word}`,text:{format:{type:'json_object'}}});
    const result=JSON.parse(response.output_text);
    res.json({meaning:String(result.meaning||''),pronunciation:String(result.pronunciation||'')});
  }catch(error){res.status(500).json({error:'Kat AI không thể xử lý từ này: '+error.message})}
});
app.listen(process.env.PORT||3000,()=>console.log('KatLearn: http://localhost:3000'));
