// Add these endpoints to your Node.js Express server
// File: server-ai-endpoints.js

module.exports = function(app) {
  const OpenAI = require('openai');
  require('dotenv').config();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Generate single vocabulary with AI
  app.post('/api/ai/vocabulary', async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'Chưa cấu hình OPENAI_API_KEY' });
    }

    const { word, context = '', level = 'intermediate' } = req.body;

    if (!word || word.trim().length === 0) {
      return res.status(400).json({ error: 'Thiếu từ tiếng Anh' });
    }

    try {
      const systemPrompt = `You are an expert English vocabulary teacher. Generate accurate vocabulary data for learning.
      
Always respond with VALID JSON matching this exact schema:
{
  "word": "string",
  "meaning_vi": "string (main Vietnamese meaning)",
  "part_of_speech": "string (verb, noun, adjective, etc.)",
  "ipa": "string (IPA pronunciation)",
  "example": "string (English example sentence)",
  "example_vi": "string (Vietnamese translation of example)",
  "synonyms": ["string", "string"],
  "antonyms": ["string", "string"],
  "notes": "string (usage notes or additional info)"
}

Context level: ${level}
${context ? `Additional context: ${context}` : ''}

For IELTS level: prioritize academic vocabulary, natural collocations, and formal examples.`;

      const userPrompt = `Generate comprehensive vocabulary data for the word: "${word.trim()}"

Respond ONLY with valid JSON. Do not include any explanation or markdown.`;

      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      let responseText = response.content[0].type === 'text' ? response.content[0].text : '';

      // Clean markdown if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse and validate JSON
      const vocabData = JSON.parse(responseText);

      // Validate required fields
      const required = ['word', 'meaning_vi', 'part_of_speech', 'ipa', 'example', 'example_vi'];
      for (const field of required) {
        if (!vocabData[field]) {
          return res.status(422).json({ error: `Invalid data: missing or empty ${field}` });
        }
      }

      // Ensure arrays for synonyms/antonyms
      if (!Array.isArray(vocabData.synonyms)) {
        vocabData.synonyms = typeof vocabData.synonyms === 'string' ? vocabData.synonyms.split(',').map(s => s.trim()) : [];
      }
      if (!Array.isArray(vocabData.antonyms)) {
        vocabData.antonyms = typeof vocabData.antonyms === 'string' ? vocabData.antonyms.split(',').map(s => s.trim()) : [];
      }

      res.json(vocabData);
    } catch (error) {
      console.error('AI Generation Error:', error);
      if (error instanceof SyntaxError) {
        return res.status(422).json({ error: 'AI returned invalid JSON format' });
      }
      res.status(500).json({ error: `Lỗi tạo từ vựng: ${error.message}` });
    }
  });

  // Regenerate specific field
  app.post('/api/ai/vocabulary/regenerate-field', async (req, res) => {
    const { word, field, context = '', level = 'intermediate' } = req.body;

    if (!word || !field) {
      return res.status(400).json({ error: 'Missing word or field' });
    }

    try {
      const fieldDescriptions = {
        'meaning_vi': 'Generate ONLY the Vietnamese meaning (return as: {"meaning_vi": "..."})',
        'example': 'Generate ONLY an English example sentence (return as: {"example": "..."})',
        'example_vi': 'Generate ONLY the Vietnamese translation of an example (return as: {"example_vi": "..."})',
        'synonyms': 'Generate ONLY 3-5 synonyms (return as: {"synonyms": ["...", "..."]})',
        'antonyms': 'Generate ONLY 2-3 antonyms if they exist (return as: {"antonyms": ["...", "..."]})',
        'ipa': 'Generate ONLY the IPA pronunciation (return as: {"ipa": "..."})',
        'part_of_speech': 'Generate ONLY the part of speech (return as: {"part_of_speech": "..."})'
      };

      const prompt = `For the English word "${word}", ${fieldDescriptions[field] || 'generate related data'}.

Respond ONLY with the JSON object. No explanation or markdown.`;

      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }]
      });

      let responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const result = JSON.parse(responseText);
      res.json(result);
    } catch (error) {
      console.error('Field Regeneration Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};