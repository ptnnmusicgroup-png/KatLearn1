/* KatLearn Home account UI: Firebase session is the source of truth. */
(function(){
  const LOGIN='/login.html', SIGNUP='/signup.html';
  const css=`#homeAccount{position:relative;display:flex;align-items:center;gap:8px;font-family:'Be Vietnam Pro',sans-serif}#homeAccount .ha-btn{height:38px;padding:0 12px;border:1px solid #e6e8ef;border-radius:10px;background:#fff;color:#4b5b70;font:700 11px 'Be Vietnam Pro';cursor:pointer;box-shadow:0 2px 7px rgba(50,55,75,.06)}#homeAccount .ha-signup{background:#ff8a73;color:#fff;border-color:#ff8a73}#homeAccount .ha-user{display:flex;align-items:center;gap:7px;height:42px;padding:0 9px;border:1px solid #e6e8ef;border-radius:11px;background:#fff;color:#4b5b70;font:700 11px 'Be Vietnam Pro';cursor:pointer;box-shadow:0 2px 7px rgba(50,55,75,.06)}#homeAccount .ha-avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ffad71,#f47691);font-size:11px}#homeAccount .ha-panel{position:absolute;right:0;top:48px;width:285px;background:#fff;border:1px solid #ececf4;border-radius:14px;padding:15px;box-shadow:0 17px 35px rgba(48,55,87,.18);z-index:50;text-align:left}#homeAccount .ha-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}#homeAccount .ha-avatar.large{width:42px;height:42px;font-size:16px;flex:none}#homeAccount .ha-head b{display:block;color:#27344a;font-size:13px}#homeAccount .ha-head small{display:block;color:#8b95a7;font-size:10px;margin-top:3px;max-width:205px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#homeAccount .ha-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0 12px}#homeAccount .ha-stat{padding:9px 5px;background:#f8f9fc;border-radius:10px;text-align:center}#homeAccount .ha-stat span{display:block;font-size:15px}#homeAccount .ha-stat b{display:block;color:#27344a;font-size:13px;margin-top:2px}#homeAccount .ha-stat small{display:block;color:#8b95a7;font-size:8px;margin-top:2px}#homeAccount .ha-menu{width:100%;border:0;background:#f7f8fb;border-radius:9px;padding:10px;text-align:left;color:#536177;font:700 10px 'Be Vietnam Pro';cursor:pointer;margin-top:5px}#homeAccount .ha-menu:hover{background:#eef1f7}#homeAccount .ha-menu.danger{color:#df625e;background:#fff1f0}#homeAccount[hidden]{display:none!important}`;
  function injectStyle(){if(document.getElementById('home-account-style'))return;const s=document.createElement('style');s.id='home-account-style';s.textContent=css;document.head.appendChild(s)}
  function el(tag,attrs={},html=''){const x=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')x.className=v;else if(k==='text')x.textContent=v;else x.setAttribute(k,v)});x.innerHTML=html;return x}
  function render(){
    const actions=document.querySelector('.top-actions'); if(!actions)return false;
    injectStyle();
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
    panel.innerHTML=`<div class="ha-head"><span class="ha-avatar large">${initial}</span><div><b>${name.replace(/[<>&\"']/g,'')}</b><small>${(user.email||'').replace(/[<>&\"']/g,'')}</small></div></div><div class="ha-stats"><div class="ha-stat"><span>🪙</span><b id="haCoins">0</b><small>KatCoin</small></div><div class="ha-stat"><span>⚡</span><b id="haEnergy">0</b><small>Năng lượng</small></div><div class="ha-stat"><span>📚</span><b id="haWords">0</b><small>Từ vựng</small></div></div><button class="ha-menu" id="haProgress">◔ Tiến độ học tập</button><button class="ha-menu danger" id="haLogout">↪ Đăng xuất</button>`;
    trigger.onclick=()=>panel.hidden=!panel.hidden;
    panel.querySelector('#haProgress').onclick=()=>{panel.hidden=true;document.querySelector('[data-page="progress"]')?.click()};
    panel.querySelector('#haLogout').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='⏳ Đang đăng xuất...';try{await window.studyStore.signOut();location.reload()}catch(err){b.disabled=false;b.textContent='↪ Đăng xuất';alert('Không thể đăng xuất lúc này. Hãy thử lại nhé.')}};
    root.append(trigger,panel);return true;
  }
  async function hydrate(){
    render();
    if(!window.studyStore)return;
    if(!window.studyStore.connected()){
      try{await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG)}catch(e){console.warn('[KatLearn] Firebase auto-connect failed:',e?.message||e)}
    }
    render();
    try{const p=await window.studyStore.loadProfile();if(p){const c=document.getElementById('haCoins'),en=document.getElementById('haEnergy'),w=document.getElementById('haWords');if(c)c.textContent=Number(p.coins||0).toLocaleString('en-US');if(en)en.textContent=Number(p.energy||0).toLocaleString('en-US');if(w)w.textContent=Number(p.totalWords||0).toLocaleString('en-US')}}catch(e){}
  }
  window.addEventListener('8b1-auth-change',()=>{setTimeout(render,0)});
  document.addEventListener('click',e=>{const root=document.getElementById('homeAccount');if(root&&!root.contains(e.target)){root.querySelector('.ha-panel')?.setAttribute('hidden','')}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
