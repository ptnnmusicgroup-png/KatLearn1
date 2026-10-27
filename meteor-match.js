(function () {
  'use strict';
  const GAME = 'meteor';
  const MESSAGE_SELECTOR = '#meteorMessage';
  const meteor = { canvas: document.querySelector('#meteorCanvas'), ctx: null, time: 55, score: 0, lives: 3, combo: 0, bestCombo: 0, target: null, asteroids: [], particles: [], stars: [], busy: false, feedback: '', input: document.querySelector('#meteorInput') };
  if (!meteor.canvas || !meteor.input) return;
  meteor.ctx = meteor.canvas.getContext('2d');

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const normalize = (value) => String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  const coordinator = window.__katlearnArcadeCoordinator || (window.__katlearnArcadeCoordinator = { active: '', generation: 0 });
  const state = { game: '', deck: [], running: false, raf: 0, lastFrame: 0, coins: 0 };
  function claimGame() {
    coordinator.active = GAME;
    coordinator.generation += 1;
    window.dispatchEvent(new CustomEvent('katlearn-arcade-starting', { detail: { game: GAME, generation: coordinator.generation } }));
  }
  function meaningOf(word) {
    if (typeof vocabMeaning === 'function') return String(vocabMeaning(word) || '').trim();
    return String(word && (word.mean || word.meaning_vi || word.translation || word.meaning) || '').trim();
  }
  function currentDeck() {
    const sourceWords = typeof vocab !== 'undefined' && Array.isArray(vocab) ? vocab : [];
    return sourceWords.map(function (word) {
      return { word: String(word && word.word || '').trim(), meaning: meaningOf(word),
        pron: String(word && (word.pron || word.ipa || word.pronunciation) || '').trim(),
        source: word && word.__reflexSource || (typeof activeVocabSource !== 'undefined' ? activeVocabSource : { kind: 'legacy' }), raw: word };
    }).filter(function (word) { return word.word && word.meaning; });
  }
  function setMessage(id, message, tone) {
    const element = $(id);
    if (!element) return;
    element.textContent = message || '';
    element.dataset.tone = tone || 'neutral';
  }
  function updateHud(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value);
  }
  function flashFeedback(message, tone) {
    setMessage(MESSAGE_SELECTOR, message, tone || 'neutral');
  }
  async function waitForDeck() {
    const deadline = Date.now() + 10000;
    let deck = currentDeck();
    while (!deck.length && Date.now() < deadline) {
      await new Promise(function (resolve) { window.setTimeout(resolve, 250); });
      deck = currentDeck();
    }
    state.deck = deck;
    return deck;
  }
  function chooseWord(previous) {
    const deck = state.deck;
    if (!deck.length) return null;
    if (deck.length === 1) return deck[0];
    let item = pick(deck), guard = 0;
    while (previous && item.word === previous.word && guard < 12) { item = pick(deck); guard += 1; }
    return item;
  }
  async function submitResult(item, guess, gameMode) {
    const user = await window.studyStore?.waitForAuth?.().catch(function () { return null; });
    if (!user) return { confirmed: false, awarded: false, message: 'Đáp án đúng! Đăng nhập để lưu tiến độ và nhận KatCoin.' };
    const token = await window.studyStore?.getIdToken?.(true);
    if (!token) return { confirmed: false, awarded: false, message: 'Đáp án đúng, nhưng chưa lấy được phiên đăng nhập để cộng KatCoin.' };
    const response = await fetch('/api/game-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'answer', word: item.word, meaning: item.meaning, answer: guess,
        mode: 'vieng', source: item.source || { kind: 'legacy' }, game: gameMode })
    });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok !== true) return { confirmed: false, awarded: false, message: data.error || 'Chưa thể xác nhận KatCoin ở máy chủ.' };
    if (Number.isFinite(Number(data.dailyQuestions)) && typeof updateDailyGoal === 'function') updateDailyGoal(data.dailyQuestions);
    if (data.streakGoal) window.dispatchEvent(new CustomEvent('katlearn-streak-updated', { detail: {
      streakGoal: data.streakGoal, streak: data.streak,
      lastStudyDay: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
      coins: data.coins, goalRewardCoins: Number(data.goalRewardCoins || 0)
    }}));
    if (data.correct === true && Number.isFinite(Number(data.coins))) window.katlearnCoinController?.setFromServer?.(data.coins, 'arcade-reward');
    if (typeof renderProgressDashboard === 'function') void renderProgressDashboard();
    const award = data.correct === true && data.rewarded === true;
    const bonus = Math.max(0, Math.floor(Number(data.goalRewardCoins || 0)));
    if (data.correct !== true) return { confirmed: true, awarded: false, message: 'Máy chủ chưa xác nhận đáp án. Không cộng KatCoin.' };
    return { confirmed: true, awarded: award, bonus, coins: Number(data.coins || 0),
      message: award ? ('+' + (10 + bonus) + ' KatCoin đã được xác nhận!') : (bonus ? '+1.000 KatCoin hoàn thành mục tiêu!' : 'Đáp án đã được lưu.') };
  }
  function drawStars(ctx, stars, width, height, dt, speed) {
    ctx.fillStyle = '#090b21'; ctx.fillRect(0, 0, width, height);
    stars.forEach(function (star) {
      star.x -= speed * dt * star.depth;
      if (star.x < -2) { star.x = width + 2; star.y = random(0, height); }
      ctx.globalAlpha = star.alpha; ctx.fillStyle = '#d5e3ff';
      ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(width * .72, height * .15, 8, width * .72, height * .15, height * .85);
    glow.addColorStop(0, 'rgba(88, 75, 183, .20)'); glow.addColorStop(1, 'rgba(9, 11, 33, 0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
  }
  function seedStars(game, width, height, amount) {
    game.stars = [];
    for (let i = 0; i < amount; i += 1) game.stars.push({ x: random(0, width), y: random(0, height),
      radius: random(.7, 2.1), alpha: random(.22, .85), depth: random(.08, .9) });
  }
  function burstParticles(game, x, y, tone) {
    for (let i = 0; i < 22; i += 1) game.particles.push({ x, y, vx: random(-105, 105), vy: random(-120, 70),
      life: random(.35, .7), maxLife: .7, size: random(2, 5), tone: tone || '#ffb47a' });
  }
  function drawParticles(ctx, game, dt) {
    game.particles = game.particles.filter(function (particle) {
      particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 80 * dt;
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.tone;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
      return particle.life > 0;
    });
    ctx.globalAlpha = 1;
  }
  function stopAnimation() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }
  function showGame() {
    const hub = $('#arcadeShell');
    if (hub) hub.hidden = false;
    $('#arcadeGameCards')?.setAttribute('hidden', '');
    $('#arcadeExit')?.removeAttribute('hidden');
    $('#meteorGame').hidden = GAME !== 'meteor';
    $('#flappyGame').hidden = GAME !== 'flappy';
    state.game = GAME; state.coins = 0;
    updateHud('meteorCoins', '0'); updateHud('flappyCoins', '0');
    const source = $('#reflexSourcePicker');
    if (source) source.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (hub) hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function stopCurrentGame() {
    stopAnimation();
    if (coordinator.active === GAME) coordinator.active = '';
    window.dispatchEvent(new Event('katlearn-arcade-stopping'));
    state.game = '';
    $('#arcadeShell').hidden = true;
    $('#arcadeGameCards')?.removeAttribute('hidden');
    $('#arcadeExit')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.addEventListener('katlearn-arcade-starting', function (event) {
    if (event.detail && event.detail.game !== GAME) stopAnimation();
  });
  window.addEventListener('katlearn-arcade-stopping', stopAnimation);
  window.addEventListener('blur', function () {
    if (state.running && coordinator.active === GAME) state.lastFrame = performance.now();
  });
  window.addEventListener('8b1-auth-change', function () {
    if (!state.running) state.deck = currentDeck();
  });

  const _flashFeedback = flashFeedback;
    function drawAsteroid(ctx, asteroid) {
    const r = asteroid.r;
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);
    ctx.shadowColor = asteroid.target ? '#77eaff' : '#8f88ff';
    ctx.shadowBlur = asteroid.target ? 20 : 8;
    const gradient = ctx.createLinearGradient(-r, -r, r, r);
    gradient.addColorStop(0, asteroid.target ? '#c4fbff' : '#c6c3ff');
    gradient.addColorStop(.48, asteroid.target ? '#4ab7d4' : '#726fbd');
    gradient.addColorStop(1, asteroid.target ? '#234b82' : '#302c61');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = asteroid.target ? 'rgba(205,252,255,.95)' : 'rgba(205,203,255,.6)';
    ctx.lineWidth = asteroid.target ? 2.5 : 1.25;
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const angle = Math.PI * 2 * i / 12;
      const radius = r * (i % 2 ? .88 : .97 + Math.sin(i * 2.7) * .035);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10,18,48,.2)';
    [[-.34,-.2,.12],[.28,.28,.1],[-.05,.42,.07]].forEach(function (spot) {
      ctx.beginPath(); ctx.arc(spot[0]*r,spot[1]*r,spot[2]*r,0,Math.PI*2); ctx.fill();
    });
    ctx.rotate(-asteroid.rotation);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (asteroid.target) {
      // Keep the target word hidden so players must recall it from the Vietnamese meaning.
      ctx.fillStyle = '#fff';
      ctx.font = '800 27px "Be Vietnam Pro", sans-serif';
      ctx.fillText('?',0,-2);
      ctx.fillStyle = '#d7fbff';
      ctx.font = '800 9px "Be Vietnam Pro", sans-serif';
      ctx.fillText('MỤC TIÊU',0,r+12);
      ctx.strokeStyle = 'rgba(131,244,255,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0,0,r+7,0,Math.PI*2); ctx.stroke();
    } else {
      const label=String(asteroid.label||'');
      const size=label.length>13?10:label.length>9?12:label.length>6?14:16;
      ctx.fillStyle='#f8f6ff';
      ctx.font='800 '+size+'px "Be Vietnam Pro", sans-serif';
      ctx.fillText(label,0,0,r*1.55);
    }
    ctx.restore();
  }

  function spawnMeteorWave(previousTarget) {
    const target = chooseWord(previousTarget);
    if (!target) return;
    meteor.target = target;
    const others = distractors(target, 4);
    const items = [{ item: target, target: true }].concat(others.map(function (item) { return { item: item, target: false }; }));
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    const width = meteor.canvas.width;
    meteor.asteroids = items.map(function (entry, index) {
      return {
        x: width * (index + 1) / (items.length + 1) + random(-25, 25),
        y: -random(25, 190) - index * 25,
        r: random(35, 45),
        speed: random(36, 58) + Math.min(22, meteor.score * 0.15),
        rotation: random(0, Math.PI * 2),
        spin: random(-0.24, 0.24),
        label: entry.item.word,
        item: entry.item,
        target: entry.target
      };
    });
    meteor.input.value = '';
    meteor.input.focus({ preventScroll: true });
    updateHud('meteorPrompt', target.meaning);
    updateHud('meteorTargetWord', '???');
  }

  function drawMeteor(dt) {
    const ctx = meteor.ctx, width = meteor.canvas.width, height = meteor.canvas.height;
    drawStars(ctx, meteor.stars, width, height, dt, 8);
    ctx.save();
    ctx.strokeStyle = 'rgba(106, 121, 222, .14)';
    ctx.lineWidth = 1;
    for (let y = 65; y < height; y += 68) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.setLineDash([4, 9]);
    ctx.strokeStyle = 'rgba(255, 149, 186, .42)';
    ctx.beginPath(); ctx.moveTo(0, height - 37); ctx.lineTo(width, height - 37); ctx.stroke();
    ctx.setLineDash([]);
    meteor.asteroids.forEach(function (asteroid) {
      if (state.running) {
        asteroid.y += asteroid.speed * dt;
        asteroid.rotation += asteroid.spin * dt;
      }
      drawAsteroid(ctx, asteroid);
    });
    drawParticles(ctx, meteor, dt);
    ctx.fillStyle = 'rgba(7, 9, 27, .65)';
    ctx.fillRect(0, height - 34, width, 34);
    ctx.fillStyle = '#f4f5ff';
    ctx.font = '700 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GÕ ĐÚNG TỪ ĐỂ NHẬN DIỆN MỤC TIÊU', 18, height - 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9ea8e9';
    ctx.fillText('BỎ LỠ MỤC TIÊU = MẤT 1 MẠNG', width - 18, height - 13);
    ctx.restore();
  }

  function updateMeteorHud() {
    updateHud('meteorScore', meteor.score);
    updateHud('meteorLives', '♥ '.repeat(Math.max(0, meteor.lives)).trim() || '—');
    updateHud('meteorCombo', meteor.combo + '×');
    updateHud('meteorTime', Math.max(0, Math.ceil(meteor.time)) + 's');
    updateHud('meteorBest', meteor.bestCombo + '×');
    updateHud('meteorCoins', state.coins);
  }

  async function submitMeteorAnswer(event) {
    event.preventDefault();
    if (!state.running || state.game !== 'meteor' || meteor.busy || !meteor.target) return;
    const guess = normalize(meteor.input.value);
    if (!guess) return;
    meteor.busy = true;
    const target = meteor.target;
    try {
      const result = await submitResult(target, guess, 'meteor');
      const isLocallyCorrect = guess === normalize(target.word);
      if (isLocallyCorrect) {
        const targetAsteroid = meteor.asteroids.find(function (asteroid) { return asteroid.target; });
        if (targetAsteroid) burstParticles(meteor, targetAsteroid.x, targetAsteroid.y, '#ffd29c');
        meteor.score += 100 + Math.max(0, meteor.combo - 1) * 25;
        meteor.combo += 1;
        meteor.bestCombo = Math.max(meteor.bestCombo, meteor.combo);
        if (result.awarded) state.coins += 10 + (result.bonus || 0);
        else if (result.bonus) state.coins += result.bonus;
        flashFeedback('✨ Chính xác! ' + (result.awarded || result.bonus ? result.message : result.message || 'Kết quả đã được ghi nhận trong phiên.'), result.awarded ? 'good' : 'neutral');
        spawnMeteorWave(target);
      } else {
        meteor.combo = 0;
        flashFeedback('Chưa đúng từ rồi! Thử nhớ lại nghĩa và gõ lại nhé.', 'bad');
        meteor.input.select();
      }
      updateMeteorHud();
    } catch (error) {
      flashFeedback('⚠️ Lỗi kết nối: ' + (error.message || 'chưa xác nhận được kết quả.'), 'bad');
    } finally {
      meteor.busy = false;
      if (state.running && state.game === 'meteor') meteor.input.focus({ preventScroll: true });
    }
  }

  function loseMeteorLife() {
    meteor.lives -= 1;
    meteor.combo = 0;
    if (meteor.target) flashFeedback('Mục tiêu đã đi qua! Từ cần nhớ là: ' + meteor.target.word, 'bad');
    if (meteor.lives <= 0) return endGame('Hết mạng rồi! Thử lại để phá kỷ lục nhé.');
    const old = meteor.target;
    spawnMeteorWave(old);
    updateMeteorHud();
  }

  function tickMeteor(dt) {
    meteor.time -= dt;
    meteor.asteroids.forEach(function (asteroid) {
      if (asteroid.target && asteroid.y > meteor.canvas.height - 70 && !meteor.busy) asteroid.missed = true;
    });
    if (meteor.asteroids.some(function (asteroid) { return asteroid.target && asteroid.missed; })) loseMeteorLife();
    drawMeteor(dt);
    updateMeteorHud();
    if (meteor.time <= 0) endGame('Hết giờ! Mục tiêu đã hoàn thành.');
  }
  function animate(timestamp) {
    if (!state.running || coordinator.active !== GAME) { stopAnimation(); return; }
    const dt = Math.min(.04, Math.max(0, (timestamp - (state.lastFrame || timestamp)) / 1000));
    state.lastFrame = timestamp;
    tickMeteor(dt);
    if (state.running && coordinator.active === GAME) state.raf = requestAnimationFrame(animate);
  }
  function drawGameOver(message) {
    const ctx = meteor.ctx, width = meteor.canvas.width, height = meteor.canvas.height;
    ctx.save(); ctx.fillStyle = 'rgba(6, 8, 26, .72)'; ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 30px "Be Vietnam Pro", sans-serif';
    ctx.fillText('PHIÊN GIẢI MÃ KẾT THÚC', width / 2, height / 2 - 16);
    ctx.font = '600 17px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#c9d1ff';
    ctx.fillText(message, width / 2, height / 2 + 22, width - 80); ctx.restore();
  }
  function endGame(message) {
    if (!state.running || coordinator.active !== GAME) return;
    stopAnimation(); drawMeteor(0); drawGameOver(message);
    flashFeedback(message + ' Điểm: ' + meteor.score + ' · Combo tốt nhất: ' + meteor.bestCombo + '×.', 'neutral');
  }
  async function startMeteor() {
    const deck = await waitForDeck();
    if (!deck.length) {
      flashFeedback('Chưa có từ để chơi. Hãy chọn ít nhất một bộ từ ở mục “Chọn bộ từ để chơi” phía trên nhé.', 'bad');
      $('#reflexSourcePicker')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    stopAnimation(); claimGame(); showGame();
    meteor.time = 55; meteor.score = 0; meteor.lives = 3; meteor.combo = 0; meteor.bestCombo = 0; meteor.busy = false; meteor.particles = [];
    seedStars(meteor, meteor.canvas.width, meteor.canvas.height, 72); spawnMeteorWave(null); updateMeteorHud();
    $('#meteorRestart')?.removeAttribute('hidden');
    flashFeedback('Gõ từ tiếng Anh ứng với nghĩa tiếng Việt để nhận diện mục tiêu!', 'neutral');
    state.running = true; state.lastFrame = 0; state.raf = requestAnimationFrame(animate);
  }
  $('#meteorForm')?.addEventListener('submit', submitMeteorAnswer);
  $('#arcadeMeteorStart')?.addEventListener('click', function () { void startMeteor(); });
  $('#meteorRestart')?.addEventListener('click', function () { void startMeteor(); });
  $('#arcadeExit')?.addEventListener('click', stopCurrentGame);
})();