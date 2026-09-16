// KatLearn administrator configuration.
window.KATLEARN_ADMIN_EMAILS = ['katlearn.admin@gmail.com'];

// Load optional AI pack modules without changing the existing app boot order.
(function(){
  const files=['ai-pack-generator.js','ai-pack-generator-ui.js','pack-preview-modal.js','katlearn-activation.js'];
  let chain=Promise.resolve();
  files.forEach(src=>{
    chain=chain.then(()=>new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src; s.async=false;
      s.onload=resolve; s.onerror=()=>reject(new Error('Không tải được '+src));
      document.head.appendChild(s);
    })).catch(err=>console.warn('[KatLearn]',err.message));
  });
})();
