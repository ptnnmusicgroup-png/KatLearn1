(function(){
  const $=s=>document.querySelector(s);
  const aiEndpoint=name=>'/api/'+String(name||'').replace(/^\/+/, '');
async function aiHeaders(){const h={'Content-Type':'application/json'};try{const t=await window.studyStore?.getIdToken?.();if(t)h.Authorization='Bearer '+t}catch(_){}return h}
  const $$=s=>document.querySelectorAll(s);
  const esc=t=>String(t??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let editingPack=null;
  
  function row(data={}){
    const el=document.createElement('div');
    el.className='student-pack-row';
    el.innerHTML=`
      <span class="student-pack-num"># 1</span>
      <div class="sp-word-wrap"><input class="sp-word" value="${esc(data.word||'')}" placeholder="TỪ VỰNG" maxlength="80" required></div>
      <input class="sp-pron" value="${esc(data.pron||'')}" placeholder="PHIÊN ÂM">
      <input class="sp-mean" value="${esc(data.mean||'')}" placeholder="NGHĨA*" maxlength="160" required>
      <select class="sp-type"><option value="">LOẠI TỪ</option><option>noun</option><option>verb</option><option>adjective</option><option>adverb</option><option>phrase</option><option>other</option></select>
      <input class="sp-example" value="${esc(data.example||'')}" placeholder="VÍ DỤ">
      <input class="sp-note" value="${esc(data.note||'')}" placeholder="GHI CHÚ">
      <button type="button" class="sp-ai" title="AI tự điền nghĩa + phiên âm">✨</button>
      <button type="button" class="sp-remove" title="Xóa dòng">×</button>`;
    el.querySelector('.sp-type').value=normalizeType(data.type);
    const wordInput=el.querySelector('.sp-word');
    const aiBtn=el.querySelector('.sp-ai');

    async function aiAssist(force=false){
      const word=wordInput.value.trim();
      if(!word)return toast('Nhập từ tiếng Anh trước nhé! ✨');
      if(!force && el.dataset.aiWord===word && (el.querySelector('.sp-mean').value||el.querySelector('.sp-pron').value))return;

      const old=aiBtn.textContent;
      aiBtn.disabled=true;
      aiBtn.textContent='…';

      try{
        const res=await fetch(aiEndpoint('vocab-assist'),{
          method:'POST',
          headers:await aiHeaders(),
          body:JSON.stringify({word})
        });
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||'Kat AI chưa sẵn sàng.');

        const mean=el.querySelector('.sp-mean');
        const pron=el.querySelector('.sp-pron');
        if(!mean.value.trim()||force)mean.value=String(data.meaning||'').trim();
        if(!pron.value.trim()||force)pron.value=String(data.pronunciation||'').trim();
        el.dataset.aiWord=word;
      }catch(e){
        toast('AI chưa điền được: '+(e.message||'Lỗi không xác định'));
      }finally{
        aiBtn.disabled=false;
        aiBtn.textContent=old;
      }
    }

    aiBtn.onclick=()=>aiAssist(true);
    wordInput.addEventListener('blur',()=>{void aiAssist(false)});
    wordInput.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        void aiAssist(true);
      }
    });
    el.querySelector('.sp-remove').onclick=()=>{
      if($$('.student-pack-row').length<=1)return toast('Bộ từ cần ít nhất một từ nhé!');
      el.remove();
      renumber();
    };
    return el;
  }

  function renumber(){
    $$('.student-pack-row').forEach((r,i)=>r.querySelector('.student-pack-num').textContent='# '+(i+1));
    const c=$('.student-pack-row').length;
    const b=$('#studentPackCount');
    if(b)b.textContent=c;
  }

  function normalizeType(value){
    const v=String(value||'').toLowerCase();
    if(v.includes('noun')||v.includes('danh từ'))return 'noun';
    if(v.includes('verb')||v.includes('động từ'))return 'verb';
    if(v.includes('adjective')||v.includes('tính từ'))return 'adjective';
    if(v.includes('adverb')||v.includes('trạng từ'))return 'adverb';
    if(v.includes('phrase')||v.includes('cụm'))return 'phrase';
    return 'other';
  }

  async function generateWithAI(){
    const prompt=$('#studentPackAiPrompt')?.value.trim();
    const wordCount=Math.min(100,Math.max(5,Number($('#studentPackAiCount')?.value)||50));
    const difficulty=$('#studentPackAiDifficulty')?.value||'intermediate';
    const btn=$('#studentPackAiBtn');
    const status=$('#studentPackAiStatus');

    if(!prompt)return toast('Nhập chủ đề hoặc yêu cầu cho Kat AI trước nhé! ✨');

    btn.disabled=true;
    btn.textContent='🤖 Đang tạo...';
    if(status)status.textContent=`Kat AI đang xử lý ${wordCount} từ trong 1 lần gọi...`;

    try{
      const res=await fetch(aiEndpoint('ai-pack'),{
        method:'POST',
        headers:await aiHeaders(),
        body:JSON.stringify({prompt,wordCount,difficulty,purpose:'personal vocabulary pack',wordTypes:'mixed'})
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Kat AI chưa sẵn sàng.');

      const words=Array.isArray(data.words)?data.words:[];
      if(!words.length)throw new Error('Kat AI không trả về từ vựng.');

      const rows=$('#studentPackRows');
      rows.innerHTML='';
      words.forEach(w=>rows.append(row({
        word:w.word,
        pron:w.ipa,
        mean:w.meaning_vi,
        type:w.part_of_speech,
        example:w.example,
        note:w.notes
      })));
      renumber();

      const suggested=String(data.pack?.suggested_title||'').trim();
      const name=$('#studentPackName');
      if(name && !name.value.trim())name.value=suggested||prompt.slice(0,80);

      if(status)status.textContent=`✓ Đã tạo ${words.length} từ bằng 1 request. Kiểm tra lại rồi bấm “Tạo bộ từ”.`;
      toast(`✨ Kat AI đã tạo ${words.length} từ trong 1 lần gọi!`);
    }catch(e){
      if(status)status.textContent='Kat AI chưa tạo được bộ từ.';
      toast('Không tạo được bộ từ bằng AI: '+(e.message||'Lỗi không xác định'));
    }finally{
      btn.disabled=false;
      btn.textContent='✨ Tạo cả bộ bằng Kat AI';
    }
  }

  async function generateQuickWithAI(){
    const prompt=$('#studentPackQuickPrompt')?.value.trim();
    const btn=$('#studentPackQuickBtn');
    const status=$('#studentPackQuickStatus');

    if(!prompt)return toast('Nhập topic từ vựng trước nhé! ✨');

    btn.disabled=true;
    btn.textContent='🤖 Đang tìm từ...';
    if(status)status.textContent='Kat AI đang cố gắng tìm thật đầy đủ từ vựng liên quan đến topic...';

    try{
      const res=await fetch(aiEndpoint('ai-pack'),{
        method:'POST',
        headers:await aiHeaders(),
        body:JSON.stringify({
          prompt:'Hãy xây dựng một bộ từ vựng thật đầy đủ và có hệ thống về topic sau: '+prompt+'. Cố gắng bao quát các từ vựng quan trọng, phổ biến và các khía cạnh liên quan của topic, không lặp từ, ưu tiên từ phù hợp học sinh Việt Nam. Trả về càng nhiều từ hữu ích càng tốt trong giới hạn cho phép.',
          wordCount:100,
          difficulty:'intermediate',
          purpose:'comprehensive topic vocabulary',
          wordTypes:'mixed'
        })
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Kat AI chưa sẵn sàng.');

      const words=Array.isArray(data.words)?data.words:[];
      if(!words.length)throw new Error('Kat AI không tìm thấy từ vựng phù hợp.');

      const rows=$('#studentPackRows');
      rows.innerHTML='';
      words.forEach(w=>rows.append(row({
        word:w.word,
        pron:w.ipa,
        mean:w.meaning_vi,
        type:w.part_of_speech,
        example:w.example,
        note:w.notes
      })));
      renumber();

      const name=$('#studentPackName');
      if(name&&!name.value.trim())name.value=String(data.pack?.suggested_title||prompt).slice(0,80);
      if(status)status.textContent='✓ Đã thêm '+words.length+' từ vựng theo topic. Kiểm tra lại rồi bấm “Tạo bộ từ”.';
      toast('✨ Đã thêm '+words.length+' từ vựng theo topic!');
    }catch(e){
      if(status)status.textContent='Kat AI chưa thêm được từ vựng.';
      toast('Không thêm được từ vựng bằng AI: '+(e.message||'Lỗi không xác định'));
    }finally{
      btn.disabled=false;
      btn.textContent='✨ Thêm từ vựng của bạn';
    }
  }

  async function isManagedStudent(){return !!window.studyStore?.user&&await window.studyStore.isClassStudent?.()}

  function open(pack=null){
    if(!window.studyStore?.user){toast('Hãy đăng nhập để tạo bộ từ riêng nhé! 🐱');location.href='/login.html';return;}
    if(window.studyStore?.isClassStudent){
      window.studyStore.isClassStudent().then(blocked=>{if(blocked)toast('🔒 Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân.');else openPackModal(pack)});
      return;
    }
    openPackModal(pack);
  }

  function openPackModal(pack=null){
    if($('#studentPackModal')){
      editingPack=pack;
      $('#studentPackModal').classList.add('show');
      loadRows(pack);
      return;
    }
    editingPack=pack;

    const modal=document.createElement('div');
    modal.id='studentPackModal';
    modal.className='modal show student-pack-enter';
    modal.innerHTML=`
      <div class="modal-card student-pack-modal">
        <button class="modal-close" id="studentPackClose">×</button>
        <div class="student-pack-head">
          <div class="student-pack-head-main"><div class="student-pack-title-icon">📚</div><div><p class="eyebrow">BỘ TỪ CÁ NHÂN</p><h2 id="studentPackTitle">Tạo bộ từ của bạn</h2><p id="studentPackSubtitle">Tự thêm từ, dùng Kat AI hoặc kết hợp cả hai cách.</p></div></div>
          <div class="student-pack-flow"><span class="active"><b>1</b> Tên bộ</span><i>→</i><span><b>2</b> Từ vựng</span><i>→</i><span><b>3</b> Lưu</span></div>
        </div>
        <section class="student-pack-create-panel"><div class="student-pack-section-label"><span>⚡</span><div><b>Tạo từ nhanh</b><small>Chọn cách bạn muốn xây bộ từ này.</small></div></div>
          <div class="student-pack-mode-switch"><button type="button" id="studentPackModeManual" class="primary-btn">✨ Kat AI</button><button type="button" id="studentPackModeQuick" class="secondary-btn">⚡ Theo chủ đề</button></div>

          <div id="studentPackManualAi" class="student-pack-mode-panel">
            <label class="student-pack-field student-pack-ai-prompt">Yêu cầu cho Kat AI<textarea id="studentPackAiPrompt" rows="2" maxlength="600" placeholder="Ví dụ: Tạo 50 từ vựng về môi trường, phù hợp học sinh lớp 8, ưu tiên từ thường gặp trong IELTS."></textarea>
            </label>
            <div class="student-pack-ai-controls">
              <label>Số từ <input id="studentPackAiCount" type="number" min="5" max="100" value="50" style="width:90px;"></label>
              <label>Trình độ
                <select id="studentPackAiDifficulty">
                  <option value="beginner">beginner</option>
                  <option value="elementary">elementary</option>
                  <option value="intermediate" selected>intermediate</option>
                  <option value="upper-intermediate">upper-intermediate</option>
                  <option value="advanced">advanced</option>
                </select>
              </label>
              <button type="button" id="studentPackAiBtn" class="primary-btn">✨ Tạo cả bộ bằng Kat AI</button>
            </div>
            <small id="studentPackAiStatus" class="student-pack-status">Một lần gọi AI sẽ trả về toàn bộ dữ liệu của bộ từ.</small>
          </div>

          <div id="studentPackQuick" class="student-pack-mode-panel" hidden>
            <label class="student-pack-field">Chủ đề bạn muốn học
            <textarea id="studentPackQuickPrompt" rows="3" maxlength="600" placeholder="Ví dụ: môi trường, biến đổi khí hậu, ô nhiễm không khí..."></textarea>
            <button type="button" id="studentPackQuickBtn" class="primary-btn student-pack-wide-btn">✨ Tạo từ theo chủ đề</button>
            <small id="studentPackQuickStatus" class="student-pack-status">Kat AI sẽ cố gắng tìm thật đầy đủ các từ vựng liên quan đến topic (tối đa 100 từ).</small>
          </div>
        </div></section>

        <section class="student-pack-name-block"><div class="student-pack-step-kicker"><span>1</span><div><b>Đặt tên bộ từ</b><small>Tên này sẽ xuất hiện trong “Bộ từ của tôi”.</small></div></div><label class="student-pack-field"><span>Tên bộ từ</span><input id="studentPackName" maxlength="80" placeholder="Ví dụ: IELTS Unit 7"></label>
        <section class="student-pack-words-section"><div class="student-pack-step-kicker"><span>2</span><div><b>Thêm và chỉnh sửa từ vựng</b><small>✨ = AI điền nghĩa + phiên âm · * = bắt buộc</small></div></div><div class="student-pack-columns"><span>#</span><span>TỪ VỰNG</span><span>PHIÊN ÂM</span><span>NGHĨA*</span><span>LOẠI TỪ</span><span>VÍ DỤ</span><span>GHI CHÚ</span><span>AI</span><span></span></div>
        <div id="studentPackRows"></div>
        <button type="button" id="studentPackAddRow" class="add-word-btn">＋ Thêm một dòng</button></section>
        <div class="student-pack-footer"><div class="student-pack-count"><b id="studentPackCount">3</b><span> từ vựng</span></div><div class="student-pack-actions"><button type="button" class="secondary-btn" id="studentPackCancel">Hủy</button><button type="button" class="secondary-btn danger-action" id="studentPackDelete" hidden>Xóa bộ từ</button><button type="button" class="primary-btn student-pack-save-btn" id="studentPackSave">Tạo bộ từ <span>→</span></button></div></div>
      </div>`;
    document.body.appendChild(modal);
    $('#studentPackClose').onclick=close;
    $('#studentPackCancel').onclick=close;
    modal.onclick=e=>{if(e.target===modal)close()};
    $('#studentPackAddRow').onclick=()=>{
      const next=row();
      next.classList.add('student-pack-row-enter');
      $('#studentPackRows').append(next);
      renumber();
    };
    $('#studentPackAiBtn').onclick=generateWithAI;
    $('#studentPackQuickBtn').onclick=generateQuickWithAI;

    const manualMode=$('#studentPackModeManual');
    const quickMode=$('#studentPackModeQuick');
    const manualBox=$('#studentPackManualAi');
    const quickBox=$('#studentPackQuick');
    const setPackMode=mode=>{
      const quick=mode==='quick';
      manualBox.hidden=quick;
      quickBox.hidden=!quick;
      manualMode.classList.toggle('primary-btn',!quick);
      manualMode.classList.toggle('secondary-btn',quick);
      quickMode.classList.toggle('primary-btn',quick);
      quickMode.classList.toggle('secondary-btn',!quick);
    };
    manualMode.onclick=()=>setPackMode('manual');
    quickMode.onclick=()=>setPackMode('quick');
    setPackMode('manual');

    $('#studentPackSave').onclick=save;
    $('#studentPackDelete').onclick=deletePack;
    loadRows(pack);
  }

  function loadRows(pack=editingPack){
    const rows=$('#studentPackRows');
    if(!rows)return;
    rows.innerHTML='';
    const words=Array.isArray(pack?.words)&&pack.words.length?pack.words:[{}, {}, {}];
    words.forEach(word=>rows.append(row(word)));
    renumber();
    $('#studentPackName').value=pack?.name||'';
    const saveBtn=$('#studentPackSave'),deleteBtn=$('#studentPackDelete');
    if(saveBtn)saveBtn.innerHTML=pack?'Lưu thay đổi <span>→</span>':'Tạo bộ từ <span>→</span>';
    const title=$('#studentPackTitle'),subtitle=$('#studentPackSubtitle');
    if(title)title.textContent=pack?'Chỉnh sửa bộ từ':'Tạo bộ từ của bạn';
    if(subtitle)subtitle.textContent=pack?'Chỉnh sửa từ vựng rồi lưu lại vào bộ từ của bạn.':'Tự thêm từ, dùng Kat AI hoặc kết hợp cả hai cách.';
    if(deleteBtn)deleteBtn.hidden=!pack;
    if($('#studentPackAiPrompt'))$('#studentPackAiPrompt').value='';
    if($('#studentPackAiStatus'))$('#studentPackAiStatus').textContent=pack?'Bạn có thể thêm dòng, chỉnh sửa hoặc xóa từ rồi bấm “Lưu thay đổi”.':'Một lần gọi AI sẽ trả về toàn bộ dữ liệu của bộ từ.';
  }

  async function save(){
    if(await isManagedStudent())return toast('🔒 Tài khoản lớp học không thể tạo hoặc sửa bộ từ cá nhân.');
    const wasEditing=!!editingPack;
    const name=$('#studentPackName').value.trim();
    if(!name)return toast('Hãy đặt tên cho bộ từ nhé!');

    const rawWords=[...$('.student-pack-row')].map(r=>({
      word:r.querySelector('.sp-word').value.trim(),
      pron:r.querySelector('.sp-pron').value.trim(),
      mean:r.querySelector('.sp-mean').value.trim(),
      type:r.querySelector('.sp-type').value,
      example:r.querySelector('.sp-example').value.trim(),
      note:r.querySelector('.sp-note').value.trim(),
      emoji:'📚'
    })).filter(w=>w.word&&w.mean);

    if(!rawWords.length)return toast('Hãy nhập ít nhất một từ có nghĩa!');
    const seenWords=new Set();
    const words=rawWords.filter(w=>{
      const key=w.word.toLowerCase().replace(/\s+/g,' ').trim();
      if(seenWords.has(key))return false;
      seenWords.add(key);
      return true;
    });
    if(words.length<rawWords.length)toast(`Đã tự bỏ ${rawWords.length-words.length} từ bị trùng.`);


    const btn=$('#studentPackSave');
    btn.disabled=true;
    btn.textContent='Đang tạo...';

    try{
      let savedPackId=editingPack?.id||'';
      if(editingPack){
        await window.studyStore.updatePersonalPack(editingPack.id,{name,words});
        toast(`Đã cập nhật “${name}” với ${words.length} từ! 🐱`);
      }else{
        const ref=await window.studyStore.createPersonalPack({name,words});
        savedPackId=ref?.id||'';
        toast(`Đã tạo “${name}” gồm ${words.length} từ! 🐱`);
      }
      close();
      await renderMine();
      window.dispatchEvent(new CustomEvent('katlearn-personal-pack-open',{detail:{words,id:savedPackId,name}}));
    }catch(e){
      toast('Không thể tạo bộ từ: '+(e.message||'Lỗi không xác định'));
    }finally{
      btn.disabled=false;
      btn.textContent=wasEditing?'Lưu thay đổi':'Tạo bộ từ';
    }
  }

  async function deletePack(){
    if(await isManagedStudent())return toast('🔒 Tài khoản lớp học không thể quản lý bộ từ cá nhân.');
    if(!editingPack)return;
    if(!confirm(`Xóa bộ từ “${editingPack.name||'này'}”? Thao tác này không thể hoàn tác.`))return;
    const btn=$('#studentPackDelete');
    if(btn){btn.disabled=true;btn.textContent='Đang xóa...'}
    try{
      const deletedId=editingPack.id;
      await window.studyStore.deletePersonalPack(deletedId);
      close();
      await renderMine();
      window.dispatchEvent(new CustomEvent('katlearn-personal-pack-deleted',{detail:{id:String(deletedId)}}));
      toast('Đã xóa bộ từ.');
    }catch(e){
      toast('Không thể xóa bộ từ: '+(e.message||'Lỗi không xác định'));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Xóa bộ từ'}
    }
  }

  function close(){
    editingPack=null;
    const m=$('#studentPackModal');
    if(m){m.classList.remove('show');m.classList.add('student-pack-closing');window.setTimeout(()=>m.classList.remove('student-pack-closing'),220);}
  }

  async function renderMine(){
    const box=$('#studentPersonalPacks');
    if(!box)return;
    const uid=String(window.studyStore?.user?.uid||'');
    if(!uid){
      box.innerHTML='';
      return;
    }

    try{
      if(await isManagedStudent()){
        if(String(window.studyStore?.user?.uid||'')!==uid)return;
        $('#personalPackCount').textContent='0';
        box.innerHTML='<div class="personal-pack-empty">🔒 Bộ từ cá nhân bị khóa vì tài khoản này đang thuộc lớp do giáo viên quản lý.</div>';
        return;
      }
      if(String(window.studyStore?.user?.uid||'')!==uid)return;
      const packs=await window.studyStore.personalPacks();
      if(String(window.studyStore?.user?.uid||'')!==uid)return;
      $('#personalPackCount').textContent=packs.length;
      box.innerHTML=packs.length
        ?`<div class="personal-packs-title"><div><h3>🧑‍🎓 Bộ từ của tôi</h3><p>Những bộ từ bạn tự tạo — riêng cho tài khoản của bạn.</p></div></div><div class="personal-pack-grid">${packs.map(p=>`<article class="personal-pack-card"><span>📚</span><div><h3>${esc(p.name||'Bộ từ chưa đặt tên')}</h3><p>${Array.isArray(p.words)?p.words.length:0} từ vựng</p></div><div style="display:flex;gap:7px;align-items:center"><button data-my-pack="${esc(p.id)}">Học ngay →</button><button type="button" class="personal-pack-more" data-my-pack-menu="${esc(p.id)}" aria-label="Tùy chọn">⋮</button></div></article>`).join('')}</div>`
        : '<div class="personal-pack-empty">Bạn chưa có bộ từ riêng. Bấm <b>＋ Tạo bộ từ</b> để tạo bộ đầu tiên nhé! 🐾</div>';

      $$('[data-my-pack-menu]').forEach(b=>b.onclick=e=>{e.stopPropagation();openPersonalPackMenu(b,packs.find(x=>x.id===b.dataset.myPackMenu))});
      $$('[data-edit-pack]').forEach(b=>b.onclick=()=>{const p=packs.find(x=>x.id===b.dataset.editPack);if(p)open(p)});
      $$('[data-my-pack]').forEach(b=>b.onclick=async()=>{
        const p=packs.find(x=>x.id===b.dataset.myPack);
        if(!p)return;
        const words=Array.isArray(p.words)?p.words:[];
        window.dispatchEvent(new CustomEvent('katlearn-personal-pack-open',{detail:{words,id:p.id,name:p.name||''}}));
        if(typeof showPage==='function')showPage('learn');
        toast(`Đã mở “${p.name}”.`);
      });
    }catch(e){
      box.innerHTML='<div class="personal-pack-empty">Chưa thể tải bộ từ riêng lúc này.</div>';
    }
  }

  window.renderStudentPersonalPacks=renderMine;

  function closePersonalPackMenu(){document.querySelector('.personal-pack-action-menu')?.remove()}
  function openPersonalPackMenu(anchor,p){
    closePersonalPackMenu();if(!p)return;
    const menu=document.createElement('div');menu.className='personal-pack-action-menu';
    menu.innerHTML='<button data-personal-pack-action="rename">✏️ Đổi tên bộ từ</button><button class="danger" data-personal-pack-action="delete">🗑️ Xóa</button>';
    document.body.appendChild(menu);
    const r=anchor.getBoundingClientRect();
    menu.style.position='fixed';menu.style.top=Math.min(window.innerHeight-menu.offsetHeight-8,r.bottom+6)+'px';menu.style.left=Math.min(window.innerWidth-menu.offsetWidth-8,Math.max(8,r.right-menu.offsetWidth))+'px';
    menu.onclick=async e=>{
      const action=e.target.closest('[data-personal-pack-action]')?.dataset.personalPackAction;if(!action)return;
      closePersonalPackMenu();
      if(action==='rename')return renamePersonalPack(p);
      if(action==='delete'){editingPack=p;return deletePack()}
    };
  }
  document.addEventListener('click',e=>{if(!e.target.closest('.personal-pack-action-menu')&&!e.target.closest('[data-my-pack-menu]'))closePersonalPackMenu()});
  async function renamePersonalPack(p){
    if(await isManagedStudent())return toast('🔒 Tài khoản lớp học không thể quản lý bộ từ cá nhân.');
    const name=prompt('Tên mới cho bộ từ:',p.name||'');if(name===null)return;
    const cleanName=name.trim();if(!cleanName)return toast('Tên bộ từ không được để trống.');
    if(cleanName===p.name)return;
    try{await window.studyStore.updatePersonalPack(p.id,{name:cleanName});toast('✓ Đã đổi tên bộ từ');await renderMine()}
    catch(e){toast('Không thể đổi tên: '+(e.message||'Lỗi không xác định'))}
  }

  function init(){
    const btn=$('#createPersonalPack');
    if(!btn)return;
    btn.onclick=open;
    window.addEventListener('8b1-auth-change',()=>setTimeout(renderMine,0));
    const nav=$('#packs');
    if(nav){
      const observer=new MutationObserver(()=>{
        if($('#packs').classList.contains('active-page'))renderMine();
      });
      observer.observe(nav,{attributes:true,attributeFilter:['class']});
    }
    setTimeout(renderMine,500);
  }

  init();
})();