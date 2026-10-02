// KatLearn Core Vocabulary loader.
// Public vocabulary is organized as a single KatLearn-curated library.
// Legacy topic files remain supported for backward compatibility.
(function(){
  const TOPICS=[
    {id:'daily-life',name:'Daily Life',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/daily-life.json'},
    {id:'family',name:'Family & Relationships',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/family.json'},
    {id:'home',name:'Home & Household',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/home.json'},
    {id:'food',name:'Food',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/food.json'},
    {id:'cooking',name:'Cooking',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/cooking.json'},
    {id:'shopping',name:'Shopping',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/shopping.json'},
    {id:'clothes-fashion',name:'Clothes & Fashion',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/clothes-fashion.json'},
    {id:'school-education',name:'School & Education',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/school-education.json'},
    {id:'work-career',name:'Work & Career',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/work-career.json'},
    {id:'technology',name:'Technology',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/technology.json'},
    {id:'internet-social-media',name:'Internet & Social Media',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/internet-social-media.json'},
    {id:'health-medicine',name:'Health & Medicine',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/health-medicine.json'},
    {id:'sports-fitness',name:'Sports & Fitness',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/sports-fitness.json'},
    {id:'travel-tourism',name:'Travel & Tourism',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/travel-tourism.json'},
    {id:'transport',name:'Transport',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/transport.json'},
    {id:'weather-seasons',name:'Weather & Seasons',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/weather-seasons.json'},
    {id:'environment',name:'Environment',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/environment.json'},
    {id:'animals-nature',name:'Animals & Nature',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/animals-nature.json'},
    {id:'feelings-personality',name:'Feelings & Personality',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/feelings-personality.json'},
    {id:'entertainment-culture',name:'Entertainment & Culture',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/entertainment-culture.json'},
    {id:'city-community',name:'City & Community',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/city-community.json'},
    {id:'money-finance',name:'Money & Finance',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/money-finance.json'},
    {id:'communication',name:'Communication',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/communication.json'},
    {id:'people-relationships',name:'People & Relationships',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/people-relationships.json'},
    {id:'places',name:'Places',category:'Everyday Topics',path:'TOPICs_KatLearn/Everyday Topics/places.json'},

    {id:'ielts-writing-task-1',name:'IELTS Writing Task 1',category:'IELTS',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Writing_Task_1.json'},
    {id:'ielts-writing-task-2',name:'IELTS Writing Task 2',category:'IELTS',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Writing_Task_2.json'},
    {id:'ielts-reading',name:'IELTS Reading',category:'IELTS',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Reading.json'},
    {id:'ielts-speaking',name:'IELTS Speaking',category:'IELTS',path:'TOPICs_KatLearn/IELTS Vocabulary/IELTS_Speaking.json'},

    {id:'katlearn-synthesis',name:'KatLearn Synthesis Core',category:'KatLearn Library · General & Academic',path:'TOPICs_KatLearn/KatLearn_Synthesis_Core.json'},
    {id:'katlearn-cefr-builder',name:'KatLearn CEFR Builder',category:'KatLearn Library · CEFR',path:'TOPICs_KatLearn/KatLearn_CEFR_Builder.json'},
    {id:'katlearn-academic-writing',name:'KatLearn Academic & Writing',category:'KatLearn Library · Academic',path:'TOPICs_KatLearn/KatLearn_Academic_Writing.json'},
    {id:'katlearn-collocations-phrasal',name:'KatLearn Collocations & Phrasal Verbs',category:'KatLearn Library · Skills',path:'TOPICs_KatLearn/KatLearn_Collocations_Phrasal.json'},
    {id:'katlearn-exam-workplace-specialized',name:'KatLearn Exam · Workplace · Specialized',category:'KatLearn Library · Exam & Specialized',path:'TOPICs_KatLearn/KatLearn_Exam_Workplace_Specialized.json'},
    {id:'katlearn-school-english',name:'KatLearn School English',category:'KatLearn Library · School English',path:'TOPICs_KatLearn/KatLearn_School_English.json'},
    {id:'katlearn-irregular-verbs',name:'KatLearn Irregular Verbs',category:'KatLearn Library · Foundations',path:'TOPICs_KatLearn/KatLearn_Irregular_Verbs.json'}
  ];
  const cache=new Map();
  async function loadCoreVocabulary(id){
    if(cache.has(id))return cache.get(id);
    const found=TOPICS.find(x=>x.id===id||x.name===id);
    if(!found)throw new Error('Không tìm thấy bộ từ KatLearn: '+id);
    const response=await fetch('/data/vocabulary/'+found.path,{cache:'no-store'});
    if(!response.ok)throw new Error('Không tải được kho từ '+found.name);
    let data=await response.json();
    if(Array.isArray(data.packs)){
      const pack=data.packs.find(x=>x.id===found.id);
      if(!pack)throw new Error('Không tìm thấy pack '+found.name+' trong KatLearn Library.');
      data={...pack};
    }
    if(!Array.isArray(data.words)||data.words.length===0)throw new Error(found.name+' không có dữ liệu từ vựng.');
    data={...data,id:found.id,name:found.name,category:found.category};
    cache.set(found.id,data);
    return data;
  }
  window.katlearnCoreVocabulary={
    topics:TOPICS.map(({id,name,category})=>({id,name,category})),
    load:loadCoreVocabulary,
    clear:()=>cache.clear()
  };
})();