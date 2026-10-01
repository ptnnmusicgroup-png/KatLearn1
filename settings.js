(function(){
  const $=s=>document.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const toast=msg=>{const el=$('#settingsToast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(window.__settingsToast);window.__settingsToast=setTimeout(()=>el.classList.remove('show'),2800)};
  const updatePreview=(user)=>{
    if(!user)return;
    const name=user.displayName||user.email?.split('@')[0]||'KatLearn Student';
    const avatar=$('#settingsAvatar');$('#settingsName').textContent=name;$('#settingsEmail').textContent=user.email||'';
    avatar.textContent=(name.trim()[0]||'K').toUpperCase();
    if(user.photoURL){avatar.style.backgroundImage='url("'+safe(user.photoURL)+'")';avatar.style.color='transparent'}
    else{avatar.style.backgroundImage='';avatar.style.color=''}
  };
  async function boot(){
    try{
      await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG);
      const user=await window.studyStore.waitForAuth();
      if(!user)return;
      $('#settingsMain').hidden=false;$('#settingsLocked').hidden=true;
      updatePreview(user);
      $('#accountDisplayName').value=user.displayName||user.email?.split('@')[0]||'';
      $('#accountPhotoURL').value=user.photoURL||'';
      $('#accountEmail').value=user.email||'';
      try{
        const profile=await window.studyStore.loadProfile();
        $('#accountInfoCode').textContent=String(profile?.accountCode||'Chưa có mã');
      }catch(_){$('#accountInfoCode').textContent='Chưa có mã'}
    }catch(error){
      $('#settingsLocked').hidden=false;toast('Không thể kết nối tài khoản: '+(error.message||'Lỗi không xác định'));
    }
  }
  $('#accountInfoForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=$('#accountInfoSave'),status=$('#accountInfoStatus');
    const displayName=$('#accountDisplayName').value.trim(),photoURL=$('#accountPhotoURL').value.trim();
    if(!displayName){toast('Tên hiển thị không được để trống.');return}
    btn.disabled=true;btn.textContent='⏳ Đang lưu...';status.textContent='';
    try{
      await window.studyStore.updateAccountInfo({displayName,photoURL});
      updatePreview(window.studyStore.user);
      toast('✓ Đã cập nhật thông tin tài khoản.');
      status.textContent='Đã lưu thành công.';
    }catch(error){
      status.textContent='Không thể lưu: '+(error.message||'Lỗi không xác định');
      toast('Không thể cập nhật tài khoản.');
    }finally{btn.disabled=false;btn.textContent='Lưu thay đổi'}
  });
  window.addEventListener('8b1-auth-change',()=>{void boot()});
  boot();
})();