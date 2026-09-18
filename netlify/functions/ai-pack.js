const OpenAI = require("openai");

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function aiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error("Kat AI chưa được cấu hình trên Netlify"), { status: 503 });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const PACK_INSTRUCTIONS = `Bạn là Kat AI, trợ lý tạo bộ từ vựng tiếng Anh cho học sinh Việt Nam.
Hãy tạo toàn bộ bộ từ trong MỘT lần trả lời.
Trả về JSON object duy nhất, không markdown, đúng cấu trúc:
{"pack":{"suggested_title":"...","description":"...","topic":"...","difficulty":"...","purpose":"..."},"words":[{"word":"...","meaning_vi":"...","part_of_speech":"...","ipa":"/.../","example":"...","translation_vi":"...","synonyms":["..."],"antonyms":["..."],"notes":"...","difficulty":"...","topic":"..."}]}
Ưu tiên từ thực sự liên quan đến chủ đề và phù hợp trình độ. Không lặp từ. Không bịa từ hoặc IPA. Số lượng words phải đúng wordCount nếu có thể.
Luôn trả lời bằng JSON hợp lệ.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const prompt = clean(body.prompt, 600);
    const wordCount = Math.min(100, Math.max(5, Number(body.wordCount) || 50));
    const difficulty = clean(body.difficulty, 40) || "intermediate";
    const purpose = clean(body.purpose, 60) || "general";
    const wordTypes = clean(body.wordTypes, 80) || "mixed";

    if (!prompt) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Hãy nhập chủ đề hoặc yêu cầu cho Kat AI." })
      };
    }

    const client = aiClient();
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      reasoning: { effort: "none" },
      max_output_tokens: 12000,
      instructions: PACK_INSTRUCTIONS,
      input: `Yêu cầu của người dùng: ${prompt}
Số lượng từ cần tạo: ${wordCount}
Trình độ: ${difficulty}
Mục đích học: ${purpose}
Loại từ: ${wordTypes}

Hãy trả về JSON object theo đúng cấu trúc đã yêu cầu.`,
      text: { format: { type: "json_object" } }
    });

    const result = JSON.parse(response.output_text || "{}");
    result.pack = result.pack || {};
    result.pack.topic = prompt;
    result.pack.difficulty = difficulty;
    result.pack.purpose = purpose;
    result.words = Array.isArray(result.words)
      ? result.words.slice(0, wordCount)
      : [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("ai-pack:", error);
    return {
      statusCode: error.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Kat AI không thể tạo bộ từ: " + String(error.message || error)
      })
    };
  }
};
