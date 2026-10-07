// Per-account KatCoin display sync. Firestore/server remains the only source of truth.
(function(){
  let cloudCoins=0,uid=null,ready=false,loadPromise=null;
  const $=s=>document.querySelector(s),fmt=n=>Number(n||0).toLocaleString('en-US');
  function paint(){
    ['#coinCount','#shopCoins','#panelCoins','#haCoins'].forEach(s=>{const el=$(s);if(el)el.textContent=fmt(cloudCoins)});
    const box=$('#shopCoinBalance');if(box)box.dataset.ready=ready?'1':'0';
  }
  async function load(profileHint=null){
    const user=window.studyStore?.user;if(!user)return false;
    const nextUid=String(user.uid||'');if(uid!==nextUid){uid=nextUid;ready=false;}
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      try{
        const profile=profileHint&&typeof profileHint==='object'
          ?profileHint
          :await window.studyStore.loadProfile();
        if(String(window.studyStore?.user?.uid||'')!==nextUid)return false;
        cloudCoins=Math.max(0,Number(profile?.coins||0));
        ready=true;paint();
        window.dispatchEvent(new CustomEvent('katlearn-coins-ready',{detail:{uid:nextUid,coins:cloudCoins}}));
        return true;
      }catch(e){console.warn('[KatLearn coins]',e);return false}
      finally{loadPromise=null}
    })();
    return loadPromise;
  }
  window.addEventListener('katlearn-account-ready',e=>{
    if(e.detail?.account&&e.detail?.user)void load(e.detail.profile||null);
  });
  window.addEventListener('katlearn-coin-balance',e=>{
    const value=Number(e.detail?.coins);if(!Number.isFinite(value))return;
    cloudCoins=Math.max(0,value);ready=true;paint();
  });
  window.addEventListener('8b1-auth-change',e=>{
    if(e.detail)void load();
    else{cloudCoins=0;uid=null;ready=false;paint();}
  });
  function boot(){
    paint();
    if(window.studyStore?.user)void load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();