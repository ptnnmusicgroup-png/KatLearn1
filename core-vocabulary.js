// KatLearn Core Vocabulary loader.
// The generated JSON files are bundled as static, read-only vocabulary data.
(function(){
  const TOPICS=[
    ['daily-life','Daily_Life_Topic_Dùng hằng ngày'],['family','Family_Topic_Dùng hằng ngày'],['home','Home_Topic_Dùng hằng ngày'],['food','Food_Topic_Dùng hằng ngày'],['cooking','Cooking_Topic_Dùng hằng ngày'],['shopping','Shopping_Topic_Dùng hằng ngày'],['clothes-fashion','Clothes_Fashion_Topic_Dùng hằng ngày'],['school-education','School_Education_Topic_Dùng hằng ngày'],['work-career','Work_Career_Topic_Dùng hằng ngày'],['technology','Technology_Topic_Dùng hằng ngày'],['internet-social-media','Internet_SocialMedia_Topic_Dùng hằng ngày'],['health-medicine','Health_Medicine_Topic_Dùng hằng ngày'],['sports-fitness','Sports_Fitness_Topic_Dùng hằng ngày'],['travel-tourism','Travel_Tourism_Topic_Dùng hằng ngày'],['transport','Transport_Topic_Dùng hằng ngày'],['weather-seasons','Weather_Seasons_Topic_Dùng hằng ngày'],['environment','Environment_Topic_Dùng hằng ngày'],['animals-nature','Animals_Nature_Topic_Dùng hằng ngày'],['feelings-personality','Feelings_Personality_Topic_Dùng hằng ngày'],['entertainment-culture','Entertainment_Culture_Topic_Dùng hằng ngày'],['city-community','City_Community_Topic_Dùng hằng ngày'],['money-finance','Money_Finance_Topic_Dùng hằng ngày'],['communication','Communication_Topic_Dùng hằng ngày'],['people-relationships','People_Relationships_Topic_Dùng hằng ngày'],['places','Places_Topic_Dùng hằng ngày']
  ];
  const cache=new Map();
  async function loadCoreVocabulary(id){
    if(cache.has(id))return cache.get(id);
    const found=TOPICS.find(x=>x[0]===id||x[1]===id);
    if(!found)throw new Error('Không tìm thấy topic KatLearn: '+id);
    let data=await fetch('/data/vocabulary/'+found[0]+'.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Không tải được kho từ '+found[1]);return r.json()});
    if(!Array.isArray(data.words)||data.words.length!==500)throw new Error(found[1]+' phải có đúng 500 từ.');
    data={...data,name:found[1]};
    cache.set(found[0],data);
    return data;
  }
  window.katlearnCoreVocabulary={topics:TOPICS.map(([id,name])=>({id,name})),load:loadCoreVocabulary,clear:()=>cache.clear()};
})();
