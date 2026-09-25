/* Firebase browser data layer. */
(function(){
  let db=null,auth=null,api={},currentUser=null,authReady=null,connectPromise=null,lastAuthUid=undefined;
  window.KATLEARN_FIREBASE_CONFIG={apiKey:'AIzaSyCgMDdCP0R5fW3QjhYrd3Ab8AJH3xYGiz8',authDomain:'elp---katlearn.firebaseapp.com',projectId:'elp---katlearn',storageBucket:'elp---katlearn.firebasestorage.app',messagingSenderId:'344478447672',appId:'1:344478447672:web:4ed109a40303d0b41b0ecd',measurementId:'G-KTW11GD97T'};
  const guestId=localStorage.getItem('8b1-guest-id')||crypto.randomUUID();localStorage.setItem('8b1-guest-id',guestId);
  function stripVietnamese(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function accountPart(value,fallback){const clean=stripVietnamese(value).trim().replace(/[^a-zA-Z0-9.@_-]+/g,'');return clean||fallback}
  function displayAccountPart(value,fallback){const clean=stripVietnamese(value).trim().replace(/[^a-zA-Z0-9]+/g,'');return clean||fallback}
  function createAccountPrefix(user){
    const login=String(user?.email||'').split('@')[0]||'katlearn';
    const display=user?.displayName||login||'student';
    return {login:accountPart(login,'katlearn'),display:displayAccountPart(display,'Student')};
  }
  function formatAccountCode(prefix,number){
    return prefix.login+'_'+prefix.display+'_'+String(number).padStart(3,'0');
  }
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
    const uid=user?.uid||null;
    if(uid===lastAuthUid)return;
    lastAuthUid=uid;
    window.dispatchEvent(new CustomEvent('8b1-auth-change',{detail:user||null}));
  }
  window.studyStore={
    get userId(){return currentUser?.uid||guestId},get user(){return currentUser},
    isAdmin(){return !!currentUser&&window.KATLEARN_ADMIN_EMAILS.includes((currentUser.email||'').toLowerCase())},
    async connect(config){
      if(!config?.apiKey||!config?.projectId)throw new Error('Firebase config chưa đầy đủ');
      if(db&&auth){
        const currentApp=auth.app;
        if(currentApp?.options?.apiKey===config.apiKey&&currentApp?.options?.projectId===config.projectId)return true;
        if(connectPromise)return connectPromise;
      }
      if(connectPromise)return connectPromise;

      connectPromise=(async()=>{
        const [{initializeApp,getApps,deleteApp},{getFirestore,doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit,where,updateDoc,deleteDoc,runTransaction},{getAuth,GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword}]=await Promise.all([
          import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
          import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')
        ]);
        const existing=getApps()[0];
        if(existing){
          await deleteApp(existing);
          db=null;auth=null;api=null;authReady=null;currentUser=null;notifyAuth(null);
        }
        const app=initializeApp(config);
        db=getFirestore(app);
        api={doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit,where,updateDoc,deleteDoc,runTransaction};
        auth=getAuth(app);
        api.auth={GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword};

        authReady=new Promise(resolve=>api.auth.onAuthStateChanged(auth,user=>{
          currentUser=user;
          notifyAuth(user);
          resolve(user);
        }));

        // Profile hydration is owned by auth-sync.js so each auth event has one sync owner.\n        return true;
      })().finally(()=>{connectPromise=null});

      return connectPromise;
    },
    connected(){return !!db},
    async waitForAuth(){return authReady?await authReady:null},
    async loadProfile(){if(!db||!currentUser)return null;const snap=await api.getDoc(api.doc(db,'users',this.userId));return snap.exists()?{id:snap.id,...snap.data()}:null},
    async ensureAccountNamespace(){
      const user=currentUser;if(!user||!db)throw new Error('Hãy đăng nhập trước.');
      const uid=user.uid;
      const profile=await this.loadProfile();
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');

      if(profile?.accountCode){
        const code=String(profile.accountCode);
        const accountRef=api.doc(db,'accounts',code);
        const memoryRef=api.doc(db,'accounts',code,'memory','meta');
        const snap=await api.getDoc(accountRef);
        if(!snap.exists()){
          await api.setDoc(accountRef,{
            accountCode:code,uid,email:user.email||'',displayName:user.displayName||'',
            loginName:String(user.email||'').split('@')[0]||'katlearn',
            createdAt:profile.createdAt||api.serverTimestamp(),updatedAt:api.serverTimestamp()
          },{merge:false});
          await api.setDoc(memoryRef,{accountCode:code,uid,updatedAt:api.serverTimestamp()},{merge:true});
        }else{
          await api.setDoc(accountRef,{uid,email:user.email||'',displayName:user.displayName||'',updatedAt:api.serverTimestamp()},{merge:true});
          await api.setDoc(memoryRef,{accountCode:code,uid,updatedAt:api.serverTimestamp()},{merge:true});
        }
        return code;
      }

      const prefix=createAccountPrefix(user);
      const sequenceRef=api.doc(db,'system','accountSequence');
      const result=await api.runTransaction(db,async tx=>{
        const seqSnap=await tx.get(sequenceRef);
        let next=Number(seqSnap.exists()?seqSnap.data()?.lastIssued:0)+1;
        let code=formatAccountCode(prefix,next);
        let accountRef=api.doc(db,'accounts',code);
        let accountSnap=await tx.get(accountRef);
        while(accountSnap.exists()){
          next++;
          code=formatAccountCode(prefix,next);
          accountRef=api.doc(db,'accounts',code);
          accountSnap=await tx.get(accountRef);
        }
        const memoryRef=api.doc(db,'accounts',code,'memory','meta');
        tx.set(sequenceRef,{lastIssued:next,updatedAt:api.serverTimestamp()},{merge:true});
        tx.set(accountRef,{
          accountCode:code,uid,email:user.email||'',displayName:user.displayName||'',
          loginName:prefix.login,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()
        },{merge:false});
        tx.set(memoryRef,{accountCode:code,uid,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()},{merge:true});
        return code;
      });

      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      await this.saveProfile({accountCode:result},uid);
      return currentUser?.uid===uid?result:null;
    },
    async ensureAccountCode(){return this.ensureAccountNamespace();},
    async getRole(){const p=await this.loadProfile();return String(p?.role||'student').toLowerCase()},
    async getAccountType(){const p=await this.loadProfile();return String(p?.studentAccountType||'free').toLowerCase()==='class'?'class':'free'},
    async isClassStudent(){return !!this.user&&await this.getAccountType()==='class'},
    async getIdToken(forceRefresh=false){return currentUser?currentUser.getIdToken(forceRefresh):null},
    async signInCustomToken(token){if(!auth)throw new Error('Hãy kết nối Firebase trước.');sessionStorage.removeItem('katlearn-logged-out');const {signInWithCustomToken}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');const result=await signInWithCustomToken(auth,token);currentUser=result.user;notifyAuth(currentUser);return currentUser},
    async signIn(providerName){
      if(!auth)throw new Error('Hãy kết nối Firebase trước.');
      sessionStorage.removeItem('katlearn-logged-out');
      const provider=providerName==='apple'?new api.auth.OAuthProvider('apple.com'):new api.auth.GoogleAuthProvider();
      if(providerName==='apple')provider.addScope('email');
      const result=await api.auth.signInWithPopup(auth,provider);
      currentUser=result.user;notifyAuth(currentUser);
      // auth-sync.js owns profile hydration after the auth event.
      return currentUser;
    },
    async signInEmail(email,password,create=false){
      if(!auth)throw new Error('Hãy kết nối Firebase trước.');
      sessionStorage.removeItem('katlearn-logged-out');
      const action=create?api.auth.createUserWithEmailAndPassword:api.auth.signInWithEmailAndPassword;
      const result=await action(auth,email,password);
      currentUser=result.user;notifyAuth(currentUser);
      // auth-sync.js owns profile hydration after the auth event.
      return currentUser;
    },
    async signOut(){
      sessionStorage.setItem('katlearn-logged-out','1');
      sessionStorage.removeItem('katlearn-sso-lms-attempt');
      for(const key of ['katlearn-vocab','katlearn-vocab-source','katlearn-owned-themes','katlearn-stats','katlearn-personal-pack-name','katlearn-theme','katlearn-account-type'])localStorage.removeItem(key);
      for(const key of Object.keys(localStorage))if(key.startsWith('katlearn-known:'))localStorage.removeItem(key);
      if(auth)await api.auth.signOut(auth);
      currentUser=null;notifyAuth(null);
    },
    async saveProfile(data,expectedUid=''){
      if(!db||!currentUser)return;
      const user=currentUser,uid=user.uid;
      if(expectedUid&&String(expectedUid)!==uid)return;
      const payload={...data};
      ['__coinsAuthoritative','coins','energy','streak','lastStudyDay','dailyQuestions','dailyCorrect','questionsAnswered','correctAnswers','ownedThemes','teacherUid','teacherUids','studentAccountType','classId','className','catalogClassId','schoolId','schoolName','province','ward','teacherName','teacherEmail'].forEach(k=>delete payload[k]);
      if(currentUser?.uid!==uid)return;
      return api.setDoc(api.doc(db,'users',uid),{displayName:user.displayName||user.email?.split('@')[0]||'KatLearn Student',email:user.email||'',photoURL:user.photoURL||'',updatedAt:api.serverTimestamp(),...payload},{merge:true});
    },
    async recordAnswer(data){if(!db||!currentUser)return;await api.addDoc(api.collection(db,'users',this.userId,'attempts'),{...data,createdAt:api.serverTimestamp()});await this.saveProfile({lastStudyAt:api.serverTimestamp()})},
    async purchase(item){if(!db||!currentUser)return;return api.setDoc(api.doc(db,'users',this.userId,'items',item.id),{...item,boughtAt:api.serverTimestamp()})},
    async createPublicPack(pack){if(!db||!currentUser||!this.isAdmin())throw new Error('Bạn không có quyền quản trị.');return api.addDoc(api.collection(db,'publicPacks'),{...pack,createdBy:currentUser.uid,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()})},
    async createPersonalPack(pack){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để tạo bộ từ riêng.');
      const user=currentUser,uid=user.uid;
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      let ownerAccountCode='';
      try{ownerAccountCode=await this.ensureAccountNamespace();}catch(namespaceError){console.warn('[KatLearn] Falling back to legacy personal pack storage:',namespaceError)}
      const payload={
        ...pack,kind:'personalPack',ownerUid:uid,ownerEmail:user.email||'',
        ownerDisplayName:user.displayName||user.email?.split('@')[0]||'KatLearn Student',
        ownerAccountCode,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()
      };
      if(ownerAccountCode){
        try{return await api.addDoc(api.collection(db,'accounts',ownerAccountCode,'memory'),payload)}
        catch(namespaceError){console.warn('[KatLearn] New account memory write failed; using legacy storage:',namespaceError)}
      }
      return api.addDoc(api.collection(db,'users',uid,'personalPacks'),payload);
    },
    async updatePersonalPack(packId,pack){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để cập nhật bộ từ.');
      if(!packId)throw new Error('Không tìm thấy bộ từ cần cập nhật.');
      const user=currentUser,uid=user.uid;
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      let ownerAccountCode='';
      try{ownerAccountCode=await this.ensureAccountNamespace();}catch(_){}
      if(!ownerAccountCode)return api.updateDoc(api.doc(db,'users',uid,'personalPacks',packId),{...pack,ownerUid:uid,updatedAt:api.serverTimestamp()});
      const newRef=api.doc(db,'accounts',ownerAccountCode,'memory',packId);
      const newSnap=await api.getDoc(newRef);
      const ref=newSnap.exists()?newRef:api.doc(db,'users',uid,'personalPacks',packId);
      return api.updateDoc(ref,{...pack,kind:'personalPack',ownerUid:uid,ownerEmail:user.email||'',ownerDisplayName:user.displayName||user.email?.split('@')[0]||'KatLearn Student',ownerAccountCode,updatedAt:api.serverTimestamp()});
    },
    async deletePersonalPack(packId){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để xóa bộ từ.');
      if(!packId)throw new Error('Không tìm thấy bộ từ cần xóa.');
      const uid=currentUser.uid;let code='';
      try{code=await this.ensureAccountNamespace();}catch(_){}
      if(!code)return api.deleteDoc(api.doc(db,'users',uid,'personalPacks',packId));
      const newRef=api.doc(db,'accounts',code,'memory',packId),newSnap=await api.getDoc(newRef);
      return api.deleteDoc(newSnap.exists()?newRef:api.doc(db,'users',uid,'personalPacks',packId));
    },
    async personalPacks(){
      if(!db||!currentUser)return[];
      const uid=currentUser.uid;let code='';
      try{code=await this.ensureAccountNamespace();}catch(e){console.warn('[KatLearn] Account namespace unavailable; using legacy packs:',e)}
      if(!code){
        const oldSnap=await api.getDocs(api.query(api.collection(db,'users',uid,'personalPacks'),api.orderBy('createdAt','desc'),api.limit(100)));
        return oldSnap.docs.map(d=>({id:d.id,...d.data()}));
      }
      const [newSnap,oldSnap]=await Promise.all([
        api.getDocs(api.query(api.collection(db,'accounts',code,'memory'),api.orderBy('createdAt','desc'),api.limit(100))),
        api.getDocs(api.query(api.collection(db,'users',uid,'personalPacks'),api.orderBy('createdAt','desc'),api.limit(100)))
      ]);
      const merged=[];const seen=new Set();
      for(const snap of [newSnap,oldSnap])for(const d of snap.docs){
        if(seen.has(d.id))continue;
        const data=d.data()||{};
        if(data.kind&&data.kind!=='personalPack')continue;
        seen.add(d.id);merged.push({id:d.id,...data});
      }
      return merged.sort((a,b)=>{
        const ta=a.createdAt?.seconds||a.createdAt||0,tb=b.createdAt?.seconds||b.createdAt||0;
        return Number(tb)-Number(ta);
      }).slice(0,100);
    },
    async publicPacks(){if(!db)return[];const snap=await api.getDocs(api.query(api.collection(db,'publicPacks'),api.orderBy('createdAt','desc'),api.limit(50)));return snap.docs.map(d=>({id:d.id,...d.data()}))},
    async leaderboard(){if(!db)return[];const snap=await api.getDocs(api.query(api.collection(db,'leaderboard'),api.orderBy('xp','desc'),api.limit(20)));return snap.docs.map(d=>({id:d.id,...d.data()}))}
  };
  const TEACHER_HOME='https://teacher-katlearn.vercel.app',SSO_EXCHANGE=TEACHER_HOME+'/api/auth-exchange';
  const isMainLms=()=>{const p=location.pathname;return(p==='/'||p.endsWith('/index.html'))&&!/login\.html|signup\.html|sso-bridge\.html/.test(p)};
  let guardStarted=false;
  async function handleLmsSso(){
    if(!isMainLms()||guardStarted)return;guardStarted=true;
    const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.replace(/^#/,'')||''),incoming=hash.get('katlearn_id_token');
    if(incoming){history.replaceState(null,document.title,location.pathname+location.search);try{const r=await fetch(SSO_EXCHANGE,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:incoming,target:'lms'})}),d=await r.json();if(r.ok&&d.customToken){await window.studyStore.signInCustomToken(d.customToken);if(d.role==='teacher')location.replace(TEACHER_HOME);return}}catch(e){console.warn('[KatLearn SSO] incoming session failed:',e)}}
    if(sessionStorage.getItem('katlearn-logged-out')==='1')return;
    const role=window.studyStore.user?await window.studyStore.getRole().catch(()=>null):null;
    if(role==='teacher'){location.replace(TEACHER_HOME);return}
    // Guests stay on Student Home; the Teacher SSO bridge is only entered
    // from an explicit Teacher-to-Student SSO flow.
    if(window.studyStore.user||params.has('sso'))return;
  }
  window.addEventListener('8b1-auth-change',()=>setTimeout(()=>handleLmsSso(),0));setTimeout(()=>handleLmsSso(),0);
  document.addEventListener('DOMContentLoaded',()=>{renderAccountUi(currentUser)}, {once:true});
})();