/* Firebase browser data layer. */
(function(){
  let db=null,auth=null,api={},currentUser=null,authReady=null;
  window.KATLEARN_FIREBASE_CONFIG={apiKey:'AIzaSyCgMDdCP0R5fW3QjhYrd3Ab8AJH3xYGiz8',authDomain:'elp---katlearn.firebaseapp.com',projectId:'elp---katlearn',storageBucket:'elp---katlearn.firebasestorage.app',messagingSenderId:'344478447672',appId:'1:344478447672:web:4ed109a40303d0b41b0ecd',measurementId:'G-KTW11GD97T'};
  const guestId=localStorage.getItem('8b1-guest-id')||crypto.randomUUID();localStorage.setItem('8b1-guest-id',guestId);
  function renderAccountUi(user){
    const loginBtn=document.querySelector('#loginBtn'),trigger=document.querySelector('#accountTrigger'),panel=document.querySelector('#accountPanel');
    if(!loginBtn||!trigger)return false;
    const avatar=document.querySelector('#accountAvatar'),panelAvatar=document.querySelector('#panelAvatar'),name=document.querySelector('#accountName'),panelName=document.querySelector('#panelName'),email=document.querySelector('#panelEmail');
    const logout=document.querySelector('#logoutBtn');
    if(!user){
      loginBtn.hidden=false;trigger.hidden=true;if(panel)panel.hidden=true;
      if(name)name.textContent='Tài khoản';if(panelName)panelName.textContent='Tài khoản KatLearn';if(email)email.textContent='';
      if(avatar)avatar.textContent='K';if(panelAvatar)panelAvatar.textContent='K';
      return true;
    }
    const displayName=user.displayName||user.email?.split('@')[0]||'KatLearn Student';
    const initial=displayName.trim().charAt(0).toUpperCase()||'K';
    loginBtn.hidden=true;trigger.hidden=false;
    if(avatar)avatar.textContent=initial;if(panelAvatar)panelAvatar.textContent=initial;
    if(name)name.textContent=displayName;if(panelName)panelName.textContent=displayName;if(email)email.textContent=user.email||'';
    if(trigger.dataset.authBound!=='1'){
      trigger.dataset.authBound='1';
      trigger.onclick=()=>{if(panel)panel.hidden=!panel.hidden};
    }
    if(logout&&logout.dataset.authBound!=='1'){
      logout.dataset.authBound='1';
      logout.onclick=async()=>{
        if(logout.disabled)return;
        logout.disabled=true;logout.textContent='⏳ Đang đăng xuất...';
        try{await window.studyStore.signOut();sessionStorage.removeItem('katlearn-login-toast');if(panel)panel.hidden=true;location.replace('/login.html')}
        catch(e){console.error('[KatLearn] Logout failed:',e);logout.disabled=false;logout.textContent='↪ Đăng xuất';alert('Không thể đăng xuất lúc này. Hãy thử lại nhé.')}
      };
    }
    return true;
  }
  function notifyAuth(user){
    renderAccountUi(user);
    window.dispatchEvent(new CustomEvent('8b1-auth-change',{detail:user||null}));
  }
  window.studyStore={
    get userId(){return currentUser?.uid||guestId},get user(){return currentUser},
    isAdmin(){return !!currentUser&&window.KATLEARN_ADMIN_EMAILS.includes((currentUser.email||'').toLowerCase())},
    async connect(config){
      if(!config?.apiKey||!config?.projectId)throw new Error('Firebase config chưa đầy đủ');
      const [{initializeApp,getApps},{getFirestore,doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit},{getAuth,GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')]);
      const app=getApps().length?getApps()[0]:initializeApp(config);db=getFirestore(app);api={doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit};auth=getAuth(app);api.auth={GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword};
      authReady=new Promise(resolve=>api.auth.onAuthStateChanged(auth,user=>{currentUser=user;notifyAuth(user);resolve(user)}));
      await authReady;
      if(currentUser){try{const profile=await this.loadProfile();let pending=null;try{pending=JSON.parse(localStorage.getItem('katlearn-pending-profile')||'null')}catch(_){}if(pending&&pending.email&&currentUser.email&&pending.email.toLowerCase()===currentUser.email.toLowerCase()){await this.saveProfile({displayName:pending.displayName||currentUser.displayName||currentUser.email.split('@')[0],email:currentUser.email,role:pending.role||'student',provider:pending.provider||'password'});localStorage.removeItem('katlearn-pending-profile')}else if(!profile){await this.saveProfile({displayName:currentUser.displayName||currentUser.email?.split('@')[0]||'KatLearn Student',email:currentUser.email||'',provider:'password',coins:0,energy:0,streak:0,__coinsAuthoritative:true})}notifyAuth(currentUser)}catch(e){console.warn('[KatLearn] Firestore profile sync skipped:',e?.message||e)}}
      return true;
    },
    connected(){return !!db},
    async loadProfile(){if(!db||!currentUser)return null;const snap=await api.getDoc(api.doc(db,'users',this.userId));return snap.exists()?{id:snap.id,...snap.data()}:null},
    async getRole(){const p=await this.loadProfile();return String(p?.role||'student').toLowerCase()},
    async getIdToken(forceRefresh=true){return currentUser?currentUser.getIdToken(forceRefresh):null},
    async signInCustomToken(token){if(!auth)throw new Error('Hãy kết nối Firebase trước.');const {signInWithCustomToken}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const result=await signInWithCustomToken(auth,token);currentUser=result.user;notifyAuth(currentUser);return currentUser},
    async signIn(providerName){
      if(!auth)throw new Error('Hãy kết nối Firebase trước.');
      const provider=providerName==='apple'?new api.auth.OAuthProvider('apple.com'):new api.auth.GoogleAuthProvider();
      if(providerName==='apple')provider.addScope('email');
      const result=await api.auth.signInWithPopup(auth,provider);
      currentUser=result.user;notifyAuth(currentUser);
      void (async()=>{try{const profile=await this.loadProfile();if(!profile)await this.saveProfile({coins:0,energy:0,streak:0,__coinsAuthoritative:true});await this.saveProfile({displayName:currentUser.displayName||currentUser.email?.split('@')[0]||'KatLearn Student',email:currentUser.email||'',photoURL:currentUser.photoURL||'',provider:providerName})}catch(e){console.warn('[KatLearn] Background Firestore sync skipped after sign-in:',e?.message||e)}})();
      return currentUser;
    },
    async signInEmail(email,password,create=false){
      if(!auth)throw new Error('Hãy kết nối Firebase trước.');
      const action=create?api.auth.createUserWithEmailAndPassword:api.auth.signInWithEmailAndPassword;
      const result=await action(auth,email,password);
      currentUser=result.user;notifyAuth(currentUser);
      void (async()=>{try{const profile=await this.loadProfile();if(!profile)await this.saveProfile({coins:0,energy:0,streak:0,__coinsAuthoritative:true});if(!create)await this.saveProfile({displayName:currentUser.displayName||currentUser.email?.split('@')[0]||'KatLearn Student',email:currentUser.email||'',provider:'password'});else await this.saveProfile({displayName:currentUser.email?.split('@')[0]||'KatLearn Student',email:currentUser.email||'',provider:'password'})}catch(e){console.warn('[KatLearn] Background Firestore sync skipped after email auth:',e?.message||e)}})();
      return currentUser;
    },
    async signOut(){
      if(auth)await api.auth.signOut(auth);
      currentUser=null;notifyAuth(null);
    },
    async saveProfile(data){if(!db||!currentUser)return;const user=currentUser,payload={...data};['__coinsAuthoritative','coins','energy','streak','questionsAnswered','correctAnswers','ownedThemes'].forEach(k=>delete payload[k]);return api.setDoc(api.doc(db,'users',this.userId),{displayName:user.displayName||user.email?.split('@')[0]||'KatLearn Student',email:user.email||'',photoURL:user.photoURL||'',updatedAt:api.serverTimestamp(),...payload},{merge:true})},
    async recordAnswer(data){if(!db||!currentUser)return;await api.addDoc(api.collection(db,'users',this.userId,'attempts'),{...data,createdAt:api.serverTimestamp()});await this.saveProfile({lastStudyAt:api.serverTimestamp()})},
    async purchase(item){if(!db||!currentUser)return;return api.setDoc(api.doc(db,'users',this.userId,'items',item.id),{...item,boughtAt:api.serverTimestamp()})},
    async createPublicPack(pack){if(!db||!currentUser||!this.isAdmin())throw new Error('Bạn không có quyền quản trị.');return api.addDoc(api.collection(db,'publicPacks'),{...pack,createdBy:currentUser.uid,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()})},
    async createPersonalPack(pack){if(!db||!currentUser)throw new Error('Hãy đăng nhập để tạo bộ từ riêng.');return api.addDoc(api.collection(db,'users',this.userId,'personalPacks'),{...pack,createdByUid:currentUser.uid,createdByEmail:currentUser.email||'',createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()})},
    async personalPacks(){if(!db||!currentUser)return[];const snap=await api.getDocs(api.query(api.collection(db,'users',this.userId,'personalPacks'),api.orderBy('createdAt','desc'),api.limit(100)));return snap.docs.map(d=>({id:d.id,...d.data()}))},
    async publicPacks(){if(!db)return[];const snap=await api.getDocs(api.query(api.collection(db,'publicPacks'),api.orderBy('createdAt','desc'),api.limit(50)));return snap.docs.map(d=>({id:d.id,...d.data()}))},
    async leaderboard(){if(!db)return[];const snap=await api.getDocs(api.query(api.collection(db,'users'),api.orderBy('energy','desc'),api.limit(20)));return snap.docs.map(d=>({id:d.id,...d.data()}))}
  };
  const TEACHER_HOME='https://teacher-katlearn.vercel.app',SSO_EXCHANGE=TEACHER_HOME+'/.netlify/functions/auth-exchange';
  const isMainLms=()=>{const p=location.pathname;return(p==='/'||p.endsWith('/index.html'))&&!/login\.html|signup\.html|sso-bridge\.html/.test(p)};
  let guardStarted=false;
  async function handleLmsSso(){
    if(!isMainLms()||guardStarted)return;guardStarted=true;
    const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.replace(/^#/,'')||''),incoming=hash.get('katlearn_id_token');
    if(incoming){history.replaceState(null,document.title,location.pathname+location.search);try{const r=await fetch(SSO_EXCHANGE,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:incoming,target:'lms'})}),d=await r.json();if(r.ok&&d.customToken){await window.studyStore.signInCustomToken(d.customToken);if(d.role==='teacher')location.replace(TEACHER_HOME);return}}catch(e){console.warn('[KatLearn SSO] incoming session failed:',e)}}
    const role=window.studyStore.user?await window.studyStore.getRole().catch(()=>null):null;if(role==='teacher'){location.replace(TEACHER_HOME);return}if(window.studyStore.user||params.has('sso'))return;if(sessionStorage.getItem('katlearn-sso-lms-attempt')==='1')return;sessionStorage.setItem('katlearn-sso-lms-attempt','1');location.replace(TEACHER_HOME+'/sso-bridge.html');
  }
  window.addEventListener('8b1-auth-change',()=>setTimeout(()=>handleLmsSso(),0));setTimeout(()=>handleLmsSso(),0);
  document.addEventListener('DOMContentLoaded',()=>{renderAccountUi(currentUser)}, {once:true});
})();