/* Firebase browser data layer. */
(function(){
  let db=null,auth=null,api={},currentUser=null,authReady=null,authStateReady=false,connectPromise=null,lastAuthUid=undefined,profileWriteQueue=Promise.resolve();
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
  function packNamePart(value,fallback){
    const clean=stripVietnamese(value).trim().replace(/[^a-zA-Z0-9]+/g,'');
    return clean||fallback;
  }
  function formatPackDocumentId(packCode,packName,displayName){
    return String(packCode).padStart(5,'0')+'_'+packNamePart(packName,'Pack')+'_'+displayAccountPart(displayName,'User');
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
        const [{initializeApp,getApps},{getFirestore,doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit,where,updateDoc,deleteDoc,runTransaction,increment},{getAuth,GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,setPersistence,browserLocalPersistence}]=await Promise.all([
          import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
          import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')
        ]);
        const existing=getApps()[0];
        const existingMatches=existing?.options?.apiKey===config.apiKey&&existing?.options?.projectId===config.projectId;
        const app=existingMatches?existing:initializeApp(config);
        db=getFirestore(app);
        api={doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit,where,updateDoc,deleteDoc,runTransaction,increment};
        auth=getAuth(app);
        // Explicitly persist the Firebase Auth session across reloads/restarts.
        // This prevents transient/session-only auth behavior on browsers where
        // relying on the SDK default is not desirable.
        try{
          await setPersistence(auth,browserLocalPersistence);
        }catch(error){
          console.warn('[KatLearn] Không thể bật browserLocalPersistence:',error);
        }
        api.auth={GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile};

        authStateReady=false;
        authReady=new Promise(resolve=>api.auth.onAuthStateChanged(auth,user=>{
          currentUser=user;
          authStateReady=true;
          notifyAuth(user);
          resolve(user);
        }));

        // Profile hydration is owned by auth-sync.js so each auth event has one sync owner.
        return true;
      })().finally(()=>{connectPromise=null});

      return connectPromise;
    },
    connected(){return !!db},
    async waitForAuth(){
      if(!authReady&&!auth&&window.KATLEARN_FIREBASE_CONFIG){
        try{await this.connect(window.KATLEARN_FIREBASE_CONFIG)}catch(_){return currentUser}
      }
      if(authReady&&!authStateReady)await authReady;
      return currentUser;
    },
    async loadProfile(){if(!db||!currentUser)return null;const snap=await api.getDoc(api.doc(db,'users',this.userId));return snap.exists()?{id:snap.id,...snap.data()}:null},
    async ensureAccountNamespace(){
      const user=currentUser;
      if(!user||!db)throw new Error('Hãy đăng nhập trước.');
      const uid=user.uid;
      const profileRef=api.doc(db,'users',uid);
      const sequenceRef=api.doc(db,'system','accountSequence');
      const prefix=createAccountPrefix(user);

      const result=await api.runTransaction(db,async tx=>{
        const profileSnap=await tx.get(profileRef);
        const existingProfile=profileSnap.exists()?profileSnap.data()||{}:{};
        const existingCode=String(existingProfile.accountCode||'').trim();

        if(existingCode){
          const accountRef=api.doc(db,'accounts',existingCode);
          const memoryRef=api.doc(db,'accounts',existingCode,'memory','meta');
          tx.set(accountRef,{
            accountCode:existingCode,uid,email:user.email||'',displayName:user.displayName||'',
            loginName:prefix.login,createdAt:existingProfile.createdAt||api.serverTimestamp(),updatedAt:api.serverTimestamp()
          },{merge:true});
          tx.set(memoryRef,{accountCode:existingCode,uid,updatedAt:api.serverTimestamp()},{merge:true});
          return existingCode;
        }

        const seqSnap=await tx.get(sequenceRef);
        const next=Number(seqSnap.exists()?seqSnap.data()?.lastIssued:0)+1;
        const code=formatAccountCode(prefix,next);
        const accountRef=api.doc(db,'accounts',code);
        const memoryRef=api.doc(db,'accounts',code,'memory','meta');

        tx.set(sequenceRef,{lastIssued:next,updatedAt:api.serverTimestamp()},{merge:true});
        tx.set(accountRef,{
          accountCode:code,uid,email:user.email||'',displayName:user.displayName||'',
          loginName:prefix.login,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()
        },{merge:false});
        tx.set(memoryRef,{accountCode:code,uid,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()},{merge:true});
        tx.set(profileRef,{accountCode:code,updatedAt:api.serverTimestamp()},{merge:true});
        return code;
      });

      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      return result;
    },
    async ensurePackIdentity(packName){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập trước.');
      const code=await this.ensureAccountNamespace();
      const user=currentUser,uid=user.uid,sequenceRef=api.doc(db,'system','packSequence');
      const result=await api.runTransaction(db,async tx=>{
        const seq=await tx.get(sequenceRef);
        const next=Number(seq.exists()?seq.data()?.lastIssued:0)+1;
        const docId=formatPackDocumentId(next,packName,user.displayName||user.email?.split('@')[0]||'KatLearn Student');
        const ref=api.doc(db,'accounts',code,'memory',docId);
        // packSequence is the global allocator, so probing the pack document
        // would only introduce an unnecessary protected read.
        tx.set(sequenceRef,{lastIssued:next,updatedAt:api.serverTimestamp()},{merge:true});
        return {code:next,docId,refPath:ref.path};
      });
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      return {accountCode:code,packCode:String(result.code).padStart(5,'0'),docId:result.docId};
    },
    async updateAccountInfo(data={}){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để thay đổi thông tin tài khoản.');
      const uid=currentUser.uid;
      const displayName=String(data.displayName??currentUser.displayName??'').trim().slice(0,80);
      const photoURL=String(data.photoURL??currentUser.photoURL??'').trim().slice(0,1000);
      if(!displayName)throw new Error('Tên hiển thị không được để trống.');
      if(api.auth?.updateProfile){
        await api.auth.updateProfile(currentUser,{displayName,photoURL});
      }
      await this.saveProfile({displayName,photoURL},uid);
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      renderAccountUi(currentUser);
      window.dispatchEvent(new CustomEvent('katlearn-account-profile-updated',{detail:{user:currentUser,displayName,photoURL}}));
      return {uid,displayName,photoURL,email:currentUser.email||''};
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
      if(currentUser?.uid!==uid)return;
      const ref=api.doc(db,'users',uid);
      const run=async()=>{
        if(currentUser?.uid!==uid)return null;
        const existing=await api.getDoc(ref);
        if(currentUser?.uid!==uid)return null;
        const payload={...data};
        ['__coinsAuthoritative','coins','energy','streak','lastStudyDay','dailyQuestions','dailyCorrect','questionsAnswered','correctAnswers','ownedThemes','teacherUid','teacherUids','studentAccountType','classId','className','catalogClassId','schoolId','schoolName','province','ward','teacherName','teacherEmail'].forEach(k=>delete payload[k]);
        if(!existing.exists()){
          const base={
            displayName:user.displayName||user.email?.split('@')[0]||'KatLearn Student',
            email:user.email||'',
            photoURL:user.photoURL||'',
            provider:user.providerData?.[0]?.providerId||'password',
            role:'student',
            coins:0,
            energy:0,
            streak:0,
            lastStudyDay:'',
            dailyQuestions:0,
            dailyCorrect:0,
            questionsAnswered:0,
            correctAnswers:0,
            ownedThemes:[],
            joinedClassIds:[],
            teacherUid:'',
            teacherUids:[],
            totalWords:0
          };
          return api.setDoc(ref,{...base,...payload,updatedAt:api.serverTimestamp()},{merge:false});
        }
        return api.setDoc(ref,{...payload,displayName:user.displayName||existing.data()?.displayName||user.email?.split('@')[0]||'KatLearn Student',email:user.email||existing.data()?.email||'',photoURL:user.photoURL||existing.data()?.photoURL||'',updatedAt:api.serverTimestamp()},{merge:true});
      };
      const next=profileWriteQueue.then(run,run);
      profileWriteQueue=next.catch(()=>{});
      return next;
    },
    async recordProgressView(){
      const user=currentUser||await this.waitForAuth();
      if(!db||!user)return null;
      const uid=String(user.uid||'');
      if(!uid||currentUser?.uid!==uid)return null;
      try{
        const ref=api.doc(db,'users',uid);
        const snap=await api.getDoc(ref);
        if(!snap.exists())await this.saveProfile({});
        if(currentUser?.uid!==uid)return null;
        await api.setDoc(ref,{
          progressViewCount:increment(1),
          lastProgressViewedAt:api.serverTimestamp(),
          updatedAt:api.serverTimestamp()
        },{merge:true});
        return true;
      }catch(error){
        if(currentUser?.uid===uid)console.warn('[KatLearn] Progress view sync:',error);
        return false;
      }
    },
    async recordAnswer(data){if(!db||!currentUser)return;await api.addDoc(api.collection(db,'users',this.userId,'attempts'),{...data,createdAt:api.serverTimestamp()});await this.saveProfile({lastStudyAt:api.serverTimestamp()})},
    async purchase(item){if(!db||!currentUser)return;return api.setDoc(api.doc(db,'users',this.userId,'items',item.id),{...item,boughtAt:api.serverTimestamp()})},
    async createPublicPack(pack){if(!db||!currentUser||!this.isAdmin())throw new Error('Bạn không có quyền quản trị.');return api.addDoc(api.collection(db,'publicPacks'),{...pack,createdBy:currentUser.uid,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()})},
    async createPersonalPack(pack){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để tạo bộ từ riêng.');
      const user=currentUser,uid=user.uid;
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      const name=String(pack?.name||'').trim();
      const words=Array.isArray(pack?.words)?pack.words:[];
      if(!name)throw new Error('Hãy đặt tên cho bộ từ nhé.');
      if(!words.length)throw new Error('Bộ từ cần ít nhất một từ có nghĩa.');

      // Creating a personal pack is server-authoritative. Do not perform
      // client-side account/sequence transactions first: restrictive or stale
      // Firestore Rules can reject those preflights even though Firebase Admin
      // is allowed to create the pack safely.
      const token=await this.getIdToken(true);
      if(!token)throw new Error('Không lấy được phiên xác thực của tài khoản.');
      const res=await fetch('/api/personal-pack',{
        method:'POST',
        cache:'no-store',
        headers:{
          'Content-Type':'application/json',
          Authorization:'Bearer '+token
        },
        body:JSON.stringify({name,words})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||'Không thể lưu bộ từ.');
      if(String(window.studyStore?.user?.uid||'')!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      return data;
    },
    async updatePersonalPack(packId,pack){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để cập nhật bộ từ.');
      if(!packId)throw new Error('Không tìm thấy bộ từ cần cập nhật.');
      const uid=currentUser.uid;
      const profile=await this.loadProfile();
      if(String(profile?.studentAccountType||'free').toLowerCase()==='class')throw new Error('Tài khoản lớp học do giáo viên quản lý không có bộ từ cá nhân.');
      const accountCode=String(profile?.accountCode||'').trim()||await this.ensureAccountCode();
      const userRef=api.doc(db,'users',uid,'personalPacks',String(packId));
      const accountRef=api.doc(db,'accounts',accountCode,'memory',String(packId));
      let snap=await api.getDoc(userRef);
      if(!snap.exists()){
        snap=await api.getDoc(accountRef);
        if(!snap.exists()||String(snap.data()?.ownerUid||uid)!==uid)throw new Error('Bộ từ không còn tồn tại hoặc không thuộc tài khoản này.');
      }
      if(String(snap.data()?.ownerUid||uid)!==uid)throw new Error('Bộ từ không thuộc tài khoản này.');

      const update={updatedAt:api.serverTimestamp()};
      if(Object.prototype.hasOwnProperty.call(pack||{},'name')){
        const name=String(pack.name||'').trim();
        if(!name)throw new Error('Tên bộ từ không được để trống.');
        update.name=name;
      }
      if(Object.prototype.hasOwnProperty.call(pack||{},'words')){
        const words=Array.isArray(pack.words)?pack.words:[];
        if(!words.length)throw new Error('Bộ từ cần ít nhất một từ có nghĩa.');
        update.words=words;
      }

      const merged={...(snap.data()||{}),...update,ownerUid:uid,ownerAccountCode:accountCode};
      try{
        await api.setDoc(userRef,merged,{merge:true});
      }catch(directError){
        const token=await this.getIdToken(true);
        if(!token)throw directError;
        const res=await fetch('/api/personal-pack-action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'update',id:String(packId),...(Object.prototype.hasOwnProperty.call(pack||{},'name')?{name:String(pack.name||'').trim()}:{}),...(Object.prototype.hasOwnProperty.call(pack||{},'words')?{words:Array.isArray(pack.words)?pack.words:[]}:{})})});
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||directError.message||'Không thể cập nhật bộ từ.');
        return data;
      }
      try{await api.setDoc(accountRef,merged,{merge:true})}
      catch(mirrorError){console.warn('[KatLearn] Account pack mirror failed:',mirrorError)}
      return {id:String(packId),accountCode,source:'users',...merged};
    },
    async deletePersonalPack(packId){
      if(!db||!currentUser)throw new Error('Hãy đăng nhập để xóa bộ từ.');
      if(!packId)throw new Error('Không tìm thấy bộ từ cần xóa.');
      const uid=currentUser.uid;

      // Deletion is intentionally server-authoritative. Do not read the
      // Firestore profile from the browser before the request: stale or
      // restrictive client rules can reject that read even though the
      // authenticated server can safely authorize the operation.
      const token=await this.getIdToken(true);
      if(!token)throw new Error('Không lấy được phiên xác thực của tài khoản.');
      const res=await fetch('/api/personal-pack-action',{
        method:'POST',
        cache:'no-store',
        headers:{
          'Content-Type':'application/json',
          Authorization:'Bearer '+token
        },
        body:JSON.stringify({action:'delete',id:String(packId)})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok!==true)throw new Error(data.error||'Không thể xóa bộ từ.');
      if(currentUser?.uid!==uid)throw new Error('Tài khoản đã thay đổi, hãy thử lại.');
      return data;
    },
    async personalPacks(){
      if(!db&&!authReady&&window.KATLEARN_FIREBASE_CONFIG){
        try{await this.connect(window.KATLEARN_FIREBASE_CONFIG)}catch(_){return[]}
      }
      const user=currentUser||await this.waitForAuth();
      if(!db||!user)return[];
      const uid=String(user.uid||'');
      if(!uid||currentUser?.uid!==uid)return[];

      const normalizePacks=(docs,source,accountCode='')=>docs.map(doc=>{
        const data=typeof doc.data==='function'?(doc.data()||{}):(doc||{});
        const id=typeof doc.id==='string'?doc.id:String(data.id||'');
        return{
          id,...data,kind:'personalPack',
          ownerUid:String(data.ownerUid||uid),
          accountCode:String(data.ownerAccountCode||accountCode||''),
          source
        };
      }).filter(pack=>String(pack.ownerUid||uid)===uid).sort((a,b)=>{
        const ta=Number(a.createdAt?.seconds||a.createdAt||0);
        const tb=Number(b.createdAt?.seconds||b.createdAt||0);
        return tb-ta;
      });

      let directError=null;
      try{
        // Primary path: Auth UID -> users/{uid}/personalPacks.
        // An empty canonical collection is not definitive: older packs may
        // still live in the account-memory namespace. Only return early when
        // we actually found packs.
        const snap=await api.getDocs(api.query(
          api.collection(db,'users',uid,'personalPacks')
        ));
        const directPacks=normalizePacks(snap.docs,'users');
        if(directPacks.length)return directPacks;
      }catch(error){
        directError=error;
      }

      // Rules-safe fallback: locate the account by the same authenticated UID,
      // then read its mirrored personal-pack memory. No profile lookup required.
      try{
        const accountSnap=await api.getDocs(api.query(
          api.collection(db,'accounts'),
          api.where('uid','==',uid),
          api.limit(1)
        ));
        if(accountSnap.docs.length){
          const accountDoc=accountSnap.docs[0];
          const accountCode=String(accountDoc.id||accountDoc.data()?.accountCode||'').trim();
          if(accountCode){
            const memorySnap=await api.getDocs(api.query(
              api.collection(db,'accounts',accountCode,'memory'),
              api.where('kind','==','personalPack'),
              api.limit(100)
            ));
            const accountPacks=normalizePacks(memorySnap.docs,'account-memory',accountCode);
            if(accountPacks.length)return accountPacks;
          }
        }
      }catch(accountError){
        console.warn('[KatLearn] Account-memory personal packs fallback failed:',accountError);
      }

      // Last resort: protected server reader, when Firebase Admin is configured.
      try{
        const token=await this.getIdToken(true);
        if(!token)throw directError;
        const res=await fetch('/api/personal-packs',{
          method:'GET',cache:'no-store',
          headers:{Authorization:'Bearer '+token,Accept:'application/json'}
        });
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||directError?.message||'Không thể tải bộ từ.');
        return (Array.isArray(data.packs)?data.packs:[]).map(pack=>({
          ...pack,kind:'personalPack',
          ownerUid:String(pack.ownerUid||uid),
          accountCode:String(pack.ownerAccountCode||data.accountCode||''),
          source:String(pack.source||'users')
        })).filter(pack=>String(pack.ownerUid||uid)===uid);
      }catch(serverError){
        console.warn('[KatLearn] Personal packs load failed (UID + account + server):',directError,serverError);
        throw serverError;
      }
    },
    async syncPersonalLearningData(){
      const user=currentUser||await this.waitForAuth();
      if(!db||!user)return {uid:'',packs:[],words:[],totalWords:0,knownWords:0,personalPacksCount:0};
      const uid=String(user.uid||'');
      if(!uid||currentUser?.uid!==uid)return {uid,packs:[],words:[],totalWords:0,knownWords:0,personalPacksCount:0};
      let packs=[];
      try{
        packs=await this.personalPacks();
      }catch(error){
        console.warn('[KatLearn] Personal learning sync load failed:',error);
        return {uid,packs:[],words:[],totalWords:0,knownWords:0,personalPacksCount:0,error};
      }
      const merged=[];
      const byWord=new Map();
      const knownKeys=new Set();
      const addKnown=(packId)=>{
        try{
          const raw=localStorage.getItem('katlearn-known:'+uid+':personal:'+String(packId||''));
          const arr=JSON.parse(raw||'[]');
          if(Array.isArray(arr))for(const key of arr)if(key)knownKeys.add(String(key));
        }catch(_){}
      };
      for(const pack of packs){
        const packId=String(pack?.id||'');
        addKnown(packId);
        const packName=String(pack?.name||'Bộ từ riêng');
        for(const word of Array.isArray(pack?.words)?pack.words:[]){
          const wordValue=String(word?.word||'').trim();
          const meanValue=String(word?.mean||word?.meaning_vi||'').trim();
          if(!wordValue||!meanValue)continue;
          const key=wordValue.toLowerCase().replace(/\s+/g,' ')+'::'+meanValue.toLowerCase().replace(/\s+/g,' ');
          const existing=byWord.get(key);
          if(existing){
            existing.packIds=[...new Set([...(existing.packIds||[]),packId])];
            existing.packNames=[...new Set([...(existing.packNames||[]),packName])];
            continue;
          }
          const item={...word,packIds:packId?[packId]:[],packNames:packName?[packName]:[]};
          byWord.set(key,item);merged.push(item);
        }
      }
      const totalWords=merged.length;
      let knownWords=0;
      for(const item of merged){
        const key=String(item?.word||'').trim().toLowerCase().replace(/\s+/g,' ')+'::'+String(item?.mean||item?.meaning_vi||'').trim().toLowerCase().replace(/\s+/g,' ');
        if(knownKeys.has(key))knownWords++;
      }
      const result={uid,packs,words:merged,totalWords,knownWords,knownKeys:[...knownKeys],personalPacksCount:packs.length,updatedAt:Date.now()};
      try{
        if(String(window.studyStore?.user?.uid||'')===uid){
          await this.saveProfile({
            personalPacksCount:packs.length,
            personalWordCount:totalWords,
            personalKnownCount:knownWords,
            totalWords,
            knownWords,
            personalLearningSyncedAt:api.serverTimestamp()
          },uid);
        }
      }catch(error){console.warn('[KatLearn] Personal learning progress write failed:',error)}
      if(String(window.studyStore?.user?.uid||'')===uid){
        window.dispatchEvent(new CustomEvent('katlearn-personal-learning-synced',{detail:result}));
      }
      return result;
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