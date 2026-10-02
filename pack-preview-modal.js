// Pack Preview Modal - Review and edit before saving
(function() {
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));
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

        <div class="preview-vocabulary-list">
          <div class="list-header">
            <div>
              <span class="preview-section-kicker">VOCABULARY PREVIEW</span>
              <h3>Từ Vựng (<span id="previewWordListCount">0</span>)</h3>
              <p class="preview-list-subtitle">Vuốt ngang để xem nhanh toàn bộ từ trong pack.</p>
            </div>
            <div class="list-actions">
              <button id="regeneratePackBtn" class="btn-small">🔄 Tạo lại</button>
            </div>
          </div>

          <div id="previewWordsList" class="words-list"></div>
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
            <div class="vocab-word">${esc(word.word)}</div>
            <div class="vocab-meta">
              <span class="pos">${esc(word.part_of_speech)}</span>
              <span class="meaning">${esc(word.meaning_vi)}</span>
            </div>
            <div class="vocab-example">
              <small>${esc(word.example)}</small>
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

      // Dispatch save event; the persistence listener owns the success toast.
      window.dispatchEvent(new CustomEvent('pack-ready-to-save', {
        detail: this.currentPack
      }));
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
          display:none;
          position:fixed;
          inset:0;
          background:rgba(32,26,48,.48);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          z-index:1001;
          align-items:center;
          justify-content:center;
          padding:18px;
        }
        #packPreviewModal.show {display:flex;}
        .pack-preview-container {
          background:rgba(255,255,255,.97);
          border:1px solid rgba(255,255,255,.82);
          border-radius:26px;
          width:min(1080px,96vw);
          max-height:94vh;
          overflow-y:auto;
          padding:24px;
          box-shadow:0 28px 90px rgba(35,27,54,.24);
        }
        .preview-header {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:18px;
          margin-bottom:16px;
          padding-bottom:14px;
          border-bottom:1px solid #eeeaf4;
        }
        .preview-title h2 {
          margin:0 0 4px;
          color:#2f2940;
          font:700 24px/1.1 Fredoka,sans-serif;
        }
        .preview-title p {
          margin:0;
          font-size:11px;
          color:#8a8297;
        }
        .modal-close {
          background:#f7f5fb;
          border:1px solid #ebe7f2;
          border-radius:11px;
          font-size:21px;
          cursor:pointer;
          padding:0;
          width:34px;
          height:34px;
          color:#746b80;
        }
        .preview-vocabulary-list {
          margin:0 0 16px;
          position:relative;
        }
        .list-header {
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:12px;
          margin-bottom:10px;
        }
        .list-header h3 {
          margin:3px 0 0;
          color:#2f2940;
          font:700 18px Fredoka,sans-serif;
        }
        .preview-section-kicker {
          display:block;
          color:#9185ff;
          font-size:9px;
          font-weight:900;
          letter-spacing:.12em;
        }
        .preview-list-subtitle {
          margin:4px 0 0;
          color:#9991a4;
          font-size:10px;
        }
        .list-actions {
          display:flex;
          gap:8px;
          flex:0 0 auto;
        }
        .btn-small {
          padding:8px 12px;
          font-size:11px;
          border:1px solid #e8e3f0;
          border-radius:11px;
          background:#fff;
          cursor:pointer;
          color:#5f5570;
          font-weight:800;
        }
        .btn-small:hover {
          background:#faf8ff;
          border-color:#cfc5f7;
        }
        .words-list {
          display:flex;
          flex-direction:row;
          align-items:stretch;
          gap:10px;
          overflow-x:auto;
          overflow-y:hidden;
          padding:4px 2px 10px;
          scroll-snap-type:x proximity;
          scrollbar-width:thin;
          scrollbar-color:#d8d1e8 transparent;
          border:0;
          border-radius:0;
          max-height:none;
        }
        .words-list::-webkit-scrollbar {height:7px;}
        .words-list::-webkit-scrollbar-track {background:transparent;}
        .words-list::-webkit-scrollbar-thumb {
          background:#ddd6e9;
          border-radius:999px;
        }
        .vocab-preview-item {
          flex:0 0 230px;
          min-height:142px;
          padding:13px;
          background:linear-gradient(145deg,#fbfaff 0%,#fff 76%);
          border:1px solid #ebe6f4;
          border-radius:17px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          gap:10px;
          scroll-snap-align:start;
          box-shadow:0 7px 22px rgba(57,45,83,.06);
          transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;
        }
        .vocab-preview-item:hover {
          transform:translateY(-2px);
          border-color:#d8cff7;
          box-shadow:0 12px 28px rgba(57,45,83,.1);
        }
        .vocab-preview-content {min-width:0;}
        .vocab-word {
          font:700 19px/1.15 Fredoka,sans-serif;
          color:#332c40;
          margin-bottom:7px;
          overflow-wrap:anywhere;
        }
        .vocab-meta {
          font-size:10px;
          margin-bottom:7px;
          display:flex;
          align-items:center;
          gap:6px;
          min-width:0;
        }
        .pos {
          flex:0 0 auto;
          background:#eeeaff;
          color:#6653cb;
          padding:4px 7px;
          border-radius:999px;
          font-weight:900;
        }
        .meaning {
          color:#756c80;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .vocab-example {
          font-size:10px;
          color:#9991a4;
          line-height:1.45;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
          min-height:29px;
          font-style:normal;
        }
        .vocab-preview-actions {
          display:flex;
          justify-content:flex-end;
          gap:6px;
          padding-top:8px;
          border-top:1px solid #eeeaf4;
        }
        .btn-tiny {
          width:30px;
          height:30px;
          border:1px solid #e8e3f0;
          border-radius:9px;
          background:#fff;
          cursor:pointer;
          font-size:12px;
          padding:0;
          color:#70667d;
        }
        .btn-tiny:hover {border-color:#cfc5f7;background:#faf8ff;}
        .btn-tiny.danger {color:#e16c7d;}
        .preview-pack-info {
          margin:0 0 4px;
          padding:15px;
          background:#faf9fd;
          border:1px solid #eeeaf4;
          border-radius:17px;
        }
        .info-group {
          margin-bottom:10px;
          display:flex;
          flex-direction:column;
          gap:5px;
        }
        .info-group:last-child {margin-bottom:0;}
        .info-group label {
          font-weight:800;
          font-size:10px;
          color:#8b8296;
          letter-spacing:.03em;
        }
        .info-group input,
        .info-group textarea {
          padding:10px 11px;
          border:1px solid #e8e3f0;
          border-radius:11px;
          font-size:12px;
          font-family:inherit;
          background:#fff;
          color:#40374d;
          outline:none;
          resize:vertical;
        }
        .info-group input:focus,
        .info-group textarea:focus {
          border-color:#cfc5f7;
          box-shadow:0 0 0 3px rgba(123,97,255,.08);
        }
        .preview-actions {
          display:flex;
          gap:9px;
          margin-top:16px;
        }
        .btn-primary.btn-large {
          background:linear-gradient(135deg,#6d5efc,#8c7eff);
          color:#fff;
          border:none;
          padding:12px 20px;
          border-radius:12px;
          cursor:pointer;
          font-weight:800;
          flex:1;
        }
        .btn-secondary {
          background:#f5f3f9;
          color:#453c51;
          border:1px solid #e8e3f0;
          padding:10px 20px;
          border-radius:12px;
          cursor:pointer;
          font-weight:800;
          flex:1;
        }
        @media(max-width:700px){
          #packPreviewModal{padding:10px;}
          .pack-preview-container{width:100%;max-height:96vh;padding:17px;border-radius:21px;}
          .list-header{align-items:flex-start;flex-direction:column;}
          .vocab-preview-item{flex-basis:210px;}
          .preview-actions{flex-direction:column;}
        }
      `;
      document.head.appendChild(style);
    }
  };
})();
