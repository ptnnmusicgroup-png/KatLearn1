// Feature activation bridge: wires the already-built AI UI into KatLearn without replacing existing learning flows.
(function(){
  function boot(){
    const ready=()=>{
      if(window.aiPackGeneratorUI?.init) window.aiPackGeneratorUI.init();
      if(window.packPreviewModal?.init) window.packPreviewModal.init();
      installManualAI();
      addAiButton();
      wirePackSave();
      addCuteShopItems();
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
  }
  function addAiButton(){
    if(document.getElementById('openAiPackModal')) return;
    const anchor=document.getElementById('createPersonalPack');
    if(!anchor) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.id='openAiPackModal'; btn.className=anchor.className;
    btn.textContent='✨ Tạo pack bằng AI';
    btn.addEventListener('click',()=>window.aiPackGeneratorUI?.open());
    anchor.parentNode.insertBefore(btn,anchor.nextSibling);
  }
  function installManualAI(){
    window.aiVocabularyUI={open(){
      const modal=document.getElementById('wordModal');
      if(modal) modal.classList.add('show');
      const input=document.getElementById('newWord'); if(input) input.focus();
    }};
    const word=document.getElementById('newWord'), meaning=document.getElementById('newMeaning'), pron=document.getElementById('newPronounce');
    if(!word||!meaning||!pron||document.getElementById('generateWordAI')) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.id='generateWordAI'; btn.className='primary-btn'; btn.style.marginBottom='10px'; btn.textContent='✨ AI tự điền nghĩa & phiên âm';
    word.parentNode.insertBefore(btn,meaning);

    let timer=null, requestId=0, lastWord='';
    const fillFromAI=async(value, silent=false)=>{
      const clean=value.trim();
      if(!clean || clean.length<2 || clean===lastWord) return;
      lastWord=clean;
      const id=++requestId;
      if(!silent){ btn.disabled=true; btn.textContent='⏳ Kat AI đang tra...'; }
      try{
        const res=await fetch('/api/vocab-assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:clean})});
        const data=await res.json(); if(!res.ok) throw new Error(data.error||'AI chưa sẵn sàng');
        if(id!==requestId || word.value.trim()!==clean) return;
        meaning.value=data.meaning||meaning.value;
        pron.value=data.pronunciation||pron.value;
        meaning.dispatchEvent(new Event('input',{bubbles:true}));
        pron.dispatchEvent(new Event('input',{bubbles:true}));
        if(!silent) toast(`✓ AI đã điền thông tin cho “${clean}”.`);
      }catch(err){
        if(!silent) toast(`❌ ${err.message}`);
      }finally{
        if(!silent){ btn.disabled=false; btn.textContent='✨ AI tự điền nghĩa & phiên âm'; }
      }
    };
    word.addEventListener('input',()=>{
      clearTimeout(timer);
      const value=word.value.trim();
      if(value.length<2){ lastWord=''; return; }
      timer=setTimeout(()=>fillFromAI(value,true),700);
    });
    btn.addEventListener('click',()=>fillFromAI(word.value,false));
  }
  function wirePackSave(){
    window.addEventListener('pack-ready-to-save',async e=>{
      const pack=e.detail;
      const words=(pack.words||[]).map(w=>({
        word:String(w.word||'').trim(),
        mean:String(w.meaning_vi||w.mean||'').trim(),
        pron:String(w.ipa||w.pronunciation||w.pron||'').trim(),
        emoji:'📚'
      })).filter(w=>w.word&&w.mean);
      if(!words.length) return toast('Pack AI chưa có từ hợp lệ để lưu.');
      const title=String(pack.pack?.suggested_title||pack.pack?.topic||'AI Vocabulary Pack').trim();
      localStorage.setItem('katlearn-vocab',JSON.stringify(words));
      window.dispatchEvent(new CustomEvent('katlearn-ai-pack-saved',{detail:{name:title,words}}));
      if(window.studyStore?.user && window.studyStore.isAdmin?.()){
        try{await window.studyStore.createPublicPack({name:title,words}); toast(`✓ Đã lưu “${title}” và xuất bản pack AI.`);}
        catch(err){toast(`✓ Đã lưu pack AI vào bộ học cá nhân. ${err.message}`);}
      }else toast(`✓ Đã lưu “${title}” vào bộ từ đang học.`);
      setTimeout(()=>location.reload(),450);
    });
  }
  function addCuteShopItems(){
    const shop=document.getElementById('shop');
    if(!shop||shop.dataset.katlearnShopReady==='1')return;
    shop.dataset.katlearnShopReady='1';
    let grid=shop.querySelector('.shop-grid');
    if(!grid){
      grid=document.createElement('div');
      grid.className='shop-grid';
      shop.appendChild(grid);
    }
    const items=[
      ['cat-nap','Cat Nap','Một góc ngủ mềm mềm cho Kat.','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=82'],
      ['tabby-cozy','Cozy Tabby','Một chiếc mood chill đúng nghĩa.','https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=82'],
      ['sleepy-cat','Sleepy Kitty','Nhìn thôi cũng muốn đi ngủ.','https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=82'],
      ['window-cat','Window Chill','Mèo + ánh sáng = bình yên.','https://images.unsplash.com/photo-1489084917528-a57e68a79a1e?auto=format&fit=crop&w=900&q=82'],
      ['soft-cat','Soft Paws','Một chút cute cho bộ sưu tập.','https://images.unsplash.com/photo-1548546738-8509cb246ed3?auto=format&fit=crop&w=900&q=82'],
      ['pastel-cat','Pastel Kitty','Một chiếc ảnh pastel siêu chill.','https://images.unsplash.com/photo-1595752776689-aebef37b5d32?auto=format&fit=crop&w=900&q=82']
    ];
    const existing=new Set([...grid.querySelectorAll('[data-katlearn-item]')].map(x=>x.dataset.katlearnItem));
    items.forEach(([id,name,desc,img])=>{
      if(existing.has(id))return;
      const card=document.createElement('article');
      card.className='shop-item'; card.dataset.katlearnItem=id;
      card.innerHTML=`<img src="${img}" alt="${name}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:18px 18px 0 0;display:block"><div style="padding:16px"><span style="font-size:.78rem;font-weight:800;letter-spacing:.06em">KAT'S CUTIE DROP</span><h3 style="margin:.35rem 0">${name}</h3><p style="margin:.35rem 0 1rem">${desc}</p><button type="button" data-price="3000" style="width:100%">🪙 3,000 xu</button></div>`;
      grid.appendChild(card);
    });
  }
  function toast(msg){
    if(typeof window.toast==='function') return window.toast(msg);
    const el=document.getElementById('toast'); if(!el) return;
    el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600);
  }
  boot();
})();
