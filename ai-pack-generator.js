// KatLearn AI Pack Generator core - server-side Gemini only
(function(){
  const endpoint=name=>'/api/'+name;
  const authHeaders=async()=>{const h={'Content-Type':'application/json'};try{const t=await window.studyStore?.getIdToken?.();if(t)h.Authorization='Bearer '+t}catch(_){}return h};
  const post=async(path,body)=>{
    const res=await fetch(endpoint(path),{method:'POST',headers:await authHeaders(),body:JSON.stringify(body)});
    let data={}; try{data=await res.json()}catch(e){}
    if(!res.ok) throw new Error(data.error||'Kat AI chưa sẵn sàng.');
    return data;
  };
  window.aiPackGenerator={
    async generatePackByTopic(options){
      const body={...options,prompt:String(options?.prompt||options?.topic||'').trim()};
      delete body.topic;
      return post('ai-pack',body);
    },
    async regenerateWord(word,topic,difficulty){
      return post('ai-regenerate-word',{word,topic,difficulty});
    },
    async regeneratePackAtDifficulty(topic,wordCount,difficulty,purpose,wordTypes){
      return post('ai-pack',{
        prompt:topic,
        wordCount,
        difficulty,
        purpose,
        wordTypes,
        instructions:'Tạo lại pack, tránh trùng các từ đã có nếu có.'
      });
    }
  };
})();