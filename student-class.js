(function(){
  const css=`
    .student-class-page{padding-bottom:40px}
    .class-hero{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:26px 28px;background:linear-gradient(135deg,#fff4f6,#f6f2ff);border:1px solid #eee6f0;border-radius:24px;margin-bottom:22px}
    .class-hero h2{margin:5px 0;font:700 25px Fredoka,'Be Vietnam Pro',sans-serif;color:#3f3549}
    .class-hero p{margin:0;color:#7e7488;font:500 13px/1.6 'Be Vietnam Pro',sans-serif}
    .class-code-pill{display:flex;align-items:center;gap:12px;background:#fff;border:1px dashed #e6a0ae;border-radius:16px;padding:12px 14px}
    .class-code-pill b{font:800 22px/1 Fredoka,sans-serif;letter-spacing:.16em;color:#d95f78}
    .student-class-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
    .student-class-card{background:#fff;border:1px solid #eee8ef;border-radius:20px;padding:20px;box-shadow:0 10px 30px #3c31500b}
    .student-class-card h3{margin:0 0 5px;font:700 18px Fredoka,'Be Vietnam Pro',sans-serif;color:#44394f}
    .student-class-card p{margin:4px 0;color:#857b8c;font:500 12px/1.6 'Be Vietnam Pro',sans-serif}
    .student-class-card .class-card-actions{display:flex;gap:8px;margin-top:14px}
    .student-class-empty{text-align:center;padding:38px 20px;color:#8b8191;background:#fff;border:1px dashed #ddd3e2;border-radius:20px}
    .student-class-empty b{display:block;color:#51475b;font:700 18px Fredoka,sans-serif;margin-bottom:5px}
    .class-join-modal{position:fixed;inset:0;z-index:99990;display:none;place-items:center;padding:20px;background:#2e25334d}
    .class-join-modal.show{display:grid}
    .class-join-box{width:min(460px,100%);background:#fff;border-radius:24px;padding:28px;box-shadow:0 30px 100px #241b2d33}
    .class-join-box h2{margin:0 0 7px;font:700 24px Fredoka,sans-serif;color:#44394f}
    .class-join-box p{margin:0 0 18px;color:#817689;font:500 13px/1.6 'Be Vietnam Pro',sans-serif}
    .class-join-box input{text-transform:uppercase;letter-spacing:.2em;text-align:center;font:800 22px Fredoka,sans-serif;width:100%;box-sizing:border-box;padding:14px;border:1px solid #e6dce8;border-radius:14px}
    .class-join-actions{display:flex;gap:9px;margin-top:14px}
    .class-join-actions button{flex:1}
    @media(max-width:700px){.class-hero{display:block}.class-code-pill{margin-top:14px;justify-content:center}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  function page(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));document.getElementById(id)?.classList.add('active-page');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));document.querySelector('.sidebar')?.classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});if(id==='studentClasses')render()}
  function toast(msg){const t=document.querySelector('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}}
  function ensurePage(){
    if(document.getElementById('studentClasses'))return;
    const main=document.querySelector('main');const progress=document.getElementById('progress');if(!main||!progress)return;
    const nav=document.querySelector('.sidebar nav');if(nav){const b=document.createElement('button');b.className='nav-item';b.dataset.page='studentClasses';b.innerHTML='<span>🏫</span> Lớp học';b.onclick=()=>page('studentClasses');const ref=[...nav.querySelectorAll('.nav-item')].find(x=>x.dataset.page==='progress');ref?nav.insertBefore(b,ref):nav.appendChild(b)}
    const sec=document.createElement('section');sec.id='studentClasses';sec.className='page student-class-page';sec.innerHTML=`
      <div class="page-intro"><div><p class="eyebrow">CLASSROOM</p><h1>Lớp học</h1><p class="subtext">Tham gia lớp bằng mã giáo viên gửi cho bạn.</p></div><button class="add-word-btn" id="joinClassBtn">＋ Tham gia lớp</button></div>
      <div id="studentClassContent"></div>`;
    main.insertBefore(sec,progress);
    const modal=document.createElement('div');modal.className='class-join-modal';modal.id='classJoinModal';modal.innerHTML=`<div class="class-join-box"><h2>Tham gia lớp học 🏫</h2><p>Nhập mã 6 ký tự do giáo viên cung cấp. Mã không phân biệt chữ hoa/thường.</p><input id="classJoinCode" maxlength="6" placeholder="ABC123" autocomplete="off"><div class="class-join-actions"><button class="teacher-btn secondary" id="closeJoinClass">Hủy</button><button class="primary-btn" id="confirmJoinClass">Tham gia</button></div></div>`;document.body.appendChild(modal);
    document.getElementById('joinClassBtn').onclick=()=>{modal.classList.add('show');setTimeout(()=>document.getElementById('classJoinCode')?.focus(),50)};
    document.getElementById('closeJoinClass').onclick=()=>modal.classList.remove('show');
    document.getElementById('confirmJoinClass').onclick=join;
    document.getElementById('classJoinCode').onkeydown=e=>{if(e.key==='Enter')join()};
  }
  async function render(){
    const box=document.getElementById('studentClassContent');if(!box)return;
    if(!window.studyStore?.user){box.innerHTML='<div class="student-class-empty"><b>Đăng nhập để tham gia lớp</b>Hãy đăng nhập tài khoản học sinh trước nhé.</div>';return}
    try{
      const classes=await window.studyStore.myClasses();
      box.innerHTML=classes.length?`<div class="class-hero"><div><span class="eyebrow">LỚP CỦA BẠN</span><h2>Bạn đang tham gia ${classes.length} lớp</h2><p>Giáo viên có thể giao nội dung và theo dõi tiến độ của bạn tại cổng Teacher.</p></div><div class="class-code-pill"><span>Mã lớp mới</span><b>••••••</b></div></div><div class="student-class-list">${classes.map(c=>`<article class="student-class-card"><h3>${esc(c.name)}</h3><p>${esc(c.description||'Chưa có mô tả')}</p><p>Khối ${esc(c.grade||'—')} · Giáo viên: ${esc(c.teacherEmail||'KatLearn Teacher')}</p><div class="class-card-actions"><button class="teacher-btn danger" data-leave-class="${c.id}">Rời lớp</button></div></article>`).join('')}</div>`:'<div class="student-class-empty"><b>Bạn chưa tham gia lớp nào 🐾</b>Bấm “＋ Tham gia lớp” và nhập mã giáo viên gửi cho bạn.</div>';
      box.querySelectorAll('[data-leave-class]').forEach(b=>b.onclick=async()=>{if(!confirm('Rời lớp này?'))return;try{await window.studyStore.leaveClass(b.dataset.leaveClass);toast('Đã rời lớp');render()}catch(e){toast('Không thể rời lớp: '+e.message)}})
    }catch(e){box.innerHTML='<div class="student-class-empty"><b>Không tải được lớp</b>'+esc(e.message||'Đã xảy ra lỗi')+'</div>'}
  }
  function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  async function join(){
    const modal=document.getElementById('classJoinModal'),input=document.getElementById('classJoinCode'),code=input.value.trim().toUpperCase();if(!code)return toast('Nhập mã lớp trước nhé.');
    const btn=document.getElementById('confirmJoinClass');btn.disabled=true;btn.textContent='Đang tham gia...';
    try{const cls=await window.studyStore.joinClass(code);modal.classList.remove('show');input.value='';toast('✓ Đã tham gia lớp '+cls.name);await render()}catch(e){toast(e.message||'Không thể tham gia lớp')}finally{btn.disabled=false;btn.textContent='Tham gia'}
  }
  window.addEventListener('8b1-auth-change',()=>setTimeout(render,0));
  document.addEventListener('DOMContentLoaded',()=>{ensurePage();setTimeout(render,0)},{once:true});
  window.katlearnStudentClasses={open:()=>page('studentClasses'),render};
})();