// Anti-Cheat System - Comprehensive browser-level monitoring
(function() {
  const config = {
    maxViolations: 2,
    autoSubmitOnViolation: true,
    fullscreenRequired: true,
    enableDevToolsDetection: true,
    enableVisibilityTracking: true,
  };

  let violations = [];
  let isInTestMode = false;
  let testStartTime = null;
  let violations_count = 0;

  window.antiCheatSystem = {
    config,
    violations: [],
    isInTestMode: false,

    init(customConfig = {}) {
      Object.assign(config, customConfig);
    },

    startTestMode() {
      isInTestMode = true;
      testStartTime = Date.now();
      violations = [];
      violations_count = 0;

      if (config.fullscreenRequired) {
        this.requestFullscreen();
      }

      this.setupVisibilityTracking();
      this.setupFocusTracking();
      this.setupFullscreenTracking();
      this.setupDevToolsDetection();
      this.setupContextMenuDisable();
      this.setupCopyPasteDisable();
      this.setupBeforeUnload();
    },

    stopTestMode() {
      isInTestMode = false;
      this.removeAllListeners();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    },

    requestFullscreen() {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
          console.warn('Fullscreen request failed:', err);
          window.dispatchEvent(new CustomEvent('anti-cheat:warning', {
            detail: { type: 'FULLSCREEN_FAILED', message: 'Không thể bật chế độ toàn màn hình' }
          }));
        });
      }
    },

    setupVisibilityTracking() {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    },

    handleVisibilityChange() {
      if (!isInTestMode) return;
      if (document.hidden) {
        this.recordViolation('TAB_SWITCH', 'Rời khỏi tab kiểm tra');
      }
    },

    setupFocusTracking() {
      window.addEventListener('blur', this.handleBlur.bind(this));
      window.addEventListener('focus', this.handleFocus.bind(this));
    },

    handleBlur() {
      if (!isInTestMode) return;
      this.recordViolation('WINDOW_BLUR', 'Rời khỏi cửa sổ trình duyệt');
    },

    handleFocus() {
      if (!isInTestMode) return;
      // Log focus return but don't penalize
    },

    setupFullscreenTracking() {
      document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    },

    handleFullscreenChange() {
      if (!isInTestMode) return;
      if (!document.fullscreenElement && isInTestMode) {
        this.recordViolation('FULLSCREEN_EXIT', 'Thoát chế độ toàn màn hình');
      }
    },

    setupDevToolsDetection() {
      // Check for DevTools every 500ms
      const checkDevTools = () => {
        if (!isInTestMode) return;
        const threshold = 160;
        if (window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold) {
          console.log('[Anti-Cheat] DevTools activity detected');
          window.dispatchEvent(new CustomEvent('anti-cheat:devtools-detected'));
        }
        setTimeout(checkDevTools, 500);
      };
      checkDevTools();
    },

    setupContextMenuDisable() {
      document.addEventListener('contextmenu', (e) => {
        if (isInTestMode) e.preventDefault();
      });
    },

    setupCopyPasteDisable() {
      document.addEventListener('copy', (e) => {
        if (isInTestMode) {
          e.preventDefault();
          this.recordViolation('COPY_ATTEMPT', 'Cố gắng copy text');
        }
      });
      document.addEventListener('paste', (e) => {
        if (isInTestMode) {
          e.preventDefault();
          this.recordViolation('PASTE_ATTEMPT', 'Cố gắng paste text');
        }
      });
      document.addEventListener('cut', (e) => {
        if (isInTestMode) {
          e.preventDefault();
          this.recordViolation('CUT_ATTEMPT', 'Cố gắng cut text');
        }
      });
    },

    setupBeforeUnload() {
      window.addEventListener('beforeunload', (e) => {
        if (isInTestMode && violations_count > 0) {
          e.preventDefault();
          e.returnValue = 'Bạn đang làm bài kiểm tra. Hành động này sẽ được ghi nhận.';
        }
      });
    },

    recordViolation(type, description) {
      if (!isInTestMode) return;

      violations_count++;
      const violation = {
        type,
        description,
        timestamp: Date.now(),
        count: violations_count
      };
      violations.push(violation);
      this.violations.push(violation);

      // Dispatch event
      window.dispatchEvent(new CustomEvent('anti-cheat:violation', {
        detail: violation
      }));

      // Show warning
      if (violations_count === 1) {
        window.dispatchEvent(new CustomEvent('anti-cheat:warning', {
          detail: {
            type,
            message: `⚠️ Cảnh báo: ${description}. Đây là lần cảnh báo cuối cùng.`,
            violationCount: violations_count
          }
        }));
      }

      // Auto-submit on second violation
      if (violations_count >= config.maxViolations && config.autoSubmitOnViolation) {
        window.dispatchEvent(new CustomEvent('anti-cheat:auto-submit', {
          detail: {
            reason: 'MAX_VIOLATIONS_EXCEEDED',
            message: 'Bài kiểm tra sẽ được nộp vì vượt quá số lần vi phạm cho phép.'
          }
        }));
      }
    },

    getViolations() {
      return violations;
    },

    getViolationCount() {
      return violations_count;
    },

    removeAllListeners() {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('blur', this.handleBlur);
      window.removeEventListener('focus', this.handleFocus);
      document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    }
  };
})();