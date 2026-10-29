// Feature activation bridge: wires the already-built AI UI into KatLearn without replacing existing learning flows.
function installThemeRuntime(){
    if(window.katlearnTheme?.apply)return;
    const themes={
      default:{accent:'#a99cff',accent2:'#38b7dc',bg:'#080711',surface:'#12101f',surface2:'#191729',text:'#f3f0ff',muted:'#aaa4c4',line:'rgba(190,178,255,.16)',soft:'rgba(121,101,232,.16)',top:'rgba(12,10,23,.94)',meta:'rgba(255,255,255,.045)',hero1:'#1f1939',hero2:'#11192b',shadow:'rgba(0,0,0,.38)',themeColor:'#080711'},
      night:{accent:'#a99cff',accent2:'#f39bb1',bg:'#141327',surface:'#211f38',surface2:'#2a2745',text:'#f6f2ff',muted:'#b7aecb',line:'rgba(255,255,255,.10)',soft:'rgba(169,156,255,.16)',top:'rgba(27,24,49,.94)',meta:'rgba(255,255,255,.08)',hero1:'#40356f',hero2:'#8d5d86',shadow:'rgba(0,0,0,.25)',themeColor:'#17152f'},
      sky:{accent:'#3289c7',accent2:'#79c8ee',bg:'#eef8ff',surface:'rgba(255,255,255,.82)',surface2:'#f7fcff',text:'#25445c',muted:'#71889a',line:'rgba(79,145,183,.15)',soft:'#e8f5fc',top:'rgba(255,255,255,.86)',meta:'rgba(255,255,255,.72)',hero1:'#4b9fd1',hero2:'#8bcfed',shadow:'rgba(38,98,133,.10)',themeColor:'#9edcff'},
      pink:{accent:'#d65c8a',accent2:'#f39fbd',bg:'#fff4f8',surface:'rgba(255,255,255,.86)',surface2:'#fff9fb',text:'#563446',muted:'#987985',line:'rgba(214,92,138,.14)',soft:'#fff0f5',top:'rgba(255,255,255,.88)',meta:'rgba(255,255,255,.74)',hero1:'#d66392',hero2:'#f5b2c8',shadow:'rgba(158,73,110,.10)',themeColor:'#ffd6e1'},
      ocean:{accent:'#177f90',accent2:'#54c7d0',bg:'#ebfbf8',surface:'rgba(255,255,255,.84)',surface2:'#f6fffd',text:'#214b58',muted:'#718f98',line:'rgba(23,127,144,.14)',soft:'#e5f8f7',top:'rgba(255,255,255,.87)',meta:'rgba(255,255,255,.73)',hero1:'#258d9d',hero2:'#64c9cf',shadow:'rgba(27,107,119,.10)',themeColor:'#74d7df'},
      lavender:{accent:'#6f63b8',accent2:'#a9a0e8',bg:'#f5f1ff',surface:'rgba(255,255,255,.84)',surface2:'#fbf9ff',text:'#433c65',muted:'#857ea0',line:'rgba(111,99,184,.15)',soft:'#efecff',top:'rgba(255,255,255,.87)',meta:'rgba(255,255,255,.72)',hero1:'#786cc8',hero2:'#b6afea',shadow:'rgba(86,73,143,.10)',themeColor:'#d8d1ff'},
      'sen-viet':{accent:'#5b9b83',accent2:'#786ccc',bg:'#fbf7ef',surface:'rgba(255,255,255,.80)',surface2:'#fffaf2',text:'#3f4751',muted:'#7d7f86',line:'rgba(91,155,131,.16)',soft:'#edf6f1',top:'rgba(255,252,246,.84)',meta:'rgba(255,255,255,.70)',hero1:'#5b9b83',hero2:'#786ccc',shadow:'rgba(83,91,86,.10)',themeColor:'#fffaf2'}
    };

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
      root.style.setProperty('--kl-theme-background',assets[id] ? 'url("' + assets[id] + '")' : 'none')
      // Bridge page-specific design tokens so standalone pages inherit the same theme too.
      root.style.setProperty('--test-ink',t.text);
      root.style.setProperty('--test-muted',t.muted);
      root.style.setProperty('--test-line',t.line);
      root.style.setProperty('--test-card',t.surface);
      root.style.setProperty('--test-purple',t.accent);
      root.style.setProperty('--test-purple2',t.accent2);
      root.style.setProperty('--test-bg',t.bg);
      root.style.setProperty('--cp-text',t.text);
      root.style.setProperty('--cp-muted',t.muted);
      root.style.setProperty('--cp-card',t.surface);
      root.style.setProperty('--cp-card-strong',t.surface2);
      root.style.setProperty('--cp-purple',t.accent);
      root.style.setProperty('--cp-purple-dark',t.accent);
      root.style.setProperty('--cp-shadow','0 24px 80px ' + t.shadow);
      root.style.setProperty('--text',t.text);
      root.style.setProperty('--purple-dark',t.accent);
      // Bridge every legacy design-token family. Several older stylesheets declare
      // these variables with !important, so the runtime bridge must use the same priority.
      const shadow='0 12px 30px '+t.shadow;
      const shadowSm='0 8px 26px '+t.shadow;
      const v3Shadow='0 20px 60px '+t.shadow;
      const v3ShadowSm='0 9px 28px '+t.shadow;
      const bridge={
        '--kl-bg':t.bg,'--kl-surface':t.surface,'--kl-surface-2':t.surface2,'--kl-ink':t.text,
        '--kl-muted':t.muted,'--kl-line':t.line,'--kl-accent':t.accent,'--kl-accent-2':t.accent2,
        '--kl-soft':t.soft,'--kl-shadow':shadow,'--kl-shadow-sm':shadowSm,
        '--kl-v3-bg':t.bg,'--kl-v3-surface':t.surface,'--kl-v3-surface-solid':t.surface2,
        '--kl-v3-line':t.line,'--kl-v3-ink':t.text,'--kl-v3-muted':t.muted,
        '--kl-v3-purple':t.accent,'--kl-v3-purple-2':t.accent2,
        '--kl-v3-blue':t.accent2,'--kl-v3-shadow':v3Shadow,'--kl-v3-shadow-sm':v3ShadowSm,
        '--purple':t.accent,'--purple2':t.accent2,'--bg':t.bg,'--ink':t.text,'--muted':t.muted,
        '--line':t.line,'--shadow':shadow,'--coral':t.accent2,'--kl-navy':t.text,
        '--kl-cyan':t.accent2,'--kl-pastel':t.soft
      };
      Object.entries(bridge).forEach(([name,value])=>root.style.setProperty(name,value,'important'));

      body.dataset.katTheme=id;
      let meta=document.querySelector('meta[name="theme-color"]');
      if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
      meta.setAttribute('content',t.themeColor);
      if(persist)localStorage.setItem('katlearn-theme',id);
      window.dispatchEvent(new CustomEvent('katlearn-theme-changed',{detail:{themeId:id}}));
      return id;
    }
    window.katlearnTheme={apply,themes:Object.freeze(themes)};
    // Default Dark Mode is the platform default. Restore a selected store theme only after the signed-in profile is resolved.
    apply('default',{persist:false});
    async function syncThemeFromProfile(profile){
      const currentUid=String(window.studyStore?.user?.uid||'');
      if(!currentUid){
        localStorage.removeItem('katlearn-theme-uid');
        apply('default',{persist:false});
        return;
      }
      const savedUid=String(localStorage.getItem('katlearn-theme-uid')||'');
      const sameAccount=!!savedUid&&savedUid===currentUid;
      if(!sameAccount)apply('default',{persist:false});
      const themeId=String(profile?.themeId||'').replace(/^theme-/,'').trim();
      localStorage.setItem('katlearn-theme-uid',currentUid);
      apply(themeId||((sameAccount&&localStorage.getItem('katlearn-theme'))||'default'),{persist:true});
    }
    window.addEventListener('8b1-auth-change',async()=>{
      try{
        if(!window.studyStore?.user){await syncThemeFromProfile(null);return}
        let profile=window.katlearnAccount?.profile||null;
        if(!profile&&window.studyStore?.loadProfile)profile=await window.studyStore.loadProfile();
        await syncThemeFromProfile(profile);
      }catch(error){console.warn('[KatLearn theme auth sync]',error)}
    });
    window.addEventListener('katlearn-account-ready',event=>{
      void syncThemeFromProfile(event?.detail?.profile||null);
    });
    window.addEventListener('katlearn-account-profile-updated',event=>{
      if(event?.detail?.user?.uid&&String(event.detail.user.uid)===String(window.studyStore?.user?.uid||'')){
        void syncThemeFromProfile(window.katlearnAccount?.profile||event.detail.profile||null);
      }
    });
  }

