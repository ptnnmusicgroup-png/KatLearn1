// Feature activation bridge: wires the already-built AI UI into KatLearn without replacing existing learning flows.
(function(){
  function boot(){
    const ready=()=>{
      if(window.aiPackGeneratorUI?.init) window.aiPackGeneratorUI.init();
      if(window.packPreviewModal?.init) window.packPreviewModal.init();
      addAiButton();
      wirePackSave();
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
    });
  }
  function toast(msg){
    if(typeof window.toast==='function') return window.toast(msg);
    const el=document.getElementById('toast'); if(!el) return;
    el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600);
  }
  boot();
})();
