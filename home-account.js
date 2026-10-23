/* KatLearn Home account UI: Firebase session is the source of truth. */
(function(){
  const LOGIN='/login.html', SIGNUP='/signup.html', ADMIN_EMAIL='katlearn.admin@gmail.com', ADMIN_HOME=String(window.KATLEARN_DEPLOYMENT_CONFIG?.teacherUrl||'https://quanly-giaovien-katlearn.netlify.app').replace(/\/+$/,'')+'/admin.html';

  function el(tag,attrs={},html=''){const x=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')x.className=v;else if(k==='text')x.textContent=v;else x.setAttribute(k,v)});if(html)x.innerHTML=html;return x}
  function render(){
    const actions=document.querySelector('.top-actions'); if(!actions)return false;
    let root=document.getElementById('homeAccount');
    if(!root){
      ['loginBtn','accountTrigger','accountPanel'].forEach(id=>document.getElementById(id)?.remove());
      root=el('div',{id:'homeAccount'});actions.prepend(root);
    }
    const user=window.studyStore?.user||null;
    root.innerHTML='';
    if(!user){
      const login=el('button',{class:'ha-btn',text:'Đăng nhập'}),signup=el('button',{class:'ha-btn ha-signup',text:'Đăng ký'});
      login.onclick=()=>location.href=LOGIN;signup.onclick=()=>location.href=SIGNUP;root.append(login,signup);return true;
    }
    const name=user.displayName||user.email?.split('@')[0]||'KatLearn Student',initial=(name.trim()[0]||'K').toUpperCase();
    const trigger=el('button',{class:'ha-user'});trigger.innerHTML=`<span class="ha-avatar">${initial}</span><span>${name.replace(/[<>&\"']/g,'')}</span><span>⌄</span>`;
    const panel=el('div',{class:'ha-panel'});panel.hidden=true;
    panel.innerHTML=`<div class="ha-head"><span class="ha-avatar large">${initial}</span><div><b>${name.replace(/[<>&\"']/g,'')}</b><small>${(user.email||'').replace(/[<>&\"']/g,'')}</small></div></div><div id="haClassInfo" class="ha-class-info" hidden></div><div class="ha-stats"><div class="ha-stat"><span>🪙</span><b id="haCoins">—</b><small>KatCoin</small></div><div class="ha-stat"><span>⚡</span><b id="haEnergy">0</b><small>Năng lượng</small></div><div class="ha-stat"><span>📚</span><b id="haWords">0</b><small>Từ vựng</small></div></div><button class="ha-menu" id="haProgress">◔ Tiến độ học tập</button><button class="ha-menu danger" id="haLogout">↪ Đăng xuất</button>`;
    trigger.onclick=()=>panel.hidden=!panel.hidden;
    panel.querySelector('#haProgress').onclick=()=>{panel.hidden=true;document.querySelector('[data-page="progress"]')?.click()};
    panel.querySelector('#haLogout').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='⏳ Đang đăng xuất...';try{await window.studyStore.signOut();location.reload()}catch(err){b.disabled=false;b.textContent='↪ Đăng xuất';alert('Không thể đăng xuất lúc này. Hãy thử lại nhé.')}};
    root.append(trigger,panel);return true;
  }
  function applyProfile(p){
    if(!p)return;
    const c=document.getElementById('haCoins'),en=document.getElementById('haEnergy'),w=document.getElementById('haWords'),ci=document.getElementById('haClassInfo');
    if(ci){
      const isClass=String(p.studentAccountType||'').toLowerCase()==='class';
      if(isClass){
        const cn=String(p.className||'').trim(),sn=String(p.schoolName||'').trim();
        ci.textContent='Học sinh'+(cn?' lớp '+cn:'')+(sn?' - Trường '+sn:'');
        ci.hidden=false;
      }else{ci.textContent='';ci.hidden=true}
    }
    if(c){
      const controller=window.katlearnCoinController;
      const liveValue=Number(controller?.value);
      const profileValue=Number(p.coins);
      if(controller?.ready&&Number.isFinite(liveValue))c.textContent=Math.max(0,Math.floor(liveValue)).toLocaleString('en-US');
      else if(Number.isFinite(profileValue))c.textContent=Math.max(0,Math.floor(profileValue)).toLocaleString('en-US');
      else c.textContent='—';
    }
    if(en)en.textContent=Number(p.energy||0).toLocaleString('en-US');
    if(w)w.textContent=Number(p.totalWords||0).toLocaleString('en-US');
  }
  async function hydrate(){
    render();
    if(!window.studyStore)return;
    if(!window.studyStore.connected()){
      try{await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG)}catch(e){console.warn('[KatLearn] Firebase auto-connect failed:',e?.message||e)}
    }
    render();
    if((window.studyStore?.user?.email||'').toLowerCase()===ADMIN_EMAIL){location.replace(ADMIN_HOME);return}
    // Profile data has one owner: auth-sync.js. Do not perform a second
    // Firestore read here, which can race the shared account-ready event.
    applyProfile(window.katlearnAccount?.profile||null);
  }
  window.addEventListener('katlearn-account-ready',e=>applyProfile(e.detail?.profile||null));
  window.addEventListener('katlearn-coin-balance',e=>{
    const value=Number(e.detail?.coins);
    if(!Number.isFinite(value))return;
    const coinEl=document.getElementById('haCoins');
    if(coinEl)coinEl.textContent=Math.max(0,value).toLocaleString('en-US');
  });
  window.addEventListener('8b1-auth-change',()=>{void hydrate()});
  document.addEventListener('click',e=>{const root=document.getElementById('homeAccount');if(root&&!root.contains(e.target)){root.querySelector('.ha-panel')?.setAttribute('hidden','')}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