(function(){
  const ICONS={
    target:'<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2.5v2M21.5 12h-2M12 21.5v-2M2.5 12h2"></path>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"></path><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M8 7h8M8 10h6"></path>',
    layers:'<path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"></path><path d="m4 12 8 4.5 8-4.5"></path><path d="m4 16.5 8 4.5 8-4.5"></path>',
    words:'<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 8h8M8 12h6M8 16h5"></path>',
    chart:'<path d="M5 19V9"></path><path d="M12 19V5"></path><path d="M19 19v-7"></path><path d="M3 19h18"></path>',
    checkCircle:'<circle cx="12" cy="12" r="8.5"></circle><path d="m8 12 2.5 2.5L16 9"></path>',
    settings:'<path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6"></path><circle cx="12" cy="12" r="3.3"></circle>',
    shield:'<path d="M12 3 19 6v5c0 4.5-2.7 7.8-7 10-4.3-2.2-7-5.5-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path>',
    coin:'<circle cx="12" cy="12" r="8.5"></circle><path d="M9.2 9.5c.4-1 1.4-1.5 2.8-1.5 1.6 0 2.8.7 2.8 1.9 0 1.1-.8 1.7-2.6 2.1-1.8.4-2.8 1-2.8 2.1 0 1.2 1.2 1.9 2.8 1.9 1.4 0 2.4-.5 2.8-1.5"></path><path d="M12 7v10"></path>',
    flame:'<path d="M13.2 3.5c.4 2.2-.8 3.2-2.1 4.4C9.8 9.1 8.8 10.4 8.8 12a3.2 3.2 0 0 0 6.4 0c0-.9-.4-1.8-1-2.7.1 2-1.2 3.2-2 3.8"></path><path d="M12 20.5a7 7 0 0 0 7-7c0-2.5-1.1-4.8-3.2-6.7.2 2.2-.3 4-1.6 5.2A4.2 4.2 0 0 1 12 20.5Z"></path>',
    arrow:'<path d="M5 12h13"></path><path d="m13 6 6 6-6 6"></path>'
  };
  function renderIcon(el){
    if(!el||el.dataset.katIconRendered==='1')return;
    const name=String(el.getAttribute('data-kat-icon')||'').trim(),icon=ICONS[name];
    if(!icon)return;
    const size=Math.max(10,Number(el.getAttribute('data-icon-size')||18));
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width',String(size));svg.setAttribute('height',String(size));
    svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
    svg.innerHTML=icon;el.replaceChildren(svg);el.dataset.katIconRendered='1';
    el.style.display='inline-flex';el.style.alignItems='center';el.style.justifyContent='center';el.style.width=size+'px';el.style.height=size+'px';el.style.flex='0 0 auto';el.style.lineHeight='0';
  }
  function installKatIcons(){
    const renderAll=()=>document.querySelectorAll('[data-kat-icon]').forEach(renderIcon);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderAll,{once:true});else renderAll();
    if(window.__katIconObserver||!document.body)return;
    window.__katIconObserver=new MutationObserver(muts=>{
      for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1){
        if(n.matches?.('[data-kat-icon]'))renderIcon(n);
        n.querySelectorAll?.('[data-kat-icon]').forEach(renderIcon);
      }
    });
    window.__katIconObserver.observe(document.body,{childList:true,subtree:true});
  }
  window.katlearnIcons={render:renderIcon,refresh:installKatIcons};
  installKatIcons();
})();

