// KatLearn Core Vocabulary loader.
// The generated JSON files are bundled as static, read-only vocabulary data.
(function(){
  const TOPICS=[
    {id:'daily-life',name:'Daily_Life_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/daily-life.json'},
    {id:'family',name:'Family_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/family.json'},
    {id:'home',name:'Home_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/home.json'},
    {id:'food',name:'Food_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/food.json'},
    {id:'cooking',name:'Cooking_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/cooking.json'},
    {id:'shopping',name:'Shopping_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/shopping.json'},
    {id:'clothes-fashion',name:'Clothes_Fashion_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/clothes-fashion.json'},
    {id:'school-education',name:'School_Education_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/school-education.json'},
    {id:'work-career',name:'Work_Career_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/work-career.json'},
    {id:'technology',name:'Technology_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/technology.json'},
    {id:'internet-social-media',name:'Internet_SocialMedia_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/internet-social-media.json'},
    {id:'health-medicine',name:'Health_Medicine_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/health-medicine.json'},
    {id:'sports-fitness',name:'Sports_Fitness_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/sports-fitness.json'},
    {id:'travel-tourism',name:'Travel_Tourism_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/travel-tourism.json'},
    {id:'transport',name:'Transport_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/transport.json'},
    {id:'weather-seasons',name:'Weather_Seasons_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/weather-seasons.json'},
    {id:'environment',name:'Environment_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/environment.json'},
    {id:'animals-nature',name:'Animals_Nature_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/animals-nature.json'},
    {id:'feelings-personality',name:'Feelings_Personality_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/feelings-personality.json'},
    {id:'entertainment-culture',name:'Entertainment_Culture_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/entertainment-culture.json'},
    {id:'city-community',name:'City_Community_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/city-community.json'},
    {id:'money-finance',name:'Money_Finance_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/money-finance.json'},
    {id:'communication',name:'Communication_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/communication.json'},
    {id:'people-relationships',name:'People_Relationships_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/people-relationships.json'},
    {id:'places',name:'Places_Topic_Dùng hằng ngày',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/places.json'},
    {id:'ielts-writing-task-1',name:'IELTS Writing Task 1 Vocabulary',category:'IELTS Vocabulary',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Writing_Task_1.json'},
    {id:'ielts-writing-task-2',name:'IELTS Writing Task 2 Vocabulary',category:'IELTS Vocabulary',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Writing_Task_2.json'},
    {id:'ielts-reading',name:'IELTS Reading Academic Vocabulary',category:'IELTS Vocabulary',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Reading.json'},
    {id:'ielts-speaking',name:'IELTS Speaking Vocabulary',category:'IELTS Vocabulary',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Speaking.json'}
  ];
  const cache=new Map();
  async function loadCoreVocabulary(id){
    if(cache.has(id))return cache.get(id);
    const found=TOPICS.find(x=>x.id===id||x.name===id);
    if(!found)throw new Error('Không tìm thấy topic KatLearn: '+id);
    let data=await fetch('/data/vocabulary/'+found.path,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Không tải được kho từ '+found.name);return r.json()});
    if(!Array.isArray(data.words)||data.words.length===0)throw new Error(found.name+' không có dữ liệu từ vựng.');
    data={...data,name:found.name,category:found.category};
    cache.set(found.id,data);
    return data;
  }
  window.katlearnCoreVocabulary={topics:TOPICS.map(({id,name,category})=>({id,name,category})),load:loadCoreVocabulary,clear:()=>cache.clear()};
})();
