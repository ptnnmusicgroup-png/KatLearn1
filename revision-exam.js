(function(){
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let packs=[],questions=[],index=0,score=0,answered=false,selectedPack=null,questionCount=10;

  function cleanWords(words){
    const seen=new Set();
    return (Array.isArray(words)?words:[]).map(w=>({
      word:String(w?.word||'').trim(),
      mean:String(w?.mean||w?.meaning_vi||'').trim(),
      pron:String(w?.pron||w?.ipa||'').trim()
    })).filter(w=>w.word&&w.mean).filter(w=>{
      const k=w.word.toLowerCase();
      if(seen.has(k))return false;
      seen.add(k);return true;
    });
  }

  async function loadPacks(){
    const select=$('#revisionExamPack');
    if(!select)return;
    packs=[];
    if(!window.studyStore?.user){
      renderLocked('🔒 Đăng nhập để làm bài thi ôn tập bằng bộ từ của bạn.');
      return;
    }
    select.innerHTML='<option value="">Đang tải bộ từ...</option>';
    try{
      if(window.studyStore.isClassStudent&&await window.studyStore.isClassStudent()){
        renderLocked('🔒 Tài khoản lớp học chỉ có bộ từ do giáo viên quản lý. Hãy dùng bài được giao để ôn tập.');
        select.innerHTML='<option value="">Không có bộ từ cá nhân</option>';
        return;
      }
      const uid=String(window.studyStore.user.uid||'');
      const rows=await window.studyStore.personalPacks();
      if(String(window.studyStore?.user?.uid||'')!==uid)return;
      packs=(Array.isArray(rows)?rows:[]).map(p=>({...p,words:cleanWords(p.words)})).filter(p=>String(p?.ownerUid||uid)===uid&&p.words.length>=2);
      if(!packs.length){
        select.innerHTML='<option value="">Chưa có bộ từ đủ để thi</option>';
        renderLocked('📚 Bạn cần ít nhất một bộ từ riêng có từ vựng để bắt đầu bài thi.',true);
        return;
      }
      const activeId=String(window.activeVocabSource?.kind==='personal'?window.activeVocabSource?.id:'');
      select.innerHTML=packs.map((p,i)=>'<option value="'+esc(p.id)+'">'+esc(p.name||'Bộ từ của tôi')+' · '+p.words.length+' từ</option>').join('');
      select.value=packs.some(p=>String(p.id)===activeId)?activeId:packs[0].id;
      updateStartState();
    }catch(e){
      select.innerHTML='<option value="">Không tải được</option>';
      renderLocked('Không thể tải bộ từ cá nhân lúc này. Hãy thử làm mới trang nhé.');
    }
  }

  function renderLocked(message,noPack=false){
    const area=$('#revisionExamWorkspace');if(!area)return;
    area.innerHTML='<div class="revision-exam-empty"><div style="font-size:32px;margin-bottom:6px">'+(noPack?'📚':'🐾')+'</div><b>'+esc(message)+'</b>'+(noPack?'<br><a class="revision-exam-open-pack" href="#personalPacks" data-exam-open-packs>Mở Bộ từ riêng →</a>':'')+'</div>';
    $('[data-exam-open-packs]')?.addEventListener('click',()=>typeof showPage==='function'&&showPage('personalPacks'));
  }

  function updateStartState(){
    const btn=$('#revisionExamStart'),select=$('#revisionExamPack');
    const has=!!select?.value&&packs.some(p=>String(p.id)===String(select.value));
    if(btn)btn.disabled=!has;
    if(has){
      const p=packs.find(x=>String(x.id)===String(select.value));
      selectedPack=p||null;
      const label=$('#revisionExamPackMeta');
      if(label)label.textContent=(p.words.length<4?'Bộ nhỏ · ':'')+'Bài thi sẽ trộn câu hỏi Anh ↔ Việt, không cộng KatCoin.';
    }
  }

  function buildQuestions(words,count){
    const pool=shuffle(words).slice(0,Math.min(count,words.length));
    return pool.map(item=>{
      const direction=Math.random()<.5?'engvi':'vieng';
      const correct=direction==='engvi'?item.mean:item.word;
      const candidates=shuffle(words.filter(w=>w!==item).map(w=>direction==='engvi'?w.mean:w.word)).filter(Boolean);
      const options=shuffle([correct,...[...new Set(candidates)].slice(0,3)]);
      return {item,direction,correct,options};
    });
  }

  function shuffle(a){return [...a].sort(()=>Math.random()-.5)}

  function start(){
    const p=packs.find(x=>String(x.id)===String($('#revisionExamPack')?.value));
    if(!p)return;
    selectedPack=p;
    questionCount=Math.min(Number($('#revisionExamCount')?.value)||10,p.words.length);
    questions=buildQuestions(p.words,questionCount);
    index=0;score=0;answered=false;
    $('#revisionExamSetup')?.setAttribute('hidden','');
    $('#revisionExamResult')?.setAttribute('hidden','');
    $('#revisionExamPanel')?.removeAttribute('hidden');
    renderQuestion();
  }

  function renderQuestion(){
    const q=questions[index],item=q.item;
    if(!q)return;
    answered=false;
    $('#revisionExamCounter').textContent='CÂU '+(index+1)+' / '+questions.length;
    $('#revisionExamProgressBar').style.width=((index/questions.length)*100)+'%';
    $('#revisionExamRunningScore').textContent='Điểm: '+score;
    $('#revisionExamDirection').textContent=q.direction==='engvi'?'ENGLISH → VIETNAMESE':'VIETNAMESE → ENGLISH';
    $('#revisionExamWord').textContent=q.direction==='engvi'?item.word:item.mean;
    $('#revisionExamPron').textContent=q.direction==='engvi'&&item.pron?item.pron:'';
    const ctx=$('#revisionExamContext');
    ctx.textContent=q.direction==='engvi'?'Chọn nghĩa tiếng Việt phù hợp nhất.':'Chọn từ tiếng Anh tương ứng.';
    const labels=['A','B','C','D'];
    $('#revisionExamAnswers').innerHTML=q.options.map((a,i)=>'<button class="revision-exam-answer" type="button" data-answer="'+esc(a)+'"><b>'+labels[i]+'</b><span>'+esc(a)+'</span></button>').join('');
    $('#revisionExamFeedback').textContent='';
    $('#revisionExamNext').disabled=true;
    $$('.revision-exam-answer').forEach(btn=>btn.onclick=()=>answer(btn));
  }

  function answer(btn){
    if(answered)return;
    answered=true;
    const q=questions[index],good=btn.dataset.answer===q.correct;
    if(good)score++;
    $$('.revision-exam-answer').forEach(b=>{
      b.disabled=true;
      if(b.dataset.answer===q.correct)b.classList.add('correct');
    });
    if(!good){
      btn.classList.add('wrong');
      $('#revisionExamFeedback').textContent='Chưa đúng. Đáp án: '+q.correct;
      $('#revisionExamFeedback').style.color='#a34a4a';
    }else{
      $('#revisionExamFeedback').textContent='✓ Chính xác! Tiếp tục nào.';
      $('#revisionExamFeedback').style.color='#2a7450';
    }
    $('#revisionExamRunningScore').textContent='Điểm: '+score;
    $('#revisionExamNext').disabled=false;
    $('#revisionExamNext').textContent=index===questions.length-1?'Xem kết quả →':'Câu tiếp theo →';
  }

  function next(){
    if(!answered)return;
    index++;
    if(index>=questions.length){finish();return;}
    renderQuestion();
  }

  function finish(){
    $('#revisionExamPanel').setAttribute('hidden','');
    $('#revisionExamResult').removeAttribute('hidden');
    const total=questions.length,pct=Math.round(score/total*100);
    $('#revisionExamResultScore').textContent=pct+'%';
    $('#revisionExamResultTitle').textContent=pct>=90?'Xuất sắc! 🐱':pct>=70?'Rất tốt! ✨':pct>=50?'Đã có tiến bộ! 🌱':'Cùng ôn lại thêm một vòng nhé! 💙';
    $('#revisionExamResultText').textContent='Bạn đúng '+score+'/'+total+' câu trong bài thi “'+(selectedPack?.name||'Bộ từ của bạn')+'”.';
    $('#revisionExamCorrect').textContent=score;
    $('#revisionExamWrong').textContent=String(total-score);
    $('#revisionExamCountDone').textContent=total;
    const wrong=questions.filter((q,i)=>{
      const choices=$$('[data-answer]');
      return false;
    });
    const list=$('#revisionExamWrongList');
    const wrongItems=questions.filter((q,idx)=>{
      const stored=localStorage.getItem('katlearn-revision-answer-'+String(idx));
      return stored==='wrong';
    });
    list.innerHTML=wrongItems.length
      ?wrongItems.map(q=>'<div class="revision-exam-wrong-item"><b>'+esc(q.item.word)+'</b> — '+esc(q.item.mean)+'</div>').join('')
      :'<div class="revision-exam-wrong-item">Không có câu sai. Quá tuyệt! 🎉</div>';
    localStorage.setItem('katlearn-last-revision-exam',JSON.stringify({
      packId:selectedPack?.id||'',packName:selectedPack?.name||'',score,total,pct,completedAt:Date.now()
    }));
    // clean temporary per-question answer markers
    questions.forEach((_,i)=>localStorage.removeItem('katlearn-revision-answer-'+String(i)));
  }

  // Override finish markers cleanly by recording answer state in localStorage.
  const originalAnswer=answer;
  answer=function(btn){
    const q=questions[index];
    if(answered)return;
    originalAnswer(btn);
    localStorage.setItem('katlearn-revision-answer-'+String(index),btn.dataset.answer===q.correct?'correct':'wrong');
  };

  function restart(){
    $('#revisionExamResult').setAttribute('hidden','');
    $('#revisionExamSetup').removeAttribute('hidden');
    updateStartState();
  }

  function mount(){
    const select=$('#revisionExamPack');
    if(!select)return;
    $('#revisionExamStart').onclick=start;
    $('#revisionExamNext').onclick=next;
    $('#revisionExamRestart').onclick=restart;
    select.onchange=updateStartState;
    $('#revisionExamCount').onchange=updateStartState;
    window.addEventListener('katlearn-personal-pack-open',()=>{
      loadPacks();
    });
    window.addEventListener('katlearn-personal-pack-deleted',()=>{
      loadPacks();
      $('#revisionExamSetup')?.removeAttribute('hidden');
      $('#revisionExamPanel')?.setAttribute('hidden','');
      $('#revisionExamResult')?.setAttribute('hidden','');
    });
    window.addEventListener('8b1-auth-change',e=>{
      if(e.detail){loadPacks();}else{packs=[];renderLocked('🔒 Đăng nhập để làm bài thi ôn tập bằng bộ từ của bạn.');}
    });
    loadPacks();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();