// KatLearn account signup: choose Student or Teacher. Teachers are redirected to the teacher portal.
(function(){
  const TEACHER_URL='https://teacher-katlearn.netlify.app';
  const $=s=>document.querySelector(s);

  function boot(){
    const login=$('#loginBtn');
    if(!login||$('#signupBtn')) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.id='signupBtn'; btn.className=login.className;
    btn.textContent='Đăng ký';
    login.parentNode.insertBefore(btn,login.nextSibling);
    btn.onclick=openSignup;
  }

  function openSignup(){
    if($('#signupModal')) return $('#signupModal').classList.add('show');
    const modal=document.createElement('div');
    modal.id='signupModal'; modal.className='modal-overlay show';
    modal.innerHTML=`<div class="modal-card" style="max-width:520px">
      <button type="button" class="modal-close signup-close">×</button>
      <p class="eyebrow">KATLEARN ACCOUNT</p>
      <h2>Đăng ký tài khoản</h2>
      <p class="subtext">Chọn đúng vai trò để KatLearn đưa bạn đến đúng nơi.</p>
      <form id="signupForm">
        <label style="display:block;margin:14px 0 6px;font-weight:700">Họ và tên</label>
        <input id="signupName" required maxlength="80" placeholder="Nguyễn Văn A" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd">
        <label style="display:block;margin:14px 0 6px;font-weight:700">Email</label>
        <input id="signupEmail" type="email" required autocomplete="email" placeholder="you@example.com" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd">
        <label style="display:block;margin:14px 0 6px;font-weight:700">Mật khẩu</label>
        <input id="signupPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Ít nhất 6 ký tự" style="width:100%;padding:12px;border-radius:12px;border:1px solid #ddd">
        <label style="display:block;margin:14px 0 8px;font-weight:700">Bạn là</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="signup-role" style="cursor:pointer;border:1px solid #ddd;border-radius:14px;padding:14px"><input type="radio" name="signupRole" value="student" checked> 🎒 Học sinh</label>
          <label class="signup-role" style="cursor:pointer;border:1px solid #ddd;border-radius:14px;padding:14px"><input type="radio" name="signupRole" value="teacher"> 🧑‍🏫 Giáo viên</label>
        </div>
        <button id="signupSubmit" type="submit" class="primary-btn" style="width:100%;margin-top:18px">Tạo tài khoản →</button>
        <p id="signupStatus" style="min-height:24px;margin:10px 0 0"></p>
      </form>
    </div>`;
    document.body.appendChild(modal);
    $('.signup-close').onclick=()=>modal.classList.remove('show');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
    $('#signupForm').onsubmit=submitSignup;
  }

  async function ensureFirebase(){
    if(window.studyStore?.connected()) return;
    if(!window.studyStore?.connect) throw new Error('Firebase chưa được tải.');
    await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG);
  }

  async function submitSignup(e){
    e.preventDefault();
    const name=$('#signupName').value.trim(), email=$('#signupEmail').value.trim().toLowerCase(), password=$('#signupPassword').value, role=document.querySelector('input[name="signupRole"]:checked')?.value||'student';
    const status=$('#signupStatus'), submit=$('#signupSubmit');
    if(!name) return;
    submit.disabled=true; status.textContent='⏳ Đang tạo tài khoản...';
    try{
      await ensureFirebase();
      await window.studyStore.signInEmail(email,password,true);
      await window.studyStore.saveProfile({displayName:name,role,email});
      status.textContent='✓ Tạo tài khoản thành công!';
      if(role==='teacher'){
        status.textContent='✓ Tài khoản giáo viên đã được tạo. Đang chuyển sang KatLearn For Teachers...';
        setTimeout(()=>{location.href=TEACHER_URL},500);
      }else{
        setTimeout(()=>location.reload(),500);
      }
    }catch(err){
      status.textContent='❌ '+(err?.message||'Không thể tạo tài khoản.');
      submit.disabled=false;
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
