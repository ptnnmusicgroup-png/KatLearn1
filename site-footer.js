(function(){
  function mount(){
    const main=document.querySelector('.app-shell main');
    if(!main||document.getElementById('katlearnFooter'))return !!main;



    const footer=document.createElement('footer');
    footer.id='katlearnFooter';
    footer.innerHTML=`
      <div class="footer-grid">
        <div class="footer-left">
          <div class="footer-brand">
            <span class="footer-brand-mark">🐱</span>
            <div>
              <p class="footer-title">KatLearn</p>
              <p class="footer-kicker">English Learning Platform</p>
            </div>
          </div>
          <p class="footer-copy">Một góc học tiếng Anh do Nguyễn Đặng Phương (8B1) phát triển, với mục tiêu biến việc học từ vựng thành một hành trình nhẹ nhàng, vui và dễ duy trì hơn.</p>
          <p class="footer-meta">Phuong Me Dev · Part of PTNN Dev Group</p>
        </div>

        <div class="footer-middle">
          <p class="footer-heading">Hạ tầng</p>
          <div class="footer-stack">
            <span class="footer-chip">⌘ GitHub</span>
            <span class="footer-chip">🔥 Firebase</span>
          </div>
        </div>

        <div class="footer-right">
          <div class="footer-protection">
            <p class="footer-protection-title"><span>🛡</span> Bảo vệ nội dung</p>
            <p>Trang web được đăng ký bảo vệ bản quyền với DMCA.</p>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© 2026 Nguyen Dang Phuong. All rights reserved.</span>
        <span>KatLearn · Made with 🐾 for English learners</span>
      </div>`;
    main.appendChild(footer);
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();