/* Firebase browser data layer. Paste your public Firebase Web config in Settings. */
(function(){
  let db=null, auth=null, api={}, currentUser=null, authReady=null;
  window.KATLEARN_FIREBASE_CONFIG={apiKey:'AIzaSyCgMDdCP0R5fW3QjhYrd3Ab8AJH3xYGiz8',authDomain:'elp---katlearn.firebaseapp.com',projectId:'elp---katlearn',storageBucket:'elp---katlearn.firebasestorage.app',messagingSenderId:'344478447672',appId:'1:344478447672:web:4ed109a40303d0b41b0ecd',measurementId:'G-KTW11GD97T'};
  const guestId=localStorage.getItem('8b1-guest-id')||crypto.randomUUID(); localStorage.setItem('8b1-guest-id',guestId);
  window.studyStore={
    get userId(){return currentUser?.uid||guestId}, get user(){return currentUser},
    isAdmin(){return !!currentUser&&window.KATLEARN_ADMIN_EMAILS?.includes((currentUser.email||'').toLowerCase())},
    async connect(config){
      if(!config?.apiKey||!config?.projectId)throw new Error('Firebase config chưa đầy đủ');
      const [{initializeApp,getApps},{getFirestore,doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit},{getAuth,GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')]);
      const app=getApps().length?getApps()[0]:initializeApp(config); db=getFirestore(app); api={doc,setDoc,addDoc,collection,serverTimestamp,getDocs,getDoc,query,orderBy,limit}; auth=getAuth(app); api.auth={GoogleAuthProvider,OAuthProvider,signInWithPopup,onAuthStateChanged,signOut,createUserWithEmailAndPassword,signInWithEmailAndPassword};
      authReady=new Promise(resolve=>api.auth.onAuthStateChanged(auth,user=>{currentUser=user;window.dispatchEvent(new CustomEvent('8b1-auth-change',{detail:user}));resolve(user)})); await authReady;
      if(currentUser){const profile=await this.loadProfile();if(!profile)await this.saveProfile({coins:0,energy:0,streak:0,__coinsAuthoritative:true})} return true;
    },
    connected(){return !!db},
    async loadProfile(){if(!db||!currentUser)return null;const snap=await api.getDoc(api.doc(db,'users',this.userId));return snap.exists()?{id:snap.id,...snap.data()}:null},
    async signIn(providerName){if(!auth)throw new Error('Hãy kết nối Firebase trước.');const provider=providerName==='apple'?new api.auth.OAuthProvider('apple.com'):new api.auth.GoogleAuthProvider();if(providerName==='apple')provider.addScope('email');const result=await api.auth.signInWithPopup(auth,provider);currentUser=result.user;const profile=await this.loadProfile();if(!profile)await this.saveProfile({coins:0,energy:0,streak:0,__coinsAuthoritative:true});await this.saveProfile({displayName:currentUser.displayName||'KatLearn Student',email:currentUser.email||'',photoURL:currentUser.photoURL||'',provider:providerName});return currentUser},
    async signInEmail(email,password,create=false){if(!auth)throw new Error('Hãy kết nối Firebase trước.');const action=create?api.auth.createUserWithEmailAndPassword:api.auth.signInWithEmailAndPassword;const result=await action(auth,email,password);currentUser=result.user;const profile=await this.loadProfile();if(!profile)await this.saveProfile({coins:0,energy:0,streak:0,__coinsAuthoritative:true});await this.saveProfile({displayName:currentUser.email?.split('@')[0]||'KatLearn Student',email:currentUser.email||'',provider:'password'});return currentUser},
    async signOut(){if(auth)await api.auth.signOut(auth)},
    async saveProfile(data){if(!db||!currentUser)return;const user=currentUser,payload={...data},allowCoins=payload.__coinsAuthoritative===true;delete payload.__coinsAuthoritative;if(!allowCoins)delete payload.coins;return api.setDoc(api.doc(db,'users',this.userId),{displayName:user.displayName||'KatLearn Student',email:user.email||'',photoURL:user.photoURL||'',updatedAt:api.serverTimestamp(),...payload},{merge:true})},
    async recordAnswer(data){if(!db||!currentUser)return;await api.addDoc(api.collection(db,'users',this.userId,'attempts'),{...data,createdAt:api.serverTimestamp()});await this.saveProfile({lastStudyAt:api.serverTimestamp()})},
    async purchase(item){if(!db||!currentUser)return;return api.setDoc(api.doc(db,'users',this.userId,'items',item.id),{...item,boughtAt:api.serverTimestamp()})},
    async createPublicPack(pack){if(!db||!currentUser||!this.isAdmin())throw new Error('Bạn không có quyền quản trị.');return api.addDoc(api.collection(db,'publicPacks'),{...pack,createdBy:currentUser.uid,createdAt:api.serverTimestamp(),updatedAt:api.serverTimestamp()})},
    async publicPacks(){if(!db)return[];const snap=await api.getDocs(api.query(api.collection(db,'publicPacks'),api.orderBy('createdAt','desc'),api.limit(50)));return snap.docs.map(d=>({id:d.id,...d.data()}))},
    async leaderboard(){if(!db)return[];const snap=await api.getDocs(api.query(api.collection(db,'users'),api.orderBy('energy','desc'),api.limit(20)));return snap.docs.map(d=>({id:d.id,...d.data()}))}
  };
  // Load account UI directly from the Firebase layer as a fallback, so login works even if admin-config.js is absent/stale.
  if(!window.__KATLEARN_SIGNUP_LOADED){const s=document.createElement('script');s.src='signup.js';s.async=false;s.onload=()=>console.log('[KatLearn] auth UI loaded');s.onerror=()=>console.warn('[KatLearn] signup.js failed to load');document.head.appendChild(s)}
})();
