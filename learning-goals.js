/* KatLearn streak goals: server-authoritative challenge progress and rewards. */
(function(){
  'use strict';
  const VALID_GOALS=[7,10,20,30,50];
  const $=id=>document.getElementById(id);
  const card=$('streakGoalCard');
  if(!card)return;
  const setup=$('streakGoalSetup'),active=$('streakGoalActive'),message=$('streakGoalMessage');
  const ring=$('streakGoalRingProgress');
  let state={target:0,progress:0,completed:false,remaining:0},busy=false;

  function normalizeGoal(raw){
    const target=VALID_GOALS.includes(Number(raw?.target))?Number(raw.target):0;
    const progress=target?Math.max(0,Math.min(target,Math.floor(Number(raw?.progress)||0))):0;
    return{target,progress,completed:Boolean(raw?.completed)||(target>0&&progress>=target),remaining:target?Math.max(0,target-progress):0,rewarded:Boolean(raw?.rewarded)};
  }
  function setMessage(text,type=''){
    if(!message)return;
    message.textContent=text||'';
    message.className='streak-goal-message'+(type?' is-'+type:'');
  }
  function currentStreak(value){
    const node=$('currentStreakValue');
    if(node&&Number.isFinite(Number(value)))node.textContent=Math.max(0,Math.floor(Number(value))).toLocaleString('vi-VN')+' ngày';
  }
  function renderGoal(raw,options={}){
    state=normalizeGoal(raw);
    window.katlearnStreakGoalState={...state};
    window.dispatchEvent(new CustomEvent('katlearn-streak-goal-state',{detail:{...state,justCompleted:Boolean(options.justCompleted)}}));
    const target=state.target,progress=state.progress,completed=state.completed;
    const status=$('streakGoalStatus');
    if(!target){
      setup.hidden=false;active.hidden=true;
      if(status)status.textContent='Bắt đầu hành trình';
      const heading=$('streakGoalHeading');if(heading)heading.textContent='Chọn mục tiêu streak';
      if(ring)ring.style.strokeDashoffset='100';
      return;
    }
    setup.hidden=true;active.hidden=false;
    if(status)status.textContent=completed?'Đã chinh phục':('Đang tiến tới '+target+' ngày');
    const count=$('streakGoalCount');if(count)count.textContent=progress+'/'+target;
    const title=$('streakGoalTitle');if(title)title.textContent='Thử thách '+target+' ngày';
    const meta=$('streakGoalMeta');
    if(meta)meta.textContent=completed?'Bạn đã giữ nhịp học đủ '+target+' ngày liên tiếp. Hẹn gặp ở thử thách tiếp theo!':('Còn '+state.remaining+' ngày học đúng để hoàn thành. Mỗi ngày chỉ tính một lần.');
    if(ring)ring.style.strokeDashoffset=String(100-(progress/target*100));
    const graphic=$('streakGoalRingGraphic');
    if(graphic)graphic.setAttribute('aria-label','Đã hoàn thành '+progress+' trên '+target+' ngày của mục tiêu streak');
    const reward=$('streakGoalReward');if(reward)reward.hidden=!completed;
    const newButton=$('streakGoalNew');if(newButton)newButton.hidden=!completed;
    const changeButton=$('streakGoalChange');if(changeButton)changeButton.hidden=completed||progress>0;
    if(completed&&options.justCompleted){
      card.classList.remove('streak-goal-complete');
      void card.offsetWidth;
      card.classList.add('streak-goal-complete');
      setMessage('🏆 Tuyệt vời! Máy chủ đã xác nhận phần thưởng 1.000 KatCoin.', 'success');
    }
  }
  let goalLoadPromise=null;
  let goalLoadUid='';
  async function loadStoredGoal(){
    if(goalLoadPromise)return goalLoadPromise;
    goalLoadPromise=(async()=>{
      let uid='';
      try{
        const store=window.studyStore;
        const user=await store?.waitForAuth?.();
        uid=String(user?.uid||'');
        if(!uid){
          goalLoadUid='';
          currentStreak(0);
          renderGoal({target:0,progress:0,completed:false});
          return null;
        }
        const token=await store.getIdToken(true);
        if(!token)throw new Error('Phiên đăng nhập chưa sẵn sàng.');
        const response=await fetch('/api/study-progress',{
          method:'POST',cache:'no-store',
          headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
          body:JSON.stringify({action:'get-goal'})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.ok)throw new Error(data.error||'Không tải được mục tiêu streak.');
        if(String(window.studyStore?.user?.uid||'')!==uid)return null;
        goalLoadUid=uid;
        currentStreak(data.streak);
        renderGoal(data.goal||{target:0,progress:0,completed:false});
        return data;
      }catch(error){
        console.warn('[KatLearn] Load streak goal:',error?.message||error);
        if(!state.target)setMessage('Chưa tải được mục tiêu streak. Kiểm tra kết nối rồi thử lại nhé.','error');
        return null;
      }finally{
        goalLoadPromise=null;
      }
    })();
    return goalLoadPromise;
  }
  function fromProfile(profile){
    if(profile&&Number.isFinite(Number(profile.streak)))currentStreak(profile.streak);
    // Challenge progress lives in the server-only streakChallenges collection,
    // never in the user-editable account profile.
    void loadStoredGoal();
  }
  async function authToken(){
    const store=window.studyStore;
    const user=await store?.waitForAuth?.();
    if(!user)throw new Error('Hãy đăng nhập để lưu mục tiêu streak vào tài khoản.');
    const token=await store.getIdToken(true);
    if(!token)throw new Error('Phiên đăng nhập chưa sẵn sàng. Hãy thử lại nhé.');
    return token;
  }
  async function chooseGoal(target,button){
    if(busy)return;
    if(!VALID_GOALS.includes(Number(target)))return;
    busy=true;
    const buttons=[...card.querySelectorAll('[data-streak-goal]')];
    buttons.forEach(b=>b.disabled=true);
    if(button)button.setAttribute('aria-busy','true');
    setMessage('Đang lưu mục tiêu vào tài khoản KatLearn…');
    try{
      const token=await authToken();
      const response=await fetch('/api/study-progress',{
        method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({action:'set-goal',goal:Number(target)})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.error||'Chưa thể lưu mục tiêu lúc này.');
      renderGoal(data.goal);
      setMessage('Đã chọn mục tiêu '+target+' ngày. Bắt đầu bằng một câu học đúng hôm nay nhé!','success');
    }catch(error){
      setMessage(error?.message||'Không thể lưu mục tiêu. Hãy thử lại nhé.','error');
    }finally{
      busy=false;
      buttons.forEach(b=>b.disabled=false);
      if(button)button.removeAttribute('aria-busy');
    }
  }
  card.querySelectorAll('[data-streak-goal]').forEach(button=>{
    button.addEventListener('click',()=>chooseGoal(button.dataset.streakGoal,button));
  });
  function showGoalPicker(){
    if(busy)return;
    active.hidden=true;setup.hidden=false;
    const heading=$('streakGoalHeading');
    if(heading)heading.textContent=state.completed?'Chọn thử thách tiếp theo':'Đổi mục tiêu streak';
    setMessage('');
    card.querySelector('[data-streak-goal]')?.focus();
  }
  $('streakGoalNew')?.addEventListener('click',showGoalPicker);
  $('streakGoalChange')?.addEventListener('click',showGoalPicker);

  window.addEventListener('katlearn-account-ready',event=>fromProfile(event.detail?.profile||window.katlearnAccount?.profile));
  window.addEventListener('8b1-auth-change',()=>{
    const profile=window.katlearnAccount?.profile;
    if(profile&&Number.isFinite(Number(profile.streak)))currentStreak(profile.streak);
    if(!window.studyStore?.user){
      goalLoadUid='';
      currentStreak(0);
      renderGoal({target:0,progress:0,completed:false});
    }else void loadStoredGoal();
  });
  window.addEventListener('katlearn-streak-updated',event=>{
    const data=event.detail||{};
    if(Number.isFinite(Number(data.streak)))currentStreak(data.streak);
    if(data.streakGoal){
      const wasComplete=state.completed;
      renderGoal(data.streakGoal,{justCompleted:!wasComplete&&Boolean(data.streakGoal.completed)&&Number(data.goalRewardCoins||0)>=1000});
    }
  });
  if(window.katlearnAccount?.profile)currentStreak(window.katlearnAccount.profile.streak);
  void loadStoredGoal();
})();