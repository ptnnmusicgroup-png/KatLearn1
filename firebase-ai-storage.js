// Firebase Integration for AI-Generated Vocabulary Storage
(function() {
  window.aiVocabStorage = {
    async saveGeneratedVocabToPack(packId, vocabulary) {
      if (!window.studyStore?.user) {
        throw new Error('User must be logged in');
      }

      try {
        const pack = JSON.parse(localStorage.getItem(`pack_${packId}`) || '{}');
        pack.words = pack.words || [];
        
        // Merge new vocabulary
        vocabulary.forEach(word => {
          const existing = pack.words.findIndex(w => w.word.toLowerCase() === word.word.toLowerCase());
          if (existing === -1) {
            pack.words.push({
              ...word,
              addedAt: new Date().toISOString(),
              source: 'ai-generated'
            });
          }
        });

        localStorage.setItem(`pack_${packId}`, JSON.stringify(pack));

        // Sync with Firebase if connected
        if (window.studyStore?.connected()) {
          await window.studyStore.savePack(packId, pack);
        }

        return { success: true, count: vocabulary.length };
      } catch (error) {
        console.error('Save pack error:', error);
        throw error;
      }
    },

    async getAiGenerationHistory(packId) {
      try {
        const pack = JSON.parse(localStorage.getItem(`pack_${packId}`) || '{}');
        const aiWords = (pack.words || []).filter(w => w.source === 'ai-generated');
        return aiWords;
      } catch (error) {
        console.error('Get history error:', error);
        return [];
      }
    }
  };
})();