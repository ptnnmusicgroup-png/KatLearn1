(function(){
const data=[['night','Night Study',1000,'assets/1/bg-cat-night.svg','Học đêm cùng Kat','🌙'],['sky','Sky Day',1200,'assets/1/bg-sky.svg','Bầu trời trong xanh','☁️'],['pink','Pink Mood',1400,'assets/1/bg-pink.svg','Pastel nhẹ nhàng','🌸'],['ocean','Ocean Calm',1600,'assets/1/bg-ocean.svg','Biển xanh thư giãn','🌊'],['lavender','Lavender Dream',1800,'assets/1/bg-lavender.svg','Tím mộng mơ','✨'],['sen-viet','Sen Việt',2000,'assets/1/bg-sen-viet.svg','Modern Việt Nam · học thật chill','🪷']];
const $=s=>document.querySelector(s),num=n=>Number(n||0).toLocaleString('en-US');
async function aiHeaders(){const h={'Content-Type':'application/json'};try{const t=await window.studyStore?.getIdToken?.();if(t)h.Authorization='Bearer '+t}catch(_){}return h}

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
function draw(){const g=$('.shop-theme-grid');if(!g)return;const have=owned(),cur=localStorage.getItem('katlearn-theme')||'default';g.innerHTML=data.map(x=>{const already=have.has('theme-'+x[0]);return `<article class="shop-theme-card"><div class="shop-theme-preview" style="background-image:url('${x[3]}')"></div><span class="theme-card-icon" aria-hidden="true">${x[5]}</span><h3>${x[1]}</h3><p>${x[4]}</p><b class="theme-card-price">🪙 ${num(x[2])} KatCoin</b><button class="shop-buy-theme" data-price="${x[2]}" data-theme-id="${x[0]}" data-item-id="theme-${x[0]}" ${already?'disabled':''}>${already?'✓ Đã mua':'Mở khóa'}</button><button class="shop-apply-theme" data-theme-id="${x[0]}" ${already||cur===x[0]?'':'disabled'}>${cur===x[0]?'✓ Đang áp dụng':'Áp dụng'}</button></article>`}).join('')}
function paintFreeze(value){const balance=$('#freezeStreakBalance'),button=$('#buyFreezeStreak');const amount=Math.max(0,Math.floor(Number(value||0)));if(balance)balance.textContent=num(amount);if(button)button.dataset.balance=String(amount)}
async function refreshFreeze(){if(!window.studyStore?.user){paintFreeze(0);return}try{const profile=window.katlearnAccount?.profile||await window.studyStore.loadProfile();paintFreeze(profile?.freezeStreak||0)}catch(_){paintFreeze(0)}}
async function restore(){if(!window.studyStore?.user)return false;const uid=String(window.studyStore.user.uid||'');try{let p=window.katlearnAccount?.profile||null;if(!p)p=await window.katlearnAccount?.wait?.()||null;if(!p)p=await window.studyStore.loadProfile();if(String(window.studyStore?.user?.uid||'')!==uid)return false;if(p){localStorage.setItem('katlearn-account-type',String(p.studentAccountType||'free').toLowerCase()==='class'?'class':'free');const vv=Array.isArray(p.vocab)?p.vocab:[];let activeSource={kind:'legacy'};try{activeSource=JSON.parse(localStorage.getItem('katlearn-vocab-source')||'{"kind":"legacy"}')||activeSource}catch(_){}const activePack=['core','public','assigned'].includes(String(activeSource.kind||''));if(!activePack){localStorage.setItem('katlearn-vocab',JSON.stringify(vv));if(typeof vocab!=='undefined')vocab=vv;}localStorage.setItem('katlearn-owned-themes',JSON.stringify(Array.isArray(p.ownedThemes)?p.ownedThemes:[]));localStorage.setItem('katlearn-stats',JSON.stringify({questionsAnswered:Number(p.questionsAnswered||0),correctAnswers:Number(p.correctAnswers||0)}));if(p.personalPackName)localStorage.setItem('katlearn-personal-pack-name',p.personalPackName);const storedTheme=String(p.themeId||'').replace(/^theme-/,'').trim();if(storedTheme)localStorage.setItem('katlearn-theme',storedTheme);else localStorage.removeItem('katlearn-theme');if(!activePack&&typeof known!=='undefined')known=Number(p.knownWords||0);if(typeof energy!=='undefined')energy=Number(p.energy||0);paintFreeze(p.freezeStreak||0);if(document.querySelector('#learn')&&typeof renderCard==='function')renderCard();if(document.querySelector('#practice')&&typeof renderQuiz==='function')renderQuiz();if(document.querySelector('#wordTable')&&typeof renderVocabularyViews==='function')renderVocabularyViews();if(document.querySelector('#wordList')&&typeof renderWordList==='function')renderWordList();const k=$('#knownCount');if(k&&!activePack)k.textContent=Number(p.knownWords||0);const t=$('#totalWords');if(t&&!activePack)t.textContent=vv.length;const cards=document.querySelectorAll('#progress .stat-grid>div'),a=Number(p.questionsAnswered||0),c=Number(p.correctAnswers||0),acc=a?Math.round(c/a*100):0,vals=[Number(p.knownWords||0),acc+'%',Number(p.streak||0),num(p.coins)];cards.forEach((x,i)=>{const h=x.querySelector('h2');if(h)h.textContent=vals[i]});setBg(storedTheme||'default',false)}else{localStorage.setItem('katlearn-account-type','free');localStorage.setItem('katlearn-vocab','[]');localStorage.setItem('katlearn-owned-themes','[]');localStorage.setItem('katlearn-stats','{"questionsAnswered":0,"correctAnswers":0}');localStorage.removeItem('katlearn-theme')}return true}catch(e){console.warn('[KatLearn restore]',e);return false}}
document.addEventListener('click',async e=>{
  const freezeButton=e.target.closest?.('#buyFreezeStreak');
  if(freezeButton){
    e.preventDefault();
    const quantity=Math.floor(Number($('#freezeStreakQuantity')?.value||1));
    if(!Number.isInteger(quantity)||quantity<1||quantity>14)return toastSafe('Mỗi lần chỉ mua từ 1 đến 14 Freeze Streak.');
    freezeButton.disabled=true;
    try{
      if(!window.studyStore?.user)throw new Error('Bạn cần đăng nhập để mua Freeze Streak.');
      const token=await window.studyStore.getIdToken(true);
      if(!token)throw new Error('Không lấy được phiên xác thực của tài khoản.');
      const res=await fetch('/api/game-action',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'purchase-freeze-streak',quantity})});
      const result=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(result.error||'Không thể mua Freeze Streak.');
      window.katlearnCoinController?.setFromServer?.(result.coins,'freeze-streak-purchase');
      paintFreeze(result.freezeStreak);
      try{if(window.katlearnAccount?.profile)window.katlearnAccount.profile.freezeStreak=result.freezeStreak}catch(_){}
      toastSafe('❄️ Đã thêm '+quantity+' Freeze Streak. Kat sẽ tự dùng khi bạn có đủ để bù ngày vắng học.');
    }catch(err){void window.katlearnCoinController?.refresh?.('freeze-streak-error');toastSafe('Không thể hoàn tất giao dịch: '+(err.message||'lỗi'))}finally{freezeButton.disabled=false}
    return;
  }

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
        try{ if(window.katlearnAccount?.profile) window.katlearnAccount.profile.themeId='theme-'+appliedId; }catch(_){}
        window.dispatchEvent(new CustomEvent('katlearn-theme-applied',{detail:{themeId:appliedId,source:'apply'}}));
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
      try{ if(window.katlearnAccount?.profile) window.katlearnAccount.profile.themeId='theme-'+appliedTheme; }catch(_){}
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
function openWordEditor(packName){const o=makeOverlay();$('#klPackStep').innerHTML=`<h2>🐱 Hãy thêm từ vựng của bạn</h2><p><b>${escapeHtml(packName)}</b> · Nhập từ tiếng Anh, Kat AI sẽ tự điền nghĩa và phiên âm. Ghi chú là tùy chọn.</p><div class="kl-word-head"><span>Tiếng Anh</span><span>Tiếng Việt</span><span>Phiên Âm</span><span>Ghi chú</span><span></span></div><div id="klWordRows"></div><div class="kl-pack-success" id="klPackSuccess"></div><div class="kl-pack-actions"><div><button class="kl-btn secondary" id="klAddRow">＋ Thêm dòng</button></div><div><button class="kl-btn ghost" id="klWordCancel">Hủy</button><button class="kl-btn primary" id="klSaveWords">Lưu bộ từ ✓</button></div></div>`;const rows=$('#klWordRows');rows.append(wordRow(),wordRow(),wordRow());o.classList.add('show');$('#klAddRow').onclick=()=>rows.append(wordRow());$('#klWordCancel').onclick=()=>o.classList.remove('show');$('#klSaveWords').onclick=async()=>{const words=[...document.querySelectorAll('.kl-word-row')].map(r=>({word:r.querySelector('.kl-english').value.trim(),mean:r.querySelector('.kl-vietnamese').value.trim(),pron:r.querySelector('.kl-pronunciation').value.trim(),note:r.querySelector('.kl-note').value.trim(),emoji:'📚'})).filter(x=>x.word);if(!words.length)return toastSafe('Hãy thêm ít nhất một từ nhé!');if(words.length>100)return toastSafe('Mỗi bộ từ tối đa 100 từ nhé!');const missing=words.find(x=>!x.mean);if(missing)return toastSafe(`Hãy điền nghĩa cho “${missing.word}” hoặc chờ Kat AI hoàn thành.`);const saveBtn=$('#klSaveWords');if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Đang lưu…'}try{if(!window.studyStore?.user)throw new Error('Bạn cần đăng nhập để tạo bộ từ.');const saved=await window.studyStore.createPersonalPack({name:packName,words});if(typeof vocab!=='undefined'){if(typeof setVocabSource==='function')setVocabSource({kind:'personal',id:String(saved?.id||''),name:packName});vocab=Array.isArray(saved?.words)&&saved.words.length?saved.words:words;localStorage.setItem('katlearn-vocab',JSON.stringify(vocab));if(typeof known!=='undefined')known=0;if(typeof cardIndex!=='undefined')cardIndex=0;if(typeof renderCard==='function')renderCard();if(typeof renderQuiz==='function')renderQuiz();if(typeof renderVocabularyViews==='function')renderVocabularyViews();if(typeof renderWordList==='function')renderWordList();}const success=$('#klPackSuccess');success.textContent=`✓ Đã lưu “${packName}” với ${vocab?.length||words.length} từ trên KatLearn. Bộ từ đã sẵn sàng để học!`;success.classList.add('show');setTimeout(()=>{o.classList.remove('show');if(typeof showPage==='function')showPage('learn');toastSafe(`🎉 Đã tạo bộ từ “${packName}” gồm ${vocab?.length||words.length} từ!`)},650)}catch(error){toastSafe('Không thể lưu bộ từ: '+(error?.message||'Lỗi không xác định'));}finally{if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Lưu bộ từ ✓'}}}}
async function boot(){if(!window.studyStore?.user){paintFreeze(0);return}await restore();draw();await refreshFreeze()}
window.addEventListener('8b1-auth-change',boot);window.addEventListener('katlearn-account-ready',()=>{void boot()});document.addEventListener('DOMContentLoaded',async()=>{await boot();draw();await refreshFreeze();setBg(localStorage.getItem('katlearn-theme')||'default',false)},{once:true});
})();
