// AI-Powered Vocabulary Creation System
(function() {
  class AIVocabularyGenerator {
    constructor() {
      this.isGenerating = false;
      this.currentBatch = [];
      this.generatedVocab = [];
    }

    async generateVocabulary(word, context = '', level = 'intermediate') {
      if (this.isGenerating) return null;
      this.isGenerating = true;

      try {
        const response = await fetch('/api/ai/vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, context, level })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!this.validateVocabularyJSON(data)) {
          throw new Error('Invalid vocabulary format from AI');
        }

        return data;
      } catch (error) {
        console.error('AI Generation Error:', error);
        throw new Error(`Lỗi tạo từ vựng: ${error.message}`);
      } finally {
        this.isGenerating = false;
      }
    }

    async generateBatch(words, context = '', level = 'intermediate') {
      const results = [];
      
      for (const word of words) {
        try {
          const vocab = await this.generateVocabulary(word, context, level);
          results.push({
            word,
            status: 'success',
            data: vocab
          });
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          results.push({
            word,
            status: 'failed',
            error: error.message
          });
        }
      }

      return results;
    }

    validateVocabularyJSON(data) {
      const required = ['word', 'meaning_vi', 'part_of_speech', 'ipa', 'example', 'example_vi'];
      return required.every(field => field in data && data[field] !== null && data[field] !== undefined);
    }

    async regenerateField(word, field, context = '', level = 'intermediate') {
      try {
        const response = await fetch('/api/ai/vocabulary/regenerate-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, field, context, level })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Field Regeneration Error:', error);
        throw error;
      }
    }
  }

  window.aiVocabularyGenerator = new AIVocabularyGenerator();
})();