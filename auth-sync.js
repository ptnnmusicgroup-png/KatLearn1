/* KatLearn shared account/session bus.
   Fast UI first: Firebase Auth state appears immediately.
   Full Firestore profile sync happens in the background and is shared
   with every feature through one event. */
(function(){
  let ready=false;
  let syncing=null;
  let syncingUid=null;
  let generation=0;
  let profile=null;

  const emit=(name,detail={})=>window.dispatchEvent(new CustomEvent(name,{detail}));

  async function sync(user){
    const uid=String(user?.uid||'');
    const run=++generation;

    if(!user){
      profile=null;
      ready=true;
      syncing=null;
      syncingUid=null;
      emit('katlearn-account-ready',{account:false,user:null,profile:null});
      return null;
    }

    // A new account starts a fresh sync state; never expose the previous profile.
    if(syncingUid!==uid){profile=null;ready=false;}

    // UI can react immediately; do not block login on Firestore.
    emit('katlearn-account-fast',{account:true,user,profile:null});

    // Reuse only a sync for the same account. A different account must
    // never receive the previous account's profile result.
    if(syncing&&syncingUid===uid)return syncing;

    syncingUid=uid;
    const isCurrent=()=>run===generation&&String(window.studyStore?.user?.uid||'')===uid;
    const promise=(async()=>{
      let nextProfile=null;
      try{
        if(!isCurrent())return null;
        nextProfile=await window.studyStore?.loadProfile?.()||null;

        if(!nextProfile && window.studyStore?.saveProfile){
          if(!isCurrent())return null;
          await window.studyStore.saveProfile({
            displayName:user.displayName||user.email?.split('@')[0]||'KatLearn Student',
            email:user.email||'',
            photoURL:user.photoURL||'',
            provider:user.providerData?.[0]?.providerId||'password',
            coins:0,
            energy:0,
            streak:0,
            totalWords:0
          });
          if(!isCurrent())return null;
          nextProfile=await window.studyStore.loadProfile?.()||null;
        }

        // Ignore stale work if Firebase has already switched accounts.
        if(!isCurrent())return null;

        profile=nextProfile;
        ready=true;
        emit('katlearn-account-ready',{account:true,user,profile});
        return profile;
      }catch(error){
        if(run!==generation||String(window.studyStore?.user?.uid||'')!==uid)return null;
        console.warn('[KatLearn] Background account sync failed:',error);
        ready=true;
        profile=null;
        emit('katlearn-account-ready',{account:true,user,profile:null,error});
        return null;
      }finally{
        if(run===generation){
          syncing=null;
          syncingUid=null;
        }
      }
    })();

    syncing=promise;
    return promise;
  }

  window.katlearnAccount={
    get ready(){return ready},
    get loggedIn(){return !!window.studyStore?.user},
    get user(){return window.studyStore?.user||null},
    get profile(){return profile},
    async wait(){return syncing||profile}
  };

  window.addEventListener('8b1-auth-change',e=>{void sync(e.detail||null)});

  // If Firebase was already authenticated before this file loaded.
  if(window.studyStore?.user)void sync(window.studyStore.user);
})();