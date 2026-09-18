const { GoogleGenAI } = require("@google/genai");

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function aiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error("Kat AI chưa được cấu hình trên Netlify"), { status: 503 });
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const PACK_SCHEMA = {
  type: "object",
  properties: {
    pack: {
      type: "object",
      properties: {
        suggested_title: { type: "string" },
        description: { type: "string" },
        topic: { type: "string" },
        difficulty: { type: "string" },
        purpose: { type: "string" }
      },
      required: ["suggested_title", "description", "topic", "difficulty", "purpose"]
    },
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          meaning_vi: { type: "string" },
          part_of_speech: { type: "string" },
          ipa: { type: "string" },
          example: { type: "string" },
          translation_vi: { type: "string" },
          synonyms: { type: "array", items: { type: "string" } },
          antonyms: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
          difficulty: { type: "string" },
          topic: { type: "string" }
        },
        required: [
          "word", "meaning_vi", "part_of_speech", "ipa", "example",
          "translation_vi", "synonyms", "antonyms", "notes", "difficulty", "topic"
        ]
      }
    }
  },
  required: ["pack", "words"]
};

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

    const ai = aiClient();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: [
        `Yêu cầu của người dùng: ${prompt}
Số lượng từ cần tạo: ${wordCount}
Trình độ: ${difficulty}
Mục đích học: ${purpose}
Loại từ: ${wordTypes}`
      ],
      config: {
        systemInstruction:
          "Bạn là Kat AI, trợ lý tạo bộ từ vựng tiếng Anh cho học sinh Việt Nam. " +
          "Trong MỘT lần trả lời, hãy tạo toàn bộ bộ từ theo yêu cầu. Không hỏi lại. " +
          "Ưu tiên từ vựng thực sự liên quan đến chủ đề, phù hợp trình độ. " +
          "Mỗi từ phải có nghĩa tiếng Việt ngắn gọn, IPA Anh-Anh chính xác đặt giữa dấu /, loại từ, " +
          "một câu ví dụ tự nhiên bằng tiếng Anh và bản dịch tiếng Việt. " +
          "Có thể thêm synonyms, antonyms và notes khi phù hợp. Không bịa từ hoặc IPA. " +
          "Không markdown; chỉ trả về JSON đúng schema.",
        responseMimeType: "application/json",
        responseSchema: PACK_SCHEMA
      }
    });

    const result = JSON.parse(response.text || "{}");
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
    const message = String(error?.message || error);
    const status = error?.status || error?.statusCode || (message.includes("429") ? 429 : 500);

    return {
      statusCode: status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Kat AI không thể tạo bộ từ: " + message
      })
    };
  }
};
