const OpenAI = require("openai");

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
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

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Kat AI chưa được cấu hình trên Netlify" })
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "Bạn là từ điển Anh–Việt dành cho học sinh lớp 8. Chỉ trả lời json hợp lệ có đúng hai khóa: meaning (nghĩa tiếng Việt ngắn gọn) và pronunciation (phiên âm IPA Anh-Anh đặt giữa dấu /). Không thêm markdown hay giải thích.",
      input: `Tra từ tiếng Anh: ${word}. Hãy trả về kết quả dưới dạng json.`,
      text: { format: { type: "json_object" } }
    });

    const result = JSON.parse(response.output_text || "{}");

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
    return {
      statusCode: error.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Kat AI không thể xử lý từ này: " + String(error.message || error)
      })
    };
  }
};
