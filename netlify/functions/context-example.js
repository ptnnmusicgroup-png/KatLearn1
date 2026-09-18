const OpenAI = require("openai");
function clean(value, max = 500) { return String(value ?? "").trim().slice(0, max); }
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const word = clean(body.word, 80), meaning = clean(body.meaning, 160);
    if (!word || !meaning) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Thiếu từ vựng" }) };
    if (!process.env.OPENAI_API_KEY) return { statusCode: 503, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Kat AI chưa được cấu hình trên Netlify" }) };
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "none" },
      max_output_tokens: 120,
      instructions: "Bạn là giáo viên tiếng Anh lớp 8 Việt Nam. Trả lời thật ngắn: một câu tiếng Anh tự nhiên dùng đúng từ được yêu cầu, sau đó xuống dòng ghi \"Nghĩa: \" và bản dịch tiếng Việt. Không thêm nội dung khác.",
      input: `Tạo ví dụ cho từ "${word}" (nghĩa: ${meaning}).`
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: response.output_text || "" }) };
  } catch (error) {
    console.error("context-example:", error);
    return { statusCode: error.status || 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Không tạo được câu ngữ cảnh AI: " + String(error.message || error) }) };
  }
};