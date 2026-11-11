(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const normalize = (value) => String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  const state = {
    game: '',
    deck: [],
    running: false,
    raf: 0,
    lastFrame: 0,
    elapsed: 0,
    coins: 0
  };

  const meteor = {
    canvas: $('#meteorCanvas'),
    ctx: null,
    time: 0,
    score: 0,
    lives: 3,
    question: 1,
    maxQuestions: 10,
    energy: 0,
    combo: 0,
    bestCombo: 0,
    target: null,
    asteroids: [],
    particles: [],
    stars: [],
    busy: false,
    feedback: '',
    feedbackUntil: 0,
    input: $('#meteorInput')
  };

  const flappy = {
    canvas: $('#flappyCanvas'),
    time: 0,
    score: 0,
    lives: 3,
    question: 1,
    maxQuestions: 10,
    energy: 0,
    pipe: null,
    answer: '',
    busy: false,
    feedback: '',
    feedbackUntil: 0,
    input: $('#flappyInput')
  };
  let flappyEngine = null;
  let flappyEnginePromise = null;
  let flappyGateCounter = 0;

  if (!meteor.canvas || !flappy.canvas) return;
  meteor.ctx = meteor.canvas.getContext('2d');

  function meaningOf(word) {
    if (typeof vocabMeaning === 'function') return String(vocabMeaning(word) || '').trim();
    return String(word && (word.mean || word.meaning_vi || word.translation || word.meaning) || '').trim();
  }

  function currentDeck() {
    const sourceWords = typeof vocab !== 'undefined' && Array.isArray(vocab) ? vocab : [];
    return sourceWords.map(function (word) {
      return {
        word: String(word && word.word || '').trim(),
        meaning: meaningOf(word),
        pron: String(word && (word.pron || word.ipa || word.pronunciation) || '').trim(),
        source: word && word.__reflexSource || (typeof activeVocabSource !== 'undefined' ? activeVocabSource : { kind: 'legacy' }),
        raw: word
      };
    }).filter(function (word) {
      return word.word && word.meaning;
    });
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

  function flashFeedback(which, message, tone) {
    const game = which === 'meteor' ? meteor : flappy;
    game.feedback = message;
    game.feedbackUntil = performance.now() + 2400;
    setMessage(which === 'meteor' ? '#meteorMessage' : '#flappyMessage', message, tone || 'neutral');
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
    let item = pick(deck);
    let guard = 0;
    while (previous && item.word === previous.word && guard < 12) {
      item = pick(deck);
      guard += 1;
    }
    return item;
  }

  function distractors(target, count) {
    const seen = new Set([normalize(target.word)]);
    const options = state.deck.filter(function (item) {
      const key = normalize(item.word);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options.slice(0, count);
  }

  async function submitResult(item, guess, gameMode) {
    const user = await window.studyStore?.waitForAuth?.().catch(function () { return null; });
    if (!user) return { confirmed: false, awarded: false, message: 'Đúng rồi! Đăng nhập để lưu tiến độ và nhận KatCoin.' };

    const token = await window.studyStore?.getIdToken?.(true);
    if (!token) return { confirmed: false, awarded: false, message: 'Đáp án đúng, nhưng chưa lấy được phiên đăng nhập để cộng KatCoin.' };

    const response = await fetch('/api/game-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        action: 'answer',
        word: item.word,
        meaning: item.meaning,
        answer: guess,
        mode: 'vieng',
        source: item.source || { kind: 'legacy' },
        game: gameMode
      })
    });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok !== true) {
      return { confirmed: false, awarded: false, message: data.error || 'Chưa thể xác nhận KatCoin ở máy chủ.' };
    }
    if (Number.isFinite(Number(data.dailyQuestions)) && typeof updateDailyGoal === 'function') updateDailyGoal(data.dailyQuestions);
    if (data.streakGoal) {
      window.dispatchEvent(new CustomEvent('katlearn-streak-updated', { detail: {
        streakGoal: data.streakGoal,
        streak: data.streak,
        lastStudyDay: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
        coins: data.coins,
        goalRewardCoins: Number(data.goalRewardCoins || 0)
      }}));
    }
    if (data.correct === true && Number.isFinite(Number(data.coins))) {
      window.katlearnCoinController?.setFromServer?.(data.coins, 'arcade-reward');
    }
    if (typeof renderProgressDashboard === 'function') void renderProgressDashboard();
    const award = data.correct === true && data.rewarded === true;
    const bonus = Math.max(0, Math.floor(Number(data.goalRewardCoins || 0)));
    if (data.correct !== true) return { confirmed: true, awarded: false, message: 'Đúng trong game, nhưng máy chủ chưa xác nhận đáp án. Không cộng KatCoin.' };
    return {
      confirmed: true,
      awarded: award,
      bonus: bonus,
      coins: Number(data.coins || 0),
      energy: Number(data.xp || 0),
      message: award ? ('+' + (10 + bonus) + ' KatCoin đã được xác nhận!') : (bonus ? '+1.000 KatCoin hoàn thành mục tiêu!' : 'Đáp án đã được lưu.')
    };
  }

  function drawStars(ctx, stars, width, height, dt, speed) {
    ctx.fillStyle = '#090b21';
    ctx.fillRect(0, 0, width, height);
    stars.forEach(function (star) {
      star.x -= speed * dt * star.depth;
      if (star.x < -2) { star.x = width + 2; star.y = random(0, height); }
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#d5e3ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(width * 0.72, height * 0.15, 8, width * 0.72, height * 0.15, height * 0.85);
    glow.addColorStop(0, 'rgba(88, 75, 183, .20)');
    glow.addColorStop(1, 'rgba(9, 11, 33, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function seedStars(game, width, height, amount) {
    game.stars = [];
    for (let i = 0; i < amount; i += 1) {
      game.stars.push({ x: random(0, width), y: random(0, height), radius: random(0.7, 2.1), alpha: random(0.22, 0.85), depth: random(0.08, 0.9) });
    }
  }

  function drawAsteroid(ctx, asteroid) {
    const r = asteroid.r;
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);
    ctx.shadowColor = asteroid.target ? '#ff789d' : '#6f74ff';
    ctx.shadowBlur = asteroid.target ? 25 : 12;
    const gradient = ctx.createLinearGradient(-r, -r, r, r);
    gradient.addColorStop(0, asteroid.target ? '#ffb18c' : '#7f80da');
    gradient.addColorStop(1, asteroid.target ? '#db4e83' : '#363a75');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = asteroid.target ? '#ffd3df' : 'rgba(185,193,255,.6)';
    ctx.lineWidth = asteroid.target ? 3 : 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const radius = r * (i % 2 ? 0.84 : 1 + Math.sin(i * 3.4) * 0.06);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.rotate(-asteroid.rotation);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxFont = asteroid.label.length > 13 ? 13 : asteroid.label.length > 9 ? 15 : 18;
    ctx.font = '800 ' + maxFont + 'px "Be Vietnam Pro", sans-serif';
    ctx.fillText(asteroid.label, 0, 0, r * 1.65);
    if (asteroid.target) {
      ctx.fillStyle = '#ffe2a1';
      ctx.font = '800 10px "Be Vietnam Pro", sans-serif';
      ctx.fillText('MỤC TIÊU', 0, r + 12);
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

  function burstParticles(game, x, y, tone) {
    for (let i = 0; i < 22; i += 1) {
      game.particles.push({
        x: x, y: y, vx: random(-105, 105), vy: random(-120, 70),
        life: random(0.35, 0.7), maxLife: 0.7, size: random(2, 5),
        tone: tone || '#ffb47a'
      });
    }
  }

  function drawParticles(ctx, game, dt) {
    game.particles = game.particles.filter(function (particle) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 80 * dt;
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.tone;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      return particle.life > 0;
    });
    ctx.globalAlpha = 1;
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
    ctx.fillText('GÕ TỪ TIẾNG ANH ĐỂ BẮN ĐÚNG THIÊN THẠCH', 18, height - 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9ea8e9';
    ctx.fillText('LỆCH MỤC TIÊU = MẤT 1 MẠNG', width - 18, height - 13);
    ctx.restore();
  }

  function updateMeteorHud() {
    updateHud('meteorQuestion', meteor.question + ' / ' + meteor.maxQuestions);
    updateHud('meteorLives', '♥ '.repeat(Math.max(0, meteor.lives)).trim() || '—');
    updateHud('meteorEnergy', meteor.energy);
    updateHud('meteorCoins', state.coins);
  }
  function nextMeteorQuestion(previousTarget) {
    if (meteor.question >= meteor.maxQuestions) {
      endGame('meteor', 'Hoàn thành ' + meteor.maxQuestions + ' câu hỏi!');
      return false;
    }
    meteor.question += 1;
    spawnMeteorWave(previousTarget);
    updateMeteorHud();
    return true;
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
        if (Number.isFinite(result.energy) && result.energy >= 0) meteor.energy = result.energy;
        flashFeedback('meteor', '🎯 Chính xác! ' + (result.awarded || result.bonus ? result.message : result.message || 'Lưu kết quả chưa được xác nhận.'), result.awarded ? 'good' : 'neutral');
        nextMeteorQuestion(target);
      } else {
        meteor.combo = 0;
        flashFeedback('meteor', '💥 Chưa trúng rồi! Thử gõ lại từ tiếng Anh ứng với nghĩa này nhé.', 'bad');
        meteor.input.select();
      }
      updateMeteorHud();
    } catch (error) {
      flashFeedback('meteor', '⚠️ Lỗi kết nối: ' + (error.message || 'chưa xác nhận được kết quả.'), 'bad');
    } finally {
      meteor.busy = false;
      if (state.running && state.game === 'meteor') meteor.input.focus({ preventScroll: true });
    }
  }

  function loseMeteorLife() {
    meteor.lives -= 1;
    meteor.combo = 0;
    if (meteor.target) flashFeedback('meteor', '☄️ Thiên thạch mục tiêu lọt qua! Từ đúng là: ' + meteor.target.word, 'bad');
    if (meteor.lives <= 0) return endGame('meteor', 'Hết mạng rồi! Thử lại để phá kỷ lục nhé.');
    const old = meteor.target;
    nextMeteorQuestion(old);
    updateMeteorHud();
  }

  function tickMeteor(dt) {
    meteor.asteroids.forEach(function (asteroid) {
      if (asteroid.target && asteroid.y > meteor.canvas.height - 70 && !meteor.busy) asteroid.missed = true;
    });
    if (meteor.asteroids.some(function (asteroid) { return asteroid.target && asteroid.missed; })) loseMeteorLife();
    drawMeteor(dt);
    updateMeteorHud();
  }

  async function ensureFlappyEngine() {
    if (flappyEngine) return flappyEngine;
    if (!window.KatLearnFlappyEngine) throw new Error('Chưa tải được Phaser Flappy Owl.');

    if (!flappyEnginePromise) {
      flappyEnginePromise = window.KatLearnFlappyEngine.mount({
        parent: flappy.canvas,
        onGatePass: function (id) {
          if (!state.running || state.game !== 'flappy' || !flappy.pipe || flappy.pipe.id !== id || flappy.pipe.resolved) return;
          void resolveFlappyPipe(flappy.pipe);
        },
        onGateExit: function (id) {
          if (!state.running || state.game !== 'flappy' || !flappy.pipe || flappy.pipe.id !== id) return;
          nextFlappyQuestion(flappy.pipe.item);
        },
        onHit: function (id, reason) {
          if (!state.running || state.game !== 'flappy' || !flappy.pipe || flappy.pipe.id !== id) return;
          failFlappyPipe(reason === 'bounds'
            ? 'Chim chạm mép màn hình! Canh nhịp vỗ cánh nhé.'
            : 'Ôi! Chim va vào ống rồi. Thử canh nhịp bay qua khe hở nhé.');
        }
      }).then(function (engine) {
        flappyEngine = engine;
        return engine;
      }).catch(function (error) {
        flappyEnginePromise = null;
        throw error;
      });
    }
    return flappyEnginePromise;
  }

  function spawnFlappyPipe(previous) {
    const item = chooseWord(previous);
    if (!item) return;
    const gap = 148;
    const gapY = random(132, 252);
    const id = 'flappy-gate-' + (++flappyGateCounter);
    flappy.pipe = {
      id: id,
      gapY: gapY,
      gap: gap,
      speed: 178 + Math.min(58, flappy.score * 1.1),
      item: item,
      answer: '',
      resolved: false,
      hit: false
    };
    flappy.answer = '';
    flappy.input.value = '';
    flappy.input.focus({ preventScroll: true });
    updateHud('flappyPrompt', item.meaning);
    updateHud('flappyTargetWord', 'GÕ TỪ RỒI BAY QUA!');
    flappyEngine?.setGate({
      id: id,
      gapY: gapY,
      gap: gap,
      speed: flappy.pipe.speed
    });
  }

  function flapBird() {
    if (!state.running || state.game !== 'flappy') return;
    flappyEngine?.jump();
  }

  function updateFlappyHud() {
    updateHud('flappyQuestion', flappy.question + ' / ' + flappy.maxQuestions);
    updateHud('flappyLives', '♥ '.repeat(Math.max(0, flappy.lives)).trim() || '—');
    updateHud('flappyEnergy', flappy.energy);
    updateHud('flappyCoins', state.coins);
  }
  function nextFlappyQuestion(previous) {
    if (flappy.question >= flappy.maxQuestions) {
      endGame('flappy', 'Hoàn thành ' + flappy.maxQuestions + ' câu hỏi!');
      return false;
    }
    flappy.question += 1;
    startNextFlappyPipe(previous);
    updateFlappyHud();
    return true;
  }

  function startNextFlappyPipe(previous) {
    if (!state.running || state.game !== 'flappy') return;
    spawnFlappyPipe(previous || (flappy.pipe && flappy.pipe.item));
    updateFlappyHud();
  }

  async function resolveFlappyPipe(pipe) {
    if (!pipe || pipe.resolved) return;
    pipe.resolved = true;
    const correct = normalize(pipe.answer) === normalize(pipe.item.word);
    if (!correct) {
      flappy.lives -= 1;
      flashFeedback('flappy', '😵 Chưa nhập đúng từ cho cổng này. Từ cần nhớ: ' + pipe.item.word, 'bad');
      if (flappy.lives <= 0) return endGame('flappy', 'Hết lượt bay rồi! Thử lại để vượt thêm cổng nhé.');
    } else {
      flappy.score += 1;
      flashFeedback('flappy', '🐦 Qua cổng thành công! Đang lưu kết quả…', 'good');
      try {
        const result = await submitResult(pipe.item, pipe.answer, 'flappy');
        if (result.awarded) state.coins += 10 + (result.bonus || 0);
        else if (result.bonus) state.coins += result.bonus;
        if (Number.isFinite(Number(result.energy)) && Number(result.energy) >= 0) flappy.energy = Number(result.energy);
        flashFeedback('flappy', '🐦 Cổng đã vượt! ' + result.message, result.awarded ? 'good' : 'neutral');
      } catch (error) {
        flashFeedback('flappy', 'Cổng đã vượt, nhưng chưa đồng bộ KatCoin: ' + (error.message || 'Lỗi kết nối.'), 'bad');
      }
    }
    updateFlappyHud();
  }

  function failFlappyPipe(message) {
    const pipe = flappy.pipe;
    if (!pipe || pipe.resolved) return;
    pipe.resolved = true;
    pipe.hit = true;
    flappy.lives -= 1;
    flappyEngine?.recover();
    flashFeedback('flappy', '💫 ' + message, 'bad');
    if (flappy.lives <= 0) endGame('flappy', 'Hết lượt bay rồi! Thử lại để vượt thêm cổng nhé.');
    updateFlappyHud();
  }

  function animate(timestamp) {
    if (!state.running) return;
    const dt = Math.min(0.04, Math.max(0, (timestamp - (state.lastFrame || timestamp)) / 1000));
    state.lastFrame = timestamp;
    if (state.game === 'meteor') tickMeteor(dt);
    if (state.running) state.raf = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    flappyEngine?.pause();
  }

  function showGame(gameName) {
    const hub = $('#arcadeShell');
    if (hub) hub.hidden = false;
    $('#arcadeGameCards')?.setAttribute('hidden', '');
    $('#arcadeExit')?.removeAttribute('hidden');
    $('#meteorGame').hidden = gameName !== 'meteor';
    $('#flappyGame').hidden = gameName !== 'flappy';
    state.game = gameName;
    state.coins = 0;
    updateHud('meteorCoins', '0');
    updateHud('flappyCoins', '0');
    const source = $('#reflexSourcePicker');
    if (source) source.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (hub) hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function startMeteor() {
    const deck = await waitForDeck();
    if (!deck.length) {
      flashFeedback('meteor', 'Chưa có từ để chơi. Hãy chọn ít nhất một bộ từ ở mục “Chọn bộ từ để chơi” phía trên nhé.', 'bad');
      $('#reflexSourcePicker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    stopAnimation();
    showGame('meteor');
    meteor.time = 0; meteor.score = 0; meteor.lives = 3; meteor.question = 1; meteor.maxQuestions = 10; meteor.combo = 0; meteor.bestCombo = 0; meteor.busy = false; meteor.particles = [];
    meteor.energy = Math.max(0, Math.floor(Number(window.katlearnAccount?.profile?.energy || 0)));
    seedStars(meteor, meteor.canvas.width, meteor.canvas.height, 72);
    spawnMeteorWave(null);
    updateMeteorHud();
    $('#meteorRestart')?.removeAttribute('hidden');
    setMessage('#meteorMessage', 'Gõ từ tiếng Anh ứng với nghĩa tiếng Việt để bắn mục tiêu!', 'neutral');
    state.running = true; state.lastFrame = 0; state.raf = requestAnimationFrame(animate);
    enterMeteorFullscreen();
  }

  async function startFlappy() {
    const deck = await waitForDeck();
    if (!deck.length) {
      flashFeedback('flappy', 'Chưa có từ để chơi. Chọn ít nhất một bộ từ ở phía trên rồi thử lại nhé.', 'bad');
      $('#reflexSourcePicker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    stopAnimation();
    showGame('flappy');
    enterFlappyFullscreen();
    flappy.time = 0; flappy.score = 0; flappy.lives = 3; flappy.question = 1; flappy.maxQuestions = 10;
    flappy.energy = Math.max(0, Math.floor(Number(window.katlearnAccount?.profile?.energy || 0)));
    flappy.pipe = null; flappy.answer = ''; flappy.busy = false;
    state.running = true;
    state.lastFrame = 0;
    $('#flappyRestart')?.removeAttribute('hidden');
    setMessage('#flappyMessage', 'Gõ từ tiếng Anh, khóa đáp án, rồi vỗ cánh bay qua khe hở giữa hai ống!', 'neutral');

    try {
      await ensureFlappyEngine();
      if (!state.running || state.game !== 'flappy') return;
      flappyEngine.reset();
      startNextFlappyPipe(null);
      updateFlappyHud();
      flappy.input.focus({ preventScroll: true });
    } catch (error) {
      state.running = false;
      flashFeedback('flappy', 'Không thể khởi động Phaser Flappy Owl: ' + (error.message || 'Lỗi tải game.'), 'bad');
    }
  }

  function drawGameOver(message) {
    const ctx = meteor.ctx, width = meteor.canvas.width, height = meteor.canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 26, .72)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Be Vietnam Pro", sans-serif';
    ctx.fillText('PHIÊN SĂN THIÊN THẠCH KẾT THÚC', width / 2, height / 2 - 16);
    ctx.font = '600 17px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#c9d1ff';
    ctx.fillText(message, width / 2, height / 2 + 22, width - 80);
    ctx.restore();
  }

  function endGame(gameName, message) {
    if (!state.running) return;
    stopAnimation();
    if (gameName === 'meteor') {
      drawMeteor(0);
      drawGameOver(message);
      flashFeedback(gameName, message + ' Điểm: ' + meteor.score + ' · Combo tốt nhất: ' + meteor.bestCombo + '×.', 'neutral');
    } else {
      flappyEngine?.pause();
      flashFeedback(gameName, message + ' Điểm: ' + flappy.score + '.', 'neutral');
    }
  }

  function enterMeteorFullscreen() {
    const shell = $('#arcadeShell');
    if (!shell) return;
    shell.classList.add('meteor-fullscreen');
    // Native fullscreen may be blocked after async deck loading; the CSS fullscreen
    // class is an intentional, complete fallback.
    if (document.fullscreenElement || typeof shell.requestFullscreen !== 'function') return;
    Promise.resolve(shell.requestFullscreen()).catch(function () {});
  }
  function exitMeteorFullscreen() {
    const shell = $('#arcadeShell');
    shell?.classList.remove('meteor-fullscreen');
    if (document.fullscreenElement === shell && typeof document.exitFullscreen === 'function') {
      Promise.resolve(document.exitFullscreen()).catch(function () {});
    }
  }
  function exitMeteorGame() {
    if (state.game === 'meteor') stopAnimation();
    exitMeteorFullscreen();
    state.game = '';
    $('#meteorGame')?.setAttribute('hidden', '');
    $('#arcadeShell')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.removeAttribute('hidden');
    $('#arcadeExit')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function enterFlappyFullscreen() {
    const shell = $('#arcadeShell');
    if (!shell) return;
    shell.classList.add('flappy-fullscreen');
    if (document.fullscreenElement || typeof shell.requestFullscreen !== 'function') return;
    Promise.resolve(shell.requestFullscreen()).catch(function () {});
  }
  function exitFlappyFullscreen() {
    const shell = $('#arcadeShell');
    shell?.classList.remove('flappy-fullscreen');
    if (document.fullscreenElement === shell && typeof document.exitFullscreen === 'function') {
      Promise.resolve(document.exitFullscreen()).catch(function () {});
    }
  }
  function exitFlappyGame() {
    if (state.game === 'flappy') stopAnimation();
    exitFlappyFullscreen();
    state.game = '';
    $('#flappyGame')?.setAttribute('hidden', '');
    $('#arcadeShell')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.removeAttribute('hidden');
    $('#arcadeExit')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function stopCurrentGame() {
    stopAnimation();
    state.game = '';
    $('#arcadeShell').hidden = true;
    $('#arcadeGameCards')?.removeAttribute('hidden');
    $('#arcadeExit')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // A personal pack can route directly here from "Chơi game".
  // app.js restores its deck before this event is emitted.
  window.addEventListener('katlearn-personal-pack-restored', event=>{
    if(event.detail?.launchMode!=='game')return;
    window.setTimeout(()=>{if(!state.running)void startMeteor();},0);
  });

  $('#meteorForm')?.addEventListener('submit', submitMeteorAnswer);
  $('#flappyForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!state.running || state.game !== 'flappy' || !flappy.pipe || flappy.pipe.resolved) return;
    const answer = normalize(flappy.input.value);
    if (!answer) return;
    flappy.pipe.answer = answer;
    flappy.answer = answer;
    flashFeedback('flappy', 'Đã khóa đáp án cho cổng này. Giờ bay qua bằng ↑ / click / Flap!', answer === normalize(flappy.pipe.item.word) ? 'good' : 'neutral');
  });

  $('#arcadeMeteorStart')?.addEventListener('click', function () { void startMeteor(); });
  $('#arcadeFlappyStart')?.addEventListener('click', function () { void startFlappy(); });
  $('#meteorRestart')?.addEventListener('click', function () { void startMeteor(); });
  $('#meteorExit')?.addEventListener('click', exitMeteorGame);
  $('#flappyRestart')?.addEventListener('click', function () { void startFlappy(); });
  $('#flappyExit')?.addEventListener('click', exitFlappyGame);
  $('#arcadeExit')?.addEventListener('click', function () {
    if (state.game === 'meteor') exitMeteorFullscreen();
    if (state.game === 'flappy') exitFlappyFullscreen();
    stopCurrentGame();
  });
  $('#flappyFlap')?.addEventListener('click', flapBird);

  document.addEventListener('keydown', function (event) {
    if (!state.running || state.game !== 'flappy') return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      flapBird();
    }
    if (event.code === 'Space' && document.activeElement !== flappy.input) {
      event.preventDefault();
      flapBird();
    }
  });

  window.addEventListener('blur', function () {
    if (!state.running) return;
    // Do not let a background tab silently consume the whole session timer.
    state.lastFrame = performance.now();
  });

  // Keep arcade words in sync with the selected personal/public vocabulary pool.
  window.addEventListener('8b1-auth-change', function () {
    if (!state.running) state.deck = currentDeck();
  });
})();
