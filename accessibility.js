// Accessibility improvements
(function() {
  window.accessibilityUtils = {
    init() {
      this.addKeyboardNavigation();
      this.improveAriaLabels();
      this.addSkipLinks();
      this.enhanceContrastRatios();
      this.improveFormLabels();
    },

    addKeyboardNavigation() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.querySelector('.modal.show');
          if (modal) {
            modal.classList.remove('show');
          }
        }
        if (e.key === 'Tab') {
          document.body.classList.add('keyboard-focus');
        }
      });
    },

    improveAriaLabels() {
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        if (!btn.getAttribute('aria-label') && btn.textContent.trim()) {
          btn.setAttribute('aria-label', btn.textContent.trim());
        }
      });
    },

    addSkipLinks() {
      const skipLink = document.createElement('a');
      skipLink.href = '#main';
      skipLink.className = 'skip-link';
      skipLink.textContent = 'Skip to main content';
      document.body.prepend(skipLink);

      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.setAttribute('id', 'main');
      }
    },

    enhanceContrastRatios() {
      // Add focus styles
      const style = document.createElement('style');
      style.textContent = `
        *:focus {
          outline: 3px solid #6d5efc !important;
          outline-offset: 2px;
        }
        .keyboard-focus *:focus {
          outline: 3px solid #6d5efc !important;
        }
        .skip-link {
          position: absolute;
          top: -40px;
          left: 0;
          background: #6d5efc;
          color: white;
          padding: 8px;
          z-index: 100;
          border-radius: 0 0 4px 0;
        }
        .skip-link:focus {
          top: 0;
        }
      `;
      document.head.appendChild(style);
    },

    improveFormLabels() {
      const inputs = document.querySelectorAll('input:not([type="hidden"])');
      inputs.forEach(input => {
        if (!input.id) {
          input.id = `input_${Math.random().toString(36).substr(2, 9)}`;
        }
        let label = document.querySelector(`label[for="${input.id}"]`);
        if (!label && input.placeholder) {
          label = document.createElement('label');
          label.setAttribute('for', input.id);
          label.textContent = input.placeholder;
          label.className = 'sr-only';
          input.parentNode.insertBefore(label, input);
        }
      });
    }
  };
})();