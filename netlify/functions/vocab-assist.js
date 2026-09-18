const { GoogleGenAI } = require("@google/genai");

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function aiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error("Kat AI chưa được cấu hình trên Netlify"), { status: 503 });
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

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
    const word = clean(body.word, 80);

    if (!word) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Thiếu từ tiếng Anh" })
      };
    }

    const ai = aiClient();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: `Tra từ tiếng Anh: ${word}. Hãy trả về nghĩa tiếng Việt ngắn gọn và phiên âm IPA Anh-Anh.`,
      config: {
        systemInstruction:
          "Bạn là từ điển Anh–Việt dành cho học sinh lớp 8. Trả về dữ liệu chính xác, ngắn gọn. pronunciation phải là IPA Anh-Anh đặt giữa dấu /.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            meaning: { type: "string" },
            pronunciation: { type: "string" }
          },
          required: ["meaning", "pronunciation"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meaning: String(result.meaning || ""),
        pronunciation: String(result.pronunciation || "")
      })
    };
  } catch (error) {
    console.error("vocab-assist:", error);
    const message = String(error?.message || error);
    const status = error?.status || (message.includes("429") ? 429 : 500);

    return {
      statusCode: status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Kat AI không thể xử lý từ này: " + message
      })
    };
  }
};
