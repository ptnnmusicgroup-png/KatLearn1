/* KatLearn standalone personal-pack creator */
(function(){
  const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
  const toast=msg=>{const el=$('#cpToast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(window.__cpToastTimer);window.__cpToastTimer=setTimeout(()=>el.classList.remove('show'),3200)};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const endpoint=name=>'/api/'+String(name||'').replace(/^\/+/, '');
  const authHeaders=async()=>{const h={'Content-Type':'application/json'};try{const token=await window.studyStore?.getIdToken?.(true);if(token)h.Authorization='Bearer '+token}catch(_){ }return h};
  let user=null;
  function normalizeType(v){const x=String(v||'').toLowerCase();if(x.includes('noun')||x.includes('danh từ'))return'noun';if(x.includes('verb')||x.includes('động từ'))return'verb';if(x.includes('adjective')||x.includes('tính từ'))return'adjective';if(x.includes('adverb')||x.includes('trạng từ'))return'adverb';if(x.includes('phrase')||x.includes('cụm'))return'phrase';return'other'}
  function row(data={}){
    const el=document.createElement('div');el.className='cp-row';el.innerHTML=`<span class="cp-num"># 1</span><input class="cp-input cp-word" value="${esc(data.word||'')}" maxlength="80" placeholder="TỪ VỰNG"><input class="cp-input cp-pron" value="${esc(data.pron||data.ipa||'')}" placeholder="/fəʊn/"><input class="cp-input cp-mean" value="${esc(data.mean||data.meaning_vi||'')}" maxlength="160" placeholder="NGHĨA*"><select class="cp-select cp-type"><option value="">LOẠI TỪ</option><option value="noun">noun</option><option value="verb">verb</option><option value="adjective">adjective</option><option value="adverb">adverb</option><option value="phrase">phrase</option><option value="other">other</option></select><input class="cp-input cp-example" value="${esc(data.example||'')}" placeholder="Ví dụ"><input class="cp-input cp-note" value="${esc(data.note||data.notes||'')}" placeholder="Ghi chú"><button type="button" class="cp-icon-btn cp-ai" title="Kat AI điền nghĩa + phiên âm">✨</button><button type="button" class="cp-icon-btn remove cp-remove" title="Xóa dòng">×</button>`;
    el.querySelector('.cp-type').value=normalizeType(data.type||data.part_of_speech);
    const aiBtn=el.querySelector('.cp-ai'),wordInput=el.querySelector('.cp-word');
    aiBtn.onclick=async()=>{const word=wordInput.value.trim();if(!word){toast('Nhập từ tiếng Anh trước nhé! ✨');wordInput.focus();return}aiBtn.disabled=true;const old=aiBtn.textContent;aiBtn.textContent='…';try{const res=await fetch(endpoint('vocab-assist'),{method:'POST',headers:await authHeaders(),body:JSON.stringify({word})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Kat AI chưa sẵn sàng.');el.querySelector('.cp-mean').value=String(data.meaning||'').trim();el.querySelector('.cp-pron').value=String(data.pronunciation||'').trim()}catch(e){toast('AI chưa điền được: '+(e.message||'Lỗi không xác định'))}finally{aiBtn.disabled=false;aiBtn.textContent=old}};
    el.querySelector('.cp-remove').onclick=()=>{if($$('.cp-row').length<=1)return toast('Bộ từ cần ít nhất một từ nhé!');el.remove();renumber()};
    return el;
  }
  function currentRows(){return[...$$('.cp-row')]}
  function renumber(){const count=currentRows().length;currentRows().forEach((r,i)=>{r.querySelector('.cp-num').textContent='# '+(i+1)});for(const id of ['cpWordCount','cpWordCountFooter']){const el=$('#'+id);if(el)el.textContent=count}}
  function clearAndLoad(words=[]){const wrap=$('#cpRows');wrap.innerHTML='';const list=Array.isArray(words)&&words.length?words:[{}, {}, {}];list.slice(0,100).forEach(w=>wrap.append(row(w)));renumber()}
  function setMode(mode){$$('.cp-mode-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.mode===mode));$$('.cp-mode-panel').forEach(panel=>panel.hidden=panel.dataset.panel!==mode)}
  function showAlert(msg){$('#cpAlert').textContent=msg;$('#cpAlert').classList.add('show')}function hideAlert(){$('#cpAlert').classList.remove('show')}function hideLoading(){const el=$('#cpLoading');if(el)el.style.display='none'}
  function redirectToLogin(){location.href='/login.html?from=create-pack'}
  function lock(message){$('#cpMain').hidden=true;$('#cpLocked').classList.add('show');$('#cpLockText').textContent=message;hideLoading()}
  async function generateAi(kind){
    if(!user)return redirectToLogin();const topic=kind==='topic',prompt=$(topic?'#cpTopicPrompt':'#cpAiPrompt')?.value.trim();if(!prompt)return toast(topic?'Nhập topic trước nhé! ✨':'Mô tả bộ từ bạn muốn Kat tạo trước nhé! ✨');
    const btn=$(topic?'#cpTopicBtn':'#cpAiBtn'),status=$(topic?'#cpTopicStatus':'#cpAiStatus'),count=topic?100:Math.min(100,Math.max(5,Number($('#cpAiCount')?.value)||50)),difficulty=$('#cpAiDifficulty')?.value||'intermediate';btn.disabled=true;const original=btn.textContent;btn.textContent='🤖 Kat đang tạo...';status.textContent=topic?'Kat AI đang tìm các từ quan trọng quanh topic...':`Kat AI đang tạo ${count} từ theo yêu cầu...`;
    try{
      const requestPrompt=topic?'Hãy xây dựng một bộ từ vựng thật đầy đủ và có hệ thống về topic sau: '+prompt+'. Cố gắng bao quát các từ vựng quan trọng, phổ biến và các khía cạnh liên quan của topic, không lặp từ, ưu tiên từ phù hợp học sinh Việt Nam. Trả về càng nhiều từ hữu ích càng tốt trong giới hạn cho phép.':prompt;
      const res=await fetch(endpoint('ai-pack'),{method:'POST',headers:await authHeaders(),body:JSON.stringify({prompt:requestPrompt,wordCount:count,difficulty,purpose:'personal vocabulary pack',wordTypes:'mixed'})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Kat AI chưa sẵn sàng.');
      const words=Array.isArray(data.words)?data.words:[];if(!words.length)throw new Error('Kat AI không trả về từ vựng.');clearAndLoad(words.map(w=>({word:w.word,pron:w.ipa,mean:w.meaning_vi,type:w.part_of_speech,example:w.example,note:w.notes})));
      const suggested=String(data.pack?.suggested_title||'').trim(),name=$('#cpPackName');if(name&&!name.value.trim())name.value=(suggested||prompt).slice(0,80);status.textContent=`✓ Đã tạo ${words.length} từ. Kiểm tra lại trước khi lưu.`;toast('✨ Kat AI đã tạo '+words.length+' từ!');document.querySelector('.cp-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){const msg=String(e.message||'Lỗi không xác định');status.textContent='❌ '+msg;toast('Không tạo được bộ từ: '+msg)}finally{btn.disabled=false;btn.textContent=original}
  }
  function collectWords(){const raw=currentRows().map(r=>({word:r.querySelector('.cp-word').value.trim(),pron:r.querySelector('.cp-pron').value.trim(),mean:r.querySelector('.cp-mean').value.trim(),type:r.querySelector('.cp-type').value,example:r.querySelector('.cp-example').value.trim(),note:r.querySelector('.cp-note').value.trim(),emoji:'📚'})).filter(w=>w.word&&w.mean);const seen=new Set(),words=[];for(const w of raw){const key=w.word.toLowerCase().replace(/\s+/g,' ').trim();if(seen.has(key))continue;seen.add(key);words.push(w)}return{raw,words,duplicates:raw.length-words.length}}
  async function savePack(){
    if(!user)return redirectToLogin();
    const name=$('#cpPackName').value.trim(),data=collectWords();if(!name)return toast('Hãy đặt tên cho bộ từ nhé!');if(!data.raw.length)return toast('Hãy nhập ít nhất một từ có nghĩa!');if(data.words.length>100)return toast('Mỗi bộ từ tối đa 100 từ trong trang này.');
    const btn=$('#cpSave');btn.disabled=true;btn.textContent='⏳ Đang lưu...';hideAlert();if(data.duplicates)toast('Đã tự bỏ '+data.duplicates+' từ bị trùng.');
    try{
      if(!window.studyStore?.createPersonalPack)throw new Error('KatLearn account service chưa sẵn sàng.');
      const saved=await window.studyStore.createPersonalPack({name,words:data.words});
      const savedId=String(saved?.id||'');
      window.dispatchEvent(new CustomEvent('katlearn-personal-pack-open',{detail:{words:data.words,id:savedId,name}}));
      toast(`Đã tạo “${name}” gồm ${data.words.length} từ! 🐱`);
      setTimeout(()=>{location.href='/?created=1#personalPacks'},650);
    }
    catch(e){showAlert('Không thể lưu bộ từ: '+(e.message||'Lỗi không xác định'));toast('Không thể tạo bộ từ lúc này.')}finally{btn.disabled=false;btn.textContent='Tạo bộ từ →'}
  }
  function updateAccountUi(u){user=u||null;const name=u?.displayName||u?.email?.split('@')[0]||'Tài khoản KatLearn';$('#cpName').textContent=name;$('#cpEmail').textContent=u?.email||'';$('#cpAvatar').textContent=(name.trim().charAt(0)||'K').toUpperCase();$('#cpStatusText').textContent=u?'Tài khoản cá nhân đang sẵn sàng tạo bộ từ.':'Chưa đăng nhập — đang chuyển tới trang đăng nhập.'}
  async function boot(){try{if(!window.studyStore)throw new Error('Không tải được KatLearn account service.');await window.studyStore.connect(window.KATLEARN_FIREBASE_CONFIG);const u=await window.studyStore.waitForAuth();if(!u){redirectToLogin();return}updateAccountUi(u);hideLoading()}catch(e){hideLoading();showAlert('Không thể khởi tạo hệ thống tài khoản: '+(e.message||'Lỗi không xác định'));toast('KatLearn chưa kết nối được Firebase.')}}
  window.addEventListener('8b1-auth-change',e=>{if(e.detail)updateAccountUi(e.detail)});
  $('#cpAiBtn').onclick=()=>generateAi('ai');$('#cpTopicBtn').onclick=()=>generateAi('topic');$('#cpSave').onclick=savePack;$$('.cp-mode-tab').forEach(tab=>tab.onclick=()=>setMode(tab.dataset.mode));$('#cpAddRow').onclick=()=>{const r=row();$('#cpRows').append(r);renumber()};$('#cpReset').onclick=()=>{clearAndLoad();$('#cpPackName').value='';hideAlert();toast('Đã làm mới trình soạn bộ từ.')};setMode('ai');clearAndLoad();boot();
})();