(function(){
  function boot(){
    const ready=()=>{
      // Render the shop catalog first so an unrelated AI/theme initializer
      // cannot leave the cute-products section empty if it throws.
      try{addCuteShopItems()}catch(error){console.error('[KatLearn shop] Could not render product catalog',error)}
      installThemeRuntime();
      if(window.aiPackGeneratorUI?.init) window.aiPackGeneratorUI.init();
      if(window.packPreviewModal?.init) window.packPreviewModal.init();
      installManualAI(); addAiButton(); wirePackSave();
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


/* Global navigation and KatLearn vocabulary search. */
(function(){
  const $=selector=>document.querySelector(selector);
  const normalize=value=>String(value||'').trim().toLocaleLowerCase('vi');
  function flattenLibrary(nodes,out=[]){
    (Array.isArray(nodes)?nodes:[]).forEach(node=>{
      out.push(node);
      flattenLibrary(node.children,out);
    });
    return out;
  }
  function addOrbitStar(card){
    if(!card||card.querySelector('.kl-hover-star'))return;
    const star=document.createElement('span');star.className='kl-hover-star';star.setAttribute('aria-hidden','true');card.appendChild(star);
  }
  function wireOrbitStars(){
    document.addEventListener('pointerover',event=>{
      const card=event.target.closest?.('.nav-item,.activity-card,.mode-card,.pack-tile,.personal-pack-card,.shop-item,.shop-theme-card,.metric,.arcade-card,.reflex-pack-card');
      if(card&&!card.contains(event.relatedTarget))addOrbitStar(card);
    });
    document.addEventListener('pointerout',event=>{
      const card=event.target.closest?.('.nav-item,.activity-card,.mode-card,.pack-tile,.personal-pack-card,.shop-item,.shop-theme-card,.metric,.arcade-card,.reflex-pack-card');
      if(card&&!card.contains(event.relatedTarget))card.querySelector('.kl-hover-star')?.remove();
    });
  }
  function wireNavigation(){
    const sidebar=$('.sidebar'),toggle=$('.menu-toggle');
    if(!sidebar||!toggle)return;
    const desktop=()=>window.matchMedia('(min-width:821px)').matches;
    if(desktop()&&localStorage.getItem('katlearn-nav-collapsed')==='1')sidebar.classList.add('nav-collapsed');
    toggle.setAttribute('aria-label','Thu gọn hoặc mở rộng menu');
    toggle.addEventListener('click',()=>{
      if(!desktop())return;
      sidebar.classList.toggle('nav-collapsed');
      localStorage.setItem('katlearn-nav-collapsed',sidebar.classList.contains('nav-collapsed')?'1':'0');
      toggle.setAttribute('aria-expanded',String(!sidebar.classList.contains('nav-collapsed')));
    });
  }
  function resultButton(icon,title,description,data){
    const button=document.createElement('button');button.type='button';button.className='kl-search-result';
    button.innerHTML='<i>'+icon+'</i><span><b></b><small></small></span>';
    button.querySelector('b').textContent=title;button.querySelector('small').textContent=description;
    button.addEventListener('click',()=>{
      try{localStorage.setItem('katlearn-global-search',JSON.stringify(data))}catch(_){}
      window.location.href=data.kind==='pack'?'/packs.html':'/vocabulary.html';
    });
    return button;
  }
  function wireGlobalSearch(){
    const search=$('.search');if(!search||search.dataset.klSearchReady)return;
    search.dataset.klSearchReady='1';search.classList.add('kl-global-search');search.replaceChildren();
    const icon=document.createElement('span');icon.className='kl-search-icon';icon.textContent='⌕';
    const input=document.createElement('input');input.type='search';input.autocomplete='off';input.placeholder='Tìm từ, chủ đề, bộ IELTS...';input.setAttribute('aria-label','Tìm trong kho từ vựng KatLearn');
    const results=document.createElement('div');results.className='kl-search-results';results.hidden=true;results.setAttribute('role','listbox');
    search.append(icon,input,results);
    let timer=0;
    const render=()=>{
      const query=normalize(input.value);results.replaceChildren();
      if(query.length<2){results.hidden=true;return}
      const addTitle=label=>{const title=document.createElement('span');title.className='kl-search-title';title.textContent=label;results.appendChild(title)};
      const core=window.katlearnCoreVocabulary||{};
      const nodes=flattenLibrary(core.library||[]);
      const packs=(core.topics||[]).filter(pack=>normalize(pack.name+' '+pack.category+' '+pack.id).includes(query)).slice(0,6);
      const packNodes=nodes.filter(node=>node.packId&&normalize(node.name+' '+node.packId).includes(query)).slice(0,4);
      const vocabulary=(Array.isArray(window.vocab)?window.vocab:[]).filter(word=>normalize((word.word||'')+' '+(word.mean||word.meaning_vi||word.meaning||'')).includes(query)).slice(0,7);
      const guided=nodes.filter(node=>Array.isArray(node.words)&&node.words.some(word=>normalize(word).includes(query))).slice(0,5);
      if(vocabulary.length){addTitle('Từ trong bộ bạn đang học');vocabulary.forEach(word=>results.appendChild(resultButton('Aa',word.word,word.mean||word.meaning_vi||word.meaning||'Từ vựng KatLearn',{kind:'word',word:word.word,meaning:word.mean||word.meaning_vi||word.meaning||''})))}
      if(packs.length||packNodes.length||guided.length){addTitle('Chủ đề & bộ từ KatLearn');[...packs,...packNodes,...guided].slice(0,9).forEach(item=>results.appendChild(resultButton(item.icon||'📚',item.name,item.category||item.packId||'Bộ từ KatLearn',{kind:'pack',packId:item.packId||item.id,name:item.name})))}
      if(!results.childElementCount){const empty=document.createElement('span');empty.className='kl-search-empty';empty.textContent='Không tìm thấy. Hãy thử tên từ tiếng Anh, nghĩa tiếng Việt, IELTS hoặc chủ đề.';results.appendChild(empty)}
      results.hidden=false;
    };
    input.addEventListener('input',()=>{clearTimeout(timer);timer=window.setTimeout(render,120)});
    input.addEventListener('focus',render);
    document.addEventListener('pointerdown',event=>{if(!search.contains(event.target))results.hidden=true});
    input.addEventListener('keydown',event=>{if(event.key==='Escape'){results.hidden=true;input.blur()}});
  }
  function boot(){
    wireNavigation();wireOrbitStars();wireGlobalSearch();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
