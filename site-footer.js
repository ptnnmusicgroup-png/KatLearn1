(function(){
  function mount(){
    const main=document.querySelector('.app-shell main');
    if(!main||document.getElementById('katlearnFooter'))return !!main;

    const style=document.createElement('style');
    style.id='katlearnFooterStyle';
    style.textContent=`
      #katlearnFooter{
        position:relative;
        margin-top:54px;
        padding:28px 38px 22px;
        border-top:1px solid rgba(103,90,75,.11);
        background:
          radial-gradient(circle at 92% 8%,rgba(109,94,252,.055),transparent 28%),
          linear-gradient(180deg,#fffdf9 0%,#faf8f4 100%) !important;
        color:#7d746d;
        font:500 11px/1.7 'Be Vietnam Pro',sans-serif;
        overflow:hidden;
      }
      #katlearnFooter:before{
        content:'';
        position:absolute;
        left:0;
        right:0;
        top:0;
        height:2px;
        background:linear-gradient(90deg,#6d5efc 0%,#9b8eff 45%,#c9a45c 100%);
        opacity:.72;
      }
      #katlearnFooter .footer-grid{
        display:grid;
        grid-template-columns:minmax(0,1.35fr) minmax(220px,.85fr) minmax(220px,.9fr);
        gap:26px;
        align-items:start;
        max-width:1400px;
        margin:0 auto;
      }
      #katlearnFooter .footer-left,
      #katlearnFooter .footer-middle,
      #katlearnFooter .footer-right{min-width:0}
      #katlearnFooter .footer-brand{
        display:flex;
        align-items:center;
        gap:10px;
        margin-bottom:10px;
      }
      #katlearnFooter .footer-brand-mark{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        border-radius:11px;
        background:linear-gradient(135deg,#8d7dff,#5d4fea);
        color:#fff;
        font-size:19px;
        box-shadow:0 7px 16px rgba(109,94,252,.18);
      }
      #katlearnFooter .footer-title{
        margin:0;
        font:700 16px 'Fredoka','Be Vietnam Pro',sans-serif;
        color:#35425a;
      }
      #katlearnFooter .footer-kicker{
        margin:1px 0 0;
        color:#a0968e;
        font-size:9px;
        letter-spacing:.7px;
        text-transform:uppercase;
      }
      #katlearnFooter .footer-copy{
        margin:0;
        max-width:560px;
        color:#7b736d;
        line-height:1.75;
      }
      #katlearnFooter .footer-meta{
        margin-top:10px;
        color:#9b928b;
        font-size:9px;
      }
      #katlearnFooter .footer-heading{
        margin:3px 0 10px;
        color:#4b596e;
        font-size:10px;
        font-weight:800;
        letter-spacing:.65px;
        text-transform:uppercase;
      }
      #katlearnFooter .footer-stack{
        display:flex;
        flex-wrap:wrap;
        gap:7px;
      }
      #katlearnFooter .footer-chip{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:7px 9px;
        border:1px solid #ebe7e2;
        border-radius:9px;
        background:rgba(255,255,255,.76);
        color:#6f6862;
        font-size:9px;
        box-shadow:0 4px 12px rgba(74,62,48,.035);
      }
      #katlearnFooter .footer-protection{
        padding:13px 14px 12px;
        border:1px solid #ebe5dd;
        border-radius:14px;
        background:rgba(255,255,255,.72);
        box-shadow:0 8px 22px rgba(74,62,48,.045);
      }
      #katlearnFooter .footer-protection-title{
        display:flex;
        align-items:center;
        gap:7px;
        margin:0 0 7px;
        color:#5a514b;
        font-size:10px;
        font-weight:800;
      }
      #katlearnFooter .footer-protection-title span{
        width:22px;
        height:22px;
        display:grid;
        place-items:center;
        border-radius:7px;
        background:#fff5e8;
        color:#c68c2e;
      }
      #katlearnFooter .footer-protection p{
        margin:0 0 9px;
        color:#968d86;
        font-size:9px;
      }
      #katlearnFooter .dmca-badge-wrap{
        display:flex;
        align-items:center;
        gap:9px;
        flex-wrap:wrap;
        margin-top:2px;
      }
      #katlearnFooter .dmca-badge{
        display:inline-flex;
        line-height:0;
        padding:4px 7px;
        border:1px solid #ebe7e2;
        border-radius:8px;
        background:#fff;
      }
      #katlearnFooter .dmca-badge img{
        width:112px;
        height:auto;
        display:block;
      }
      #katlearnFooter .dmca-status-link{
        color:#6d5efc;
        text-decoration:none;
        font-size:9px;
        font-weight:700;
      }
      #katlearnFooter .dmca-status-link:hover{text-decoration:underline}
      #katlearnFooter .footer-bottom{
        display:flex;
        justify-content:space-between;
        gap:18px;
        margin:22px auto 0;
        padding-top:13px;
        border-top:1px solid #eeeae5;
        max-width:1400px;
        color:#a09891;
        font-size:8.5px;
      }
      #katlearnFooter .footer-bottom span:last-child{text-align:right}
      @media(max-width:900px){
        #katlearnFooter .footer-grid{grid-template-columns:1fr 1fr}
        #katlearnFooter .footer-left{grid-column:1/-1}
      }
      @media(max-width:620px){
        #katlearnFooter{padding:26px 18px 20px;margin-top:38px}
        #katlearnFooter .footer-grid{grid-template-columns:1fr;gap:20px}
        #katlearnFooter .footer-left{grid-column:auto}
        #katlearnFooter .footer-bottom{flex-direction:column;gap:5px}
        #katlearnFooter .footer-bottom span:last-child{text-align:left}
        #katlearnFooter .dmca-badge-wrap{align-items:flex-start;flex-direction:column}
      }
    `;
    document.head.appendChild(style);

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
            <span class="footer-chip">▲ Vercel</span>
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