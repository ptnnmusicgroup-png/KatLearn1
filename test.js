(function(){
  const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  let packs=[],selectedPacks=[],questions=[],index=0,score=0,answered=false,startedAt=0,timerId=null,testActive=false,suppressGuard=false,answersLog=[],antiCheatCleanup=null,antiCheatTriggered=false,focusCheckId=null,blurCheckId=null;
  function toast(msg,kind='normal'){
    const el=$('#testToast');if(!el)return;
    el.textContent=msg;el.className='test-toast '+kind+' show';
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);
  }
  function cleanPack(p){
    const raw=Array.isArray(p?.words)?p.words:[];
    const seen=new Set();
    const clean=raw.map(w=>({
      word:String(w?.word||'').trim(),mean:String(w?.mean||w?.meaning_vi||'').trim(),
      pron:String(w?.pron||w?.ipa||'').trim(),example:String(w?.example||'').trim(),
      type:String(w?.type||w?.part_of_speech||'').trim()
    })).filter(w=>w.word&&w.mean).filter(w=>{
      const k=normalize(w.word);if(seen.has(k))return false;seen.add(k);return true;
    });
    return {...p,words:clean};
  }
  function renderPackList(){
    const box=$('#packList'),empty=$('#packEmpty'),count=$('#selectedPackCount');
    if(!box)return;
    if(!packs.length){
      box.innerHTML='';empty.hidden=false;empty.innerHTML='<div class="lock-state"><div class="lock-state-icon">📚</div><b>Chưa có bộ từ đủ điều kiện</b><p>Tạo ít nhất một bộ từ riêng có từ vựng hợp lệ rồi quay lại đây để Kat ra đề cho bạn.</p><a href="/personal-packs.html">+ Tạo bộ từ riêng</a></div>';count.textContent='0';updateConfig();return;
    }
    empty.hidden=true;
    box.innerHTML=packs.map(p=>'<label class="pack-check"><input type="checkbox" value="'+esc(p.id)+'"><span class="pack-check-ui"><i class="pack-check-mark">✓</i><span class="pack-check-info"><b>'+esc(p.name||'Bộ từ chưa đặt tên')+'</b><span>'+p.words.length+' từ · bộ riêng của bạn</span></span></span></label>').join('');
    $$('input[type="checkbox"][value]').forEach(cb=>cb.onchange=updateConfig);
    updateConfig();
  }
  function getSelectedPackRows(){
    const ids=new Set([...$$('#packList input[type="checkbox"]:checked')].map(x=>String(x.value)));
    return packs.filter(p=>ids.has(String(p.id)));
  }
  function combineSelectedWords(){
    const seen=new Set(),out=[];
    getSelectedPackRows().forEach(p=>p.words.forEach(w=>{
      const k=normalize(w.word)+'::'+normalize(w.mean);if(seen.has(k))return;
      seen.add(k);out.push({...w,packName:p.name||''});
    }));
    return out;
  }
  function updateConfig(){
    const rows=getSelectedPackRows(),ws=combineSelectedWords(),packCount=$('#selectedPackCount'),wordCount=$('#selectedWordCount'),start=$('#startTest');
    if(packCount)packCount.textContent=String(rows.length);
    if(wordCount)wordCount.textContent=String(ws.length);
    if(start){start.disabled=rows.length===0||ws.length<4;start.textContent=ws.length<4&&rows.length?'Cần ít nhất 4 từ':'🔒 Vào chế độ thi toàn màn hình';}
  }
  let loadPromise=null;
  async function load(){
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      try{
        await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG);
        const user=await window.studyStore.waitForAuth();
        if(!user){showLocked('🔐 Đăng nhập để làm bài kiểm tra','Bài test dùng trực tiếp các bộ từ riêng trong tài khoản của bạn.','/login.html','Đăng nhập →');return;}
        try{
          if(window.studyStore.isClassStudent&&await window.studyStore.isClassStudent()){
            showLocked('🏫 Tài khoản lớp học đang được quản lý','Tài khoản lớp học không có kho bộ từ cá nhân để tự tạo đề.','/index.html','← Về KatLearn');
            return;
          }
        }catch(profileError){
          // A missing/temporary Firestore profile must not hide personal packs.
          console.warn('[KatLearn Test] Could not read account type; loading UID-owned packs anyway.',profileError);
        }
        packs=(await window.studyStore.personalPacks()).map(cleanPack).filter(p=>p.words.length>=2);
        renderPackList();
      }catch(e){
        console.warn('[KatLearn Test] Personal pack loading failed:',e);
        showLocked('Không tải được bộ từ','KatLearn chưa thể đồng bộ bộ từ cá nhân lúc này. Hãy thử tải lại trang.','','↻ Tải lại');
        $('#lockedAction')?.addEventListener('click',()=>location.reload());
      }finally{
        loadPromise=null;
      }
    })();
    return loadPromise;
  }
  function showLocked(title,body,href,label){
    const setup=$('#packSetup');if(!setup)return;
    setup.innerHTML='<div class="lock-state"><div class="lock-state-icon">🔐</div><b>'+esc(title)+'</b><p>'+esc(body)+'</p>'+(href?'<a id="lockedAction" href="'+esc(href)+'">'+esc(label)+'</a>':'<button id="lockedAction" class="ghost-btn" type="button">'+esc(label)+'</button>')+'</div>';
  }
  function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
  function buildQuestions(pool,count){
    const chosen=shuffle(pool).slice(0,Math.min(count,pool.length));
    return chosen.map(item=>{
      const r=Math.random();let kind;
      if(r<.33)kind='engvi';else if(r<.66)kind='vieng';else if(r<.83)kind='type-en';else kind='type-vi';
      if(kind==='engvi'||kind==='vieng'){
        const correct=kind==='engvi'?item.mean:item.word;
        const candidates=shuffle(pool.filter(x=>x!==item).map(x=>kind==='engvi'?x.mean:x.word)).filter(Boolean);
        const options=shuffle([correct,...[...new Set(candidates)].slice(0,3)]);
        return {item,kind,correct,options};
      }
      return {item,kind,correct:kind==='type-en'?item.word:item.mean};
    });
  }
  async function start(){
    if(testActive)return;
    const pool=combineSelectedWords(),count=Number($('#questionCount')?.value)||15;
    if(pool.length<4){toast('Hãy chọn bộ từ có ít nhất 4 từ hợp lệ.','error');return;}
    $('#startTest').disabled=true;
    $('#setupStatus').textContent='🛡️ Chế độ kiểm tra đã sẵn sàng. Không cần toàn màn hình; chỉ cần giữ bài kiểm tra ở cửa sổ đang dùng.';
    selectedPacks=getSelectedPackRows();
    questions=buildQuestions(pool,count);index=0;score=0;answersLog=[];answered=false;startedAt=Date.now();testActive=true;suppressGuard=false;antiCheatTriggered=false;
    installAntiCheatGuard();
    clearInterval(timerId);timerId=setInterval(updateTimer,1000);updateTimer();
    $('#packSetup').setAttribute('hidden','');$('#testRun').classList.add('active');$('#testResult').classList.remove('active');renderQuestion();
  }
  function renderQuestion(){
    const q=questions[index];if(!q)return;
    answered=false;$('#testCounter').textContent='CÂU '+(index+1)+' / '+questions.length;
    $('#testProgress').style.width=((index)/questions.length*100)+'%';$('#testScore').textContent=score;
    $('#testType').textContent=q.kind==='engvi'?'ENGLISH → VIETNAMESE':q.kind==='vieng'?'VIETNAMESE → ENGLISH':q.kind==='type-en'?'GÕ ĐÁP ÁN · ENGLISH':'GÕ ĐÁP ÁN · VIETNAMESE';
    $('#testQuestionLabel').textContent=q.kind==='engvi'?'Chọn nghĩa tiếng Việt phù hợp nhất.':q.kind==='vieng'?'Chọn từ tiếng Anh tương ứng.':q.kind==='type-en'?'Nhập chính xác từ tiếng Anh tương ứng với nghĩa bên dưới.':'Nhập nghĩa tiếng Việt của từ bên dưới.';
    $('#testWord').textContent=q.kind==='vieng'||q.kind==='type-en'?q.item.mean:q.item.word;
    $('#testPron').textContent=q.kind==='engvi'&&q.item.pron?'/ '+q.item.pron+' /':'';
    const ex=$('#testExample');
    if(q.item.example){ex.hidden=false;ex.innerHTML='<b>Context:</b> '+esc(q.item.example);}else ex.hidden=true;
    const opts=$('#testOptions'),input=$('#testInput'),submit=$('#submitAnswer');
    if(q.kind==='engvi'||q.kind==='vieng'){
      opts.hidden=false;input.hidden=true;submit.disabled=true;
      opts.innerHTML=q.options.map((a,i)=>'<button type="button" class="test-option" data-option="'+esc(a)+'"><i class="test-option-key">'+String.fromCharCode(65+i)+'</i><span>'+esc(a)+'</span></button>').join('');
      $$('.test-option').forEach(btn=>btn.onclick=()=>{$$('.test-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');submit.disabled=false;});
    }else{
      opts.hidden=true;input.hidden=false;input.value='';input.placeholder=q.kind==='type-en'?'Nhập từ tiếng Anh…':'Nhập nghĩa tiếng Việt…';submit.disabled=true;
      input.oninput=()=>{submit.disabled=!input.value.trim()};
      input.onkeydown=e=>{if(e.key==='Enter'&&!submit.disabled){e.preventDefault();checkAnswer(input.value.trim());}};
      setTimeout(()=>input.focus(),60);
    }
    $('#testFeedback').textContent='';$('#testNext').setAttribute('hidden','');$('#submitAnswer').removeAttribute('hidden');
  }
  function checkAnswer(value){
    if(answered)return;
    const q=questions[index];let userAnswer=String(value??'').trim();
    if(q.kind==='engvi'||q.kind==='vieng'){const picked=document.querySelector('.test-option.selected');if(!picked)return;userAnswer=picked.dataset.option||'';}
    answered=true;const good=normalize(userAnswer)===normalize(q.correct);if(good)score++;
    answersLog[index]={good,answer:userAnswer,correct:q.correct,word:q.item.word,mean:q.item.mean};
    if(q.kind==='engvi'||q.kind==='vieng'){
      $$('.test-option').forEach(b=>{b.disabled=true;if(normalize(b.dataset.option)===normalize(q.correct))b.classList.add('correct');});
      if(!good)document.querySelector('.test-option.selected')?.classList.add('wrong');
    }
    $('#testFeedback').textContent=good?'✓ Chính xác!':'✕ Chưa đúng · Đáp án: '+q.correct;
    $('#testFeedback').style.color=good?'#2a7450':'#a34a57';
    $('#submitAnswer').setAttribute('hidden','');$('#testNext').removeAttribute('hidden');$('#testNext').textContent=index===questions.length-1?'Xem kết quả →':'Câu tiếp theo →';$('#testScore').textContent=score;
  }
  function next(){if(!answered)return;index++;if(index>=questions.length)return finish();renderQuestion();}
  function finish(){
    clearInterval(timerId);timerId=null;testActive=false;answered=false;
    const total=questions.length,pct=Math.round(score/total*100),elapsed=Date.now()-startedAt;
    $('#testProgress').style.width='100%';$('#testRun').classList.remove('active');$('#testResult').classList.add('active');
    $('#resultRing').style.setProperty('--score',pct+'%');$('#resultPercent').textContent=pct+'%';
    $('#resultTitle').textContent=pct>=90?'Quá đỉnh! 🐱':pct>=75?'Rất tốt! ✨':pct>=60?'Khá ổn rồi! 🌱':'Ôn thêm một vòng nữa nhé 💙';
    $('#resultText').textContent='Bạn hoàn thành '+score+'/'+total+' câu với '+formatDuration(elapsed)+'. Đề được tạo từ '+selectedPacks.map(p=>p.name||'Bộ từ').join(', ')+'.';
    $('#resultCorrect').textContent=score;$('#resultWrong').textContent=String(total-score);$('#resultTotal').textContent=total;$('#resultTime').textContent=formatDuration(elapsed);
    const wrong=answersLog.filter(x=>x&&!x.good);
    $('#resultWrongWords').innerHTML=wrong.length?'<div class="wrong-title">📌 Các từ cần ôn lại</div>'+wrong.map(x=>'<div class="wrong-row"><b>'+esc(x.word)+'</b><span>'+esc(x.mean)+'</span></div>').join(''):'<div class="wrong-title success">✓ Không có từ sai — quá đẹp!</div>';
    try{localStorage.setItem('katlearn-last-test-result',JSON.stringify({score,total,pct,elapsed,packIds:selectedPacks.map(p=>p.id),completedAt:Date.now()}))}catch(_){}
  }
  function formatDuration(ms){const s=Math.max(0,Math.floor(ms/1000)),m=Math.floor(s/60),sec=s%60;return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
  function updateTimer(){if(startedAt)$('#testTimer').textContent='⏱ '+formatDuration(Date.now()-startedAt);}
  function leaveToHome(){
    suppressGuard=true;testActive=false;clearInterval(timerId);timerId=null;cleanupAntiCheatGuard();
    location.replace('/home.html');
  }
  function restart(){
    $('#testResult').classList.remove('active');$('#packSetup').removeAttribute('hidden');$('#setupStatus').textContent='Chọn lại bộ từ, rồi tạo một đề mới.';renderPackList();
  }
  function cleanupAntiCheatGuard(){
    clearInterval(focusCheckId);focusCheckId=null;
    clearTimeout(blurCheckId);blurCheckId=null;
    if(typeof antiCheatCleanup==='function'){antiCheatCleanup();antiCheatCleanup=null;}
  }
  function triggerAntiCheat(reason){
    if(!testActive||suppressGuard||antiCheatTriggered)return;
    antiCheatTriggered=true;
    testActive=false;answered=false;clearInterval(timerId);timerId=null;cleanupAntiCheatGuard();
    const payload={reason,index:index+1,total:questions.length,detectedAt:Date.now()};
    try{
      sessionStorage.setItem('katlearn-test-violation',JSON.stringify(payload));
      sessionStorage.setItem('katlearn-test-return-error','1');
    }catch(_){}
    location.replace('/home.html?testError=focus-lost');
  }
  function installAntiCheatGuard(){
    cleanupAntiCheatGuard();
    const isAway=()=>document.visibilityState!=='visible'||!document.hasFocus();
    const onVisibility=()=>{if(isAway())triggerAntiCheat('tab-hidden');};
    const onBlur=()=>{
      clearTimeout(blurCheckId);
      blurCheckId=setTimeout(()=>{if(isAway())triggerAntiCheat('window-blur');},180);
    };
    const onContextMenu=e=>{if(testActive){e.preventDefault();toast('🛡️ Menu chuột phải bị khóa trong lúc làm bài.','error');}};
    const onCopy=e=>{if(testActive){e.preventDefault();toast('🛡️ Không thể sao chép nội dung của đề.','error');}};
    const onCut=e=>{if(testActive){e.preventDefault();toast('🛡️ Không thể cắt nội dung trong lúc làm bài.','error');}};
    const onPaste=e=>{if(testActive){e.preventDefault();toast('🛡️ Không thể dán đáp án vào bài kiểm tra.','error');}};
    const onKeyDown=e=>{
      if(!testActive)return;
      const key=String(e.key||'').toLowerCase(),mod=e.ctrlKey||e.metaKey;
      if(key==='f12'||(mod&&['c','x','v','p','s','u'].includes(key))||(mod&&e.shiftKey&&['i','j','c'].includes(key))){
        e.preventDefault();
        toast('🛡️ Phím tắt này bị khóa trong lúc làm bài.','error');
      }
    };
    document.addEventListener('visibilitychange',onVisibility,true);
    window.addEventListener('blur',onBlur,true);
    document.addEventListener('contextmenu',onContextMenu,true);
    document.addEventListener('copy',onCopy,true);
    document.addEventListener('cut',onCut,true);
    document.addEventListener('paste',onPaste,true);
    document.addEventListener('keydown',onKeyDown,true);
    focusCheckId=setInterval(()=>{if(testActive&&isAway())triggerAntiCheat('focus-check');},500);
    antiCheatCleanup=()=>{
      document.removeEventListener('visibilitychange',onVisibility,true);
      window.removeEventListener('blur',onBlur,true);
      document.removeEventListener('contextmenu',onContextMenu,true);
      document.removeEventListener('copy',onCopy,true);
      document.removeEventListener('cut',onCut,true);
      document.removeEventListener('paste',onPaste,true);
      document.removeEventListener('keydown',onKeyDown,true);
    };
  }
  function mount(){
    const menu=document.querySelector('.test-menu-toggle'),sidebar=document.querySelector('.test-sidebar');
    if(menu&&sidebar){
      menu.onclick=()=>{const open=sidebar.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Đóng menu điều hướng':'Mở menu điều hướng')};
      sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Mở menu điều hướng')}));
    }
    $('#selectAll').onclick=()=>{$('#packList input[type="checkbox"]').forEach(x=>x.checked=true);updateConfig()};
    $('#clearAll').onclick=()=>{$('#packList input[type="checkbox"]').forEach(x=>x.checked=false);updateConfig()};
    $('#startTest').onclick=start;$('#submitAnswer').onclick=()=>checkAnswer($('#testInput').value.trim());$('#testNext').onclick=next;
    $('#retryTest').onclick=restart;$('#homeFromResult').onclick=leaveToHome;
    window.addEventListener('8b1-auth-change',e=>{
      if(testActive)return;
      if(e.detail)void load();
      else{
        packs=[];selectedPacks=[];renderPackList();
      }
    });
    load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();