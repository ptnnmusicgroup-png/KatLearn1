(function(){
function patch(){if(!window.studyStore||window.studyStore.__guarded)return;const old=window.studyStore.saveProfile.bind(window.studyStore);window.studyStore.saveProfile=async data=>{if(window.KATLEARN_HYDRATION)await window.KATLEARN_HYDRATION.catch(()=>{});const vocab=JSON.parse(localStorage.getItem('katlearn-vocab')||'[]'),owned=JSON.parse(localStorage.getItem('katlearn-owned-themes')||'[]');let payload={...data,vocab,totalWords:vocab.length,ownedThemes:owned};if(window.KATLEARN_PRESERVE_REMOTE_STATE){delete payload.coins;delete payload.energy;delete payload.knownWords;delete payload.totalWords;window.KATLEARN_PRESERVE_REMOTE_STATE=false}return old(payload)};window.studyStore.__guarded=true}
function accountUi(profile){
  const user=window.studyStore?.user;if(!user)return;
  const name=user.displayName||user.email?.split('@')[0]||'KatLearn Student';
  const login=document.querySelector('#loginBtn'),trigger=document.querySelector('#accountTrigger'),panel=document.querySelector('#accountPanel');
  if(login)login.hidden=true;if(trigger)trigger.hidden=false;
  const accountName=document.querySelector('#accountName'),panelName=document.querySelector('#panelName'),email=document.querySelector('#panelEmail');
  if(accountName)accountName.textContent=name;if(panelName)panelName.textContent=name;if(email)email.textContent=user.email||'';
  const initials=(name.trim()[0]||'K').toUpperCase();
  ['#accountAvatar','#panelAvatar'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.textContent=initials});
  const stats=document.querySelectorAll('.account-stats');if(!stats.length)return;
  const box=stats[0],small=box.querySelectorAll('small'),values=box.querySelectorAll('b'),icons=box.querySelectorAll('span');
  if(small[0])small[0].textContent='KatCoin';if(small[1])small[1].textContent='Tiến độ';if(small[2])small[2].textContent='Số pack từ vựng';
  if(icons[0])icons[0].textContent='🪙';if(icons[1])icons[1].textContent='📈';if(icons[2])icons[2].textContent='📚';
  const coins=Number(profile?.coins||0),total=Array.isArray(profile?.vocab)?profile.vocab.length:Number(profile?.totalWords||0),known=Number(profile?.knownWords||0),progress=total?Math.min(100,Math.round(known/total*100)):0;
  const packs=Number(profile?.packCount??profile?.totalPacks??(Array.isArray(profile?.ownedPacks)?profile.ownedPacks.length:(Array.isArray(profile?.vocab)&&profile.vocab.length?1:0)));
  if(values[0])values[0].textContent=coins.toLocaleString('en-US');if(values[1])values[1].textContent=progress+'%';if(values[2])values[2].textContent=packs.toLocaleString('en-US');
  if(trigger&&trigger.dataset.accountPanelBound!=='1'){
    trigger.dataset.accountPanelBound='1';
    let hoverTimer=null;
    const open=()=>{clearTimeout(hoverTimer);if(panel)panel.hidden=false};
    const close=()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(panel)panel.hidden=true},180)};
    trigger.addEventListener('mouseenter',open);trigger.addEventListener('mouseleave',close);
    if(panel){panel.addEventListener('mouseenter',open);panel.addEventListener('mouseleave',close)}
    trigger.addEventListener('click',()=>{if(panel)panel.hidden=!panel.hidden});
  }
}
function successToast(){if(!window.studyStore?.user)return;const fromAuth=/\/(?:login|signup)\.html(?:[?#]|$)/i.test(document.referrer);if(!fromAuth||sessionStorage.getItem('katlearn-login-toast')==='1')return;sessionStorage.setItem('katlearn-login-toast','1');setTimeout(()=>{const t=document.querySelector('#toast');if(!t)return;const name=window.studyStore.user.displayName||window.studyStore.user.email?.split('@')[0]||'bạn';t.textContent=`🎉 Đăng nhập thành công! Chào mừng ${name} 🐱`;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)},250)}
async function load(){if(!window.studyStore?.user)return;patch();window.KATLEARN_HYDRATION=(async()=>{const p=await window.studyStore.loadProfile();if(p){window.KATLEARN_PRESERVE_REMOTE_STATE=true;localStorage.setItem('katlearn-vocab',JSON.stringify(Array.isArray(p.vocab)?p.vocab:[]));localStorage.setItem('katlearn-owned-themes',JSON.stringify(Array.isArray(p.ownedThemes)?p.ownedThemes:[]));if(p.themeId)localStorage.setItem('katlearn-theme',p.themeId);else localStorage.removeItem('katlearn-theme');accountUi(p);successToast();setTimeout(()=>accountUi(p),100)}})();try{await window.KATLEARN_HYDRATION}catch(e){}finally{window.KATLEARN_HYDRATION=null}}
window.addEventListener('8b1-auth-change',load);document.addEventListener('DOMContentLoaded',()=>{patch();if(window.studyStore?.user)load()},{once:true});
})();