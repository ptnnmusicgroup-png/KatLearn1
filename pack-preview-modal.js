// Pack Preview Modal - Review and edit before saving
(function() {
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));
  const PREVIEW_HTML = `
    <div class="pack-preview-modal" id="packPreviewModal">
      <div class="pack-preview-container">
        <div class="preview-header">
          <div class="preview-header-main">
            <div class="preview-brand-mark">🐱</div>
            <div class="preview-title">
              <span class="preview-eyebrow">KATLEARN · PACK STUDIO</span>
              <h2>Review your pack</h2>
              <p>Kiểm tra nhanh, tinh chỉnh lần cuối rồi lưu vào thư viện cá nhân.</p>
            </div>
          </div>
          <button type="button" class="modal-close" id="closePreviewModal" aria-label="Đóng preview">×</button>
        </div>

        <section class="preview-pack-hero">
          <div class="preview-pack-avatar">📚</div>
          <div class="preview-pack-copy">
            <span class="preview-mini-label">PACK NAME</span>
            <input type="text" id="previewPackTitle" class="editable-field preview-title-field" placeholder="Tên bộ từ">
            <textarea id="previewPackDesc" class="editable-field preview-desc-field" rows="2" placeholder="Mô tả ngắn cho bộ từ của bạn"></textarea>
            <div class="preview-badges">
              <span class="preview-badge" id="previewPackTopic">✨ Kat AI</span>
              <span class="preview-badge" id="previewPackDifficulty">◉ Intermediate</span>
              <span class="preview-badge" id="previewPackPurpose">📚 General</span>
            </div>
          </div>
        </section>

        <section class="preview-stat-grid" aria-label="Thông tin pack">
          <div class="preview-stat-card">
            <span class="preview-stat-icon">🔤</span>
            <div><b id="previewStatWords">0</b><small>Từ vựng</small></div>
          </div>
          <div class="preview-stat-card">
            <span class="preview-stat-icon">🧠</span>
            <div><b id="previewStatRich">0</b><small>Đã có dữ liệu AI</small></div>
          </div>
          <div class="preview-stat-card">
            <span class="preview-stat-icon">🪄</span>
            <div><b>1</b><small>AI request</small></div>
          </div>
        </section>

        <section class="preview-vocabulary-list">
          <div class="list-header">
            <div>
              <span class="preview-section-kicker">VOCABULARY</span>
              <h3>Danh sách từ <span class="preview-count-pill" id="previewWordListCount">0</span></h3>
              <p class="preview-list-subtitle">Cuộn ngang để xem từng từ. Mỗi thẻ có thể tạo lại hoặc xóa trực tiếp.</p>
            </div>
            <div class="list-actions">
              <button id="regeneratePackBtn" class="btn-small">🔄 Tạo lại pack</button>
            </div>
          </div>
          <div id="previewWordsList" class="words-list"></div>
        </section>

        <div class="preview-divider"></div>

        <div class="preview-actions">
          <button id="backToEditBtn" class="btn-secondary btn-large">← Quay lại chỉnh sửa</button>
          <button id="savePackBtn" class="btn-primary btn-large">💾 Lưu bộ từ</button>
        </div>
        <p class="preview-save-hint">🐾 Kat sẽ lưu đúng phiên bản bạn đang xem ở đây.</p>
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
      this.updatePackMeta();

      this.renderWordsList();
      document.getElementById('packPreviewModal').classList.add('show');
    },

    updatePackMeta() {
      const pack = this.currentPack?.pack || {};
      const words = this.currentPack?.words || [];
      const topic = pack.topic || pack.suggested_title || 'Kat AI';
      const difficulty = pack.difficulty || 'intermediate';
      const purpose = pack.purpose || 'general';
      const rich = words.filter(word => word.meaning_vi || word.example || word.part_of_speech || word.ipa).length;

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value || '');
      };
      setText('previewPackTopic', '✨ ' + topic);
      setText('previewPackDifficulty', '◉ ' + difficulty);
      setText('previewPackPurpose', '📚 ' + purpose);
      setText('previewStatWords', words.length);
      setText('previewStatRich', rich);
    },

    renderWordsList() {
      const list = document.getElementById('previewWordsList');
      const count = document.getElementById('previewWordListCount');
      const words = this.currentPack.words || [];

      count.textContent = words.length;
      this.updatePackMeta();

      list.innerHTML = words.map((word, idx) => `
        <div class="vocab-preview-item">
          <div class="vocab-preview-content">
            <div class="vocab-word">${esc(word.word)}</div>
            <div class="vocab-meta">
              <span class="pos">${esc(word.part_of_speech || 'word')}</span>
              <span class="pron">${esc(word.ipa || '')}</span>
            </div>
            <div class="meaning-line">${esc(word.meaning_vi || 'Chưa có nghĩa tiếng Việt')}</div>
            <div class="vocab-example">
              <small>${esc(word.example || 'Chưa có ví dụ')}</small>
            </div>
            ${word.notes ? '<div class="vocab-note">💡 '+esc(word.notes)+'</div>' : ''}
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
        this.updatePackMeta();
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
        #packPreviewModal{
          display:none;
          position:fixed;
          inset:0;
          z-index:1001;
          align-items:center;
          justify-content:center;
          padding:18px;
          background:rgba(28,22,44,.46);
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
        }
        #packPreviewModal.show{display:flex;}
        .pack-preview-container{
          width:min(1180px,97vw);
          max-height:min(94vh,920px);
          overflow-y:auto;
          overflow-x:hidden;
          padding:24px;
          border:1px solid rgba(255,255,255,.84);
          border-radius:30px;
          background:
            radial-gradient(circle at 8% 0%,rgba(229,224,255,.7),transparent 26%),
            radial-gradient(circle at 100% 15%,rgba(255,226,239,.62),transparent 22%),
            rgba(255,255,255,.965);
          box-shadow:0 32px 110px rgba(35,27,54,.28);
          scrollbar-width:thin;
          scrollbar-color:#d6d0e4 transparent;
        }
        .pack-preview-container::-webkit-scrollbar{width:8px;}
        .pack-preview-container::-webkit-scrollbar-thumb{background:#d8d2e5;border-radius:999px;}

        .preview-header{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:20px;
          padding-bottom:17px;
          border-bottom:1px solid #eeeaf4;
        }
        .preview-header-main{display:flex;align-items:center;gap:13px;min-width:0;}
        .preview-brand-mark{
          width:48px;height:48px;flex:0 0 48px;
          display:grid;place-items:center;
          border-radius:16px;
          background:linear-gradient(135deg,#eeeaff,#fff1f6);
          border:1px solid #e6e0f2;
          font-size:24px;
          box-shadow:0 9px 24px rgba(87,72,127,.08);
        }
        .preview-title{min-width:0;}
        .preview-eyebrow,.preview-section-kicker,.preview-mini-label{
          display:block;
          color:#9185ff;
          font-size:9px;
          font-weight:900;
          letter-spacing:.13em;
        }
        .preview-title h2{
          margin:3px 0 4px;
          color:#2f2940;
          font:700 27px/1.05 Fredoka,sans-serif;
          letter-spacing:-.02em;
        }
        .preview-title p{margin:0;color:#8a8297;font-size:11px;}
        .modal-close{
          width:38px;height:38px;flex:0 0 38px;
          border:1px solid #e7e1ef;
          border-radius:12px;
          background:rgba(255,255,255,.78);
          color:#756b82;
          font-size:23px;
          cursor:pointer;
        }
        .modal-close:hover{background:#faf7ff;border-color:#d8cff7;}

        .preview-pack-hero{
          display:grid;
          grid-template-columns:76px minmax(0,1fr);
          gap:17px;
          margin-top:17px;
          padding:18px;
          border:1px solid #e8e2f2;
          border-radius:23px;
          background:rgba(255,255,255,.72);
          box-shadow:0 10px 32px rgba(64,50,92,.055);
        }
        .preview-pack-avatar{
          width:76px;height:76px;
          display:grid;place-items:center;
          border-radius:21px;
          background:linear-gradient(145deg,#f0ecff,#fff0f5);
          border:1px solid #e3dcf2;
          font-size:35px;
        }
        .preview-pack-copy{min-width:0;}
        .preview-title-field{
          display:block;
          width:100%;
          margin:2px 0 6px;
          padding:0;
          border:0;
          outline:none;
          background:transparent;
          color:#342c42;
          font:700 clamp(22px,3vw,31px)/1.08 Fredoka,sans-serif;
        }
        .preview-title-field::placeholder{color:#b2aabb;}
        .preview-desc-field{
          display:block;
          width:100%;
          min-height:42px;
          padding:8px 0 0;
          border:0;
          outline:none;
          resize:vertical;
          background:transparent;
          color:#786f82;
          font:500 12px/1.55 "Be Vietnam Pro",sans-serif;
        }
        .preview-desc-field::placeholder{color:#aaa2b0;}
        .preview-title-field:focus,.preview-desc-field:focus{
          box-shadow:0 2px 0 #d8cff7;
        }
        .preview-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;}
        .preview-badge{
          display:inline-flex;align-items:center;
          min-height:25px;
          padding:4px 9px;
          border:1px solid #e6e0f0;
          border-radius:999px;
          background:#faf9fd;
          color:#71677d;
          font-size:9px;
          font-weight:800;
        }

        .preview-stat-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:10px;
          margin:12px 0 18px;
        }
        .preview-stat-card{
          display:flex;align-items:center;gap:11px;
          min-height:66px;
          padding:11px 13px;
          border:1px solid #eee9f4;
          border-radius:17px;
          background:rgba(255,255,255,.76);
        }
        .preview-stat-icon{
          width:38px;height:38px;flex:0 0 38px;
          display:grid;place-items:center;
          border-radius:12px;
          background:#f4f1fb;
          font-size:18px;
        }
        .preview-stat-card b,.preview-stat-card small{display:block;}
        .preview-stat-card b{color:#3c3348;font:700 21px Fredoka,sans-serif;}
        .preview-stat-card small{margin-top:2px;color:#9a92a3;font-size:9px;font-weight:700;}

        .preview-vocabulary-list{margin:0;}
        .list-header{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:14px;
          margin-bottom:10px;
        }
        .list-header h3{
          display:flex;
          align-items:center;
          gap:8px;
          margin:3px 0 0;
          color:#342c42;
          font:700 20px Fredoka,sans-serif;
        }
        .preview-count-pill{
          min-width:23px;height:23px;
          display:inline-grid;place-items:center;
          padding:0 6px;
          border-radius:999px;
          background:#eeeaff;
          color:#6855d2;
          font:800 10px "Be Vietnam Pro",sans-serif;
        }
        .preview-list-subtitle{margin:4px 0 0;color:#9991a4;font-size:10px;}
        .list-actions{display:flex;gap:8px;}
        .btn-small{
          padding:9px 12px;
          border:1px solid #e7e1ef;
          border-radius:11px;
          background:#fff;
          color:#605670;
          cursor:pointer;
          font:800 10px "Be Vietnam Pro",sans-serif;
        }
        .btn-small:hover{background:#faf7ff;border-color:#d7cef5;}

        .words-list{
          display:flex;
          flex-direction:row;
          gap:11px;
          align-items:stretch;
          overflow-x:auto;
          overflow-y:hidden;
          padding:4px 2px 11px;
          scroll-snap-type:x proximity;
          scrollbar-width:thin;
          scrollbar-color:#d6d0e4 transparent;
        }
        .words-list::-webkit-scrollbar{height:7px;}
        .words-list::-webkit-scrollbar-track{background:transparent;}
        .words-list::-webkit-scrollbar-thumb{background:#d8d2e5;border-radius:999px;}

        .vocab-preview-item{
          position:relative;
          flex:0 0 244px;
          min-height:178px;
          padding:14px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
          gap:9px;
          scroll-snap-align:start;
          border:1px solid #e8e2f1;
          border-radius:19px;
          background:linear-gradient(150deg,rgba(250,248,255,.98),rgba(255,255,255,.98));
          box-shadow:0 9px 26px rgba(61,48,88,.065);
          transition:.18s ease;
        }
        .vocab-preview-item:hover{
          transform:translateY(-2px);
          border-color:#d8cff7;
          box-shadow:0 15px 34px rgba(61,48,88,.10);
        }
        .vocab-preview-content{min-width:0;}
        .vocab-word{
          color:#30283b;
          font:700 20px/1.12 Fredoka,sans-serif;
          overflow-wrap:anywhere;
        }
        .vocab-meta{
          display:flex;
          align-items:center;
          gap:6px;
          margin:8px 0 7px;
          min-width:0;
        }
        .pos,.pron{
          max-width:100%;
          padding:4px 7px;
          border-radius:999px;
          font-size:9px;
          font-weight:900;
        }
        .pos{background:#eeeaff;color:#6552cc;}
        .pron{background:#f3f1f7;color:#8b8296;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .meaning-line{
          min-height:24px;
          color:#675d70;
          font-size:11px;
          font-weight:700;
          line-height:1.4;
        }
        .vocab-example{
          margin-top:5px;
          color:#9b92a4;
          font-size:9px;
          line-height:1.45;
          min-height:27px;
        }
        .vocab-example small{font-size:inherit;}
        .vocab-note{
          margin-top:6px;
          color:#8c8297;
          font-size:8px;
          line-height:1.4;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .vocab-preview-actions{
          display:flex;
          justify-content:flex-end;
          gap:6px;
          padding-top:8px;
          border-top:1px solid #eeeaf4;
        }
        .btn-tiny{
          width:31px;height:31px;
          border:1px solid #e6e0ed;
          border-radius:9px;
          background:#fff;
          color:#70667d;
          cursor:pointer;
        }
        .btn-tiny:hover{border-color:#cbc1ee;background:#faf7ff;}
        .btn-tiny.danger{color:#df6b7d;}

        .preview-divider{height:1px;background:#eeeaf4;margin:13px 0 14px;}
        .preview-actions{display:flex;gap:10px;}
        .btn-primary.btn-large,.btn-secondary.btn-large{
          min-height:46px;
          padding:0 18px;
          border-radius:13px;
          font:800 11px "Be Vietnam Pro",sans-serif;
          cursor:pointer;
        }
        .btn-primary.btn-large{
          flex:1.3;
          border:0;
          color:#fff;
          background:linear-gradient(135deg,#6858ee,#927fff);
          box-shadow:0 12px 28px rgba(104,88,238,.20);
        }
        .btn-secondary.btn-large{
          flex:1;
          border:1px solid #e5dfec;
          color:#544b60;
          background:#f7f5fa;
        }
        .btn-primary.btn-large:hover,.btn-secondary.btn-large:hover{transform:translateY(-1px);}
        .preview-save-hint{
          margin:9px 0 0;
          color:#a198a9;
          text-align:center;
          font-size:9px;
        }

        @media(max-width:800px){
          #packPreviewModal{padding:10px;}
          .pack-preview-container{width:100%;max-height:96vh;padding:16px;border-radius:23px;}
          .preview-pack-hero{grid-template-columns:56px 1fr;padding:14px;border-radius:19px;}
          .preview-pack-avatar{width:56px;height:56px;border-radius:16px;font-size:25px;}
          .preview-stat-grid{grid-template-columns:1fr 1fr;}
          .preview-stat-card:last-child{grid-column:1/-1;}
          .list-header{align-items:flex-start;flex-direction:column;}
          .vocab-preview-item{flex-basis:220px;}
          .preview-actions{flex-direction:column;}
          .btn-primary.btn-large,.btn-secondary.btn-large{width:100%;flex:auto;}
        }
        @media(max-width:520px){
          .preview-stat-grid{grid-template-columns:1fr;}
          .preview-stat-card:last-child{grid-column:auto;}
          .preview-title h2{font-size:23px;}
          .preview-pack-copy .preview-badges{gap:5px;}
          .preview-badge{font-size:8px;}
        }
      `;
      document.head.appendChild(style);
    }
  };
})();
