/* DMCA protection badge for KatLearn. */
(function(){
  const PROTECTION_ID='755dcf1e-2d8c-4315-8cd3-9f29b4ca890e';
  const BADGE_URL='https://images.dmca.com/Badges/dmca_protected_16_120.png?ID='+PROTECTION_ID;
  const STATUS_URL='https://www.dmca.com/Protection/Status.aspx?ID='+PROTECTION_ID+'&refurl=https://lms-katlearn.vercel.app/';

  function mount(){
    const footer=document.getElementById('katlearnFooter');
    const protection=footer?.querySelector('.footer-protection');
    if(!footer||!protection||protection.querySelector('.dmca-badge'))return false;

    if(!document.getElementById('dmcaBadgeStyle')){
      const style=document.createElement('style');
      style.id='dmcaBadgeStyle';
      style.textContent=`
        #katlearnFooter .footer-protection .dmca-status-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-top:8px;
        }
        @media(max-width:620px){
          #katlearnFooter .footer-protection .dmca-status-row{
            align-items:flex-start;
            flex-direction:column;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const wrap=document.createElement('div');
    wrap.className='dmca-badge-wrap';
    wrap.innerHTML=`
      <div class="dmca-status-row">
        <a href="${STATUS_URL}" target="_blank" rel="noopener noreferrer" title="DMCA.com Protection Status" class="dmca-badge">
          <img src="${BADGE_URL}" alt="DMCA.com Protection Status">
        </a>
        <a href="${STATUS_URL}" target="_blank" rel="noopener noreferrer" class="dmca-status-link">Xem Protection Status ↗</a>
      </div>`;
    protection.appendChild(wrap);

    if(!document.querySelector('script[data-dmca-helper]')){
      const s=document.createElement('script');
      s.src='https://images.dmca.com/Badges/DMCABadgeHelper.min.js';
      s.async=true;
      s.dataset.dmcaHelper='1';
      document.body.appendChild(s);
    }
    return true;
  }

  function start(){
    if(mount())return;
    const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();