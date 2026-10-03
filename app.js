let vocab=[];
try{const savedVocab=JSON.parse(localStorage.getItem('katlearn-vocab')||'[]');if(Array.isArray(savedVocab))vocab=savedVocab}catch(e){}
let coins=0,energy=0,cardIndex=0,known=0,question=1,sessionCoins=0,dailyCount=0,mode='engvi',answered=false,knownWordKeys=new Set(),contextRequestId=0,reflexSessionLength=10,reflexTimeLimit=15,reflexTimerId=null,reflexCorrect=0,reflexAnswered=0,reflexCombo=0,reflexMaxCombo=0,reflexScore=0;
let activeVocabSource={kind:'legacy'};try{const raw=localStorage.getItem('katlearn-vocab-source');if(raw)activeVocabSource=JSON.parse(raw)||activeVocabSource}catch(_){}
function vocabKey(v){return String(v?.word||'').trim().toLowerCase()+'::'+vocabMeaning(v).trim().toLowerCase()}
function knownStateKey(){const uid=String(window.studyStore?.user?.uid||window.studyStore?.userId||'guest');return 'katlearn-known:'+uid+':'+String(activeVocabSource?.kind||'legacy')+':'+String(activeVocabSource?.id||activeVocabSource?.uid||'legacy')}
function loadKnownState(){try{const raw=localStorage.getItem(knownStateKey());const arr=JSON.parse(raw||'[]');knownWordKeys=new Set(Array.isArray(arr)?arr.filter(Boolean):[])}catch(_){knownWordKeys=new Set()}known=knownWordKeys.size}
function saveKnownState(){localStorage.setItem(knownStateKey(),JSON.stringify([...knownWordKeys]));known=knownWordKeys.size}
loadKnownState();
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const aiEndpoint=name=>'/api/'+String(name||'').replace(/^\/+/, '');
const gameEndpoint=()=>'/api/game-action';
async function aiHeaders(){const h={'Content-Type':'application/json'};try{const t=await window.studyStore?.getIdToken?.();if(t)h.Authorization='Bearer '+t}catch(_){}return h}
function format(n){return n.toLocaleString('en-US')}
function updateDailyGoal(count){
  dailyCount=Math.max(0,Number(count)||0);
  const done=Math.min(10,dailyCount);
  const bar=$('#dailyProgress'),label=$('#dailyCount'),percent=$('#dailyPercent');
  if(bar)bar.style.width=(done*10)+'%';
  if(label)label.textContent=done+' / 10';
  if(percent)percent.textContent=(done*10)+'%';
}
function updateCoins(){['#coinCount','#shopCoins','#panelCoins'].forEach(s=>{const el=$(s);if(el)el.textContent=format(coins)});const energyEl=$('#panelEnergy'),wordsEl=$('#panelWords');if(energyEl)energyEl.textContent=format(energy);if(wordsEl)wordsEl.textContent=String(vocab.length)}
async function syncProfile(extra={}){const user=window.studyStore?.user;if(!window.studyStore?.connected()||!user)return;const uid=user.uid;try{if(window.studyStore?.user?.uid!==uid)return;const data={...extra};if(!['core','public','assigned'].includes(String(activeVocabSource?.kind||'')))Object.assign(data,{knownWords:known,totalWords:vocab.length,vocab});if(window.studyStore?.user?.uid!==uid)return;await window.studyStore.saveProfile(data)}catch(e){if(window.studyStore?.user?.uid===uid)console.warn('Firebase sync:',e)}}
function toast(msg,kind=''){const t=$('#toast');if(!t)return;clearTimeout(window.__katToastTimer);t.className=''+(kind?' '+kind:'');t.textContent=msg;t.classList.add('show');window.__katToastTimer=setTimeout(()=>t.classList.remove('show'),2400)}
(function showTestReturnError(){
  const params=new URLSearchParams(location.search);
  if(params.get('testError')!=='fullscreen-exit')return;
  setTimeout(()=>toast('🐱 Đang làm mà thoát full screen, biết Kat buồn lắm hummm ._.','kat-warning'),180);
  params.delete('testError');
  const next=params.toString();
  history.replaceState(null,document.title,location.pathname+(next?'?'+next:'')+location.hash);
})();
function updateHomeHeader(profile=null){
  const now=new Date(),days=['CHỦ NHẬT','THỨ HAI','THỨ BA','THỨ TƯ','THỨ NĂM','THỨ SÁU','THỨ BẢY'],month=now.getMonth()+1;
  const eyebrow=$('.greeting-row .eyebrow'),title=$('.greeting-row h1'),streak=$('.streak-card b');
  if(eyebrow)eyebrow.textContent=days[now.getDay()]+', '+now.getDate()+' THÁNG '+month;
  if(title){
    const h=now.getHours();
    const greeting=h>=5&&h<12?'Chào buổi sáng!':h>=12&&h<18?'Chào buổi chiều!':'Chào buổi tối!';
    const icon=h>=5&&h<12?'☀️':h>=12&&h<18?'🌤️':'🌙';
    title.innerHTML=esc(greeting.replace('!',''))+'! <span>'+icon+'</span>';
  }
  if(streak&&profile&&Number.isFinite(Number(profile.streak)))streak.textContent=Number(profile.streak).toLocaleString('vi-VN')+' ngày';
}
updateHomeHeader();
setInterval(()=>updateHomeHeader(),30000);
updateDailyGoal(0);
const PAGE_ALIASES={vocabulary:'words',words:'words',home:'home',packs:'packs',personalPacks:'personalPacks',personal:'personalPacks',learn:'learn',practice:'practice',test:'test',shop:'shop',ranking:'ranking',progress:'progress',studentClasses:'studentClasses'};
function showPage(rawId,updateHash=true){if(String(rawId||'')==='test'){location.href='/test.html';return}const id=PAGE_ALIASES[rawId]||rawId;const page=$('#'+id);if(!page)return;$$('.page').forEach(p=>p.classList.remove('active-page'));page.classList.add('active-page');$$('.nav-item').forEach(b=>b.classList.toggle('active',(PAGE_ALIASES[b.dataset.page]||b.dataset.page)===id));$('.sidebar')?.classList.remove('open');if(updateHash){const hash=id==='words'?'vocabulary':id;history.replaceState(null,'','#'+hash)}if(id==='ranking')renderLeaderboard();if(id==='packs')renderPublicPacks();if(id==='personalPacks')window.renderStudentPersonalPacks?.();if(id==='words')renderVocabularyViews();if(id==='studentClasses')window.katlearnStudentClasses?.render();window.scrollTo({top:0,behavior:'smooth'})}
function openInitialPage(){const hash=decodeURIComponent(location.hash.replace(/^#/,'')).trim();showPage(hash&&PAGE_ALIASES[hash]?hash:'home',false)}
$$('.nav-item').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$$('[data-go]').forEach(b=>b.onclick=()=>showPage(b.dataset.go));if($('.start-lesson'))$('.start-lesson').onclick=()=>showPage('learn');if($('.menu-toggle'))$('.menu-toggle').onclick=()=>$('.sidebar')?.classList.toggle('open');window.addEventListener('hashchange',()=>{const hash=decodeURIComponent(location.hash.replace(/^#/,'')).trim();if(hash&&PAGE_ALIASES[hash])showPage(hash,false)});
function renderWordList(){const list=$('#wordList');list.innerHTML=vocab.length?vocab.map((v,i)=>`<button class="word-item ${i===cardIndex?'selected':''}" data-index="${i}">${esc(v.word)}<small>${esc(vocabPronunciation(v)||'Chưa có phiên âm')}</small>${knownWordKeys.has(vocabKey(v))?'<i>✓</i>':''}</button>`).join(''):'<p class="empty-state">Chưa có từ nào.</p>';$$('.word-item').forEach(b=>b.onclick=()=>{cardIndex=+b.dataset.index;renderCard()});['#wordListCount','#totalWords','#cardTotal'].forEach(s=>$(s).textContent=vocab.length)}
function renderVocabularyViews(filter=''){const q=filter.trim().toLowerCase(),visible=vocab.filter(v=>{const word=String(v?.word||''),mean=vocabMeaning(v);return !q||word.toLowerCase().includes(q)||mean.toLowerCase().includes(q)}),total=vocab.length,done=Math.min(knownWordKeys.size,total),progress=total?Math.round(done/total*100):0;$('#wordTotalStat').textContent=total;$('#wordKnownStat').textContent=done;$('#wordUnknownStat').textContent=Math.max(0,total-done);$('#wordProgressStat').textContent=progress+'%';$('#personalWordCount').textContent=total;$('#personalKnownCount').textContent=done;$('#wordTable').innerHTML=visible.length?visible.map((v,i)=>`<div class="word-table-row"><span><b>${esc(v.word)}</b><small>${i+1}/${total}</small></span><span>${esc(v.mean)}</span><span>${esc(v.pron||'—')}</span><span><i class="word-status ${knownWordKeys.has(vocabKey(v))?'':'new'}">${knownWordKeys.has(vocabKey(v))?'Đã thuộc':'Mới'}</i></span></div>`).join(''):'<div class="empty-state">Chưa có từ phù hợp.</div>'}
function renderCard(){if(!vocab.length){$('#cardWord').textContent='Chưa có từ vựng';$('#cardPronounce').textContent='Hãy thêm từ đầu tiên của bạn';$('#cardMeaning').innerHTML='Kat đang<br>chờ bạn!';$('.card-front .card-visual').textContent='🐱';$('#cardStep').textContent='00';renderWordList();renderVocabularyViews();return}const v=vocab[cardIndex%vocab.length];$('#cardWord').textContent=v.word;$('#cardPronounce').textContent=vocabPronunciation(v)||'—';$('#cardMeaning').innerHTML=esc(v.mean).replace(/ /g,'<br>');$('.card-front .card-visual').textContent=v.emoji;$('#cardStep').textContent=String(cardIndex+1).padStart(2,'0');$('.flashcard').classList.remove('flipped');renderWordList();renderVocabularyViews()}
$('#flashcard').onclick=()=>{if(vocab.length)$('#flashcard').classList.toggle('flipped')};$('#prevCard').onclick=()=>{if(!vocab.length)return;cardIndex=(cardIndex+vocab.length-1)%vocab.length;renderCard()};$('#nextCard').onclick=()=>{if(!vocab.length)return;cardIndex=(cardIndex+1)%vocab.length;renderCard()};$('#knowBtn').onclick=()=>{if(!vocab.length)return toast('Hãy thêm từ vựng trước nhé!');const v=vocab[cardIndex%vocab.length],key=vocabKey(v);knownWordKeys.add(key);saveKnownState();$('#knownCount').textContent=known;syncProfile({knownWords:known});toast('Đã ghi nhận! Bạn đang tiến bộ rất tốt ✨');cardIndex=(cardIndex+1)%vocab.length;renderCard()};
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
async function loadAiContext(v,requestId){const fallback=`The word <b>${esc(v.word)}</b> is useful to learn in context.`;$('#questionWord').innerHTML=fallback;try{const res=await fetch(aiEndpoint('context-example'),{method:'POST',headers:await aiHeaders(),body:JSON.stringify({word:v.word,meaning:vocabMeaning(v)})});const data=await res.json();if(requestId!==contextRequestId)return;if(res.ok&&data.text)$('#questionWord').textContent=data.text;else $('#questionHint').textContent='AI chưa được cấu hình — dùng câu ví dụ mặc định:'}catch(e){if(requestId===contextRequestId)$('#questionHint').textContent='AI chỉ hoạt động khi chạy server — dùng câu ví dụ mặc định:'}}
function clearReflexTimer(){if(reflexTimerId){clearInterval(reflexTimerId);reflexTimerId=null}}
function updateReflexHud(timeLeft=reflexTimeLimit){
  const set=(id,value)=>{const el=$('#'+id);if(el)el.textContent=String(value)};
  set('reflexHudQuestion',question+' / '+reflexSessionLength);
  set('reflexCombo',reflexCombo+'×');
  set('reflexScore',reflexScore);
  set('reflexTime',Math.max(0,timeLeft).toFixed(1)+'s');
  set('reflexAccuracy',(reflexAnswered?Math.round(reflexCorrect/reflexAnswered*100):0)+'%');
  const total=reflexSessionLength||10;
  const qp=$('#quizProgress');if(qp)qp.style.width=Math.min(100,((question-1)/total)*100)+'%';
  const fill=$('#reflexTimeFill');if(fill)fill.style.width=Math.max(0,(timeLeft/reflexTimeLimit)*100)+'%';
}
function startReflexTimer(){
  clearReflexTimer();
  let left=reflexTimeLimit;
  updateReflexHud(left);
  reflexTimerId=setInterval(()=>{
    left=Math.max(0,left-.1);updateReflexHud(left);
    if(left<=0){clearReflexTimer();handleReflexTimeout()}
  },100);
}
function finishReflexSession(){
  clearReflexTimer();
  const earned=sessionCoins,acc=reflexAnswered?Math.round(reflexCorrect/reflexAnswered*100):0;
  const resultContent=$('#resultContent');
  if(resultContent)resultContent.innerHTML='<div class="reflex-result-card"><div class="reflex-result-score">'+acc+'%</div><h2>Phiên phản xạ hoàn tất! ⚡</h2><p>'+reflexCorrect+' / '+reflexAnswered+' câu đúng · Combo cao nhất '+reflexMaxCombo+'×</p><div class="reflex-result-grid"><div class="reflex-result-stat"><b>'+reflexScore+'</b><small>Điểm phiên</small></div><div class="reflex-result-stat"><b>'+reflexMaxCombo+'×</b><small>Best combo</small></div><div class="reflex-result-stat"><b>'+earned+'</b><small>KatCoin nhận</small></div><div class="reflex-result-stat"><b>'+reflexSessionLength+'</b><small>Số câu</small></div></div><p>'+(acc>=80?'🔥 Phản xạ rất tốt!':acc>=60?'✨ Đang vào nhịp rồi!':'🐾 Hãy chơi thêm một lượt để làm nóng phản xạ!')+'</p></div>';
  $('#resultModal')?.classList.add('show');
  question=1;sessionCoins=0;
  if($('#sessionCoins'))$('#sessionCoins').textContent='0';
  if($('#reflexCombo'))$('#reflexCombo').textContent='0×';
  updateReflexHud(reflexTimeLimit);
}
function advanceReflexRound(){
  if(question>=reflexSessionLength){finishReflexSession();return}
  question++;renderQuiz();
}
function handleReflexTimeout(){
  if(answered)return;
  answered=true;reflexAnswered++;reflexCombo=0;
  $$('.answer').forEach(b=>b.disabled=true);
  const correctBtn=$$('.answer').find?.(b=>b.dataset.right==='true') || [...$$('.answer')].find(b=>b.dataset.right==='true');
  correctBtn?.classList.add('correct');
  $('#feedback').textContent='⏱ Hết giờ! Phản xạ cần nhanh hơn một chút.';
  $('#feedback').style.color='#b67d34';
  updateReflexHud(0);
  setTimeout(advanceReflexRound,650);
}
function renderQuiz(){clearReflexTimer();const contextId=++contextRequestId;answered=false;
  if(!vocab.length){
    $('#questionHint').textContent='Bạn cần thêm từ vựng trước khi luyện tập.';$('#questionWord').textContent='Chưa có bộ từ';$('#questionPronounce').textContent='';
    $('#answers').innerHTML='<button class="answer" id="goAddWords"><b>＋</b> Thêm từ vựng ngay</button>';$('#goAddWords').onclick=()=>showPage('learn');$('#feedback').textContent='';updateReflexHud(reflexTimeLimit);return
  }
  const v=vocab[(question-1)%vocab.length];let correct,hint,word,pron='',candidateLabels=[];
  if(mode==='engvi'){
    hint='Chọn nghĩa tiếng Việt của từ:';
    word=v.word;pron=vocabPronunciation(v);correct=vocabMeaning(v);
    candidateLabels=vocab.map(x=>vocabMeaning(x));
  }else if(mode==='vieng'){
    hint='Chọn từ tiếng Anh phù hợp với nghĩa:';
    word=vocabMeaning(v);correct=v.word;
    candidateLabels=vocab.map(x=>x.word);
  }else{
    hint='Từ in đậm trong ngữ cảnh có nghĩa là gì?';
    word=`The word <b>${esc(v.word)}</b> is useful to learn in context.`;
    correct=vocabMeaning(v);
    candidateLabels=vocab.map(x=>vocabMeaning(x));
  }
  $('#questionHint').textContent=hint;$('#questionWord').innerHTML=mode==='context'?word:esc(word);$('#questionPronounce').textContent=pron;$('#questionNumber').textContent=question;
  $('#reflexQuestionTotal').textContent=reflexSessionLength;$('#reflexSessionLabel').textContent=reflexSessionLength+' câu';$('#feedback').textContent='';

  // Always build choices around the current target:
  // 1) lock the correct answer in;
  // 2) select up to three UNIQUE distractors that are different from it;
  // 3) shuffle only after the four-choice set is complete.
  const normalizedCorrect=String(correct??'').trim();
  const targetIndex=Math.max(0,vocab.indexOf(v));
  const uniqueDistractors=[...new Set(candidateLabels.map(a=>String(a??'').trim()).filter(Boolean))]
    .filter(a=>a.toLowerCase()!==normalizedCorrect.toLowerCase());

  // Prefer distractors close to the target inside the SAME vocabulary pack.
  // This keeps choices semantically related instead of mixing in random words
  // such as transport terms for an environment question.
  const nearbyIndices=[];
  for(let distance=1;distance<vocab.length;distance++){
    const left=targetIndex-distance,right=targetIndex+distance;
    if(left>=0)nearbyIndices.push(left);
    if(right<vocab.length)nearbyIndices.push(right);
    if(nearbyIndices.length>=12)break;
  }
  const nearbyCandidates=nearbyIndices
    .map(i=>candidateLabels[i])
    .map(a=>String(a??'').trim())
    .filter(Boolean)
    .filter(a=>a.toLowerCase()!==normalizedCorrect.toLowerCase());
  const orderedDistractors=[...new Set([...nearbyCandidates,...shuffle(uniqueDistractors)])];
  const distractors=orderedDistractors.slice(0,3);
  let quizAnswers=shuffle([normalizedCorrect,...distractors]);

  // Hard invariant: exactly one correct answer must be present.
  const correctCount=quizAnswers.filter(a=>a.toLowerCase()===normalizedCorrect.toLowerCase()).length;
  if(correctCount!==1){
    const filtered=quizAnswers.filter(a=>a.toLowerCase()!==normalizedCorrect.toLowerCase()).slice(0,3);
    quizAnswers=shuffle([normalizedCorrect,...filtered]);
  }

  const labels=['A','B','C','D'];
  $('#answers').innerHTML=quizAnswers.map((a,i)=>`<button class="answer" data-answer="${esc(a)}" data-right="${a.toLowerCase()===normalizedCorrect.toLowerCase()}"><b>${labels[i]}</b><span>${esc(a)}</span></button>`).join('');
  $$('.answer').forEach(btn=>btn.onclick=()=>answer(btn,correct));
  updateReflexHud(reflexTimeLimit);startReflexTimer();
  if(mode==='context')loadAiContext(v,contextId);
}
async function answer(btn,correct){
  if(answered)return;
  answered=true;clearReflexTimer();
  const good=btn.dataset.right==='true',v=vocab[(question-1)%vocab.length];
  reflexAnswered++;
  if(good){reflexCorrect++;reflexCombo++;reflexMaxCombo=Math.max(reflexMaxCombo,reflexCombo);reflexScore+=100+(Math.max(0,reflexCombo-1)*25)}
  else{reflexCombo=0}
  updateReflexHud(0);
  $$('.answer').forEach(b=>{if(b.dataset.right==='true')b.classList.add('correct');b.disabled=true});
  if(!good){btn.classList.add('wrong');$('#feedback').textContent='Đáp án đúng là: '+correct;$('#feedback').style.color='#e36b63'}
  let awarded=false,rewardError='',serverConfirmed=false;
  if(window.studyStore?.user){
    try{
      const token=await window.studyStore.getIdToken();
      const payload={action:'answer',word:v.word,meaning:vocabMeaning(v),answer:btn.dataset.answer||'',mode,source:activeVocabSource};
      const res=await fetch(gameEndpoint(),{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({}));
      if(res.ok&&data.ok){
        if(Number.isFinite(Number(data.dailyQuestions)))updateDailyGoal(data.dailyQuestions);
        serverConfirmed=typeof data.correct==='boolean';awarded=data.rewarded===true;
        if(data.correct===true&&data.rewarded===true){sessionCoins+=10;coins=Number(data.coins??coins);energy=Number(data.xp??energy);updateCoins();$('#sessionCoins').textContent=sessionCoins;$('#feedback').textContent='Chính xác! +10 KatCoin 🪙'}
        else if(good&&data.correct===true&&!data.rewarded){$('#feedback').textContent='Chính xác! Lượt này đã nhận/không đủ điều kiện cộng thêm KatCoin.'}
        else if(good){$('#feedback').textContent='Đáp án chưa được máy chủ xác nhận.'}
      }else{rewardError=data.error||'Máy chủ chưa xác nhận được kết quả.'}
    }catch(error){rewardError=error?.message||'Không thể kết nối máy chủ kết quả.'}
  }else if(good){
    awarded=true;sessionCoins+=10;coins+=10;energy+=10;updateDailyGoal(dailyCount+1);updateCoins();$('#sessionCoins').textContent=sessionCoins;$('#feedback').textContent='Chính xác! +10 KatCoin 🪙'
  }
  if(good&&!awarded&&!serverConfirmed)$('#feedback').textContent='Chính xác! KatCoin chưa được cộng: '+rewardError;
  updateReflexHud(0);
  setTimeout(advanceReflexRound,750)
}
$$('.mode-card').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('.mode-card').forEach(x=>x.classList.toggle('active-mode',x===b));question=1;reflexCorrect=0;reflexAnswered=0;reflexCombo=0;reflexMaxCombo=0;reflexScore=0;sessionCoins=0;if($('#sessionCoins'))$('#sessionCoins').textContent='0';renderQuiz()});
$$('.reflex-length').forEach(b=>b.onclick=()=>{reflexSessionLength=Math.max(1,Number(b.dataset.reflexLength)||10);$$('.reflex-length').forEach(x=>x.classList.toggle('active',x===b));question=1;reflexCorrect=0;reflexAnswered=0;reflexCombo=0;reflexMaxCombo=0;reflexScore=0;sessionCoins=0;if($('#sessionCoins'))$('#sessionCoins').textContent='0';renderQuiz()});
$('#reflexSkip')?.addEventListener('click',()=>{if(answered)return;answered=true;clearReflexTimer();reflexAnswered++;reflexCombo=0;$$('.answer').forEach(b=>b.disabled=true);$('#feedback').textContent='↷ Đã bỏ qua. Giữ nhịp và bắt câu tiếp theo!';updateReflexHud(0);setTimeout(advanceReflexRound,450)});
document.addEventListener('keydown',e=>{if(!$('#practice')?.classList.contains('active-page')||answered)return;if(['1','2','3','4'].includes(e.key)){const i=Number(e.key)-1;const btn=[...$$('#answers .answer')][i];btn?.click()}});
$('#resultModal')?.querySelector('.modal-close')?.addEventListener('click',()=>{$('#resultModal')?.classList.remove('show');renderQuiz()});
function requireSignedInPersonalService(){
  const user=window.studyStore?.user;
  if(user)return true;
  toast('🔒 Tính năng bộ từ cá nhân yêu cầu tài khoản. Đăng ký/đăng nhập để sử dụng nhé! 🐱');
  setTimeout(()=>location.replace('/login.html'),500);
  return false;
}
const addWordBtn=$('#addWordBtn'),wordModal=$('#wordModal'),wordSave=$('#saveWord');
if(addWordBtn)addWordBtn.onclick=()=>{if(requireSignedInPersonalService())wordModal?.classList.add('show')};
if(wordModal){wordModal.querySelector('.modal-close')?.addEventListener('click',()=>wordModal.classList.remove('show'));wordModal.onclick=e=>{if(e.target===wordModal)wordModal.classList.remove('show')}}
if(wordSave)wordSave.onclick=async()=>{const sourceKind=String(activeVocabSource?.kind||'legacy');if(['core','public','assigned'].includes(sourceKind))return toast('🔒 Kho từ này chỉ để học. Hãy tạo một bộ từ cá nhân nếu muốn thêm từ mới.');const authUid=String(window.studyStore?.user?.uid||'');if(sourceKind==='legacy'&&authUid&&await window.studyStore?.isClassStudent?.()){if(String(window.studyStore?.user?.uid||'')===authUid)toast('🔒 Tài khoản lớp học chỉ sử dụng bộ từ do KatLearn/GV quản lý.');return}if(authUid&&String(window.studyStore?.user?.uid||'')!==authUid)return;const item={word:$('#newWord')?.value.trim()||'',mean:$('#newMeaning')?.value.trim()||'',pron:$('#newPronounce')?.value.trim()||'',emoji:'📚'};if(!item.word||!item.mean)return toast('Hãy nhập từ và nghĩa trước nhé.');if(vocab.some(v=>v.word.toLowerCase()===item.word.toLowerCase()))return toast('Từ vựng này đã có trong danh sách.');vocab.push(item);localStorage.setItem('katlearn-vocab',JSON.stringify(vocab));cardIndex=vocab.length-1;wordModal?.classList.remove('show');renderCard();renderQuiz();syncProfile();toast('Đã thêm “'+item.word+'” vào bộ từ của bạn!')};

$('#addWordFromList').onclick=()=>{if(requireSignedInPersonalService())$('#wordModal').classList.add('show')};
$('#openFlashcards').onclick=()=>showPage('learn');$('#wordSearch').oninput=e=>renderVocabularyViews(e.target.value);
function esc(text){return String(text||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function renderLeaderboard(){
  const target=$('#rankingContent'),mini=$('#miniRanking');
  try{
    const scores=await window.studyStore.leaderboard();
    if(!scores.length){
      target.textContent='Chưa có điểm công khai. Hãy là người đầu tiên học cùng Kat! 🐾';
      mini.textContent='Chưa có điểm công khai.';
      return;
    }
    const rows=scores.map((score,index)=>`<div class="rank-list-row"><b>${String(index+1).padStart(2,'0')}</b><strong>${esc(score.displayName||'KatLearner')}</strong><small>⚡ ${Number(score.xp||0).toLocaleString('en-US')} XP</small><i>🪙 ${Number(score.coins||0).toLocaleString('en-US')} KatCoin</i></div>`).join('');
    target.innerHTML=rows;
    mini.innerHTML=scores.slice(0,3).map((score,index)=>`<div class="rank-row"><b>${String(index+1).padStart(2,'0')}</b><strong>${esc(score.displayName||'KatLearner')}</strong><span>⚡ ${Number(score.xp||0).toLocaleString('en-US')} XP · 🪙 ${Number(score.coins||0).toLocaleString('en-US')}</span></div>`).join('');
  }catch(error){
    target.textContent='Chưa thể tải bảng xếp hạng.';
    mini.textContent='Chưa thể tải bảng xếp hạng.';
  }
}
async function loadCoreTopic(topicId){const data=await window.katlearnCoreVocabulary.load(topicId);return{id:'core:'+data.id,name:data.name,words:data.words,core:true,topicId:data.id}}
async function loadAssignedPacks(){
  const uid=String(window.studyStore?.user?.uid||'');
  if(!uid)return[];
  try{
    const res=await fetch('/api/student-assigned-packs',{headers:await aiHeaders(),cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(String(window.studyStore?.user?.uid||'')!==uid)return[];
    if(!res.ok)throw new Error(data.error||'Không tải được bài được giao.');
    return Array.isArray(data.packs)?data.packs:[];
  }catch(e){if(String(window.studyStore?.user?.uid||'')===uid)console.warn('[KatLearn] assigned packs:',e);return[]}
}
function setVocabSource(source){activeVocabSource=source||{kind:'legacy'};if(activeVocabSource.kind==='personal'&&!activeVocabSource.uid)activeVocabSource.uid=window.studyStore?.userId||'';localStorage.setItem('katlearn-vocab-source',JSON.stringify(activeVocabSource));loadKnownState()}
function vocabMeaning(v){return String(v?.mean??v?.meaning_vi??v?.translation_vi??v?.translation??'').trim()}
function vocabPronunciation(v){return String(v?.pron??v?.ipa??v?.pronunciation??'').trim()}
function normalizeLearningWords(words=[]){
  return (Array.isArray(words)?words:[]).map(v=>({
    ...v,
    mean:vocabMeaning(v),
    pron:vocabPronunciation(v),
    emoji:v?.emoji||'📚',
    type:v?.type||v?.part_of_speech||''
  })).filter(v=>String(v?.word||'').trim()&&vocabMeaning(v));
}
async function openVocabularyPack(pack){
  if(!pack)return;
  // Firebase Auth can still be hydrating when the library is clicked immediately
  // after page load. Wait for the authoritative auth state before gating access.
  try{
    await window.studyStore?.waitForAuth?.();
  }catch(error){
    console.warn('[KatLearn] Auth readiness while opening vocabulary:',error);
  }
  if(!window.studyStore?.user){
    toast('🔒 Hãy đăng nhập để học bộ từ này nhé!');
    document.body.classList.add('pack-auth-gate');
    window.setTimeout(()=>location.href='/login.html',220);
    return;
  }
  vocab=normalizeLearningWords(pack.words);
  if(!pack.current)setVocabSource(pack.core?{kind:'core',id:pack.topicId}:pack.assigned?{kind:'assigned',id:pack.id}:{kind:'public',id:pack.id});
  else loadKnownState();
  cardIndex=0;
  localStorage.setItem('katlearn-vocab',JSON.stringify(vocab));
  renderCard();renderQuiz();showPage('learn');
  toast(`Đã mở “${pack.name}”.`);
}
async function openCoreTopic(topicId){
  try{openVocabularyPack(await loadCoreTopic(topicId))}
  catch(e){toast('Không tải được kho từ KatLearn: '+(e.message||'Lỗi không xác định'))}
}
function renderCoreTopicGroups(core=[]){
  return core.map(topic=>'<div class="published-pack"><span>🧠</span><div><b>'+esc(topic.name)+'</b><small>Kho từ KatLearn</small></div><button data-core-topic="'+esc(topic.id)+'">Học</button></div>').join('');
}

let katLibraryPath=[];

function katLibraryTree(core=[],packs=[],assigned=[]){
  const base=(window.katlearnCoreVocabulary?.library||[]).map(node=>({
    ...node,
    children:Array.isArray(node.children)?node.children.map(child=>({...child,children:Array.isArray(child.children)?child.children:[]})):[],
  }));
  const everyday=base.find(x=>x.id==='everyday');
  const everydayTopics=everyday?.children?.find(x=>x.id==='everyday-topics');
  if(everydayTopics){
    everydayTopics.children=core.filter(x=>x.category==='Everyday Topics').map(x=>({
      id:'topic:'+x.id,name:x.name,icon:'📘',packId:x.id
    }));
  }
  if(assigned.length)base.push({id:'assigned',name:'Bài được giao',icon:'📩',children:assigned.map(p=>({id:'assigned:'+p.id,name:p.name,icon:'📩',packId:p.id,assigned:true}))});
  if(packs.length)base.push({id:'community',name:'Cộng đồng KatLearn',icon:'🌐',children:packs.map(p=>({id:'community:'+p.id,name:p.name,icon:'📚',packId:p.id,community:true}))});
  return base;
}

function katLibraryFolderCount(node){
  if(Array.isArray(node.children)&&node.children.length)return node.children.length+' mục';
  if(Array.isArray(node.words))return node.words.length+' từ';
  return '';
}

function katLibraryFindNode(tree,path=[]){
  let level=tree,node=null;
  for(const id of path){
    node=level.find(x=>x.id===id);
    if(!node)return null;
    level=Array.isArray(node.children)?node.children:[];
  }
  return node;
}

async function katLibraryOpenLeaf(node,core=[],packs=[],assigned=[]){
  if(!node?.packId)return;
  const coreTopic=core.find(x=>x.id===node.packId);
  let pack;
  if(coreTopic){
    pack=await loadCoreTopic(node.packId);
  }else{
    pack=packs.concat(assigned).find(x=>x.id===node.packId);
  }
  if(!pack)throw new Error('Không tìm thấy bộ từ '+node.name);
  let words=Array.isArray(pack.words)?pack.words.slice():[];
  if(Array.isArray(node.words)) {
    const wanted=new Set(node.words.map(String));
    words=words.filter(w=>wanted.has(String(w.word)));
  } else if(Array.isArray(node.categories)) {
    const wanted=new Set(node.categories.map(String));
    words=words.filter(w=>wanted.has(String(w.category||'')));
  }
  if(!words.length)throw new Error(node.name+' chưa có dữ liệu phù hợp.');
  openVocabularyPack({...pack,name:node.name,words});
}

function renderKatLibraryHierarchy(core=[],packs=[],assigned=[]){
  const library=$('#packLibrary');
  if(!library)return;
  const tree=katLibraryTree(core,packs,assigned);
  const node=katLibraryFindNode(tree,katLibraryPath);
  const level=node?node.children||[]:tree;

  if(node?.packId&&!level.length){
    const count=node.words?.length||node.categories?.length||'';
    library.innerHTML='<div class="kat-library-toolbar"><button type="button" class="kat-library-back" id="katLibraryBack">← Quay lại</button><div><b>'+esc(node.name)+'</b><small>'+(count?(count+' từ chọn lọc'):'Bộ từ KatLearn')+'</small></div></div><div class="kat-library-leaf-card"><span>'+esc(node.icon||'📘')+'</span><div><h3>'+esc(node.name)+'</h3><p>Nhóm từ được KatLearn chọn lọc theo mục tiêu học tập.</p></div><button type="button" id="katLibraryOpenLeaf">Học bộ từ →</button></div>';
    $('#katLibraryBack')?.addEventListener('click',()=>{katLibraryPath.pop();renderKatLibraryHierarchy(core,packs,assigned)});
    $('#katLibraryOpenLeaf')?.addEventListener('click',()=>void katLibraryOpenLeaf(node,core,packs,assigned).catch(err=>toast('Không tải được bộ từ: '+(err.message||'Lỗi'))));
    return;
  }

  const parentLabel=node?.name||'Thư viện từ vựng';
  const cards=level.map(child=>{
    const count=katLibraryFolderCount(child);
    const icon=child.icon||'📁';
    return '<button type="button" class="kat-library-folder" data-library-node="'+esc(child.id)+'"><span class="kat-library-folder-icon">'+icon+'</span><span class="kat-library-folder-copy"><b>'+esc(child.name)+'</b><small>'+(count||'Khám phá bộ từ')+'</small></span><span class="kat-library-folder-arrow">›</span></button>';
  }).join('');
  library.innerHTML=(node?'<div class="kat-library-toolbar"><button type="button" class="kat-library-back" id="katLibraryBack">← Quay lại</button><div><b>'+esc(parentLabel)+'</b><small>'+level.length+' mục</small></div></div>':'<div class="kat-library-folder-head"><div><p class="eyebrow">KATLEARN VOCABULARY LIBRARY</p><h2>Thư viện từ vựng</h2><p>Khám phá từ vựng theo mục tiêu, kỹ năng và nhóm sử dụng.</p></div><span class="kat-library-folder-count">'+level.length+' mục lớn</span></div>')+'<div class="kat-library-folder-grid">'+(cards||'<div class="empty-state">Thư mục này đang được Kat bổ sung. 🐱</div>')+'</div>';
  $('#katLibraryBack')?.addEventListener('click',()=>{katLibraryPath.pop();renderKatLibraryHierarchy(core,packs,assigned)});
  $$('[data-library-node]').forEach(btn=>btn.onclick=()=>{
    const child=level.find(x=>x.id===btn.dataset.libraryNode);
    if(!child)return;
    if(Array.isArray(child.children)&&child.children.length){
      katLibraryPath.push(child.id);
      renderKatLibraryHierarchy(core,packs,assigned);
    }else{
      katLibraryPath.push(child.id);
      renderKatLibraryHierarchy(core,packs,assigned);
    }
  });
}

function renderCoreTopicGroups(core=[]){
  return core.map(topic=>'<div class="published-pack"><span>🧠</span><div><b>'+esc(topic.name)+'</b><small>Kho từ KatLearn</small></div><button data-core-topic="'+esc(topic.id)+'">Học</button></div>').join('');
}

function renderPackLibrary(packs=[],assigned=[]){
  const library=$('#packLibrary');
  if(!library)return;
  const signedIn=!!window.studyStore?.user;
  const core=window.katlearnCoreVocabulary?.topics||[];
  const safePacks=packs||[];
  const safeAssigned=assigned||[];
  if(!signedIn&&katLibraryPath.length===0){
    // Public core library remains visible even before login; community packs still follow existing auth behavior.
  }
  renderKatLibraryHierarchy(core,safePacks,safeAssigned);
}
let publicPackRenderPromise=null;
let publicPackRenderUid='';
async function renderPublicPacks(){
  const target=$('#publishedPacks'),adminList=$('#publicPackList');
  const uid=String(window.studyStore?.user?.uid||'guest');
  if(publicPackRenderPromise&&publicPackRenderUid===uid)return publicPackRenderPromise;

  publicPackRenderUid=uid;
  publicPackRenderPromise=(async()=>{
    let packs=[];
    try{
      // Public packs are shared data: render them as soon as Firestore returns.
      packs=await window.studyStore.publicPacks();
      if(String(window.studyStore?.user?.uid||'guest')!==uid)return;
      const core=window.katlearnCoreVocabulary?.topics||[];
      const publicBody=packs.length?packs.map(pack=>`<div class="published-pack"><span>📚</span><div><b>${esc(pack.name)}</b><small>${Array.isArray(pack.words)?pack.words.length:0} từ vựng</small></div><button data-public-pack="${esc(pack.id)}">Học pack</button></div>`).join(''):'<div class="empty-state">Chưa có pack công khai.</div>';
      const coreBody=renderCoreTopicGroups(core);
      target.innerHTML=`<b>Kho từ vựng KatLearn</b>${coreBody}<b style="display:block;margin-top:16px">Pack từ vựng công khai</b>${publicBody}`;
      if(adminList)adminList.innerHTML=publicBody;
      renderPackLibrary(packs,[]);
      $$('[data-public-pack]').forEach(btn=>btn.onclick=()=>{const pack=packs.find(p=>p.id===btn.dataset.publicPack);openVocabularyPack(pack)});
      $$('[data-core-topic]').forEach(btn=>btn.onclick=()=>void openCoreTopic(btn.dataset.coreTopic));

      // Assigned packs can come from the teacher API and may be slower.
      // Add them after the public catalog is already visible.
      try{
        const assigned=uid==='guest'?[]:await loadAssignedPacks();
        if(String(window.studyStore?.user?.uid||'guest')!==uid)return;
        const assignedBody=assigned.length?assigned.map(pack=>`<div class="published-pack"><span>📩</span><div><b>${esc(pack.name)}</b><small>${Array.isArray(pack.words)?pack.words.length:0} từ · Bài được giao</small></div><button data-assigned-pack="${esc(pack.id)}">Học</button></div>`).join(''):'';
        target.innerHTML=`<b>Kho từ vựng KatLearn</b>${coreBody}${assignedBody}<b style="display:block;margin-top:16px">Pack từ vựng công khai</b>${publicBody}`;
        renderPackLibrary(packs,assigned);
        $$('[data-public-pack]').forEach(btn=>btn.onclick=()=>{const pack=packs.find(p=>p.id===btn.dataset.publicPack);openVocabularyPack(pack)});
        $$('[data-assigned-pack]').forEach(btn=>btn.onclick=()=>{const pack=assigned.find(p=>p.id===btn.dataset.assignedPack);openVocabularyPack(pack)});
        $$('[data-core-topic]').forEach(btn=>btn.onclick=()=>void openCoreTopic(btn.dataset.coreTopic));
      }catch(e){console.warn('[KatLearn] assigned packs:',e);renderPackLibrary(packs,[]);}
    }catch(e){
      if(String(window.studyStore?.user?.uid||'guest')===uid){
        target.textContent='Chưa thể tải kho từ vựng.';
        renderPackLibrary();
        if(adminList)adminList.textContent='Chưa thể tải danh sách pack.';
      }
    }finally{
      publicPackRenderPromise=null;
    }
  })();

  return publicPackRenderPromise;
}
function renderAdmin(user){const canAdmin=!!user&&window.studyStore.isAdmin();const adminNav=$('.admin-nav');if(adminNav)adminNav.hidden=!canAdmin;const adminPage=$('#admin');if(!canAdmin&&adminPage?.classList.contains('active-page'))showPage('home')}
function packRow(data={}){const row=document.createElement('div');row.className='pack-word-row';row.innerHTML=`<input class="pack-english" value="${esc(data.word)}" maxlength="60" placeholder="Tiếng Anh" required><input class="pack-vietnamese" value="${esc(data.mean)}" maxlength="100" placeholder="AI tự điền nghĩa" required><input class="pack-pronunciation" value="${esc(data.pron)}" maxlength="70" placeholder="AI tự điền phiên âm"><button class="remove-row-btn" type="button" title="Xóa từ">×</button>`;row.querySelector('.remove-row-btn').onclick=()=>{if($$('.pack-word-row').length===1)return toast('Pack cần ít nhất một từ vựng.');row.remove()};const english=row.querySelector('.pack-english');english.addEventListener('input',()=>{clearTimeout(row.aiTimer);row.aiTimer=setTimeout(()=>fillPackWord(row),700)});return row}
async function fillPackWord(row){const word=row.querySelector('.pack-english').value.trim(),mean=row.querySelector('.pack-vietnamese'),pron=row.querySelector('.pack-pronunciation');if(!word)return;row.dataset.word=word;[mean,pron].forEach(x=>{x.classList.add('ai-filling');x.placeholder='Kat AI đang xử lý…'});try{const res=await fetch(aiEndpoint('vocab-assist'),{method:'POST',headers:await aiHeaders(),body:JSON.stringify({word})}),data=await res.json();if(!res.ok)throw new Error(data.error||'AI chưa sẵn sàng');if(row.dataset.word!==word)return;mean.value=data.meaning||mean.value;pron.value=data.pronunciation||pron.value;toast(`Kat AI đã điền nghĩa và phiên âm cho “${word}”.`)}catch(error){mean.placeholder='Tự nhập nghĩa tiếng Việt';pron.placeholder='Tự nhập phiên âm';toast('Kat AI chưa được kích hoạt — bạn vẫn có thể tự điền hai ô.')}finally{[mean,pron].forEach(x=>x.classList.remove('ai-filling'))}}
function resetPackRows(){const rows=$('#packWordRows');rows.innerHTML='';rows.append(packRow(),packRow(),packRow())}
const openPackModal=$('#openPackModal'),packModal=$('#packModal');
if(openPackModal)openPackModal.onclick=()=>{resetPackRows();$('#publicPackName').value='';packModal?.classList.add('show')};
if(packModal)packModal.querySelector('.modal-close')?.addEventListener('click',()=>packModal.classList.remove('show'));
if(packModal)packModal.onclick=e=>{if(e.target===packModal)packModal.classList.remove('show')};
const addPackRowBtn=$('#addPackRow');if(addPackRowBtn)addPackRowBtn.onclick=()=>$('#packWordRows')?.append(packRow());
const publicPackForm=$('#publicPackForm');if(publicPackForm)publicPackForm.onsubmit=async e=>{e.preventDefault();if(!window.studyStore.isAdmin())return toast('Tài khoản này chưa có quyền admin.');const words=[...$$('.pack-word-row')].map(row=>({word:row.querySelector('.pack-english').value.trim(),mean:row.querySelector('.pack-vietnamese').value.trim(),pron:row.querySelector('.pack-pronunciation').value.trim(),emoji:'📚'})).filter(item=>item.word&&item.mean);if(!words.length)return toast('Pack cần ít nhất một từ đủ Anh–Việt.');try{await window.studyStore.createPublicPack({name:$('#publicPackName').value.trim(),words});$('#packModal').classList.remove('show');await renderPublicPacks();toast(`Đã xuất bản pack gồm ${words.length} từ vựng!`)}catch(err){toast('Không thể xuất bản: '+err.message)}};const copySecretCommand=$('#copySecretCommand');if(copySecretCommand)copySecretCommand.onclick=async()=>{try{await navigator.clipboard.writeText('GEMINI_API_KEY');toast('Đã sao chép lệnh Firebase Secret.')}catch(e){toast('Hãy sao chép lệnh hiển thị bên trên.')}};
const settingsBtn=$('#settingsBtn');
if(settingsBtn){
  settingsBtn.title='Thay đổi thông tin tài khoản';
  settingsBtn.setAttribute('aria-label','Thay đổi thông tin tài khoản');
  settingsBtn.onclick=()=>{location.href='/settings.html'};
}
window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG).then(()=>syncProfile()).catch(e=>console.warn('Firebase chưa kết nối:',e));
function renderAuth(user){const login=$('#loginBtn'),trigger=$('#accountTrigger'),panel=$('#accountPanel');if(!login||!trigger||!panel)return;login.hidden=!!user;trigger.hidden=!user;if(!user){panel.hidden=true;login.onclick=()=>location.replace('/login.html');return}const name=user.displayName||user.email?.split('@')[0]||'KatLearn Student',initial=name.trim()[0].toUpperCase();['#accountAvatar','#panelAvatar'].forEach(s=>{const avatar=$(s);avatar.textContent=initial;if(user.photoURL){avatar.style.backgroundImage=`url("${user.photoURL}")`;avatar.style.backgroundSize='cover';avatar.style.color='transparent'}else{avatar.style.backgroundImage='';avatar.style.color='#fff'}});$('#accountName').textContent=name;$('#panelName').textContent=name;$('#panelEmail').textContent=user.email||'';updateCoins();trigger.onclick=()=>panel.hidden=!panel.hidden;panel.hidden=false}
async function refreshAuthDependentViews(user){
  // Auth is the fast source of truth. Never block section access on Firestore.
  renderAuth(user);renderAdmin(user);
  // Render the public catalog only once per authenticated session. The
  // account-ready event may arrive shortly after auth-change and should not
  // start a duplicate Firestore/API sync for the same UID.
  void renderPublicPacks();
  await Promise.allSettled([
    renderLeaderboard(),
    window.renderStudentPersonalPacks?.(),
    window.renderProgressDashboard?.()
  ]);
}
function clearClientLearningState(){
  vocab=[];coins=0;energy=0;cardIndex=0;known=0;question=1;sessionCoins=0;dailyCount=0;answered=false;contextRequestId++;clearReflexTimer();reflexCorrect=0;reflexAnswered=0;reflexCombo=0;reflexMaxCombo=0;reflexScore=0;
  knownWordKeys=new Set();
  activeVocabSource={kind:'legacy'};
  for(const key of ['katlearn-vocab','katlearn-vocab-source','katlearn-stats','katlearn-personal-pack-name','katlearn-theme','katlearn-owned-themes','katlearn-account-type'])localStorage.removeItem(key);
  for(const key of Object.keys(localStorage))if(key.startsWith('katlearn-known:'))localStorage.removeItem(key);
  updateDailyGoal(0);updateCoins();renderCard();renderQuiz();
  document.querySelector('#studentPersonalPacks')?.replaceChildren();
  const count=document.querySelector('#personalPackCount');if(count)count.textContent='0';
}
window.addEventListener('8b1-auth-change',e=>{
  if(!e.detail)clearClientLearningState();
  loadKnownState();
  void refreshAuthDependentViews(e.detail);
});
window.addEventListener('katlearn-account-fast',e=>{if(e.detail?.account){renderAuth(e.detail.user);renderAdmin(e.detail.user)}});
window.addEventListener('katlearn-account-ready',e=>{void refreshAuthDependentViews(e.detail?.account?e.detail.user:null)});
window.addEventListener('katlearn-account-ready',e=>{const profile=e.detail?.profile||null;updateHomeHeader(profile);updateDailyGoal(profile?.dailyQuestions||0)});renderAuth(null);renderAdmin(null);const loginModal=$('#loginModal');if(loginModal)loginModal.querySelector('.modal-close')?.addEventListener('click',()=>loginModal.classList.remove('show'));if(loginModal)loginModal.onclick=e=>{if(e.target===loginModal)loginModal.classList.remove('show')};function authError(err){if(err.code==='auth/unauthorized-domain')return `Firebase chưa cho phép domain “${location.hostname}”. Vào Authentication → Settings → Authorized domains để thêm domain này.`;const messages={'auth/operation-not-allowed':'Hãy bật Email/Password trong Firebase Authentication trước.','auth/email-already-in-use':'Email này đã có tài khoản. Hãy đăng nhập.','auth/invalid-credential':'Email hoặc mật khẩu không đúng.','auth/weak-password':'Mật khẩu cần ít nhất 6 ký tự.'};return messages[err.code]||'Không thể thực hiện: '+err.message}async function providerLogin(provider){try{const user=await window.studyStore.signIn(provider);$('#loginModal').classList.remove('show');renderAuth(user);toast(`Chào mừng ${user.displayName||'bạn'}! Dữ liệu đang được đồng bộ.`)}catch(err){toast(authError(err))}}async function emailLogin(create){const email=$('#authEmail').value.trim(),password=$('#authPassword').value;if(!email||!password)return;try{const user=await window.studyStore.signInEmail(email,password,create);$('#loginModal').classList.remove('show');renderAuth(user);toast(create?'Đã tạo tài khoản thành công!':'Đăng nhập thành công!')}catch(err){toast(authError(err))}}const emailLoginForm=$('#emailLoginForm'),emailRegister=$('#emailRegister'),googleLogin=$('#googleLogin'),appleLogin=$('#appleLogin'),logoutBtn=$('#logoutBtn'),openProgress=$('#openProgress');if(emailLoginForm)emailLoginForm.onsubmit=e=>{e.preventDefault();emailLogin(false)};if(emailRegister)emailRegister.onclick=()=>emailLogin(true);if(googleLogin)googleLogin.onclick=()=>providerLogin('google');if(appleLogin)appleLogin.onclick=()=>providerLogin('apple');if(logoutBtn)logoutBtn.onclick=async()=>{try{await window.studyStore.signOut();toast('Đã đăng xuất.');setTimeout(()=>location.replace('/login.html'),100)}catch(e){toast('❌ Không thể đăng xuất: '+(e.message||'Lỗi không xác định'))}};if(openProgress)openProgress.onclick=()=>{showPage('progress');$('#accountPanel').hidden=true};document.addEventListener('click',e=>{const topActions=$('.top-actions'),panel=$('#accountPanel');if(topActions&&!topActions.contains(e.target)&&panel)panel.hidden=true});
renderCard();renderQuiz();updateCoins();openInitialPage();
void renderPublicPacks();

window.addEventListener('katlearn-personal-pack-open',e=>{const words=Array.isArray(e.detail?.words)?e.detail.words:[];vocab=words;setVocabSource({kind:'personal',id:String(e.detail?.id||''),uid:window.studyStore?.userId||''});cardIndex=0;localStorage.setItem('katlearn-vocab',JSON.stringify(vocab));renderCard();renderQuiz();void syncProfile({personalPackName:String(e.detail?.name||'').trim(),knownWords:known,totalWords:vocab.length,vocab});});
window.addEventListener('katlearn-personal-pack-deleted',e=>{
  const id=String(e.detail?.id||'');
  if(activeVocabSource?.kind!=='personal'||String(activeVocabSource?.id||'')!==id)return;
  vocab=[];cardIndex=0;known=0;knownWordKeys.clear();
  activeVocabSource={kind:'legacy'};
  localStorage.removeItem('katlearn-vocab');localStorage.removeItem('katlearn-vocab-source');localStorage.removeItem('katlearn-known-'+id);
  renderCard();renderQuiz();void syncProfile({personalPackName:'',knownWords:0,totalWords:0,vocab:[]});void renderPackLibrary();
  toast('Bộ từ đang học đã được xóa.');
});
