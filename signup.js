// KatLearn account UI: classic popup login + signup.
(function(){
  if(window.__KATLEARN_AUTH_UI_LOADED)return;
  window.__KATLEARN_AUTH_UI_LOADED=true;
  const TEACHER_URL='https://teacher-katlearn.netlify.app';
  const $=s=>document.querySelector(s);

  function styles(){
    if($('#katlearnAuthStyles'))return;
    const s=document.createElement('style');s.id='katlearnAuthStyles';s.textContent=`
      .kat-auth-overlay{position:fixed;inset:0;background:#1f233055;display:flex;align-items:center;justify-content:center;padding:16px;z-index:10000;backdrop-filter:blur(3px)}
      .login-box{background:#fff;border-radius:20px;padding:31px;width:min(360px,calc(100vw - 32px));box-shadow:0 20px 50px #1f233055;text-align:center;position:relative;box-sizing:border-box}
      .login-logo{width:42px;height:42px;background:linear-gradient(135deg,#8d7dff,#5d4fea);border-radius:13px;display:grid;place-items:center;color:#fff;font:700 24px Fredoka;margin:0 auto 12px}
      .login-box h2{font:700 23px Fredoka;margin:0 0 7px}.login-box p{font-size:11px;line-height:1.5;color:#8290a3;margin-bottom:19px}
      .oauth-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:9px;padding:11px;margin:9px 0;border:1px solid #e3e6ed;background:#fff;color:#38455a;font:600 12px 'Be Vietnam Pro';cursor:pointer;box-sizing:border-box}
      .oauth-btn:hover{background:#f9f9ff;border-color:#a69cff}.oauth-btn.google b{font:700 18px Arial;color:#4285f4}.oauth-btn.apple{background:#1c1d23;border-color:#1c1d23;color:#fff}.oauth-btn.apple b{font-size:18px}
      .email-login input{width:100%;border:1px solid #e3e6ed;border-radius:8px;background:#fbfcff;padding:10px;margin:5px 0;font:500 11px 'Be Vietnam Pro';outline:0;box-sizing:border-box}.email-login input:focus{border-color:#f08a9b;box-shadow:0 0 0 3px #fff0f3}
      .oauth-btn.email{background:#f47c93;color:#fff;border-color:#f47c93}.text-auth-btn{border:0;background:none;color:#dc6b80;font:600 10px 'Be Vietnam Pro';cursor:pointer;padding:4px}.or-divider{display:flex;align-items:center;gap:8px;color:#a6aebb;font-size:9px;margin:11px 0}.or-divider:before,.or-divider:after{content:'';height:1px;background:#e8ebf0;flex:1}
      .kat-close{position:absolute;right:12px;top:10px;border:0;background:none;font-size:24px;color:#a1aaba;cursor:pointer}.kat-status{min-height:18px;font-size:10px;color:#e06b79;margin:8px 0 0}.kat-role{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.kat-role label{border:1px solid #e3e6ed;border-radius:9px;padding:10px;font-size:10px;cursor:pointer}.kat-role label:has(input:checked){border-color:#f47c93;background:#fff4f6}
    `;document.head.appendChild(s);
  }
  function overlay(id,html){let m=$('#'+id);if(m){m.style.display='flex';return m}m=document.createElement('div');m.id=id;m.className='kat-auth-overlay';m.innerHTML=html;document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)m.remove()});return m}
  async function ensureFirebase(){if(window.studyStore?.connected())return;if(!window.studyStore?.connect)throw new Error('Firebase chưa được tải.');await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG)}

  function openLogin(){
    styles();const m=overlay('loginModal',`<div class="login-box"><button class="kat-close" type="button">×</button><div class="login-logo">K</div><h2>Chào mừng trở lại!</h2><p>Đăng nhập để đồng bộ tiến độ học tập, KatCoin và bộ từ vựng.</p><button class="oauth-btn google" id="katGoogle"><b>G</b> Đăng nhập bằng Google</button><button class="oauth-btn apple" id="katApple"><b>●</b> Đăng nhập bằng Apple</button><div class="or-divider">hoặc</div><div class="email-login"><input id="katEmail" type="email" placeholder="Email" autocomplete="email"><input id="katPass" type="password" placeholder="Mật khẩu" autocomplete="current-password"><button class="oauth-btn email" id="katEmailLogin">Đăng nhập bằng Email</button></div><button class="text-auth-btn" id="katGoSignup">Chưa có tài khoản? Đăng ký ngay</button><div class="kat-status" id="katLoginStatus"></div></div>`);
    m.querySelector('.kat-close').onclick=()=>m.remove();m.querySelector('#katGoSignup').onclick=()=>location.href='signup.html';
    const status=m.querySelector('#katLoginStatus');
    m.querySelector('#katGoogle').onclick=()=>doProvider('google',status,m);m.querySelector('#katApple').onclick=()=>doProvider('apple',status,m);m.querySelector('#katEmailLogin').onclick=()=>doEmail(status,m);
  }
  async function doProvider(provider,status,m){try{status.textContent='⏳ Đang đăng nhập...';await ensureFirebase();await window.studyStore.signIn(provider);m.remove()}catch(e){status.textContent='❌ '+(e?.message||'Không thể đăng nhập.')}}
  async function doEmail(status,m){const email=$('#katEmail').value.trim().toLowerCase(),pass=$('#katPass').value;if(!email||!pass){status.textContent='❌ Nhập email và mật khẩu nhé.';return}try{status.textContent='⏳ Đang đăng nhập...';await ensureFirebase();await window.studyStore.signInEmail(email,pass,false);m.remove()}catch(e){status.textContent='❌ '+(e?.message||'Email hoặc mật khẩu không đúng.')}}

  function openSignup(){location.href='signup.html'}

  function renderAuth(user){const login=$('#loginBtn'),trigger=$('#accountTrigger');if(!login)return;if(user){login.hidden=true;if(trigger){trigger.hidden=false;const name=user.displayName||user.email?.split('@')[0]||'Tài khoản';['#accountName','#panelName'].forEach(s=>$(s)&&($(s).textContent=name));if($('#panelEmail'))$('#panelEmail').textContent=user.email||'';const initial=name.trim().charAt(0).toUpperCase()||'K';['#accountAvatar','#panelAvatar'].forEach(s=>$(s)&&($(s).textContent=initial));if(!trigger.dataset.bound){trigger.dataset.bound='1';trigger.onclick=()=>$('#accountPanel')&&($('#accountPanel').hidden=!$('#accountPanel').hidden)}}}else{login.hidden=false;if(trigger)trigger.hidden=true}}
  function boot(){
    const login=$('#loginBtn');
    if(!login)return;
    login.onclick=e=>{e.preventDefault();location.href='login.html'};
    if(!$('#signupBtn')){const b=document.createElement('button');b.type='button';b.id='signupBtn';b.className=login.className;b.textContent='Đăng ký';login.parentNode.insertBefore(b,login.nextSibling);b.onclick=e=>{e.preventDefault();location.href='signup.html'}}
    const logout=$('#logoutBtn');if(logout&&!logout.dataset.katlearnBound){logout.dataset.katlearnBound='1';logout.onclick=async()=>{try{await window.studyStore?.signOut()}catch(e){console.warn(e)}}}
    window.addEventListener('8b1-auth-change',e=>renderAuth(e.detail));
    if(window.studyStore?.user)renderAuth(window.studyStore.user)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
