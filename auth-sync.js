/* KatLearn shared account/session bus.
   Fast UI first: Firebase Auth state appears immediately.
   Full Firestore profile sync happens in the background and is shared
   with every feature through one event. */
(function(){
  let ready=false;
  let syncing=null;
  let profile=null;

  const emit=(name,detail={})=>window.dispatchEvent(new CustomEvent(name,{detail}));

  async function sync(user){
    if(!user){
      profile=null;
      ready=true;
      emit('katlearn-account-ready',{account:false,user:null,profile:null});
      return null;
    }

    // UI can react immediately; do not block login on Firestore.
    emit('katlearn-account-fast',{account:true,user,profile:null});

    if(syncing)return syncing;
    syncing=(async()=>{
      try{
        profile=await window.studyStore?.loadProfile?.()||null;

        // Create/fill the profile without blocking the login screen.
        if(!profile && window.studyStore?.saveProfile){
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
          profile=await window.studyStore.loadProfile?.()||null;
        }

        ready=true;
        emit('katlearn-account-ready',{account:true,user,profile});
        return profile;
      }catch(error){
        console.warn('[KatLearn] Background account sync failed:',error);
        ready=true;
        emit('katlearn-account-ready',{account:true,user,profile:null,error});
        return null;
      }finally{
        syncing=null;
      }
    })();

    return syncing;
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
