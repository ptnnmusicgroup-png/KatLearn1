// Feature activation bridge: wires the already-built AI UI into KatLearn without replacing existing learning flows.
(function(){
  function installThemeRuntime(){
    if(window.katlearnTheme?.apply)return;
    const themes={
      default:{accent:'#6d5efc',accent2:'#8c7eff',bg:'#f7f8fc',surface:'#ffffff',surface2:'#fbfbfe',text:'#24364b',muted:'#8290a3',line:'#ebedf4',soft:'#f1efff',top:'#ffffff',meta:'#f6f7fb',hero1:'#6153ef',hero2:'#a296fc',shadow:'rgba(44,54,94,.08)',themeColor:'#f7f5ff'},
      night:{accent:'#a99cff',accent2:'#f39bb1',bg:'#141327',surface:'#211f38',surface2:'#2a2745',text:'#f6f2ff',muted:'#b7aecb',line:'rgba(255,255,255,.10)',soft:'rgba(169,156,255,.16)',top:'rgba(27,24,49,.94)',meta:'rgba(255,255,255,.08)',hero1:'#40356f',hero2:'#8d5d86',shadow:'rgba(0,0,0,.25)',themeColor:'#17152f'},
      sky:{accent:'#3289c7',accent2:'#79c8ee',bg:'#eef8ff',surface:'rgba(255,255,255,.82)',surface2:'#f7fcff',text:'#25445c',muted:'#71889a',line:'rgba(79,145,183,.15)',soft:'#e8f5fc',top:'rgba(255,255,255,.86)',meta:'rgba(255,255,255,.72)',hero1:'#4b9fd1',hero2:'#8bcfed',shadow:'rgba(38,98,133,.10)',themeColor:'#9edcff'},
      pink:{accent:'#d65c8a',accent2:'#f39fbd',bg:'#fff4f8',surface:'rgba(255,255,255,.86)',surface2:'#fff9fb',text:'#563446',muted:'#987985',line:'rgba(214,92,138,.14)',soft:'#fff0f5',top:'rgba(255,255,255,.88)',meta:'rgba(255,255,255,.74)',hero1:'#d66392',hero2:'#f5b2c8',shadow:'rgba(158,73,110,.10)',themeColor:'#ffd6e1'},
      ocean:{accent:'#177f90',accent2:'#54c7d0',bg:'#ebfbf8',surface:'rgba(255,255,255,.84)',surface2:'#f6fffd',text:'#214b58',muted:'#718f98',line:'rgba(23,127,144,.14)',soft:'#e5f8f7',top:'rgba(255,255,255,.87)',meta:'rgba(255,255,255,.73)',hero1:'#258d9d',hero2:'#64c9cf',shadow:'rgba(27,107,119,.10)',themeColor:'#74d7df'},
      lavender:{accent:'#6f63b8',accent2:'#a9a0e8',bg:'#f5f1ff',surface:'rgba(255,255,255,.84)',surface2:'#fbf9ff',text:'#433c65',muted:'#857ea0',line:'rgba(111,99,184,.15)',soft:'#efecff',top:'rgba(255,255,255,.87)',meta:'rgba(255,255,255,.72)',hero1:'#786cc8',hero2:'#b6afea',shadow:'rgba(86,73,143,.10)',themeColor:'#d8d1ff'},
      'sen-viet':{accent:'#5b9b83',accent2:'#786ccc',bg:'#fbf7ef',surface:'rgba(255,255,255,.80)',surface2:'#fffaf2',text:'#3f4751',muted:'#7d7f86',line:'rgba(91,155,131,.16)',soft:'#edf6f1',top:'rgba(255,252,246,.84)',meta:'rgba(255,255,255,.70)',hero1:'#5b9b83',hero2:'#786ccc',shadow:'rgba(83,91,86,.10)',themeColor:'#fffaf2'}
    };
    const css=document.createElement('style');
    css.id='katlearn-theme-runtime';
    css.textContent=`
      body[data-kat-theme]{background-color:var(--kl-theme-bg)!important;background-image:var(--kl-theme-background)!important;background-size:cover!important;background-attachment:fixed!important;background-position:center!important;color:var(--kl-theme-text)!important}
      body[data-kat-theme] .app-shell,body[data-kat-theme] main{background:transparent!important}
      body[data-kat-theme] .sidebar{background:var(--kl-theme-top)!important;border-right-color:var(--kl-theme-line)!important;box-shadow:12px 0 40px var(--kl-theme-shadow)!important}
      body[data-kat-theme] .topbar{background:var(--kl-theme-top)!important;border-bottom-color:var(--kl-theme-line)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important}
      body[data-kat-theme] .brand,body[data-kat-theme] h1,body[data-kat-theme] h2,body[data-kat-theme] h3,body[data-kat-theme] .card-title h3,body[data-kat-theme] .pack-summary b,body[data-kat-theme] .word-summary b{color:var(--kl-theme-text)!important}
      body[data-kat-theme] p,body[data-kat-theme] small,body[data-kat-theme] .subtext,body[data-kat-theme] .muted,body[data-kat-theme] .activity-card small,body[data-kat-theme] .section-heading p{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .brand span span,body[data-kat-theme] .nav-item:hover,body[data-kat-theme] .nav-item.active,body[data-kat-theme] .eyebrow,body[data-kat-theme] .card-title button,body[data-kat-theme] .rank-tabs .active{color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .nav-item{color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .nav-item:hover,body[data-kat-theme] .nav-item.active{background:var(--kl-theme-soft)!important}
      body[data-kat-theme] .search{background:var(--kl-theme-meta)!important;color:var(--kl-theme-muted)!important}
      body[data-kat-theme] .streak-card,body[data-kat-theme] .activity-card,body[data-kat-theme] .daily-goal,body[data-kat-theme] .mini-ranking,body[data-kat-theme] .word-list,body[data-kat-theme] .mode-card,body[data-kat-theme] .quiz-panel,body[data-kat-theme] .stat-grid>div,body[data-kat-theme] .chart-card,body[data-kat-theme] .weak-card,body[data-kat-theme] .ranking-list,body[data-kat-theme] .rank-tabs,body[data-kat-theme] .shop-grid article,body[data-kat-theme] .shop-theme-card,body[data-kat-theme] .published-packs,body[data-kat-theme] .personal-pack-card,body[data-kat-theme] .learn-summary,body[data-kat-theme] .flash-stage,body[data-kat-theme] .test-card,body[data-kat-theme] .test-hero,body[data-kat-theme] .result-card,body[data-kat-theme] .cp-hero-card,body[data-kat-theme] .cp-account,body[data-kat-theme] .cp-card,body[data-kat-theme] .auth-screen .card{background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important;box-shadow:0 14px 40px var(--kl-theme-shadow)!important}
      body[data-kat-theme] .student-pack-head,body[data-kat-theme] .student-pack-row input,body[data-kat-theme] .student-pack-row select,body[data-kat-theme] .cp-field input,body[data-kat-theme] .cp-field textarea,body[data-kat-theme] .cp-field select{background:var(--kl-theme-surface2)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] .hero-card{background:linear-gradient(135deg,var(--kl-theme-hero1),var(--kl-theme-hero2))!important;box-shadow:0 18px 42px var(--kl-theme-shadow)!important}
      body[data-kat-theme] .primary-btn,body[data-kat-theme] .know-btn,body[data-kat-theme] .cp-btn.primary,body[data-kat-theme] .shop-theme-card .shop-apply-theme{background:linear-gradient(135deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important;color:#fff!important}
      body[data-kat-theme] .activity-card:hover,body[data-kat-theme] .mode-card:hover,body[data-kat-theme] .mode-card.active-mode,body[data-kat-theme] .student-pack-row input:focus,body[data-kat-theme] .student-pack-row select:focus,body[data-kat-theme] .cp-field input:focus,body[data-kat-theme] .cp-field textarea:focus,body[data-kat-theme] .cp-field select:focus{border-color:var(--kl-theme-accent)!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--kl-theme-accent) 12%,transparent)!important}
      body[data-kat-theme] .coin-pill,body[data-kat-theme] .coin-earned{background:var(--kl-theme-soft)!important;border-color:var(--kl-theme-line)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .word-item.selected,body[data-kat-theme] .rank-row.you,body[data-kat-theme] .rank-list-row.mine{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .quiz-badge,body[data-kat-theme] .mode-card span,body[data-kat-theme] .word-list h3 span{background:var(--kl-theme-soft)!important;color:var(--kl-theme-accent)!important}
      body[data-kat-theme] .quiz-progress i,body[data-kat-theme] .progress-line span,body[data-kat-theme] .bar-chart .today-bar{background:linear-gradient(90deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important}
      body[data-kat-theme] .flashcard .card-front{background:linear-gradient(145deg,var(--kl-theme-hero1),var(--kl-theme-hero2))!important}
      body[data-kat-theme] .flashcard .card-back{background:linear-gradient(145deg,var(--kl-theme-accent),var(--kl-theme-accent2))!important}
      body[data-kat-theme] .flashcard .card-face h2,body[data-kat-theme] .flashcard .card-face p,body[data-kat-theme] .flashcard .word-type{color:#fff!important}
      body[data-kat-theme] .modal-card,body[data-kat-theme] .student-pack-modal,.kl-pack-card{background:var(--kl-theme-surface)!important;color:var(--kl-theme-text)!important;border-color:var(--kl-theme-line)!important}
      body[data-kat-theme] input,body[data-kat-theme] textarea,body[data-kat-theme] select{color:var(--kl-theme-text)}
      body[data-kat-theme] .site-footer,body[data-kat-theme] #katlearnFooter{background:color-mix(in srgb,var(--kl-theme-surface) 78%,transparent)!important;border-top-color:var(--kl-theme-line)!important}
      body[data-kat-theme="night"] .vn-ui-motif{opacity:.35!important}
      body[data-kat-theme="sen-viet"] .hero-card{box-shadow:0 18px 42px rgba(91,155,131,.16)!important}
      body[data-kat-theme="sen-viet"] .brand-mark{background:linear-gradient(135deg,#5b9b83,#786ccc)!important}
      body[data-kat-theme="night"] .brand-mark{background:linear-gradient(135deg,#5f5495,#b06d84)!important}
      body[data-kat-theme="ocean"] .activity-card .activity-icon{background:#dff7f4!important}
      body[data-kat-theme="sky"] .activity-card .activity-icon{background:#e4f4fc!important}
      body[data-kat-theme="pink"] .activity-card .activity-icon{background:#ffeaf2!important}
      body[data-kat-theme="lavender"] .activity-card .activity-icon{background:#eeeaff!important}
      body[data-kat-theme="night"] .activity-card .activity-icon{background:rgba(255,255,255,.08)!important;color:var(--kl-theme-accent)!important}
      `;
    document.head.appendChild(css);
    const assets={
      night:'/assets/1/bg-cat-night.svg',sky:'/assets/1/bg-sky.svg',pink:'/assets/1/bg-pink.svg',
      ocean:'/assets/1/bg-ocean.svg',lavender:'/assets/1/bg-lavender.svg','sen-viet':'/assets/1/bg-sen-viet.svg'
    };
    function apply(raw,{persist=true}={}){
      const requested=String(raw||'default').replace(/^theme-/,'').trim();
      const id=themes[requested]?requested:'default';
      const t=themes[id];
      const root=document.documentElement;
      const body=document.body;
      if(!body)return id;
      root.style.setProperty('--kl-theme-bg',t.bg);
      root.style.setProperty('--kl-theme-surface',t.surface);
      root.style.setProperty('--kl-theme-surface2',t.surface2);
      root.style.setProperty('--kl-theme-text',t.text);
      root.style.setProperty('--kl-theme-muted',t.muted);
      root.style.setProperty('--kl-theme-line',t.line);
      root.style.setProperty('--kl-theme-soft',t.soft);
      root.style.setProperty('--kl-theme-top',t.top);
      root.style.setProperty('--kl-theme-meta',t.meta);
      root.style.setProperty('--kl-theme-accent',t.accent);
      root.style.setProperty('--kl-theme-accent2',t.accent2);
      root.style.setProperty('--kl-theme-hero1',t.hero1);
      root.style.setProperty('--kl-theme-hero2',t.hero2);
      root.style.setProperty('--kl-theme-shadow',t.shadow);
      root.style.setProperty('--kl-theme-background',assets[id]?\`url("${assets[id]}")\`:'none');
      body.dataset.katTheme=id;
      let meta=document.querySelector('meta[name="theme-color"]');
      if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
      meta.setAttribute('content',t.themeColor);
      if(persist)localStorage.setItem('katlearn-theme',id);
      window.dispatchEvent(new CustomEvent('katlearn-theme-changed',{detail:{themeId:id}}));
      return id;
    }
    window.katlearnTheme={apply,themes:Object.freeze(themes)};
    let initial=localStorage.getItem('katlearn-theme')||'default';
    apply(initial,{persist:false});
    window.addEventListener('8b1-auth-change',async event=>{
      const savedUid=String(localStorage.getItem('katlearn-theme-uid')||'');
      const currentUid=String(window.studyStore?.user?.uid||'');
      const eventUid=String(event?.detail?.uid||'');
      const nextUid=eventUid||currentUid;
      if(savedUid&&nextUid&&savedUid!==nextUid){
        apply('default',{persist:false});
      }
      apply(localStorage.getItem('katlearn-theme')||'default',{persist:false});
      try{
        if(!currentUid)return;
        let profile=window.katlearnAccount?.profile||null;
        if(!profile&&window.studyStore?.loadProfile)profile=await window.studyStore.loadProfile();
        const themeId=String(profile?.themeId||'').replace(/^theme-/,'').trim();
        if(themeId){
          localStorage.setItem('katlearn-theme-uid',currentUid);
          apply(themeId,{persist:true});
        }
      }catch(error){console.warn('[KatLearn theme sync]',error)}
    });
  }

(function(){
  function boot(){
    const ready=()=>{ installThemeRuntime();
      if(window.aiPackGeneratorUI?.init) window.aiPackGeneratorUI.init();
      if(window.packPreviewModal?.init) window.packPreviewModal.init();
      installManualAI(); addAiButton(); wirePackSave(); addCuteShopItems();
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
  }
  function addAiButton(){
    if(document.getElementById('openAiPackModal')) return;
    const anchor=document.getElementById('createPersonalPack'); if(!anchor)return;
    const btn=document.createElement('button'); btn.type='button'; btn.id='openAiPackModal'; btn.className=anchor.className; btn.textContent='✨ Tạo pack bằng AI';
    btn.addEventListener('click',()=>window.aiPackGeneratorUI?.open()); anchor.parentNode.insertBefore(btn,anchor.nextSibling);
  }
  function installManualAI(){
    window.aiVocabularyUI={open(){const modal=document.getElementById('wordModal');if(modal)modal.classList.add('show');const input=document.getElementById('newWord');if(input)input.focus()}};
    const word=document.getElementById('newWord'),meaning=document.getElementById('newMeaning'),pron=document.getElementById('newPronounce');
    if(!word||!meaning||!pron||document.getElementById('generateWordAI'))return;
    const btn=document.createElement('button'); btn.type='button'; btn.id='generateWordAI'; btn.className='primary-btn'; btn.style.marginBottom='10px'; btn.textContent='✨ AI tự điền nghĩa & phiên âm'; word.parentNode.insertBefore(btn,meaning);
    let timer=null,requestId=0,lastWord='';
    const fillFromAI=async(value,silent=false)=>{
      const clean=value.trim(); if(!clean||clean.length<2||clean===lastWord)return; lastWord=clean; const id=++requestId;
      if(!silent){btn.disabled=true;btn.textContent='⏳ Kat AI đang tra...'}
      try{const headers={'Content-Type':'application/json'};try{const token=await window.studyStore?.getIdToken?.();if(token)headers.Authorization='Bearer '+token}catch(_){}const res=await fetch('/api/vocab-assist',{method:'POST',headers,body:JSON.stringify({word:clean})});const data=await res.json();if(!res.ok)throw new Error(data.error||'AI chưa sẵn sàng');if(id!==requestId||word.value.trim()!==clean)return;meaning.value=data.meaning||meaning.value;pron.value=data.pronunciation||pron.value;meaning.dispatchEvent(new Event('input',{bubbles:true}));pron.dispatchEvent(new Event('input',{bubbles:true}));if(!silent)toast(`✓ AI đã điền thông tin cho “${clean}”.`)}catch(err){if(!silent)toast(`❌ ${err.message}`)}finally{if(!silent){btn.disabled=false;btn.textContent='✨ AI tự điền nghĩa & phiên âm'}}
    };
    word.addEventListener('input',()=>{clearTimeout(timer);const value=word.value.trim();if(value.length<2){lastWord='';return}timer=setTimeout(()=>fillFromAI(value,true),700)}); btn.addEventListener('click',()=>fillFromAI(word.value,false));
  }
  function wirePackSave(){
    window.addEventListener('pack-ready-to-save',async e=>{
      const pack=e.detail||{};
      const words=(pack.words||[]).map(w=>({word:String(w.word||'').trim(),mean:String(w.meaning_vi||w.mean||'').trim(),pron:String(w.ipa||w.pronunciation||w.pron||'').trim(),emoji:'📚'})).filter(w=>w.word&&w.mean);
      if(!words.length)return toast('Pack AI chưa có từ hợp lệ để lưu.');
      const title=String(pack.pack?.suggested_title||pack.pack?.topic||'AI Vocabulary Pack').trim().slice(0,80)||'AI Vocabulary Pack';
      if(!window.studyStore?.user)return toast('🔒 Hãy đăng nhập để lưu pack AI.');
      try{
        if(window.studyStore?.isClassStudent&&await window.studyStore.isClassStudent()){
          return toast('🔒 Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân.');
        }
        if(window.studyStore.isAdmin?.()){
          await window.studyStore.createPublicPack({name:title,words});
          window.dispatchEvent(new CustomEvent('katlearn-ai-pack-saved',{detail:{name:title,words,public:true}}));
          toast(`✓ Đã lưu “${title}” và xuất bản pack AI.`);
        }else{
          const ref=await window.studyStore.createPersonalPack({name:title,words});
          localStorage.setItem('katlearn-vocab',JSON.stringify(words));
          if(typeof setVocabSource==='function')setVocabSource({kind:'personal',id:ref?.id||''});
          window.dispatchEvent(new CustomEvent('katlearn-ai-pack-saved',{detail:{name:title,words,id:ref?.id||''}}));
          toast(`✓ Đã lưu “${title}” vào Bộ từ của tôi.`);
        }
      }catch(err){
        toast(`❌ Không thể lưu pack AI: ${err.message||err}`);
        return;
      }
      setTimeout(()=>location.reload(),450);
    });
  }
  function addCuteShopItems(){
    const shop=document.getElementById('shop'); if(!shop||shop.dataset.katlearnShopReady==='1')return; shop.dataset.katlearnShopReady='1';
    let grid=shop.querySelector('.katlearn-cute-shop-grid');
    if(!grid){
      grid=document.createElement('div');
      grid.className='shop-grid katlearn-cute-shop-grid';
      const label=document.createElement('div');
      label.className='shop-cute-dynamic-label';
      label.innerHTML="<p class=\"eyebrow\">KAT'S CUTIE DROP</p><h2>🐱 Đồ cute của Kat</h2><p>Một chút đáng yêu cho góc học tập.</p>";
      shop.append(label,grid);
    }
    const items=[
      ['cat-nap','Cat Nap','Một góc ngủ mềm mềm cho Kat.','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=82'],
      ['tabby-cozy','Cozy Tabby','Một chiếc mood chill đúng nghĩa.','https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=82'],
      ['sleepy-cat','Sleepy Kitty','Nhìn thôi cũng muốn đi ngủ.','https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=82'],
      ['window-cat','Window Chill','Mèo + ánh sáng = bình yên.','https://images.unsplash.com/photo-1489084917528-a57e68a79a1e?auto=format&fit=crop&w=900&q=82'],
      ['soft-cat','Soft Paws','Một chút cute cho bộ sưu tập.','https://images.unsplash.com/photo-1548546738-8509cb246ed3?auto=format&fit=crop&w=900&q=82'],
      ['pastel-cat','Pastel Kitty','Một chiếc ảnh pastel siêu chill.','https://images.unsplash.com/photo-1595752776689-aebef37b5d32?auto=format&fit=crop&w=900&q=82']
    ];
    let ownedItems=new Set();
    try{const raw=JSON.parse(localStorage.getItem('katlearn-owned-shop-items')||'[]');if(Array.isArray(raw))ownedItems=new Set(raw.filter(Boolean).map(String))}catch(_){localStorage.removeItem('katlearn-owned-shop-items')}
    const existing=new Set([...grid.querySelectorAll('[data-katlearn-item]')].map(x=>x.dataset.katlearnItem));
    items.forEach(([id,name,desc,img])=>{if(existing.has(id))return;const card=document.createElement('article');card.className='shop-item';card.dataset.katlearnItem=id;card.innerHTML=`<img src="${img}" alt="${name}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:18px 18px 0 0;display:block"><div style="padding:16px"><span style="font-size:.78rem;font-weight:800;letter-spacing:.06em">KAT'S CUTIE DROP</span><h3 style="margin:.35rem 0">${name}</h3><p style="margin:.35rem 0 1rem">${desc}</p><button type="button" data-price="3000" style="width:100%" ${ownedItems.has(id)?'disabled':''}>${ownedItems.has(id)?'✓ Đã mua':'🪙 3,000 xu'}</button></div>`;grid.appendChild(card);const buy=card.querySelector('button');buy.addEventListener('click',async()=>{if(!window.studyStore?.user)return toast('Đăng nhập để mua vật phẩm và lưu vào tài khoản nhé 🐱');const balance=Number((document.getElementById('coinCount')?.textContent||'0').replace(/,/g,''));if(balance<3000)return toast('Bạn chưa đủ 3,000 xu cho vật phẩm này.');try{
        const token=await window.studyStore.getIdToken();
        if(!token)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
        const res=await fetch('/api/game-action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'purchase',itemId:'shop-'+id})});
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||'Không thể hoàn tất giao dịch');
        const nextCoins=Number(data.coins);
        if(!Number.isFinite(nextCoins))throw new Error('Server không trả về số dư mới.');
        if(typeof coins!=='undefined')coins=nextCoins;
        document.getElementById('coinCount')?.replaceChildren(document.createTextNode(nextCoins.toLocaleString('en-US')));
        document.getElementById('shopCoins')?.replaceChildren(document.createTextNode(nextCoins.toLocaleString('en-US')));
        document.getElementById('panelCoins')?.replaceChildren(document.createTextNode(nextCoins.toLocaleString('en-US')));
        buy.textContent='✓ Đã mua';buy.disabled=true;ownedItems.add(id);localStorage.setItem('katlearn-owned-shop-items',JSON.stringify([...ownedItems]));toast(`✓ Đã mua “${name}” với 3,000 xu!`);
      }catch(err){toast(`❌ Không thể mua vật phẩm: ${err.message}`)}})});
  }
  function toast(msg){if(typeof window.toast==='function')return window.toast(msg);const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
  boot();
})();
