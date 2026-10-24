/* KatLearn Motion System — playful, restrained and accessible. */
(() => {
  'use strict';

  const REDUCED_MOTION = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const COUNTERS = '#coinCount,#panelCoins,#panelEnergy,#panelWords,#cardStep,#cardTotal,#learnKnownCount,#learnRemainingCount,#learnKnownPercent,#wordTotalStat,#wordKnownStat,#wordUnknownStat,#wordProgressStat,#reflexScore,#reflexCombo,#resultPercent,#resultCorrect,#resultWrong,#resultTotal,#currentStreakValue,#streakGoalCount,#dailyCount,#dailyPercent';
  const FEEDBACK = '.answer,.test-option,.quiz-option,.match-pair,.match-card,[data-answer-option]';
  const counterText = new WeakMap();
  const counterBusy = new WeakSet();
  let interacted = false;
  let dailyGoalDone = readDailyCount();
  let audioContext = null;

  function readDailyCount() {
    const node = document.querySelector('#dailyCount');
    const match = String(node?.textContent || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }
  function parseCounter(value) {
    const match = String(value ?? '').trim().match(/^([^\d-]*)(-?[\d,]+)(.*)$/);
    if (!match || /^\./.test(match[3])) return null;
    const n = Number(match[2].replace(/,/g, ''));
    if (!Number.isFinite(n)) return null;
    return { prefix: match[1], value: n, suffix: match[3], grouped: match[2].includes(',') };
  }
  function formatCounter(n, parsed) {
    const rounded = Math.round(n);
    const value = parsed.grouped ? rounded.toLocaleString('en-US') : String(rounded);
    return parsed.prefix + value + parsed.suffix;
  }
  function animateCounter(node, from, to, parsed) {
    if (REDUCED_MOTION() || from === to || Math.abs(to - from) > 1000000) {
      node.textContent = formatCounter(to, parsed);
      counterText.set(node, node.textContent);
      return;
    }
    counterBusy.add(node);
    const start = performance.now();
    const duration = 420;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = formatCounter(from + (to - from) * eased, parsed);
      if (t < 1) requestAnimationFrame(frame);
      else {
        node.textContent = formatCounter(to, parsed);
        counterText.set(node, node.textContent);
        counterBusy.delete(node);
      }
    }
    requestAnimationFrame(frame);
  }
  function initCounter(node, animateAdded = false) {
    if (!(node instanceof Element) || counterBusy.has(node)) return;
    const text = String(node.textContent || '').trim();
    const parsed = parseCounter(text);
    if (!parsed) { counterText.set(node, text); return; }
    if (!counterText.has(node)) {
      counterText.set(node, text);
      if (animateAdded && parsed.value > 0 && !REDUCED_MOTION()) animateCounter(node, 0, parsed.value, parsed);
      return;
    }
    const previousText = counterText.get(node);
    if (previousText === text) return;
    counterText.set(node, text);
    const previous = parseCounter(previousText);
    if (previous && previous.value !== parsed.value) animateCounter(node, previous.value, parsed.value, parsed);
  }
  function initializeCounters(root = document) {
    if (root instanceof Element && root.matches(COUNTERS)) initCounter(root, false);
    root.querySelectorAll?.(COUNTERS).forEach(node => initCounter(node, false));
  }

  function playCorrectTone() {
    if (!interacted || REDUCED_MOTION()) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const now = audioContext.currentTime;
      [659.25, 880].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * 0.065;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.028, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.12);
      });
    } catch (_) { /* Sound is decorative; never interrupt learning if unsupported. */ }
  }

  function sparkleBurst(x, y, count = 38) {
    if (REDUCED_MOTION() || !document.body) return;
    const layer = document.createElement('div');
    layer.className = 'kl-confetti-layer';
    layer.setAttribute('aria-hidden', 'true');
    const palette = ['#a99cff', '#38b7dc', '#f39bb1', '#58d6a4', '#f0c773', '#fff0a8'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('i');
      piece.className = 'kl-confetti-piece';
      piece.style.left = x + 'px';
      piece.style.top = y + 'px';
      piece.style.setProperty('--kl-dx', ((Math.random() - 0.5) * 300) + 'px');
      piece.style.setProperty('--kl-dy', (60 + Math.random() * 220) + 'px');
      piece.style.setProperty('--kl-spin', ((Math.random() * 900) - 450) + 'deg');
      piece.style.setProperty('--kl-confetti-color', palette[i % palette.length]);
      piece.style.setProperty('--kl-delay', (Math.random() * 140) + 'ms');
      piece.style.setProperty('--kl-piece-width', (5 + Math.random() * 5) + 'px');
      piece.style.setProperty('--kl-piece-height', (7 + Math.random() * 7) + 'px');
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    window.setTimeout(() => layer.remove(), 1450);
  }
  function celebrate() {
    sparkleBurst(window.innerWidth / 2, Math.max(120, window.innerHeight * 0.25), 48);
  }

  function playFeedback(node, type) {
    if (!(node instanceof Element)) return;
    if (type === 'correct') {
      node.classList.remove('kl-feedback-pop', 'kl-feedback-shake');
      void node.offsetWidth;
      node.classList.add('kl-feedback-pop');
      if (interacted) playCorrectTone();
      window.setTimeout(() => node.classList.remove('kl-feedback-pop'), 560);
    } else if (type === 'wrong') {
      const panel = node.closest('.quiz-panel,.question-wrap,.test-card,.test-run,.study-panel') || node;
      panel.classList.remove('kl-feedback-shake');
      void panel.offsetWidth;
      panel.classList.add('kl-feedback-shake');
      window.setTimeout(() => panel.classList.remove('kl-feedback-shake'), 420);
    }
  }
  function inspectFeedback(node) {
    if (!(node instanceof Element)) return;
    const hasCorrect = node.matches(FEEDBACK) && node.classList.contains('correct');
    const hasWrong = node.matches(FEEDBACK) && node.classList.contains('wrong');
    if (!hasCorrect && !hasWrong) {
      if (!node.classList.contains('correct') && !node.classList.contains('wrong')) delete node.dataset.klMotionFeedback;
      return;
    }
    const type = hasCorrect ? 'correct' : 'wrong';
    if (node.dataset.klMotionFeedback === type) return;
    node.dataset.klMotionFeedback = type;
    playFeedback(node, type);
  }

  function revealItems(root = document) {
    if (REDUCED_MOTION()) return;
    const selector = '.activity-grid > *, .pack-grid > *, .mode-grid > *, .reflex-pack-grid > *, .shop-grid > *, .progress-pack-list > *, .word-list .word-item, .full-personal-pack-words > *, .test-option, .answer, .metric, .reflex-hud-card, .progress-pack-card, .personal-full-word-row';
    const nodes = [];
    if (root instanceof Element && root.matches(selector)) nodes.push(root);
    root.querySelectorAll?.(selector).forEach(node => nodes.push(node));
    nodes.forEach((node, index) => {
      if (node.dataset.klRevealed) return;
      node.dataset.klRevealed = '1';
      node.style.setProperty('--kl-delay', Math.min(index, 7) * 32 + 'ms');
      node.classList.add('kl-reveal');
    });
  }

  function addRipple(button, event) {
    if (!(button instanceof HTMLElement) || button.disabled || REDUCED_MOTION()) return;
    button.classList.add('kl-ripple-host');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.25;
    const ripple = document.createElement('span');
    ripple.className = 'kl-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  }

  function onClick(event) {
    interacted = true;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const button = target.closest('button,[role="button"]');
    if (button) addRipple(button, event);
    const audioButton = target.closest('#cardSpeakBtn,#speakCardBtn,[data-speak],.audio-btn');
    if (audioButton) {
      audioButton.classList.remove('kl-audio-glow');
      void audioButton.offsetWidth;
      audioButton.classList.add('kl-audio-glow');
      const card = document.querySelector('#flashcard');
      card?.classList.add('kl-audio-glow');
      window.setTimeout(() => {
        audioButton.classList.remove('kl-audio-glow');
        card?.classList.remove('kl-audio-glow');
      }, 700);
    }
  }

  function onMutations(records) {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof Element) {
        const node = record.target;
        if (node.matches(FEEDBACK)) inspectFeedback(node);
        if (!node.classList.contains('correct') && !node.classList.contains('wrong')) delete node.dataset.klMotionFeedback;
        if (node.matches(COUNTERS)) initCounter(node, false);
      }
      for (const added of record.addedNodes || []) {
        if (!(added instanceof Element)) continue;
        inspectFeedback(added);
        added.querySelectorAll?.(FEEDBACK).forEach(inspectFeedback);
        revealItems(added);
        initializeCounters(added);
        if (added.matches?.('.reflex-result-stat b,.result-stats b,.test-result-stat b')) initCounter(added, true);
        added.querySelectorAll?.('.reflex-result-stat b,.result-stats b,.test-result-stat b').forEach(node => initCounter(node, true));
      }
    }
  }

  function boot() {
    if (!document.body) return;
    initializeCounters();
    revealItems();
    if (!REDUCED_MOTION()) {
      document.body.classList.add('kl-motion-enter');
      window.setTimeout(() => document.body?.classList.remove('kl-motion-enter'), 520);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', () => { interacted = true; }, { passive: true, once: true });
    document.addEventListener('keydown', () => { interacted = true; }, { passive: true, once: true });
    const observer = new MutationObserver(onMutations);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], characterData: true });
    window.addEventListener('katlearn-daily-goal-state', event => {
      const done = Math.max(0, Number(event.detail?.done) || 0);
      if (interacted && done >= 10 && dailyGoalDone < 10) celebrate();
      dailyGoalDone = done;
    });
    window.addEventListener('katlearn-deck-complete', () => celebrate());
    window.addEventListener('katlearn-test-complete', event => {
      if (interacted && Number(event.detail?.pct) >= 100) celebrate();
    });
    window.addEventListener('katlearn-streak-goal-state', event => {
      if (interacted && event.detail?.justCompleted) celebrate();
    });
  }

  window.KatLearnMotion = Object.freeze({
    celebrate,
    setSoundEnabled(enabled) {
      try { localStorage.setItem('katlearn-motion-sound', enabled ? 'on' : 'off'); } catch (_) {}
    }
  });
  const originalPlayCorrectTone = playCorrectTone;
  // Respect an optional user preference while keeping feedback short and quiet.
  const toneAllowed = () => {
    try { return localStorage.getItem('katlearn-motion-sound') !== 'off'; } catch (_) { return true; }
  };
  // Wrap the feedback helper so the audio cue can be switched off without affecting visuals.
  const rawPlayFeedback = playFeedback;
  // Use the preference in MutationObserver-driven feedback as well as direct clicks.
  playFeedback = function(node, type) {
    if (type === 'correct' && !toneAllowed()) {
      const previousInteracted = interacted;
      interacted = false;
      rawPlayFeedback(node, type);
      interacted = previousInteracted;
      return;
    }
    rawPlayFeedback(node, type);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
