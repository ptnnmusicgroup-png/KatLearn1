// AI Vocabulary Modal UI & Interactions
(function() {
  const MODAL_HTML = `
    <div class="ai-vocabulary-modal" id="aiVocabModal">
      <div class="ai-vocab-container">
        <div class="ai-vocab-header">
          <h2>Thêm từ vựng với AI</h2>
          <button type="button" class="modal-close" id="closeAiVocabModal">×</button>
        </div>

        <div class="ai-vocab-settings">
          <div class="setting-row">
            <label>Chọn cấp độ:</label>
            <select id="aiVocabLevel">
              <option value="beginner">Beginner</option>
              <option value="elementary">Elementary</option>
              <option value="intermediate" selected>Intermediate</option>
              <option value="upper-intermediate">Upper-Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="ielts">IELTS Academic</option>
            </select>
          </div>
          <div class="setting-row">
            <label>Chủ đề (tùy chọn):</label>
            <input type="text" id="aiVocabContext" placeholder="VD: Unit 7 - Global Warming">
          </div>
        </div>

        <div class="ai-vocab-tabs">
          <button class="tab-btn active" data-tab="single">Thêm từng từ</button>
          <button class="tab-btn" data-tab="bulk">Thêm nhiều từ</button>
        </div>

        <!-- SINGLE MODE -->
        <div id="aiVocabSingleTab" class="ai-vocab-tab active">
          <div class="ai-vocab-form">
            <div class="form-group">
              <label>Từ tiếng Anh <span class="required">*</span></label>
              <input type="text" id="aiWordInput" placeholder="Nhập từ (VD: abandon)" required>
            </div>

            <div class="form-group">
              <label>Nghĩa tiếng Việt</label>
              <input type="text" id="aiMeaningInput" placeholder="">
              <button type="button" class="regen-btn" data-field="meaning" title="Tạo lại">↻</button>
            </div>

            <div class="form-row">
              <div class="form-group half">
                <label>Từ loại</label>
                <input type="text" id="aiPosInput" placeholder="verb, noun, adj...">
                <button type="button" class="regen-btn" data-field="part_of_speech" title="Tạo lại">↻</button>
              </div>
              <div class="form-group half">
                <label>IPA</label>
                <input type="text" id="aiIpaInput" placeholder="/ə'bændən/">
                <button type="button" class="regen-btn" data-field="ipa" title="Tạo lại">↻</button>
              </div>
            </div>

            <div class="form-group">
              <label>Ví dụ tiếng Anh</label>
              <input type="text" id="aiExampleInput" placeholder="">
              <button type="button" class="regen-btn" data-field="example" title="Tạo lại">↻</button>
            </div>

            <div class="form-group">
              <label>Dịch ví dụ</label>
              <input type="text" id="aiExampleViInput" placeholder="">
              <button type="button" class="regen-btn" data-field="example_vi" title="Tạo lại">↻</button>
            </div>

            <div class="form-row">
              <div class="form-group half">
                <label>Từ đồng nghĩa</label>
                <input type="text" id="aiSynonymsInput" placeholder="leave, desert...">
                <button type="button" class="regen-btn" data-field="synonyms" title="Tạo lại">↻</button>
              </div>
              <div class="form-group half">
                <label>Từ trái nghĩa</label>
                <input type="text" id="aiAntonymsInput" placeholder="keep, retain...">
                <button type="button" class="regen-btn" data-field="antonyms" title="Tạo lại">↻</button>
              </div>
            </div>

            <div class="form-group">
              <label>Ghi chú</label>
              <textarea id="aiNotesInput" placeholder="Thêm ghi chú nếu cần" rows="3"></textarea>
            </div>

            <div class="ai-vocab-actions">
              <button type="button" id="generateAiBtn" class="btn-primary">🤖 Tạo với AI</button>
              <button type="button" id="addVocabBtn" class="btn-success">✓ Thêm từ</button>
              <button type="button" id="addAndNextBtn" class="btn-secondary">➜ Thêm & Tiếp theo</button>
              <button type="button" id="cancelAiVocabBtn" class="btn-danger">Hủy</button>
            </div>
          </div>
        </div>

        <!-- BULK MODE -->
        <div id="aiVocabBulkTab" class="ai-vocab-tab">
          <div class="bulk-input-area">
            <label>Nhập từ (mỗi dòng một từ):</label>
            <textarea id="bulkWordsInput" placeholder="abandon&#10;maintain&#10;significant&#10;environment&#10;sustainable" rows="8"></textarea>
            <button type="button" id="generateAllBtn" class="btn-primary">🤖 Tạo tất cả với AI</button>
          </div>

          <div id="bulkProgress" class="bulk-progress" hidden>
            <div class="progress-item">
              <span class="progress-word"></span>
              <span class="progress-status">⏳</span>
            </div>
          </div>
        </div>

        <!-- ADDED VOCABULARY LIST -->
        <div class="ai-vocab-added-list">
          <h3>Từ đã thêm (<span id="addedVocabCount">0</span>)</h3>
          <div id="addedVocabList" class="vocab-list"></div>
        </div>
      </div>
    </div>
  `;

  window.aiVocabularyUI = {
    init() {
      if (document.getElementById('aiVocabModal')) return;
      
      // Thêm modal vào DOM
      const container = document.createElement('div');
      container.innerHTML = MODAL_HTML;
      document.body.appendChild(container.firstElementChild);

      this.setupEventListeners();
      this.loadStyles();
    },

    setupEventListeners() {
      const modal = document.getElementById('aiVocabModal');
      
      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      });

      // Generate with AI
      document.getElementById('generateAiBtn').addEventListener('click', () => this.generateAi());
      document.getElementById('generateAllBtn').addEventListener('click', () => this.generateBulk());

      // Add vocabulary
      document.getElementById('addVocabBtn').addEventListener('click', () => this.addVocabulary());
      document.getElementById('addAndNextBtn').addEventListener('click', () => this.addAndNext());

      // Close buttons
      document.getElementById('closeAiVocabModal').addEventListener('click', () => this.close());
      document.getElementById('cancelAiVocabBtn').addEventListener('click', () => this.close());

      // Regenerate field buttons
      document.querySelectorAll('.regen-btn').forEach(btn => {
        btn.addEventListener('click', () => this.regenerateField(btn.dataset.field));
      });
    },

    async generateAi() {
      const word = document.getElementById('aiWordInput').value.trim();
      const level = document.getElementById('aiVocabLevel').value;
      const context = document.getElementById('aiVocabContext').value.trim();

      if (!word) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Vui lòng nhập từ tiếng Anh' }));
        return;
      }

      const btn = document.getElementById('generateAiBtn');
      btn.disabled = true;
      btn.textContent = '⏳ Đang tạo...';

      try {
        const vocab = await window.aiVocabularyGenerator.generateVocabulary(word, context, level);
        this.populateForm(vocab);
        window.dispatchEvent(new CustomEvent('toast', { detail: '✓ Tạo thành công!' }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `❌ ${error.message}` }));
      } finally {
        btn.disabled = false;
        btn.textContent = '🤖 Tạo với AI';
      }
    },

    async generateBulk() {
      const input = document.getElementById('bulkWordsInput').value.trim();
      const words = input.split('\n').filter(w => w.trim());
      const level = document.getElementById('aiVocabLevel').value;
      const context = document.getElementById('aiVocabContext').value.trim();

      if (words.length === 0) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Vui lòng nhập ít nhất một từ' }));
        return;
      }

      const progressDiv = document.getElementById('bulkProgress');
      progressDiv.hidden = false;
      progressDiv.innerHTML = '';

      const results = await window.aiVocabularyGenerator.generateBatch(words, context, level);

      results.forEach(result => {
        if (result.status === 'success') {
          this.addGeneratedVocab(result.data);
        }
      });

      progressDiv.hidden = true;
      window.dispatchEvent(new CustomEvent('toast', { detail: `✓ Tạo xong ${results.filter(r => r.status === 'success').length}/${words.length} từ` }));
    },

    async regenerateField(field) {
      const word = document.getElementById('aiWordInput').value.trim();
      if (!word) return;

      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '⏳';

      try {
        const result = await window.aiVocabularyGenerator.regenerateField(word, field);
        const fieldMap = {
          'meaning_vi': 'aiMeaningInput',
          'part_of_speech': 'aiPosInput',
          'ipa': 'aiIpaInput',
          'example': 'aiExampleInput',
          'example_vi': 'aiExampleViInput',
          'synonyms': 'aiSynonymsInput',
          'antonyms': 'aiAntonymsInput'
        };
        
        if (fieldMap[field]) {
          const input = document.getElementById(fieldMap[field]);
          if (Array.isArray(result[field])) {
            input.value = result[field].join(', ');
          } else {
            input.value = result[field];
          }
        }
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `❌ Lỗi: ${error.message}` }));
      } finally {
        btn.disabled = false;
        btn.textContent = '↻';
      }
    },

    populateForm(vocab) {
      document.getElementById('aiMeaningInput').value = vocab.meaning_vi;
      document.getElementById('aiPosInput').value = vocab.part_of_speech;
      document.getElementById('aiIpaInput').value = vocab.ipa;
      document.getElementById('aiExampleInput').value = vocab.example;
      document.getElementById('aiExampleViInput').value = vocab.example_vi;
      document.getElementById('aiSynonymsInput').value = Array.isArray(vocab.synonyms) ? vocab.synonyms.join(', ') : vocab.synonyms;
      document.getElementById('aiAntonymsInput').value = Array.isArray(vocab.antonyms) ? vocab.antonyms.join(', ') : vocab.antonyms;
      document.getElementById('aiNotesInput').value = vocab.notes || '';
    },

    addVocabulary() {
      const word = document.getElementById('aiWordInput').value.trim();
      if (!word) return;

      const vocab = this.getFormData();
      this.addGeneratedVocab(vocab);
      this.clearForm();
      document.getElementById('aiWordInput').focus();
    },

    addAndNext() {
      this.addVocabulary();
    },

    addGeneratedVocab(vocab) {
      if (!window.aiVocabularySaved) window.aiVocabularySaved = [];
      window.aiVocabularySaved.push(vocab);

      // Update list
      this.updateAddedList();
    },

    updateAddedList() {
      const list = document.getElementById('addedVocabList');
      const count = document.getElementById('addedVocabCount');
      const saved = window.aiVocabularySaved || [];

      count.textContent = saved.length;
      list.innerHTML = saved.map((vocab, idx) => `
        <div class="vocab-item">
          <div class="vocab-word">${vocab.word}</div>
          <div class="vocab-meaning">${vocab.meaning_vi}</div>
          <div class="vocab-actions">
            <button class="btn-small" onclick="window.aiVocabularyUI.editVocab(${idx})">✎</button>
            <button class="btn-small danger" onclick="window.aiVocabularyUI.deleteVocab(${idx})">✕</button>
          </div>
        </div>
      `).join('');
    },

    deleteVocab(idx) {
      window.aiVocabularySaved.splice(idx, 1);
      this.updateAddedList();
    },

    getFormData() {
      return {
        word: document.getElementById('aiWordInput').value.trim(),
        meaning_vi: document.getElementById('aiMeaningInput').value.trim(),
        part_of_speech: document.getElementById('aiPosInput').value.trim(),
        ipa: document.getElementById('aiIpaInput').value.trim(),
        example: document.getElementById('aiExampleInput').value.trim(),
        example_vi: document.getElementById('aiExampleViInput').value.trim(),
        synonyms: document.getElementById('aiSynonymsInput').value.trim().split(',').map(s => s.trim()).filter(s => s),
        antonyms: document.getElementById('aiAntonymsInput').value.trim().split(',').map(s => s.trim()).filter(s => s),
        notes: document.getElementById('aiNotesInput').value.trim()
      };
    },

    clearForm() {
      ['aiWordInput', 'aiMeaningInput', 'aiPosInput', 'aiIpaInput', 'aiExampleInput', 'aiExampleViInput', 'aiSynonymsInput', 'aiAntonymsInput', 'aiNotesInput'].forEach(id => {
        document.getElementById(id).value = '';
      });
    },

    switchTab(tab) {
      document.querySelectorAll('.ai-vocab-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      document.getElementById(`aiVocab${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
      event.target.classList.add('active');
    },

    open() {
      document.getElementById('aiVocabModal').classList.add('show');
      window.aiVocabularySaved = [];
      this.updateAddedList();
      this.clearForm();
      document.getElementById('aiWordInput').focus();
    },

    close() {
      document.getElementById('aiVocabModal').classList.remove('show');
      
      // Save to pack if needed
      if (window.aiVocabularySaved && window.aiVocabularySaved.length > 0) {
        window.dispatchEvent(new CustomEvent('ai-vocab-saved', { detail: window.aiVocabularySaved }));
      }
    },

    loadStyles() {
      const style = document.createElement('style');
      style.textContent = `
        #aiVocabModal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        #aiVocabModal.show {
          display: flex;
        }
        .ai-vocab-container {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .ai-vocab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        }
        .ai-vocab-settings {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #ebedf4;
        }
        .setting-row {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .setting-row label {
          font-size: 12px;
          font-weight: 600;
          color: #8290a3;
        }
        .setting-row select,
        .setting-row input {
          padding: 8px;
          border: 1px solid #ebedf4;
          border-radius: 6px;
          font-size: 14px;
        }
        .ai-vocab-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid #ebedf4;
        }
        .tab-btn {
          padding: 8px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          color: #8290a3;
          font-weight: 500;
        }
        .tab-btn.active {
          color: #6d5efc;
          border-bottom-color: #6d5efc;
        }
        .ai-vocab-tab {
          display: none;
        }
        .ai-vocab-tab.active {
          display: block;
        }
        .ai-vocab-form .form-group {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
        }
        .form-group label {
          font-weight: 600;
          font-size: 13px;
          color: #24364b;
        }
        .form-group input,
        .form-group textarea {
          padding: 8px 12px;
          border: 1px solid #ebedf4;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }
        .form-group textarea {
          resize: vertical;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .form-group.half {
          margin-bottom: 0;
        }
        .regen-btn {
          position: absolute;
          right: 8px;
          top: 28px;
          width: 28px;
          height: 28px;
          border: 1px solid #ebedf4;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }
        .regen-btn:hover {
          background: #f7f8fc;
          border-color: #6d5efc;
        }
        .ai-vocab-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 20px;
        }
        .ai-vocab-added-list {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ebedf4;
        }
        .ai-vocab-added-list h3 {
          margin-top: 0;
          color: #24364b;
        }
        .vocab-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .vocab-item {
          padding: 8px;
          background: #f7f8fc;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vocab-word {
          font-weight: 600;
          color: #24364b;
        }
        .vocab-meaning {
          font-size: 12px;
          color: #8290a3;
          flex: 1;
          margin-left: 12px;
        }
        .vocab-actions {
          display: flex;
          gap: 4px;
        }
        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
          border: 1px solid #ebedf4;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }
        .btn-small.danger {
          color: #ff7d76;
        }
        .bulk-input-area textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ebedf4;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          margin: 8px 0;
        }
        .bulk-progress {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #ebedf4;
          border-radius: 6px;
          padding: 12px;
        }
        .progress-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          border-bottom: 1px solid #ebedf4;
        }
        .progress-word {
          font-weight: 600;
        }
        .progress-status {
          color: #6d5efc;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();