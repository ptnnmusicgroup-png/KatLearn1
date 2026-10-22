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
    time: 55,
    score: 0,
    lives: 3,
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
    ctx: null,
    time: 75,
    score: 0,
    lives: 3,
    birdY: 190,
    birdV: 0,
    birdAngle: 0,
    pipe: null,
    answer: '',
    particles: [],
    stars: [],
    busy: false,
    feedback: '',
    feedbackUntil: 0,
    input: $('#flappyInput')
  };

  if (!meteor.canvas || !flappy.canvas) return;
  meteor.ctx = meteor.canvas.getContext('2d');
  flappy.ctx = flappy.canvas.getContext('2d');

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
        flashFeedback('meteor', '🎯 Chính xác! ' + (result.awarded || result.bonus ? result.message : result.message || 'Lưu kết quả chưa được xác nhận.'), result.awarded ? 'good' : 'neutral');
        spawnMeteorWave(target);
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
    if (meteor.time <= 0) endGame('meteor', 'Hết giờ! Mục tiêu đã hoàn thành.');
  }

  function spawnFlappyPipe(previous) {
    const item = chooseWord(previous);
    if (!item) return;
    const gap = 148;
    flappy.pipe = {
      x: flappy.canvas.width + 12,
      width: 86,
      gapY: random(124, flappy.canvas.height - 124),
      gap: gap,
      speed: 198 + Math.min(65, flappy.score * 1.1),
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
  }

  function flapBird() {
    if (!state.running || state.game !== 'flappy') return;
    flappy.birdV = -350;
    flappy.birdAngle = -0.35;
    burstParticles(flappy, 160, flappy.birdY + 7, '#a4f3fa');
    const canvas = flappy.canvas;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / Math.max(1, rect.width);
    const y = flappy.birdY;
    if (y < 16 || y > canvas.height - 16) flappy.birdV = -410;
  }

  function drawFlappyBird(ctx) {
    ctx.save();
    ctx.translate(170, flappy.birdY);
    ctx.rotate(flappy.birdAngle);
    ctx.shadowColor = '#79efff';
    ctx.shadowBlur = 18;
    const bird = ctx.createLinearGradient(-18, -18, 20, 18);
    bird.addColorStop(0, '#fff0a9');
    bird.addColorStop(1, '#ff9f9c');
    ctx.fillStyle = bird;
    ctx.strokeStyle = '#fff6d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f9ffff';
    ctx.beginPath(); ctx.arc(8, -5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#18213e';
    ctx.beginPath(); ctx.arc(10, -5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f77b84';
    ctx.beginPath(); ctx.moveTo(17, 1); ctx.lineTo(30, 5); ctx.lineTo(17, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6b5ca';
    ctx.beginPath(); ctx.ellipse(-7, 5, 8, 5 + Math.sin(performance.now() / 85) * 2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPipe(ctx, pipe) {
    const width = flappy.canvas.width, height = flappy.canvas.height;
    const top = pipe.gapY - pipe.gap / 2;
    const bottom = pipe.gapY + pipe.gap / 2;
    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient.addColorStop(0, '#3ac2b2');
    gradient.addColorStop(0.5, '#67e2c5');
    gradient.addColorStop(1, '#328eaa');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#a5fff1';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(66, 231, 199, .25)';
    ctx.shadowBlur = 12;
    ctx.fillRect(pipe.x, 0, pipe.width, top);
    ctx.strokeRect(pipe.x, 0, pipe.width, top);
    ctx.fillRect(pipe.x - 7, top - 22, pipe.width + 14, 22);
    ctx.strokeRect(pipe.x - 7, top - 22, pipe.width + 14, 22);
    ctx.fillRect(pipe.x, bottom, pipe.width, height - bottom);
    ctx.strokeRect(pipe.x, bottom, pipe.width, height - bottom);
    ctx.fillRect(pipe.x - 7, bottom, pipe.width + 14, 22);
    ctx.strokeRect(pipe.x - 7, bottom, pipe.width + 14, 22);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10, 26, 54, .82)';
    ctx.fillRect(pipe.x - 16, pipe.gapY - 24, pipe.width + 32, 48);
    ctx.strokeStyle = '#d7fff6';
    ctx.strokeRect(pipe.x - 16, pipe.gapY - 24, pipe.width + 32, 48);
    ctx.fillStyle = '#effffc';
    ctx.font = '800 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GATE', pipe.x + pipe.width / 2, pipe.gapY - 5);
    ctx.font = '700 9px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#8ee9dc';
    ctx.fillText('NHỚ TỪ', pipe.x + pipe.width / 2, pipe.gapY + 10);
  }

  function drawFlappy(dt) {
    const ctx = flappy.ctx, width = flappy.canvas.width, height = flappy.canvas.height;
    drawStars(ctx, flappy.stars, width, height, dt, 16);
    const floor = ctx.createLinearGradient(0, height - 24, 0, height);
    floor.addColorStop(0, '#2b426b');
    floor.addColorStop(1, '#131b3a');
    ctx.fillStyle = floor;
    ctx.fillRect(0, height - 19, width, 19);
    ctx.strokeStyle = 'rgba(132, 184, 255, .18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 42) {
      ctx.beginPath(); ctx.moveTo(x, height - 19); ctx.lineTo(x - 14, height); ctx.stroke();
    }
    if (flappy.pipe) {
      if (state.running && !flappy.pipe.resolved) flappy.pipe.x -= flappy.pipe.speed * dt;
      drawPipe(ctx, flappy.pipe);
    }
    if (state.running) {
      flappy.birdV += 760 * dt;
      flappy.birdY += flappy.birdV * dt;
      flappy.birdAngle = clamp(flappy.birdV / 700, -0.4, 0.9);
    }
    drawFlappyBird(ctx);
    drawParticles(ctx, flappy, dt);
    if (flappy.birdY < -5 || flappy.birdY > height - 19) {
      if (state.running && flappy.pipe && !flappy.pipe.resolved) failFlappyPipe('Chim bay lệch đường! Giữ nhịp bấm ↑ hoặc chạm nút Flap nhé.');
      else if (state.running) { flappy.birdY = height / 2; flappy.birdV = 0; }
    }
  }

  function updateFlappyHud() {
    updateHud('flappyScore', flappy.score);
    updateHud('flappyLives', '♥ '.repeat(Math.max(0, flappy.lives)).trim() || '—');
    updateHud('flappyTime', Math.max(0, Math.ceil(flappy.time)) + 's');
    updateHud('flappyCoins', state.coins);
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
    flappy.lives -= 1;
    flappy.birdY = clamp(flappy.birdY, 45, flappy.canvas.height - 45);
    flappy.birdV = -100;
    flashFeedback('flappy', '💫 ' + message, 'bad');
    if (flappy.lives <= 0) endGame('flappy', 'Hết lượt bay rồi! Thử lại để vượt thêm cổng nhé.');
    updateFlappyHud();
  }

  function tickFlappy(dt) {
    flappy.time -= dt;
    drawFlappy(dt);
    if (flappy.pipe && !flappy.pipe.resolved) {
      const pipe = flappy.pipe;
      const birdX = 170, birdRadius = 16;
      const top = pipe.gapY - pipe.gap / 2;
      const bottom = pipe.gapY + pipe.gap / 2;
      const overlaps = pipe.x < birdX + birdRadius && pipe.x + pipe.width > birdX - birdRadius;
      if (overlaps && !pipe.hit) {
        pipe.hit = true;
        if (flappy.birdY < top + birdRadius || flappy.birdY > bottom - birdRadius) {
          failFlappyPipe('Ôi! Va vào ống rồi. Bấm ↑ sớm hơn một chút nhé.');
        }
      }
      if (!pipe.resolved && pipe.x + pipe.width < birdX - birdRadius) void resolveFlappyPipe(pipe);
    }
    if (flappy.pipe && flappy.pipe.resolved && flappy.pipe.x + flappy.pipe.width < -5) {
      const previous = flappy.pipe.item;
      startNextFlappyPipe(previous);
    }
    updateFlappyHud();
    if (flappy.time <= 0) endGame('flappy', 'Hết giờ bay! Cố thêm một lượt để phá kỷ lục nhé.');
  }

  function animate(timestamp) {
    if (!state.running) return;
    const dt = Math.min(0.04, Math.max(0, (timestamp - (state.lastFrame || timestamp)) / 1000));
    state.lastFrame = timestamp;
    if (state.game === 'meteor') tickMeteor(dt);
    if (state.game === 'flappy') tickFlappy(dt);
    if (state.running) state.raf = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
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
    meteor.time = 55; meteor.score = 0; meteor.lives = 3; meteor.combo = 0; meteor.bestCombo = 0; meteor.busy = false; meteor.particles = [];
    seedStars(meteor, meteor.canvas.width, meteor.canvas.height, 72);
    spawnMeteorWave(null);
    updateMeteorHud();
    $('#meteorRestart')?.removeAttribute('hidden');
    setMessage('#meteorMessage', 'Gõ từ tiếng Anh ứng với nghĩa tiếng Việt để bắn mục tiêu!', 'neutral');
    state.running = true; state.lastFrame = 0; state.raf = requestAnimationFrame(animate);
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
    flappy.time = 75; flappy.score = 0; flappy.lives = 3; flappy.birdY = flappy.canvas.height / 2; flappy.birdV = 0; flappy.birdAngle = 0; flappy.pipe = null; flappy.answer = ''; flappy.busy = false; flappy.particles = [];
    seedStars(flappy, flappy.canvas.width, flappy.canvas.height, 82);
    startNextFlappyPipe(null);
    updateFlappyHud();
    $('#flappyRestart')?.removeAttribute('hidden');
    setMessage('#flappyMessage', 'Gõ từ tiếng Anh rồi bấm Enter. Vượt qua cổng bằng ↑, click hoặc nút Flap!', 'neutral');
    state.running = true; state.lastFrame = 0; state.raf = requestAnimationFrame(animate);
    flappy.input.focus({ preventScroll: true });
  }

  function drawGameOver(gameName, message) {
    const game = gameName === 'meteor' ? meteor : flappy;
    const ctx = game.ctx, width = game.canvas.width, height = game.canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 26, .72)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Be Vietnam Pro", sans-serif';
    ctx.fillText(gameName === 'meteor' ? 'PHIÊN SĂN THIÊN THẠCH KẾT THÚC' : 'KẾT THÚC CHUYẾN BAY', width / 2, height / 2 - 16);
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
      drawGameOver(gameName, message);
      flashFeedback(gameName, message + ' Điểm: ' + meteor.score + ' · Combo tốt nhất: ' + meteor.bestCombo + '×.', 'neutral');
    } else {
      drawFlappy(0);
      drawGameOver(gameName, message);
      flashFeedback(gameName, message + ' Điểm: ' + flappy.score + '.', 'neutral');
    }
  }

  function stopCurrentGame() {
    stopAnimation();
    state.game = '';
    $('#arcadeShell').hidden = true;
    $('#arcadeGameCards')?.removeAttribute('hidden');
    $('#arcadeExit')?.setAttribute('hidden', '');
    $('#arcadeGameCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
  $('#flappyRestart')?.addEventListener('click', function () { void startFlappy(); });
  $('#arcadeExit')?.addEventListener('click', stopCurrentGame);
  $('#flappyFlap')?.addEventListener('click', flapBird);
  flappy.canvas.addEventListener('pointerdown', flapBird);

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
