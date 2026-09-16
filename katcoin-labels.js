// KatCoin UI naming layer: keeps existing internal coin logic/data intact while renaming the user-facing currency.
(function(){
  function replaceText(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[]; let node;
    while((node=walker.nextNode())) nodes.push(node);
    nodes.forEach(n=>{
      const value=n.nodeValue;
      if(!value||/katcoin/i.test(value)) return;
      n.nodeValue=value.replace(/\bXu\b/g,'KatCoin').replace(/\bxu\b/g,'KatCoin');
    });
  }
  function boot(){
    replaceText(document.body);
    const observer=new MutationObserver(mutations=>{
      mutations.forEach(m=>m.addedNodes.forEach(n=>{
        if(n.nodeType===Node.TEXT_NODE){
          n.nodeValue=n.nodeValue.replace(/\bXu\b/g,'KatCoin').replace(/\bxu\b/g,'KatCoin');
        }else if(n.nodeType===Node.ELEMENT_NODE) replaceText(n);
      }));
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.dispatchEvent(new CustomEvent('katcoin-ui-ready'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
