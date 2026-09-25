(function(){
function readJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value==null?fallback:value}catch(_){return fallback}}
function accountUi(profile={}){
  const user=window.studyStore?.user;
  const login=document.querySelector('#loginBtn'),trigger=document.querySelector('#accountTrigger'),panel=document.querySelector('#accountPanel');
  if(!user){if(login)login.hidden=false;if(trigger)trigger.hidden=true;if(panel)panel.hidden=true;return}
  const name=user.displayName||user.email?.split('@')[0]||'KatLearn Student';
  if(login)login.hidden=true;if(trigger)trigger.hidden=false;
  const initial=(name.trim()[0]||'K').toUpperCase();
  ['#accountAvatar','#panelAvatar'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.textContent=initial});
  const accountName=document.querySelector('#accountName'),panelName=document.querySelector('#panelName'),email=document.querySelector('#panelEmail');
  if(accountName)accountName.textContent=name;if(panelName)panelName.textContent=name;if(email)email.textContent=user.email||'';
  const stats=document.querySelector('.account-stats');
  if(stats){
    const small=stats.querySelectorAll('small'),values=stats.querySelectorAll('b'),icons=stats.querySelectorAll('span');
    if(small[0])small[0].textContent='KatCoin';if(small[1])small[1].textContent='Tiến độ';if(small[2])small[2].textContent='Số pack từ vựng';
    if(icons[0])icons[0].textContent='🪙';if(icons[1])icons[1].textContent='📈';if(icons[2])icons[2].textContent='📚';
    const vocab=Array.isArray(profile.vocab)?profile.vocab:readJson('katlearn-vocab',[]);
    const total=Number(profile.totalWords??vocab.length),known=Number(profile.knownWords||0);
    const progress=Number.isFinite(Number(profile.progress))?Math.max(0,Math.min(100,Number(profile.progress))):(total?Math.min(100,Math.round(known/total*100)):0);
    const packs=Number(profile.packCount??profile.totalPacks??(Array.isArray(profile.ownedPacks)?profile.ownedPacks.length:(vocab.length?1:0)));
    if(values[0])values[0].textContent=Number(profile.coins||0).toLocaleString('en-US');
    if(values[1])values[1].textContent=progress+'%';
    if(values[2])values[2].textContent=packs.toLocaleString('en-US');
  }
  if(trigger&&trigger.dataset.accountPanelBound!=='1'){
    trigger.dataset.accountPanelBound='1';let hoverTimer=null;
    const open=()=>{clearTimeout(hoverTimer);if(panel)panel.hidden=false};
    const close=()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(panel)panel.hidden=true},180)};
    trigger.addEventListener('mouseenter',open);trigger.addEventListener('mouseleave',close);
    if(panel){panel.addEventListener('mouseenter',open);panel.addEventListener('mouseleave',close)}
    trigger.addEventListener('click',()=>{if(panel)panel.hidden=!panel.hidden});
  }
  const logout=document.querySelector('#logoutBtn');
  if(logout&&logout.dataset.accountBound!=='1'){
    logout.dataset.accountBound='1';
    logout.onclick=async event=>{
      event.preventDefault();
      if(logout.disabled)return;
      logout.disabled=true;
      const oldText=logout.textContent;
      logout.textContent='⏳ Đang đăng xuất...';
      try{
        if(window.studyStore?.signOut)await window.studyStore.signOut();
        localStorage.removeItem('katlearn-pending-profile');
        sessionStorage.removeItem('katlearn-login-toast');
        if(panel)panel.hidden=true;
        if(login)login.hidden=false;
        if(trigger)trigger.hidden=true;
        location.replace('/login.html');
      }catch(error){
        console.error('[KatLearn] Logout failed:',error);
        logout.disabled=false;
        logout.textContent=oldText;
        const t=document.querySelector('#toast');
        if(t){t.textContent='❌ Đăng xuất thất bại. Hãy thử lại nhé.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
      }
    };
  }
}
function currentVocabSource(){
  try{return JSON.parse(localStorage.getItem('katlearn-vocab-source')||'null')||{kind:'legacy'}}
  catch(_){return{kind:'legacy'}}
}
function preservesRemoteVocab(){
  return ['core','public','assigned'].includes(String(currentVocabSource().kind||''));
}
function patch(){
  if(!window.studyStore||window.studyStore.__guarded)return;
  const old=window.studyStore.saveProfile.bind(window.studyStore);
  window.studyStore.saveProfile=async data=>{
    const uid=String(window.studyStore?.user?.uid||'');
    if(!uid)return null;
    if(window.KATLEARN_HYDRATION)await window.KATLEARN_HYDRATION.catch(()=>{});
    if(String(window.studyStore?.user?.uid||'')!==uid)return null;
    const vocab=readJson('katlearn-vocab',[]),owned=readJson('katlearn-owned-themes',[]);
    const preserveVocab=preservesRemoteVocab();
    let payload={...data,ownedThemes:owned};
    if(!preserveVocab)Object.assign(payload,{vocab,totalWords:vocab.length});
    if(String(window.studyStore?.user?.uid||'')!==uid)return null;
    const result=await old(payload);
    if(String(window.studyStore?.user?.uid||'')===uid)accountUi(payload);
    return result;
  };
  window.studyStore.__guarded=true;
}
function successToast(){
  if(!window.studyStore?.user)return;
  const fromAuth=/\/(?:login|signup)\.html(?:[?#]|$)/i.test(document.referrer);
  if(!fromAuth||sessionStorage.getItem('katlearn-login-toast')==='1')return;
  sessionStorage.setItem('katlearn-login-toast','1');
  setTimeout(()=>{const t=document.querySelector('#toast');if(!t)return;const name=window.studyStore.user.displayName||window.studyStore.user.email?.split('@')[0]||'bạn';t.textContent=`🎉 Đăng nhập thành công! Chào mừng ${name} 🐱`;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)},250)
}
async function load(){
  if(!window.studyStore?.user){accountUi();return}
  patch();
  window.KATLEARN_HYDRATION=(async()=>{
    const p=await window.studyStore.loadProfile();
    if(p){
      if(!preservesRemoteVocab())localStorage.setItem('katlearn-vocab',JSON.stringify(Array.isArray(p.vocab)?p.vocab:[]));
      localStorage.setItem('katlearn-owned-themes',JSON.stringify(Array.isArray(p.ownedThemes)?p.ownedThemes:[]));
      if(p.themeId)localStorage.setItem('katlearn-theme',p.themeId);else localStorage.removeItem('katlearn-theme');
      accountUi(p);successToast();setTimeout(()=>accountUi(p),100)
    }else accountUi({})
  })();
  try{await window.KATLEARN_HYDRATION}catch(e){accountUi()}
  finally{window.KATLEARN_HYDRATION=null}
}
window.addEventListener('8b1-auth-change',()=>{patch();load()});
document.addEventListener('DOMContentLoaded',()=>{patch();load()},{once:true});
})();