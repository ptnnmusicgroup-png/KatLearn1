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
  /\b(toan hoc|mon toan|giai phuong trinh|phuong trinh|bat phuong trinh|he phuong trinh|dao ham|tich phan|luong giac|hinh hoc|dai so|xac suat thong ke)\b/,
  /\b(vat ly|mon ly|hoa hoc|mon hoa|sinh hoc|mon sinh|lich su|dia ly|ngu van|van hoc|tin hoc|cong nghe|gdcd)\b/,
  /\b(math|mathematics|algebra|geometry|calculus|trigonometry|physics|chemistry|biology|history|geography|civics)\b/,
  /\b(solve|calculate|find the value of|simplify|factorize|differentiate|integrate)\b.{0,100}(?:[=<>]|\b(?:equation|expression|polynomial|derivative|integral|x\s*\^?\s*\d))/,
  /(?:\d\s*[xX]\s*[+\-]\s*\d\s*=\s*\d|\b[xy]\s*[+\-]\s*\d+\s*=\s*\d+)/,
  /\b(explain|solve|answer|do)\b.{0,70}\b(math homework|math problem|physics problem|chemistry problem|biology homework)\b/
];

const HARMFUL_INTENT_PATTERNS=[
  /\b(viet|tao|soan|hay viet|hay tao)\b.{0,80}\b(chui|si nhuc|lang ma|de doa|bat nat|lam nhuc)\b/,
  /\b(write|generate|make)\b.{0,80}\b(insult|threat|harass|bully|humiliate|slur)\b/,
  /\b(đe dọa|bắt nạt|lăng mạ|sỉ nhục)\b/i
];

function classifyKatAIRequest(input={}){
  const fields=[input.focus,input.material,input.answer];
  if(Array.isArray(input.history)){
    for(const message of input.history.slice(-10))fields.push(message?.text);
  }
  const text=fold(fields.filter(Boolean).join("\n")).slice(0,30000);
  if(!text.trim())return {allowed:true,category:"empty"};
  if(HARMFUL_INTENT_PATTERNS.some(pattern=>pattern.test(text))){
    return {allowed:false,category:"unsafe",status:400,code:"kat_ai_unsafe_request",message:UNSAFE_MESSAGE};
  }
  // Explicit language-learning tasks take precedence when the user is asking
  // to translate, define, pronounce, or explain English wording from another subject.
  const languageTask=/\b(dich|translate|how do you say|how to say|nghia cua tu|meaning of|pronounce|phat am|ipa|tu vung|vocabulary|word choice)\b/.test(text);
  if(!languageTask&&OTHER_SUBJECT_PATTERNS.some(pattern=>pattern.test(text))){
    return {allowed:false,category:"off_topic",status:403,code:"kat_ai_off_topic",message:OFF_SCOPE_MESSAGE};
  }
  return {allowed:true,category:"english_learning"};
}

module.exports={OFF_SCOPE_MESSAGE,UNSAFE_MESSAGE,classifyKatAIRequest};
