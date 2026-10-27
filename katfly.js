(function () {
  'use strict';
  const GAME = 'flappy';
  const MESSAGE_SELECTOR = '#flappyMessage';
  const flappy = { canvas: document.querySelector('#flappyCanvas'), ctx: null, time: 75, score: 0, lives: 3, birdY: 190, birdV: 0, birdAngle: 0, pipe: null, answer: '', particles: [], stars: [], busy: false, feedback: '', input: document.querySelector('#flappyInput') };
  if (!flappy.canvas || !flappy.input) return;
  flappy.ctx = flappy.canvas.getContext('2d');

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

    function spawnFlappyPipe(previous) {
    const item = chooseWord(previous);
    if (!item) return;
    const gap = 170;
    flappy.pipe = {
      x: flappy.canvas.width + 12,
      width: 74,
      gapY: random(124, flappy.canvas.height - 124),
      gap: gap,
      speed: 178 + Math.min(48, flappy.score * 0.8),
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
    // A friendly original KatLearn space-kitten glider.
    const wingBeat=Math.sin(performance.now()/90)*3;
    ctx.save();
    ctx.translate(170,flappy.birdY);
    ctx.rotate(flappy.birdAngle);
    const trail=ctx.createLinearGradient(-38,0,-4,0);
    trail.addColorStop(0,'rgba(75,218,255,0)');
    trail.addColorStop(1,'rgba(75,218,255,.58)');
    ctx.fillStyle=trail;
    ctx.beginPath();ctx.moveTo(-32,-5);ctx.lineTo(-56,0);ctx.lineTo(-31,5);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#9e91ff';ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-16,7);ctx.quadraticCurveTo(-28,18,-20,22);ctx.stroke();
    ctx.fillStyle='#a7a0ff';
    ctx.beginPath();ctx.moveTo(-15,-11);ctx.lineTo(-17,-27);ctx.lineTo(-3,-17);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(4,-17);ctx.lineTo(16,-28);ctx.lineTo(17,-9);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffc0dd';
    ctx.beginPath();ctx.moveTo(-12,-15);ctx.lineTo(-14,-22);ctx.lineTo(-7,-17);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(8,-17);ctx.lineTo(14,-23);ctx.lineTo(14,-14);ctx.closePath();ctx.fill();
    ctx.shadowColor='#63e6ff';ctx.shadowBlur=16;
    const body=ctx.createLinearGradient(-20,-18,22,19);
    body.addColorStop(0,'#f4ffff');body.addColorStop(.45,'#8defff');body.addColorStop(1,'#8e8bff');
    ctx.fillStyle=body;ctx.strokeStyle='#e5fcff';ctx.lineWidth=1.8;
    ctx.beginPath();ctx.ellipse(0,0,22,17,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#4caed8';
    ctx.beginPath();ctx.ellipse(-8,5+wingBeat,8,4.5,-.25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(9,-5,5.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1b2451';ctx.beginPath();ctx.arc(11,-5,2.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff9ec8';ctx.beginPath();ctx.ellipse(9,4,3.5,2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff5bb';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(27,4);ctx.lineTo(18,7);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.beginPath();ctx.moveTo(-4,-26);ctx.lineTo(-1,-21);ctx.lineTo(4,-19);ctx.lineTo(-1,-17);ctx.lineTo(-4,-12);ctx.lineTo(-6,-17);ctx.lineTo(-11,-19);ctx.lineTo(-6,-21);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  function drawPipe(ctx, pipe) {
    const width=flappy.canvas.width,height=flappy.canvas.height;
    const top=pipe.gapY-pipe.gap/2,bottom=pipe.gapY+pipe.gap/2;
    const x=pipe.x,w=pipe.width;
    const drawPillar=function(y,h,capAtBottom){
      if(h<=0)return;
      ctx.save();
      const gradient=ctx.createLinearGradient(x,0,x+w,0);
      gradient.addColorStop(0,'#183a70');gradient.addColorStop(.45,'#2d8ba9');gradient.addColorStop(1,'#1b3b69');
      ctx.fillStyle=gradient;ctx.shadowColor='rgba(83,228,255,.18)';ctx.shadowBlur=15;
      ctx.beginPath();ctx.roundRect(x,y,w,h,12);ctx.fill();
      ctx.shadowBlur=0;ctx.strokeStyle='rgba(143,247,255,.8)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='rgba(136,248,255,.15)';
      ctx.beginPath();ctx.roundRect(x+8,y+8,5,Math.max(0,h-16),3);ctx.fill();
      ctx.strokeStyle='rgba(143,247,255,.28)';ctx.lineWidth=1;
      for(let yy=y+22;yy<y+h-8;yy+=28){ctx.beginPath();ctx.moveTo(x+19,yy);ctx.lineTo(x+w-8,yy);ctx.stroke()}
      const capY=capAtBottom?y+h-14:y;
      ctx.fillStyle='#76f0ed';ctx.globalAlpha=.95;
      ctx.beginPath();ctx.roundRect(x-5,capY,w+10,14,7);ctx.fill();
      ctx.globalAlpha=1;ctx.fillStyle='#efffff';
      ctx.beginPath();ctx.roundRect(x+6,capY+4,w-12,3,2);ctx.fill();
      ctx.restore();
    };
    drawPillar(0,top,true);drawPillar(bottom,height-bottom,false);
    ctx.save();
    ctx.shadowColor='#8df7ff';ctx.shadowBlur=18;ctx.strokeStyle='rgba(135,248,255,.82)';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(x-8,top+8,w+16,pipe.gap-16,18);ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='rgba(8,24,57,.76)';
    ctx.beginPath();ctx.roundRect(x+8,pipe.gapY-17,w-16,34,10);ctx.fill();
    ctx.fillStyle='#f1ffff';ctx.font='800 11px "Be Vietnam Pro", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('KAT GATE',x+w/2,pipe.gapY-3);
    ctx.fillStyle='#92f7ff';ctx.font='700 8px "Be Vietnam Pro", sans-serif';
    ctx.fillText('BAY QUA',x+w/2,pipe.gapY+10);
    ctx.restore();
  }

  function drawFlappy(dt) {
    const ctx=flappy.ctx,width=flappy.canvas.width,height=flappy.canvas.height;
    drawStars(ctx,flappy.stars,width,height,dt,10);
    const haze=ctx.createRadialGradient(width*.72,height*.2,6,width*.72,height*.2,height*.85);
    haze.addColorStop(0,'rgba(108,99,223,.19)');haze.addColorStop(.5,'rgba(35,112,171,.07)');haze.addColorStop(1,'rgba(5,9,29,0)');
    ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='rgba(95,120,206,.11)';ctx.beginPath();ctx.arc(width*.78,height*.23,42,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(147,164,255,.18)';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(width*.78,height*.23,59,14,-.2,0,Math.PI*2);ctx.stroke();
    const floor=ctx.createLinearGradient(0,height-24,0,height);
    floor.addColorStop(0,'#233a69');floor.addColorStop(1,'#0b132c');
    ctx.fillStyle=floor;ctx.fillRect(0,height-19,width,19);
    ctx.strokeStyle='rgba(132,184,255,.16)';ctx.lineWidth=1;
    for(let x=0;x<width;x+=42){ctx.beginPath();ctx.moveTo(x,height-19);ctx.lineTo(x-14,height);ctx.stroke()}
    if(flappy.pipe){
      if(state.running&&!flappy.pipe.resolved)flappy.pipe.x-=flappy.pipe.speed*dt;
      drawPipe(ctx,flappy.pipe);
    }
    if(state.running){
      flappy.birdV+=690*dt;
      flappy.birdY+=flappy.birdV*dt;
      flappy.birdAngle=clamp(flappy.birdV/780,-.32,.72);
    }
    drawFlappyBird(ctx);drawParticles(ctx,flappy,dt);
    if(flappy.birdY<8||flappy.birdY>height-22){
      if(state.running&&flappy.pipe&&!flappy.pipe.resolved)failFlappyPipe('Lệch khỏi đường bay! Bấm nhẹ và đều để quay lại quỹ đạo nhé.');
      else if(state.running){flappy.birdY=clamp(flappy.birdY,22,height-22);flappy.birdV=-60}
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
      flashFeedback('😵 Chưa nhập đúng từ cho cổng này. Từ cần nhớ: ' + pipe.item.word, 'bad');
      if (flappy.lives <= 0) return endGame('Hết lượt bay rồi! Thử lại để vượt thêm cổng nhé.');
    } else {
      flappy.score += 1;
      flashFeedback('🐦 Qua cổng thành công! Đang lưu kết quả…', 'good');
      try {
        const result = await submitResult(pipe.item, pipe.answer, 'flappy');
        if (result.awarded) state.coins += 10 + (result.bonus || 0);
        else if (result.bonus) state.coins += result.bonus;
        flashFeedback('🐦 Cổng đã vượt! ' + result.message, result.awarded ? 'good' : 'neutral');
      } catch (error) {
        flashFeedback('Cổng đã vượt, nhưng chưa đồng bộ KatCoin: ' + (error.message || 'Lỗi kết nối.'), 'bad');
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
    flashFeedback('💫 ' + message, 'bad');
    if (flappy.lives <= 0) endGame('Hết lượt bay rồi! Thử lại để vượt thêm cổng nhé.');
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
    if (flappy.time <= 0) endGame('Hết giờ bay! Cố thêm một lượt để phá kỷ lục nhé.');
  }
  function animate(timestamp) {
    if (!state.running || coordinator.active !== GAME) { stopAnimation(); return; }
    const dt = Math.min(.04, Math.max(0, (timestamp - (state.lastFrame || timestamp)) / 1000));
    state.lastFrame = timestamp; tickFlappy(dt);
    if (state.running && coordinator.active === GAME) state.raf = requestAnimationFrame(animate);
  }
  function drawGameOver(message) {
    const ctx = flappy.ctx, width = flappy.canvas.width, height = flappy.canvas.height;
    ctx.save(); ctx.fillStyle = 'rgba(6, 8, 26, .72)'; ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 34px "Be Vietnam Pro", sans-serif';
    ctx.fillText('KẾT THÚC CHUYẾN BAY', width / 2, height / 2 - 16);
    ctx.font = '600 17px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#c9d1ff';
    ctx.fillText(message, width / 2, height / 2 + 22, width - 80); ctx.restore();
  }
  function endGame(message) {
    if (!state.running || coordinator.active !== GAME) return;
    stopAnimation(); drawFlappy(0); drawGameOver(message);
    flashFeedback(message + ' Điểm: ' + flappy.score + '.', 'neutral');
  }
  async function startFlappy() {
    const deck = await waitForDeck();
    if (!deck.length) {
      flashFeedback('Chưa có từ để chơi. Chọn ít nhất một bộ từ ở phía trên rồi thử lại nhé.', 'bad');
      $('#reflexSourcePicker')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    stopAnimation(); claimGame(); showGame();
    flappy.time = 75; flappy.score = 0; flappy.lives = 3; flappy.birdY = flappy.canvas.height / 2; flappy.birdV = 0; flappy.birdAngle = 0; flappy.pipe = null; flappy.answer = ''; flappy.busy = false; flappy.particles = [];
    seedStars(flappy, flappy.canvas.width, flappy.canvas.height, 82); startNextFlappyPipe(null); updateFlappyHud();
    $('#flappyRestart')?.removeAttribute('hidden');
    flashFeedback('Gõ từ tiếng Anh rồi bấm Enter. Vượt qua cổng bằng ↑, click hoặc nút Bay!', 'neutral');
    state.running = true; state.lastFrame = 0; state.raf = requestAnimationFrame(animate);
    flappy.input.focus({ preventScroll: true });
  }
  $('#flappyForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!state.running || coordinator.active !== GAME || !flappy.pipe || flappy.pipe.resolved) return;
    const answer = normalize(flappy.input.value);
    if (!answer) return;
    flappy.pipe.answer = answer; flappy.answer = answer;
    flashFeedback('Đã khóa đáp án cho cổng này. Giờ bay qua bằng ↑ / click / Bay!', answer === normalize(flappy.pipe.item.word) ? 'good' : 'neutral');
  });
  $('#arcadeFlappyStart')?.addEventListener('click', function () { void startFlappy(); });
  $('#flappyRestart')?.addEventListener('click', function () { void startFlappy(); });
  $('#arcadeExit')?.addEventListener('click', stopCurrentGame);
  $('#flappyFlap')?.addEventListener('click', flapBird);
  flappy.canvas.addEventListener('pointerdown', flapBird);
  document.addEventListener('keydown', function (event) {
    if (!state.running || coordinator.active !== GAME) return;
    if (event.key === 'ArrowUp') { event.preventDefault(); flapBird(); }
    if (event.code === 'Space' && document.activeElement !== flappy.input) { event.preventDefault(); flapBird(); }
  });
})();