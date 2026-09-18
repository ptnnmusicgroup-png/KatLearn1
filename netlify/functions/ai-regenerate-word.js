const OpenAI = require("openai");
function clean(value, max = 500) { return String(value ?? "").trim().slice(0, max); }
const PACK_INSTRUCTIONS = `Bạn là Kat AI, trợ lý tạo dữ liệu từ vựng tiếng Anh cho học sinh Việt Nam.
Trả về JSON object duy nhất, không markdown:
{"words":[{"word":"...","meaning_vi":"...","part_of_speech":"...","ipa":"/.../","example":"...","translation_vi":"...","synonyms":["..."],"antonyms":["..."],"notes":"...","difficulty":"...","topic":"..."}]}
Không bịa từ hoặc IPA. Tạo đúng một mục từ cho yêu cầu.`;
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method Not Allowed" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const word = clean(body.word, 100), topic = clean(body.topic, 160), difficulty = clean(body.difficulty, 40) || "intermediate";
    if (!word) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Thiếu từ cần tạo lại" }) };
    if (!process.env.OPENAI_API_KEY) return { statusCode: 503, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Kat AI chưa được cấu hình trên Netlify" }) };
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "none" },
      max_output_tokens: 500,
      instructions: PACK_INSTRUCTIONS,
      input: `Tạo lại đúng một mục từ cho từ "${word}". Chủ đề: ${topic || "general"}. Cấp độ: ${difficulty}. JSON phải có khóa words là mảng đúng 1 phần tử.`,
      text: { format: { type: "json_object" } }
    });
    const result = JSON.parse(response.output_text || "{}");
    const item = Array.isArray(result.words) ? result.words[0] : result.word;
    if (!item) throw new Error("AI không trả về dữ liệu từ vựng");
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) };
  } catch (error) {
    console.error("ai-regenerate-word:", error);
    return { statusCode: error.status || 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Không tạo lại được từ: " + String(error.message || error) }) };
  }
};