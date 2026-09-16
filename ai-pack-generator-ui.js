// AI Pack Generator UI - Two creation modes
(function() {
  const MODAL_HTML = `
    <div class="ai-pack-modal" id="aiPackModal">
      <div class="ai-pack-container">
        <div class="ai-pack-header">
          <h2>✨ Tạo Bộ Từ Vựng</h2>
          <button type="button" class="modal-close" id="closeAiPackModal">×</button>
        </div>

        <!-- CREATION MODE SELECTOR -->
        <div id="creationModeSelector" class="creation-mode-selector">
          <h3>Bạn muốn tạo pack bằng cách nào?</h3>
          
          <div class="mode-grid">
            <button class="mode-card manual-mode" id="selectManualMode">
              <div class="mode-icon">✏️</div>
              <div class="mode-title">MANUAL</div>
              <div class="mode-desc">Thêm từ vựng theo cách thủ công. AI sẽ giúp điền thông tin từng từ.</div>
            </button>

            <button class="mode-card ai-mode" id="selectAiMode">
              <div class="mode-icon">✨</div>
              <div class="mode-title">AI GENERATOR</div>
              <div class="mode-desc">Nhập chủ đề và để AI tạo một pack hoàn chỉnh.</div>
            </button>
          </div>
        </div>

        <!-- AI GENERATOR MODE -->
        <div id="aiGeneratorMode" class="ai-generator-mode" hidden>
          <div class="ai-gen-form">
            <div class="form-group">
              <label>Chủ đề <span class="required">*</span></label>
              <input type="text" id="aiGenTopic" placeholder="VD: Global Warming, Travel, Technology..." required>
            </div>

            <div class="form-row">
              <div class="form-group half">
                <label>Số lượng từ</label>
                <select id="aiGenWordCount">
                  <option value="10">10 từ</option>
                  <option value="20">20 từ</option>
                  <option value="30" selected>30 từ</option>
                  <option value="40">40 từ</option>
                  <option value="50">50 từ</option>
                </select>
              </div>
              <div class="form-group half">
                <label>Cấp độ</label>
                <select id="aiGenDifficulty">
                  <option value="beginner">Beginner</option>
                  <option value="elementary">Elementary</option>
                  <option value="pre-intermediate">Pre-Intermediate</option>
                  <option value="intermediate" selected>Intermediate</option>
                  <option value="upper-intermediate">Upper-Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="ielts">IELTS</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group half">
                <label>Mục đích học tập</label>
                <select id="aiGenPurpose">
                  <option value="general">General English</option>
                  <option value="school">School</option>
                  <option value="ielts">IELTS</option>
                  <option value="toeic">TOEIC</option>
                  <option value="academic">Academic English</option>
                  <option value="speaking">Speaking</option>
                  <option value="writing">Writing</option>
                  <option value="reading">Reading</option>
                </select>
              </div>
              <div class="form-group half">
                <label>Loại từ</label>
                <select id="aiGenWordType">
                  <option value="mixed" selected>Trộn lẫn</option>
                  <option value="nouns">Danh từ</option>
                  <option value="verbs">Động từ</option>
                  <option value="adjectives">Tính từ</option>
                  <option value="adverbs">Trạng từ</option>
                  <option value="phrasal">Phrasal Verbs</option>
                  <option value="collocations">Collocations</option>
                  <option value="idioms">Idioms</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Hướng dẫn bổ sung (tùy chọn)</label>
              <textarea id="aiGenInstructions" placeholder="VD: Tập trung vào vocabulary phổ biến trong IELTS Writing..." rows="3"></textarea>
            </div>

            <div class="ai-gen-actions">
              <button type="button" id="generatePackBtn" class="btn-primary btn-large">✨ Tạo Pack</button>
              <button type="button" id="backToModeBtn" class="btn-secondary">← Quay lại</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.aiPackGeneratorUI = {
    currentMode: null,
    generatedPack: null,

    init() {
      if (document.getElementById('aiPackModal')) return;

      const container = document.createElement('div');
      container.innerHTML = MODAL_HTML;
      document.body.appendChild(container.firstElementChild);

      this.setupEventListeners();
      this.loadStyles();
    },

    setupEventListeners() {
      document.getElementById('selectManualMode').addEventListener('click', () => {
        if (window.aiVocabularyUI && window.aiVocabularyUI.open) {
          window.aiVocabularyUI.open();
        }
        this.close();
      });

      document.getElementById('selectAiMode').addEventListener('click', () => {
        this.switchToAiMode();
      });

      document.getElementById('generatePackBtn').addEventListener('click', () => this.generatePack());
      document.getElementById('backToModeBtn').addEventListener('click', () => this.switchToModeSelector());
      document.getElementById('closeAiPackModal').addEventListener('click', () => this.close());
    },

    switchToModeSelector() {
      document.getElementById('creationModeSelector').hidden = false;
      document.getElementById('aiGeneratorMode').hidden = true;
      this.currentMode = null;
    },

    switchToAiMode() {
      document.getElementById('creationModeSelector').hidden = true;
      document.getElementById('aiGeneratorMode').hidden = false;
      this.currentMode = 'ai';
      document.getElementById('aiGenTopic').focus();
    },

    async generatePack() {
      const topic = document.getElementById('aiGenTopic').value.trim();
      const wordCount = parseInt(document.getElementById('aiGenWordCount').value);
      const difficulty = document.getElementById('aiGenDifficulty').value;
      const purpose = document.getElementById('aiGenPurpose').value;
      const wordTypes = document.getElementById('aiGenWordType').value;
      const instructions = document.getElementById('aiGenInstructions').value.trim();

      if (!topic) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Vui lòng nhập chủ đề' }));
        return;
      }

      const btn = document.getElementById('generatePackBtn');
      btn.disabled = true;
      btn.textContent = '⏳ Đang tạo pack...';

      try {
        const pack = await window.aiPackGenerator.generatePackByTopic({
          topic,
          wordCount,
          difficulty,
          purpose,
          wordTypes,
          instructions
        });

        this.generatedPack = pack;
        this.showPackPreview(pack);
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `❌ ${error.message}` }));
      } finally {
        btn.disabled = false;
        btn.textContent = '✨ Tạo Pack';
      }
    },

    showPackPreview(pack) {
      // Dispatch event to show preview modal
      window.dispatchEvent(new CustomEvent('show-pack-preview', {
        detail: pack
      }));
    },

    open() {
      document.getElementById('aiPackModal').classList.add('show');
      this.switchToModeSelector();
    },

    close() {
      document.getElementById('aiPackModal').classList.remove('show');
      this.generatedPack = null;
    },

    loadStyles() {
      const style = document.createElement('style');
      style.textContent = `
        #aiPackModal {
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
        #aiPackModal.show {
          display: flex;
        }
        .ai-pack-container {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .ai-pack-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .ai-pack-header h2 {
          margin: 0;
          color: #24364b;
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
        .creation-mode-selector h3 {
          text-align: center;
          color: #24364b;
          margin-bottom: 24px;
        }
        .mode-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .mode-card {
          padding: 24px;
          border: 2px solid #ebedf4;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mode-card:hover {
          border-color: #6d5efc;
          background: #f7f8fc;
          transform: translateY(-2px);
        }
        .mode-icon {
          font-size: 32px;
        }
        .mode-title {
          font-weight: 700;
          color: #24364b;
          font-size: 16px;
        }
        .mode-desc {
          font-size: 13px;
          color: #8290a3;
          line-height: 1.5;
        }
        .ai-gen-form .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-weight: 600;
          font-size: 13px;
          color: #24364b;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
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
        .ai-gen-actions {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #6d5efc, #8c7eff);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(109, 94, 252, 0.3);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-primary.btn-large {
          width: 100%;
          padding: 12px 20px;
          font-size: 15px;
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
        .btn-secondary:hover {
          background: #ebedf4;
        }
        .required {
          color: #ff7d76;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();
