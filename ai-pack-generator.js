// KatLearn AI Pack Generator core - server-side OpenAI only
(function(){
  const local=location.hostname==='localhost'||location.hostname==='127.0.0.1';
  const endpoint=name=>local?'/api/'+name:'/.netlify/functions/'+name;
  const post=async(path,body)=>{
    const res=await fetch(endpoint(path),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
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