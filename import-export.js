// Import/Export functionality for vocabulary packs
(function() {
  window.packImportExport = {
    // Export pack to CSV
    exportToCSV(pack) {
      const headers = ['English', 'Vietnamese', 'Part of Speech', 'IPA', 'Example', 'Translation', 'Synonyms', 'Antonyms'];
      const rows = pack.words.map(w => [
        w.word,
        w.meaning,
        w.pos || '',
        w.ipa || '',
        w.example || '',
        w.exampleTranslation || '',
        (w.synonyms || []).join('; '),
        (w.antonyms || []).join('; ')
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${pack.name || 'pack'}_${Date.now()}.csv`;
      link.click();
    },

    // Export pack to JSON
    exportToJSON(pack) {
      const data = JSON.stringify(pack, null, 2);
      const blob = new Blob([data], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${pack.name || 'pack'}_${Date.now()}.json`;
      link.click();
    },

    // Import from CSV
    async importFromCSV(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const words = [];

            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim() === '') continue;

              const values = this.parseCSVLine(lines[i]);
              if (values.length < 2) continue;

              words.push({
                word: values[0]?.trim() || '',
                meaning: values[1]?.trim() || '',
                pos: values[2]?.trim() || '',
                ipa: values[3]?.trim() || '',
                example: values[4]?.trim() || '',
                exampleTranslation: values[5]?.trim() || '',
                synonyms: (values[6]?.trim() || '').split(';').map(s => s.trim()).filter(s => s),
                antonyms: (values[7]?.trim() || '').split(';').map(s => s.trim()).filter(s => s)
              });
            }

            resolve(words);
          } catch (err) {
            reject(new Error('CSV parsing failed: ' + err.message));
          }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsText(file);
      });
    },

    // Import from JSON
    async importFromJSON(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.words || !Array.isArray(data.words)) {
              throw new Error('Invalid JSON format');
            }
            resolve(data.words);
          } catch (err) {
            reject(new Error('JSON parsing failed: ' + err.message));
          }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsText(file);
      });
    },

    parseCSVLine(line) {
      const result = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    }
  };
})();