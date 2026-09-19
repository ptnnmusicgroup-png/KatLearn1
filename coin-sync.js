// Per-account coin sync: Firebase is the source of truth for each signed-in user's balance.
(function(){
  let cloudCoins=0,uid=null,ready=false;
  const $=s=>document.querySelector(s),fmt=n=>Number(n||0).toLocaleString('en-US');
  function paint(){['#coinCount','#shopCoins','#panelCoins'].forEach(s=>{const el=$(s);if(el)el.textContent=fmt(cloudCoins)})}
  async function load(){if(!window.studyStore?.connected()||!window.studyStore.user)return;uid=window.studyStore.userId;try{const profile=await window.studyStore.loadProfile();cloudCoins=Math.max(0,Number(profile?.coins||0));ready=true;paint();window.dispatchEvent(new CustomEvent('katlearn-coins-ready',{detail:{uid,coins:cloudCoins}}))}catch(e){console.warn('[KatLearn coins]',e)}}
  async function persist(){if(!ready||!window.studyStore?.user||window.studyStore.userId!==uid)return;try{await window.studyStore.saveProfile({coins:cloudCoins,__coinsAuthoritative:true});paint()}catch(e){console.warn('[KatLearn coins sync]',e)}}
  function boot(){window.addEventListener('8b1-auth-change',()=>setTimeout(load,80));if(window.studyStore?.user)setTimeout(load,80)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
