// Pack Preview Modal - Review and edit before saving
(function() {
  const PREVIEW_HTML = `
    <div class="pack-preview-modal" id="packPreviewModal">
      <div class="pack-preview-container">
        <div class="preview-header">
          <div class="preview-title">
            <h2>📋 Review Pack</h2>
            <p>Kiểm tra và chỉnh sửa trước khi lưu</p>
          </div>
          <button type="button" class="modal-close" id="closePreviewModal">×</button>
        </div>

        <div class="preview-pack-info">
          <div class="info-group">
            <label>Tên Pack</label>
            <input type="text" id="previewPackTitle" class="editable-field">
          </div>
          <div class="info-group">
            <label>Mô tả</label>
            <textarea id="previewPackDesc" class="editable-field" rows="2"></textarea>
          </div>
        </div>

        <div class="preview-vocabulary-list">
          <div class="list-header">
            <h3>Từ Vựng (<span id="previewWordListCount">0</span>)</h3>
            <div class="list-actions">
              <button id="regeneratePackBtn" class="btn-small">🔄 Tạo lại</button>
            </div>
          </div>

          <div id="previewWordsList" class="words-list"></div>
        </div>

        <div class="preview-actions">
          <button id="savePackBtn" class="btn-primary btn-large">💾 Lưu Pack</button>
          <button id="backToEditBtn" class="btn-secondary">← Quay lại</button>
        </div>
      </div>
    </div>
  `;

  window.packPreviewModal = {
    currentPack: null,
    originalPack: null,

    init() {
      if (document.getElementById('packPreviewModal')) return;

      const container = document.createElement('div');
      container.innerHTML = PREVIEW_HTML;
      document.body.appendChild(container.firstElementChild);

      this.setupEventListeners();
      this.loadStyles();
    },

    setupEventListeners() {
      document.getElementById('closePreviewModal').addEventListener('click', () => this.close());
      document.getElementById('backToEditBtn').addEventListener('click', () => this.close());
      document.getElementById('savePackBtn').addEventListener('click', () => this.savePack());
      document.getElementById('regeneratePackBtn').addEventListener('click', () => this.regeneratePack());

      // Listen for show-pack-preview event
      window.addEventListener('show-pack-preview', (e) => {
        this.open(e.detail);
      });
    },

    open(pack) {
      this.currentPack = JSON.parse(JSON.stringify(pack)); // Deep copy
      this.originalPack = JSON.parse(JSON.stringify(pack));

      // Populate form
      document.getElementById('previewPackTitle').value = pack.pack.suggested_title || '';
      document.getElementById('previewPackDesc').value = pack.pack.description || '';

      this.renderWordsList();
      document.getElementById('packPreviewModal').classList.add('show');
    },

    renderWordsList() {
      const list = document.getElementById('previewWordsList');
      const count = document.getElementById('previewWordListCount');
      const words = this.currentPack.words || [];

      count.textContent = words.length;

      list.innerHTML = words.map((word, idx) => `
        <div class="vocab-preview-item">
          <div class="vocab-preview-content">
            <div class="vocab-word">${word.word}</div>
            <div class="vocab-meta">
              <span class="pos">${word.part_of_speech}</span>
              <span class="meaning">${word.meaning_vi}</span>
            </div>
            <div class="vocab-example">
              <small>${word.example}</small>
            </div>
          </div>
          <div class="vocab-preview-actions">
            <button onclick="window.packPreviewModal.regenerateWord(${idx})" class="btn-tiny">🔄</button>
            <button onclick="window.packPreviewModal.deleteWord(${idx})" class="btn-tiny danger">🗑️</button>
          </div>
        </div>
      `).join('');
    },

    async regenerateWord(idx) {
      const word = this.currentPack.words[idx];
      const topic = this.currentPack.pack.topic;
      const difficulty = this.currentPack.pack.difficulty;

      try {
        const newWord = await window.aiPackGenerator.regenerateWord(word.word, topic, difficulty);
        this.currentPack.words[idx] = { ...word, ...newWord };
        this.renderWordsList();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✓ Tạo lại từ thành công' }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `❌ ${error.message}` }));
      }
    },

    deleteWord(idx) {
      if (confirm('Bạn chắc chắn muốn xóa từ này?')) {
        this.currentPack.words.splice(idx, 1);
        this.renderWordsList();
      }
    },

    async regeneratePack() {
      if (!confirm('Tạo lại toàn bộ pack sẽ thay thế các từ hiện tại. Tiếp tục?')) return;

      const topic = this.currentPack.pack.topic;
      const wordCount = this.currentPack.words.length;
      const difficulty = this.currentPack.pack.difficulty;
      const purpose = this.currentPack.pack.purpose || 'general';

      try {
        const newPack = await window.aiPackGenerator.regeneratePackAtDifficulty(
          topic,
          wordCount,
          difficulty,
          purpose,
          'mixed'
        );

        this.currentPack = newPack;
        this.renderWordsList();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✓ Tạo lại pack thành công' }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `❌ ${error.message}` }));
      }
    },

    savePack() {
      // Update pack metadata from form
      this.currentPack.pack.suggested_title = document.getElementById('previewPackTitle').value;
      this.currentPack.pack.description = document.getElementById('previewPackDesc').value;

      // Dispatch save event
      window.dispatchEvent(new CustomEvent('pack-ready-to-save', {
        detail: this.currentPack
      }));

      window.dispatchEvent(new CustomEvent('toast', { detail: '✓ Pack đã được lưu' }));
      this.close();
    },

    close() {
      document.getElementById('packPreviewModal').classList.remove('show');
      this.currentPack = null;
      this.originalPack = null;
    },

    loadStyles() {
      const style = document.createElement('style');
      style.textContent = `
        #packPreviewModal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1001;
          align-items: center;
          justify-content: center;
        }
        #packPreviewModal.show {
          display: flex;
        }
        .pack-preview-container {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #ebedf4;
        }
        .preview-title h2 {
          margin: 0 0 4px 0;
          color: #24364b;
        }
        .preview-title p {
          margin: 0;
          font-size: 12px;
          color: #8290a3;
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
        .preview-pack-info {
          margin-bottom: 20px;
          padding: 16px;
          background: #f7f8fc;
          border-radius: 8px;
        }
        .info-group {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-group:last-child {
          margin-bottom: 0;
        }
        .info-group label {
          font-weight: 600;
          font-size: 12px;
          color: #8290a3;
        }
        .info-group input,
        .info-group textarea {
          padding: 8px 10px;
          border: 1px solid #ebedf4;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }
        .preview-vocabulary-list {
          margin-bottom: 20px;
        }
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .list-header h3 {
          margin: 0;
          color: #24364b;
        }
        .list-actions {
          display: flex;
          gap: 8px;
        }
        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
          border: 1px solid #ebedf4;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }
        .btn-small:hover {
          background: #f7f8fc;
          border-color: #6d5efc;
        }
        .words-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #ebedf4;
          border-radius: 6px;
          padding: 8px;
        }
        .vocab-preview-item {
          padding: 10px;
          background: #f7f8fc;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .vocab-preview-content {
          flex: 1;
        }
        .vocab-word {
          font-weight: 700;
          color: #24364b;
          margin-bottom: 4px;
        }
        .vocab-meta {
          font-size: 12px;
          margin-bottom: 4px;
          display: flex;
          gap: 8px;
        }
        .pos {
          background: #6d5efc;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }
        .meaning {
          color: #8290a3;
        }
        .vocab-example {
          font-size: 11px;
          color: #8290a3;
          font-style: italic;
        }
        .vocab-preview-actions {
          display: flex;
          gap: 4px;
        }
        .btn-tiny {
          width: 28px;
          height: 28px;
          border: 1px solid #ebedf4;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
        }
        .btn-tiny:hover {
          background: white;
          border-color: #6d5efc;
        }
        .btn-tiny.danger {
          color: #ff7d76;
        }
        .preview-actions {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }
        .btn-primary.btn-large {
          background: linear-gradient(135deg, #6d5efc, #8c7eff);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          flex: 1;
        }
        .btn-secondary {
          background: #f0f1f5;
          color: #24364b;
          border: 1px solid #ebedf4;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          flex: 1;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();
