// KatLearn account auth: login + signup, with Student/Teacher role routing.
(function(){
  if(window.__KATLEARN_SIGNUP_LOADED)return;
  window.__KATLEARN_SIGNUP_LOADED=true;
  const TEACHER_URL='https://teacher-katlearn.netlify.app';
  const $=s=>document.querySelector(s);

  function boot(){
    const login=$('#loginBtn');
    if(!login) return;
    if(!login.dataset.katlearnAuthBound){
      login.dataset.katlearnAuthBound='1';
      login.addEventListener('click',openLogin);
    }
    if(!$('#signupBtn')){
      const btn=document.createElement('button');
      btn.type='button'; btn.id='signupBtn'; btn.className=login.className;
      btn.textContent='Đăng ký';
      login.parentNode.insertBefore(btn,login.nextSibling);
      btn.addEventListener('click',openSignup);
    }
    const logout=$('#logoutBtn');
    if(logout&&!logout.dataset.katlearnBound){
      logout.dataset.katlearnBound='1';
      logout.addEventListener('click',async()=>{try{await window.studyStore?.signOut();$('#accountPanel')?.setAttribute('hidden','')}catch(e){console.warn(e)}});
    }
    if(!window.__KATLEARN_AUTH_CHANGE_BOUND){
      window.__KATLEARN_AUTH_CHANGE_BOUND=true;
      window.addEventListener('8b1-auth-change',e=>renderAuth(e.detail));
    }
    if(window.studyStore?.user) renderAuth(window.studyStore.user);
  }

  window.openKatLearnLogin=openLogin;

  // Delegated fallback: even if another script replaces/rebuilds the header,
  // clicking the login button still opens the auth dialog.
  document.addEventListener('click',function(e){
    const btn=e.target?.closest?.('#loginBtn');
    if(btn){e.preventDefault();e.stopPropagation();openLogin();}
  },true);

  function openLogin(){
    let modal=$('#loginModal');
    if(modal){modal.classList.add('show');return;}
    modal=document.createElement('div');
    modal.id='loginModal'; modal.className='modal-overlay show';
    modal.innerHTML=`<div class="modal-card" style="max-width:520px">
      <button type="button" class="modal-close login-close">×</button>
      <p class="eyebrow">KATLEARN ACCOUNT</p><h2>Đăng nhập</h2>
      <p class="subtext">Đăng nhập để đồng bộ tiến độ, KatCoin và bộ từ vựng.</p>
      <button id="googleLogin" type="button" class="primary-btn" style="width:100%;margin:12px 0">🔵 Đăng nhập bằng Google</button>
      <div style="display:flex;align-items:center;gap:10px;margin:14px 0;color:#888"><span style="height:1px;background:#ddd;flex:1"></span>hoặc<span style="height:1px;background:#ddd;flex:1"></span></div>
      <form id="loginForm">
        <label style="display:block;margin:10px 0 6px;font-weight:700">Email</label>
        <input id="loginEmail" type="email" required autocomplete="email" placeholder="you@example.com" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd">
        <label style="display:block;margin:14px 0 6px;font-weight:700">Mật khẩu</label>
        <input id="loginPassword" type="password" required autocomplete="current-password" placeholder="Mật khẩu" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd">
        <button id="loginSubmit" type="submit" class="primary-btn" style="width:100%;margin-top:18px">Đăng nhập →</button>
        <p id="loginStatus" style="min-height:24px;margin:10px 0 0"></p>
      </form>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.login-close').onclick=()=>modal.classList.remove('show');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
    modal.querySelector('#googleLogin').onclick=async()=>{
      const status=modal.querySelector('#loginStatus');
      try{await ensureFirebase();await window.studyStore.signIn('google');modal.classList.remove('show')}
      catch(err){status.textContent='❌ '+(err?.message||'Không thể đăng nhập Google.')}
    };
    modal.querySelector('#loginForm').onsubmit=submitLogin;
  }

  function openSignup(){
    let modal=$('#signupModal');
    if(modal){modal.classList.add('show');return;}
    modal=document.createElement('div'); modal.id='signupModal'; modal.className='modal-overlay show';
    modal.innerHTML=`<div class="modal-card" style="max-width:520px"><button type="button" class="modal-close signup-close">×</button><p class="eyebrow">KATLEARN ACCOUNT</p><h2>Đăng ký tài khoản</h2><p class="subtext">Chọn đúng vai trò để KatLearn đưa bạn đến đúng nơi.</p><form id="signupForm"><label style="display:block;margin:14px 0 6px;font-weight:700">Họ và tên</label><input id="signupName" required maxlength="80" placeholder="Nguyễn Văn A" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd"><label style="display:block;margin:14px 0 6px;font-weight:700">Email</label><input id="signupEmail" type="email" required autocomplete="email" placeholder="you@example.com" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd"><label style="display:block;margin:14px 0 6px;font-weight:700">Mật khẩu</label><input id="signupPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Ít nhất 6 ký tự" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd"><label style="display:block;margin:14px 0 8px;font-weight:700">Bạn là</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label style="cursor:pointer;border:1px solid #ddd;border-radius:14px;padding:14px"><input type="radio" name="signupRole" value="student" checked> 🎒 Học sinh</label><label style="cursor:pointer;border:1px solid #ddd;border-radius:14px;padding:14px"><input type="radio" name="signupRole" value="teacher"> 🧑‍🏫 Giáo viên</label></div><button id="signupSubmit" type="submit" class="primary-btn" style="width:100%;margin-top:18px">Tạo tài khoản →</button><p id="signupStatus" style="min-height:24px;margin:10px 0 0"></p></form></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.signup-close').onclick=()=>modal.classList.remove('show');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
    modal.querySelector('#signupForm').onsubmit=submitSignup;
  }

  async function ensureFirebase(){
    if(window.studyStore?.connected())return;
    if(!window.studyStore?.connect)throw new Error('Firebase chưa được tải.');
    await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG);
  }

  async function submitLogin(e){
    e.preventDefault(); const form=e.currentTarget;
    const email=form.querySelector('#loginEmail').value.trim().toLowerCase(),password=form.querySelector('#loginPassword').value,status=form.querySelector('#loginStatus'),submit=form.querySelector('#loginSubmit');
    submit.disabled=true;status.textContent='⏳ Đang đăng nhập...';
    try{await ensureFirebase();await window.studyStore.signInEmail(email,password,false);status.textContent='✓ Đăng nhập thành công!';setTimeout(()=>$('#loginModal')?.classList.remove('show'),400)}
    catch(err){status.textContent='❌ '+(err?.message||'Email hoặc mật khẩu không đúng.');submit.disabled=false}
  }

  async function submitSignup(e){
    e.preventDefault(); const form=e.currentTarget;
    const name=form.querySelector('#signupName').value.trim(),email=form.querySelector('#signupEmail').value.trim().toLowerCase(),password=form.querySelector('#signupPassword').value,role=form.querySelector('input[name="signupRole"]:checked')?.value||'student',status=form.querySelector('#signupStatus'),submit=form.querySelector('#signupSubmit');
    submit.disabled=true;status.textContent='⏳ Đang tạo tài khoản...';
    try{await ensureFirebase();await window.studyStore.signInEmail(email,password,true);await window.studyStore.saveProfile({displayName:name,role,email});status.textContent=role==='teacher'?'✓ Tài khoản giáo viên đã được tạo. Đang chuyển...':'✓ Tạo tài khoản thành công!';setTimeout(()=>{if(role==='teacher')location.href=TEACHER_URL;else location.reload()},500)}
    catch(err){status.textContent='❌ '+(err?.message||'Không thể tạo tài khoản.');submit.disabled=false}
  }

  function renderAuth(user){
    const login=$('#loginBtn'),trigger=$('#accountTrigger'); if(!login||!trigger)return;
    if(user){login.hidden=true;trigger.hidden=false;const name=user.displayName||user.email?.split('@')[0]||'Tài khoản';['#accountName','#panelName'].forEach(s=>$(s)&&($(s).textContent=name));if($('#panelEmail'))$('#panelEmail').textContent=user.email||'';const initial=name.trim().charAt(0).toUpperCase()||'K';['#accountAvatar','#panelAvatar'].forEach(s=>$(s)&&($(s).textContent=initial));if(!trigger.dataset.bound){trigger.dataset.bound='1';trigger.onclick=()=>$('#accountPanel').hidden=!$('#accountPanel').hidden}}
    else{login.hidden=false;trigger.hidden=true;if($('#accountPanel'))$('#accountPanel').hidden=true}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
