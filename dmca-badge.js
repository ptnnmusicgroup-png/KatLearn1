/* DMCA protection badge for KatLearn. */
(function(){
  const BADGE_URL='https://images.dmca.com/Badges/dmca_protected_16_120.png?ID=90b6b5dd-dff2-4ba7-9aa9-5de55271d4d4';
  const STATUS_URL='https://www.dmca.com/Protection/Status.aspx?ID=90b6b5dd-dff2-4ba7-9aa9-5de55271d4d4';
  function mount(){
    const footer=document.querySelector('.site-footer');
    if(!footer||footer.querySelector('.dmca-badge'))return;
    const wrap=document.createElement('div');
    wrap.className='dmca-badge-wrap';
    wrap.innerHTML=`<a href="${STATUS_URL}" title="DMCA.com Protection Status" class="dmca-badge"><img src="${BADGE_URL}" alt="DMCA.com Protection Status"></a>`;
    footer.appendChild(wrap);
    if(!document.querySelector('script[data-dmca-helper]')){
      const s=document.createElement('script');
      s.src='https://images.dmca.com/Badges/DMCABadgeHelper.min.js';
      s.async=true;
      s.dataset.dmcaHelper='1';
      document.body.appendChild(s);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
