"use strict";

const OFF_SCOPE_MESSAGE="Hiện tại, chúng tôi không hỗ trợ các môn học khác ngoài Tiếng Anh. Xin cảm ơn.";
const UNSAFE_MESSAGE="KatAI không thể hỗ trợ tạo nội dung xúc phạm, đe dọa hoặc gây hại. Hãy chuyển sang một yêu cầu học tiếng Anh an toàn nhé.";

function fold(value){
  return String(value??"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d")
    .replace(/Đ/g,"d")
    .toLowerCase();
}

const OTHER_SUBJECT_PATTERNS=[
  /\b(toan hoc|mon toan|bai tap toan|bai toan|giai toan|giai phuong trinh|phuong trinh|bat phuong trinh|he phuong trinh|dao ham|tich phan|luong giac|hinh hoc|dai so|xac suat thong ke)\b/,
  /\b(vat ly|mon ly|bai tap ly|bai tap hoa|bai tap sinh|hoa hoc|mon hoa|sinh hoc|mon sinh|lich su|dia ly|ngu van|van hoc|tin hoc|cong nghe|gdcd)\b/,
  /\b(math|mathematics|algebra|geometry|calculus|trigonometry|physics|chemistry|biology|history|geography|civics|photosynthesis|mitosis|gravity|chemical reaction|periodic table)\b/,
  /\b(solve|calculate|find the value of|simplify|factorize|differentiate|integrate)\b.{0,100}(?:[=<>]|\b(?:equation|expression|polynomial|derivative|integral|x\s*\^?\s*\d))/,
  /(?:\d\s*[xX]\s*[+\-]\s*\d\s*=\s*\d|\b[xy]\s*[+\-]\s*\d+\s*=\s*\d+)/,
  /\b(?:what is|calculate|compute|solve|evaluate)\b.{0,50}\d+\s*[+\-*\/×÷]\s*\d+/,
  /\b(explain|solve|answer|do)\b.{0,70}\b(math homework|math problem|physics problem|chemistry problem|biology homework)\b/
];

const HARMFUL_INTENT_PATTERNS=[
  /\b(viet|tao|soan|hay viet|hay tao)\b.{0,80}\b(chui|si nhuc|lang ma|de doa|bat nat|lam nhuc)\b/,
  /\b(write|generate|make)\b.{0,80}\b(insult|threat|harass|bully|humiliate|slur)\b/
];

function classifyKatAIRequest(input={}){
  const fields=[input.focus,input.material,input.answer];
  if(Array.isArray(input.history)){
    const recentUserMessages=input.history.filter(message=>message?.role!=="assistant"&&message?.role!=="model").slice(-2);
    for(const message of recentUserMessages)fields.push(message?.text);
  }
  const text=fold(fields.filter(Boolean).join("\n")).slice(0,30000);
  if(!text.trim())return {allowed:true,category:"empty"};
  if(HARMFUL_INTENT_PATTERNS.some(pattern=>pattern.test(text))){
    return {allowed:false,category:"unsafe",status:400,code:"kat_ai_unsafe_request",message:UNSAFE_MESSAGE};
  }
  // Let explicit English-learning tasks discuss or translate subject vocabulary
  // without turning KatAI into a tutor for those other subjects.
  const languageTask=/\b(dich|translate|how do you say|how to say|nghia cua tu|meaning of|what does (?:the )?word|definition of|pronounce|phat am|ipa|tu vung|vocabulary|word choice)\b/.test(text);
  if(!languageTask&&OTHER_SUBJECT_PATTERNS.some(pattern=>pattern.test(text))){
    return {allowed:false,category:"off_topic",status:403,code:"kat_ai_off_topic",message:OFF_SCOPE_MESSAGE};
  }
  return {allowed:true,category:"english_learning"};
}

module.exports={OFF_SCOPE_MESSAGE,UNSAFE_MESSAGE,classifyKatAIRequest};
