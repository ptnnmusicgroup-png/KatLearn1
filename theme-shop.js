(function(){
const data=[['night','Night Study',120,'assets/1/bg-cat-night.svg','Học đêm cùng Kat'],['sky','Sky Day',150,'assets/1/bg-sky.svg','Bầu trời trong xanh'],['pink','Pink Mood',180,'assets/1/bg-pink.svg','Pastel nhẹ nhàng'],['ocean','Ocean Calm',220,'assets/1/bg-ocean.svg','Biển xanh thư giãn'],['lavender','Lavender Dream',260,'assets/1/bg-lavender.svg','Tím mộng mơ'],['sen-viet','Sen Việt',320,'assets/1/bg-sen-viet.svg','Modern Việt Nam · học thật chill']];
const $=s=>document.querySelector(s),num=n=>Number(n||0).toLocaleString('en-US');
async function aiHeaders(){const h={'Content-Type':'application/json'};try{const t=await window.studyStore?.getIdToken?.();if(t)h.Authorization='Bearer '+t}catch(_){}return h}
const style=document.createElement('style');style.textContent=`.shop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}.coin-earned{display:inline-flex;align-items:center;gap:6px;padding:11px 15px;border-radius:999px;background:linear-gradient(135deg,#fff9df,#fff);border:1px solid #f0e4a9;box-shadow:0 10px 28px #7d651c12;color:#5d5363;font-weight:800}.coin-earned b{font-size:17px;color:#6d5efc}.coin-earned small{font-size:9px;color:#938a9e}.shop-theme-card{background:#fff;border:1px solid #ececf3;border-radius:22px;padding:12px;box-shadow:0 10px 30px #4c426312}.shop-theme-preview{height:150px;border-radius:16px;background-size:cover;background-position:center;margin-bottom:12px}.shop-theme-card h3{margin:4px 0;font:700 18px Fredoka,sans-serif}.shop-theme-card p{margin:0 0 10px;color:#8792a5;font-size:11px}.shop-theme-card>b{display:block;margin-bottom:10px}.shop-theme-card button{border:0;border-radius:10px;padding:9px 12px;margin-right:6px;cursor:pointer;font:700 11px "Be Vietnam Pro",sans-serif;background:#f47c93;color:#fff}.shop-theme-card .shop-apply-theme{background:#5d4fea}.shop-theme-card button:disabled{opacity:.45;cursor:not-allowed}.kl-pack-overlay{position:fixed;inset:0;background:rgba(36,43,66,.38);backdrop-filter:blur(5px);display:none;place-items:center;z-index:9999;padding:20px}.kl-pack-overlay.show{display:grid}.kl-pack-card{width:min(980px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:24px;padding:26px;box-shadow:0 25px 70px rgba(38,45,80,.22);font-family:"Be Vietnam Pro",sans-serif}.kl-pack-card h2{font:700 25px Fredoka,sans-serif;color:#27384e;margin:0 0 6px}.kl-pack-card>p{font-size:11px;color:#8290a3;margin:0 0 20px}.kl-pack-name{display:block;font-size:11px;font-weight:700;color:#516074;margin-bottom:16px}.kl-pack-name input{display:block;width:100%;margin-top:7px;border:1px solid #e4e7ef;border-radius:11px;padding:12px 13px;font:500 12px "Be Vietnam Pro",sans-serif;outline:0}.kl-pack-name input:focus,.kl-word-row input:focus,.kl-word-row textarea:focus{border-color:#8b7eff;box-shadow:0 0 0 3px #8b7eff18}.kl-word-head,.kl-word-row{display:grid;grid-template-columns:1.15fr 1.35fr 1fr 1.2fr 34px;gap:8px;align-items:center}.kl-word-head{padding:0 8px 7px;color:#8a96a8;font-size:10px;font-weight:800}.kl-word-row{padding:8px;background:#fafbfe;border:1px solid #edf0f5;border-radius:12px;margin-bottom:8px}.kl-word-row input,.kl-word-row textarea{width:100%;border:1px solid #e3e7ef;background:#fff;border-radius:9px;padding:10px;font:500 11px "Be Vietnam Pro",sans-serif;outline:0;min-width:0}.kl-word-row textarea{resize:vertical;min-height:39px}.kl-word-row input.ai-filling{background:#f4f1ff;border-color:#b8afff}.kl-remove-row{width:30px;height:30px;border:0;border-radius:9px;background:#fff0ef;color:#ef756d;font-size:20px;cursor:pointer}.kl-pack-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px}.kl-pack-actions>div{display:flex;gap:8px}.kl-btn{border:0;border-radius:10px;padding:11px 15px;font:700 11px "Be Vietnam Pro",sans-serif;cursor:pointer}.kl-btn.secondary{background:#f0efff;color:#6758ed}.kl-btn.primary{background:#6d5efc;color:#fff}.kl-btn.ghost{background:#f5f6f9;color:#6d7788}.kl-ai-note{font-size:10px;color:#8b96a8}.kl-ai-note b{color:#6d5efc}.kl-pack-success{font-size:11px;color:#4ea878;background:#effbf4;border-radius:10px;padding:9px 11px;margin-top:12px;display:none}.kl-pack-success.show{display:block}@media(max-width:760px){.kl-word-head{display:none}.kl-word-row{grid-template-columns:1fr;position:relative;padding:12px}.kl-remove-row{position:absolute;right:8px;top:8px}.kl-pack-card{padding:19px}.kl-pack-actions{align-items:stretch;flex-direction:column}.kl-pack-actions>div{width:100%}.kl-btn{flex:1}}`;document.head.appendChild(style);
function setBg(id,save){
  const clean=String(id||'default').replace(/^theme-/,'').trim()||'default';
  if(window.katlearnTheme?.apply){
    window.katlearnTheme.apply(clean,{persist:save!==false});
    if(save&&window.studyStore?.user)try{localStorage.setItem('katlearn-theme-uid',String(window.studyStore.user.uid||''))}catch(_){}
    return;
  }
  const x=data.find(a=>a[0]===clean);
  if(!x){document.body.style.removeProperty('background-image');if(save)localStorage.removeItem('katlearn-theme');return}
  document.body.style.backgroundImage=`url('${x[3]}')`;
  document.body.style.backgroundSize='cover';
  document.body.style.backgroundAttachment='fixed';
  document.body.style.backgroundPosition='center';
  if(save)localStorage.setItem('katlearn-theme',clean);
}
function owned(){try{const raw=JSON.parse(localStorage.getItem('katlearn-owned-themes')||'[]');return new Set(Array.isArray(raw)?raw:[])}catch(_){localStorage.removeItem('katlearn-owned-themes');return new Set()}}
function draw(){const g=$('.shop-theme-grid');if(!g)return;const have=owned(),cur=localStorage.getItem('katlearn-theme')||'default';g.innerHTML=data.map(x=>{const already=have.has('theme-'+x[0]);return `<article class="shop-theme-card"><div class="shop-theme-preview" style="background-image:url('${x[3]}')"></div><h3>${x[1]}</h3><p>${x[4]}</p><b>🪙 ${num(x[2])}</b><button class="shop-buy-theme" data-price="${x[2]}" data-theme-id="${x[0]}" data-item-id="theme-${x[0]}" ${already?'disabled':''}>${already?'✓ Đã mua':'Mua'}</button><button class="shop-apply-theme" data-theme-id="${x[0]}" ${already||cur===x[0]?'':'disabled'}>${cur===x[0]?'✓ Đang áp dụng':'Áp dụng'}</button></article>`}).join('')}
async function restore(){if(!window.studyStore?.user)return false;const uid=String(window.studyStore.user.uid||'');try{let p=window.katlearnAccount?.profile||null;if(!p)p=await window.katlearnAccount?.wait?.()||null;if(!p)p=await window.studyStore.loadProfile();if(String(window.studyStore?.user?.uid||'')!==uid)return false;if(p){localStorage.setItem('katlearn-account-type',String(p.studentAccountType||'free').toLowerCase()==='class'?'class':'free');const vv=Array.isArray(p.vocab)?p.vocab:[];let activeSource={kind:'legacy'};try{activeSource=JSON.parse(localStorage.getItem('katlearn-vocab-source')||'{"kind":"legacy"}')||activeSource}catch(_){}const activePack=['core','public','assigned'].includes(String(activeSource.kind||''));if(!activePack){localStorage.setItem('katlearn-vocab',JSON.stringify(vv));if(typeof vocab!=='undefined')vocab=vv;}localStorage.setItem('katlearn-owned-themes',JSON.stringify(Array.isArray(p.ownedThemes)?p.ownedThemes:[]));localStorage.setItem('katlearn-stats',JSON.stringify({questionsAnswered:Number(p.questionsAnswered||0),correctAnswers:Number(p.correctAnswers||0)}));if(p.personalPackName)localStorage.setItem('katlearn-personal-pack-name',p.personalPackName);const storedTheme=String(p.themeId||'').replace(/^theme-/,'').trim();if(storedTheme)localStorage.setItem('katlearn-theme',storedTheme);else localStorage.removeItem('katlearn-theme');if(!activePack&&typeof known!=='undefined')known=Number(p.knownWords||0);if(typeof energy!=='undefined')energy=Number(p.energy||0);if(document.querySelector('#learn')&&typeof renderCard==='function')renderCard();if(document.querySelector('#practice')&&typeof renderQuiz==='function')renderQuiz();if(document.querySelector('#wordTable')&&typeof renderVocabularyViews==='function')renderVocabularyViews();if(document.querySelector('#wordList')&&typeof renderWordList==='function')renderWordList();const k=$('#knownCount');if(k&&!activePack)k.textContent=Number(p.knownWords||0);const t=$('#totalWords');if(t&&!activePack)t.textContent=vv.length;const cards=document.querySelectorAll('#progress .stat-grid>div'),a=Number(p.questionsAnswered||0),c=Number(p.correctAnswers||0),acc=a?Math.round(c/a*100):0,vals=[Number(p.knownWords||0),acc+'%',Number(p.streak||0),num(p.coins)];cards.forEach((x,i)=>{const h=x.querySelector('h2');if(h)h.textContent=vals[i]});setBg(storedTheme||'default',false)}else{localStorage.setItem('katlearn-account-type','free');localStorage.setItem('katlearn-vocab','[]');localStorage.setItem('katlearn-owned-themes','[]');localStorage.setItem('katlearn-stats','{"questionsAnswered":0,"correctAnswers":0}');localStorage.removeItem('katlearn-theme')}return true}catch(e){console.warn('[KatLearn restore]',e);return false}}
document.addEventListener('click',async e=>{
  const applyButton=e.target.closest?.('.shop-apply-theme');
  if(applyButton){
    e.preventDefault();
    e.stopImmediatePropagation();
    const id=applyButton.dataset.themeId;
    if(applyButton.disabled)return;
    applyButton.disabled=true;
    try{
      const token=await window.studyStore?.getIdToken?.(true);
      if(!token)throw new Error('Không lấy được phiên xác thực.');
      const res=await fetch('/api/game-action',{
        method:'POST',
        cache:'no-store',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({action:'apply-theme',itemId:'theme-'+id})
      });
      const dataResponse=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(dataResponse.error||'Không thể áp dụng theme.');
      const appliedId=String(dataResponse.themeId||'').replace(/^theme-/,'');
      if(appliedId){
        setBg(appliedId,true);
      }
      draw();
      toastSafe('🎨 Đã áp dụng theme “'+(data.find(x=>x[0]===id)?.[1]||'Theme')+'”!');
    }catch(err){
      toastSafe('Không thể áp dụng theme: '+(err.message||'lỗi'));
      applyButton.disabled=false;
    }
    return;
  }

  const buyButton=e.target.closest?.('.shop-buy-theme');
  if(!buyButton)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if(buyButton.disabled)return;

  const price=Number(buyButton.dataset.price||0);
  if(!Number.isFinite(price)||price<=0){
    toastSafe('Giá vật phẩm không hợp lệ.');
    return;
  }

  buyButton.disabled=true;
  try{
    if(!window.studyStore?.user)throw new Error('Bạn cần đăng nhập để mua vật phẩm.');
    const token=await window.studyStore.getIdToken(true);
    if(!token)throw new Error('Không lấy được phiên xác thực của tài khoản.');

    const itemId=buyButton.dataset.itemId;
    const name=buyButton.closest('article')?.querySelector('h3')?.textContent||'Theme';
    const res=await fetch('/api/game-action',{
      method:'POST',
      cache:'no-store',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({action:'purchase',itemId,price,name})
    });
    const purchaseResult=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(purchaseResult.error||'Không thể mua vật phẩm.');

    // app.js is the only owner of the global KatCoin state.
    window.katlearnCoinController?.setFromServer?.(purchaseResult.coins,'purchase');

    const set=owned();
    set.add(itemId);
    localStorage.setItem('katlearn-owned-themes',JSON.stringify([...set]));

    if(itemId.startsWith('theme-')){
      const appliedTheme=String(purchaseResult.themeId||itemId).replace(/^theme-/,'');
      setBg(appliedTheme,true);
      window.dispatchEvent(new CustomEvent('katlearn-theme-applied',{
        detail:{themeId:appliedTheme,source:'purchase'}
      }));
    }

    draw();
    toastSafe(itemId.startsWith('theme-')
      ?'🎉 Đã mua và áp dụng theme ngay! 🐱'
      :'Đã mua vật phẩm! 🐾');
  }catch(err){
    void window.katlearnCoinController?.refresh?.('purchase-error');
    toastSafe('Không thể hoàn tất giao dịch: '+(err.message||'lỗi'));
    buyButton.disabled=false;
  }
});
function makeOverlay(){let o=$('#klPackOverlay');if(o)return o;o=document.createElement('div');o.id='klPackOverlay';o.className='kl-pack-overlay';o.innerHTML='<div class="kl-pack-card" role="dialog" aria-modal="true"><div id="klPackStep"></div></div>';document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('show')});return o}
function openPackName(){const o=makeOverlay(),name=localStorage.getItem('katlearn-personal-pack-name')||'';$('#klPackStep').innerHTML=`<h2>📚 Tạo bộ từ</h2><p>Đặt tên cho pack của bạn. Sau khi tạo, Kat sẽ mở ngay trình thêm từ vựng.</p><label class="kl-pack-name">Tên bộ từ<input id="klPackNameInput" maxlength="80" placeholder="VD: IELTS Environment" value="${escapeHtml(name)}" autofocus></label><div class="kl-pack-actions"><span class="kl-ai-note">🐱 Pack cá nhân của bạn</span><div><button class="kl-btn ghost" id="klPackCancel">Hủy</button><button class="kl-btn primary" id="klPackCreate">Tạo bộ từ →</button></div></div>`;o.classList.add('show');setTimeout(()=>$('#klPackNameInput')?.focus(),30);$('#klPackCancel').onclick=()=>o.classList.remove('show');$('#klPackCreate').onclick=()=>{const n=$('#klPackNameInput').value.trim();if(!n)return toastSafe('Hãy đặt tên cho bộ từ trước nhé!');localStorage.setItem('katlearn-personal-pack-name',n);if(window.studyStore?.user)void window.studyStore.saveProfile({personalPackName:n});openWordEditor(n)};$('#klPackNameInput').onkeydown=e=>{if(e.key==='Enter')$('#klPackCreate').click()}}
function escapeHtml(text){return String(text||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toastSafe(msg){if(typeof toast==='function')toast(msg);else alert(msg)}
function wordRow(data={}){const row=document.createElement('div');row.className='kl-word-row';row.innerHTML=`<input class="kl-english" maxlength="60" placeholder="Tiếng Anh" value="${escapeHtml(data.word||'')}" autocomplete="off"><input class="kl-vietnamese" maxlength="120" placeholder="AI tự điền" value="${escapeHtml(data.mean||'')}"><input class="kl-pronunciation" maxlength="80" placeholder="AI tự điền" value="${escapeHtml(data.pron||'')}"><textarea class="kl-note" maxlength="180" placeholder="Ghi chú">${escapeHtml(data.note||'')}</textarea><button class="kl-remove-row" type="button" title="Xóa từ">×</button>`;row.querySelector('.kl-remove-row').onclick=()=>{if(document.querySelectorAll('.kl-word-row').length<=1)return toastSafe('Hãy giữ lại ít nhất một dòng nhé!');row.remove()};const english=row.querySelector('.kl-english');english.addEventListener('input',()=>{clearTimeout(row.aiTimer);row.aiTimer=setTimeout(()=>fillAi(row),650)});return row}
async function fillAi(row){const word=row.querySelector('.kl-english').value.trim(),mean=row.querySelector('.kl-vietnamese'),pron=row.querySelector('.kl-pronunciation');if(!word)return;row.dataset.word=word;mean.classList.add('ai-filling');pron.classList.add('ai-filling');mean.placeholder='Kat AI đang xử lý…';pron.placeholder='Kat AI đang xử lý…';try{const res=await fetch('/api/vocab-assist',{method:'POST',headers:await aiHeaders(),body:JSON.stringify({word})});const d=await res.json();if(!res.ok)throw new Error(d.error||'AI unavailable');if(row.dataset.word!==word)return;mean.value=d.meaning||mean.value;pron.value=d.pronunciation||pron.value;toastSafe(`🐱 Kat AI đã điền “${word}”.`)}catch(err){mean.placeholder='Tự nhập nghĩa tiếng Việt';pron.placeholder='Tự nhập phiên âm'}finally{mean.classList.remove('ai-filling');pron.classList.remove('ai-filling')}}
function openWordEditor(packName){const o=makeOverlay();$('#klPackStep').innerHTML=`<h2>🐱 Hãy thêm từ vựng của bạn</h2><p><b>${escapeHtml(packName)}</b> · Nhập từ tiếng Anh, Kat AI sẽ tự điền nghĩa và phiên âm. Ghi chú là tùy chọn.</p><div class="kl-word-head"><span>Tiếng Anh</span><span>Tiếng Việt</span><span>Phiên Âm</span><span>Ghi chú</span><span></span></div><div id="klWordRows"></div><div class="kl-pack-success" id="klPackSuccess"></div><div class="kl-pack-actions"><div><button class="kl-btn secondary" id="klAddRow">＋ Thêm dòng</button></div><div><button class="kl-btn ghost" id="klWordCancel">Hủy</button><button class="kl-btn primary" id="klSaveWords">Lưu bộ từ ✓</button></div></div>`;const rows=$('#klWordRows');rows.append(wordRow(),wordRow(),wordRow());o.classList.add('show');$('#klAddRow').onclick=()=>rows.append(wordRow());$('#klWordCancel').onclick=()=>o.classList.remove('show');$('#klSaveWords').onclick=async()=>{const words=[...document.querySelectorAll('.kl-word-row')].map(r=>({word:r.querySelector('.kl-english').value.trim(),mean:r.querySelector('.kl-vietnamese').value.trim(),pron:r.querySelector('.kl-pronunciation').value.trim(),note:r.querySelector('.kl-note').value.trim(),emoji:'📚'})).filter(x=>x.word);if(!words.length)return toastSafe('Hãy thêm ít nhất một từ nhé!');const missing=words.find(x=>!x.mean);if(missing)return toastSafe(`Hãy điền nghĩa cho “${missing.word}” hoặc chờ Kat AI hoàn thành.`);if(typeof vocab!=='undefined'){if(typeof setVocabSource==='function')setVocabSource({kind:'personal'});vocab=words;localStorage.setItem('katlearn-vocab',JSON.stringify(vocab));if(typeof known!=='undefined')known=0;if(typeof cardIndex!=='undefined')cardIndex=0;if(typeof renderCard==='function')renderCard();if(typeof renderQuiz==='function')renderQuiz();if(typeof renderVocabularyViews==='function')renderVocabularyViews();if(typeof renderWordList==='function')renderWordList();if(typeof syncProfile==='function')void syncProfile({personalPackName:packName});else if(window.studyStore?.user)void window.studyStore.saveProfile({vocab,personalPackName:packName,totalWords:vocab.length});}const success=$('#klPackSuccess');success.textContent=`✓ Đã lưu “${packName}” với ${words.length} từ. Bộ từ đã sẵn sàng để học!`;success.classList.add('show');setTimeout(()=>{o.classList.remove('show');if(typeof showPage==='function')showPage('learn');toastSafe(`🎉 Đã tạo bộ từ “${packName}” gồm ${words.length} từ!`)},650)}}
async function boot(){if(!window.studyStore?.user)return;await restore();draw()}
window.addEventListener('8b1-auth-change',boot);document.addEventListener('DOMContentLoaded',async()=>{await boot();draw();setBg(localStorage.getItem('katlearn-theme')||'default',false)},{once:true});
})();
