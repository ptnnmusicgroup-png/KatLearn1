(function(){
  const css=`
    .student-class-page{padding-bottom:40px}
    .student-class-empty{text-align:center;padding:42px 22px;color:#8b8191;background:#fff;border:1px dashed #ddd3e2;border-radius:20px}
    .student-class-empty b{display:block;color:#51475b;font:700 19px Fredoka,sans-serif;margin-bottom:7px}
    .student-class-card{background:#fff;border:1px solid #eee8ef;border-radius:20px;padding:20px;box-shadow:0 10px 30px #3c31500b;margin-bottom:14px}
    .student-class-card h3{margin:0 0 6px;font:700 18px Fredoka,sans-serif;color:#44394f}
    .student-class-card p{margin:4px 0;color:#857b8c;font:500 12px/1.6 'Be Vietnam Pro',sans-serif}
    .class-waiting{display:inline-flex;margin-top:10px;padding:7px 10px;border-radius:999px;background:#fff7e9;color:#9a7440;font-size:10px;font-weight:800}
  `;
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  function page(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));document.getElementById(id)?.classList.add('active-page');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='studentClasses')render()}
  function ensurePage(){
    if(document.getElementById('studentClasses'))return;
    const main=document.querySelector('main'),progress=document.getElementById('progress');if(!main||!progress)return;
    const nav=document.querySelector('.sidebar nav');if(nav){const b=document.createElement('button');b.className='nav-item';b.dataset.page='studentClasses';b.innerHTML='<span>🏫</span> Lớp học';b.onclick=()=>page('studentClasses');nav.appendChild(b)}
    const sec=document.createElement('section');sec.id='studentClasses';sec.className='page student-class-page';sec.innerHTML='<div class="page-intro"><div><p class="eyebrow">CLASSROOM</p><h1>Lớp học</h1><p class="subtext">Tài khoản lớp học được GV quản trị trực tiếp.</p></div></div><div id="studentClassContent"></div>';
    main.insertBefore(sec,progress);
  }
  function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  async function render(){
    const box=document.getElementById('studentClassContent');if(!box)return;
    const u=window.studyStore?.user;if(!u){box.innerHTML='<div class="student-class-empty"><b>Đăng nhập để xem lớp</b>Hãy đăng nhập tài khoản học sinh trước nhé.</div>';return}
    try{
      const profile=await window.studyStore.loadProfile();
      if(profile?.studentAccountType==='free'){box.innerHTML='<div class="student-class-empty"><b>🐾 Tài khoản tự do</b>Tha hồ quậy phá các pack từ vựng. Tài khoản này không cần tham gia lớp.</div>';return}
      const ids=Array.isArray(profile?.joinedClassIds)?profile.joinedClassIds:[];
      if(!ids.length){
        box.innerHTML='<div class="student-class-empty"><b>⏳ Chờ GV quản trị thêm vào lớp</b>Bạn đã chọn tài khoản lớp học. Khi GV thêm tài khoản của bạn vào nhóm lớp, lớp sẽ xuất hiện ở đây.</div>';
        return;
      }
      const [{initializeApp,getApps},{getFirestore,doc,getDoc}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);
      const app=getApps().length?getApps()[0]:initializeApp(window.KATLEARN_FIREBASE_CONFIG),db=getFirestore(app);
      const rows=(await Promise.all(ids.slice(0,20).map(async id=>{try{const snap=await getDoc(doc(db,'classes',id));return snap.exists()?{id:snap.id,...snap.data()}:null}catch(_){return null}}))).filter(Boolean);
      box.innerHTML=rows.map(c=>'<article class="student-class-card"><h3>'+esc(c.name||profile.className||'Lớp học')+'</h3><p>Khối '+esc(c.grade||'—')+' · Trường: '+esc(c.schoolName||profile.schoolName||'KatLearn')+' · Giáo viên: '+esc(c.teacherEmail||'KatLearn Teacher')+'</p><span class="class-waiting">✓ Đã được GV quản trị</span></article>').join('')||'<div class="student-class-empty"><b>⏳ Chờ GV quản trị thêm vào lớp</b>Chưa có lớp nào được gán cho tài khoản này.</div>';
    }catch(e){box.innerHTML='<div class="student-class-empty"><b>Không tải được lớp</b>'+esc(e.message||'Đã xảy ra lỗi')+'</div>'}
  }
  window.addEventListener('8b1-auth-change',()=>setTimeout(render,0));
  document.addEventListener('DOMContentLoaded',()=>{ensurePage();setTimeout(render,0)},{once:true});
  window.katlearnStudentClasses={open:()=>page('studentClasses'),render};
})();