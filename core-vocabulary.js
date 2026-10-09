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
    {id:'global-success-english-1',name:'TIẾNG ANH 1',category:'TIẾNG ANH_Global Success',path:'TOPICs_KatLearn/TIẾNG ANH_Global Success/TIẾNG ANH 1.json'},
    {id:'global-success-english-2',name:'TIẾNG ANH 2',category:'TIẾNG ANH_Global Success',path:'TOPICs_KatLearn/TIẾNG ANH_Global Success/TIẾNG ANH 2.json'},
    {id:'global-success-english-3',name:'TIẾNG ANH 3',category:'TIẾNG ANH_Global Success',path:'TOPICs_KatLearn/TIẾNG ANH_Global Success/TIẾNG ANH 3.json'},
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
  const LIBRARY_TREE=[
    {id:'ielts',name:'IELTS',icon:'🎓',children:[
      {id:'ielts-writing-task-1',name:'IELTS Writing Task 1',icon:'📊',packId:'ielts-writing-task-1',children:[
        {id:'t1-increase',name:'Các từ diễn tả sự tăng lên',icon:'📈',packId:'ielts-writing-task-1',words:['rise','increase','climb','grow','surge','soar','jump']},
        {id:'t1-decrease',name:'Các từ diễn tả sự giảm xuống',icon:'📉',packId:'ielts-writing-task-1',words:['decline','decrease','drop','fall','dip','plummet','halve']},
        {id:'t1-fluctuation',name:'Các từ diễn tả sự biến động',icon:'〰️',packId:'ielts-writing-task-1',words:['fluctuate','vary']},
        {id:'t1-stability',name:'Các từ diễn tả sự ổn định / chững lại',icon:'➖',packId:'ielts-writing-task-1',words:['remain stable','remain constant','plateau','level off']},
        {id:'t1-peak',name:'Các từ diễn tả mức cao nhất / thấp nhất',icon:'🔝',packId:'ielts-writing-task-1',words:['peak','reach a peak']},
        {id:'t1-comparison',name:'Các từ dùng để so sánh',icon:'⚖️',packId:'ielts-writing-task-1',categories:['comparisons']},
        {id:'t1-proportion',name:'Các từ diễn tả tỷ lệ / thành phần',icon:'🥧',packId:'ielts-writing-task-1',categories:['proportions']},
        {id:'t1-degree',name:'Các từ diễn tả mức độ thay đổi',icon:'📐',packId:'ielts-writing-task-1',categories:['degree']},
        {id:'t1-data',name:'Từ vựng về số liệu',icon:'🔢',packId:'ielts-writing-task-1',categories:['data']},
        {id:'t1-time',name:'Từ vựng về thời gian',icon:'🕒',packId:'ielts-writing-task-1',categories:['time']},
        {id:'t1-charts',name:'Từ vựng về biểu đồ',icon:'📊',packId:'ielts-writing-task-1',categories:['charts']},
        {id:'t1-process',name:'Từ vựng về quy trình',icon:'🔄',packId:'ielts-writing-task-1',categories:['process']},
        {id:'t1-overview',name:'Ngôn ngữ viết Overview',icon:'🧭',packId:'ielts-writing-task-1',categories:['overview']}
      ]},
      {id:'ielts-writing-task-2',name:'IELTS Writing Task 2',icon:'✍️',packId:'ielts-writing-task-2',children:[
        {id:'t2-argument',name:'Lập luận & quan điểm',icon:'💬',packId:'ielts-writing-task-2',categories:['argument','opinion']},
        {id:'t2-evidence',name:'Bằng chứng & dẫn chứng',icon:'🔎',packId:'ielts-writing-task-2',categories:['evidence']},
        {id:'t2-balance',name:'Ý kiến đối lập & cân bằng',icon:'⚖️',packId:'ielts-writing-task-2',categories:['balance']},
        {id:'t2-causes-effects',name:'Nguyên nhân & hệ quả',icon:'🔗',packId:'ielts-writing-task-2',categories:['effects']},
        {id:'t2-solutions',name:'Giải pháp & hành động',icon:'🛠️',packId:'ielts-writing-task-2',categories:['solutions']},
        {id:'t2-policy',name:'Chính sách & xã hội',icon:'🏛️',packId:'ielts-writing-task-2',categories:['policy','society']},
        {id:'t2-economy',name:'Kinh tế',icon:'💰',packId:'ielts-writing-task-2',categories:['economy']},
        {id:'t2-environment',name:'Môi trường',icon:'🌱',packId:'ielts-writing-task-2',categories:['environment']},
        {id:'t2-technology',name:'Công nghệ',icon:'💻',packId:'ielts-writing-task-2',categories:['technology']},
        {id:'t2-health',name:'Sức khỏe',icon:'🩺',packId:'ielts-writing-task-2',categories:['health']},
        {id:'t2-time',name:'Thời gian & thay đổi',icon:'🕒',packId:'ielts-writing-task-2',categories:['time']},
        {id:'t2-structure',name:'Cấu trúc bài viết',icon:'🧩',packId:'ielts-writing-task-2',categories:['structure']}
      ]},
      {id:'ielts-reading',name:'IELTS Reading',icon:'📖',packId:'ielts-reading',children:[
        {id:'r-research',name:'Nghiên cứu & học thuật',icon:'🔬',packId:'ielts-reading',categories:['research','science']},
        {id:'r-data',name:'Số liệu & dữ liệu',icon:'📊',packId:'ielts-reading',categories:['data']},
        {id:'r-cause',name:'Nguyên nhân & hệ quả',icon:'🔗',packId:'ielts-reading',categories:['causes','cause','effects']},
        {id:'r-comparison',name:'So sánh & đối chiếu',icon:'⚖️',packId:'ielts-reading',categories:['comparison','contrast']},
        {id:'r-process',name:'Quy trình & cấu trúc',icon:'🔄',packId:'ielts-reading',categories:['process','structure']},
        {id:'r-description',name:'Mô tả & đặc điểm',icon:'🔎',packId:'ielts-reading',categories:['description','properties']},
        {id:'r-environment-health',name:'Môi trường & sức khỏe',icon:'🌱',packId:'ielts-reading',categories:['environment','health','biology']},
        {id:'r-history-language',name:'Lịch sử & ngôn ngữ',icon:'📚',packId:'ielts-reading',categories:['history','language']}
      ]},
      {id:'ielts-speaking',name:'IELTS Speaking',icon:'🗣️',packId:'ielts-speaking',children:[
        {id:'s-part1',name:'Part 1 · Chủ đề cá nhân',icon:'👤',packId:'ielts-speaking',categories:['part1','preferences','feelings']},
        {id:'s-part2',name:'Part 2 · Long Turn',icon:'🎙️',packId:'ielts-speaking',categories:['part2','experience','examples']},
        {id:'s-description',name:'Mô tả người / nơi / trải nghiệm',icon:'📝',packId:'ielts-speaking',categories:['description','personality','relationships']},
        {id:'s-opinion',name:'Nêu ý kiến & phát triển ý',icon:'💭',packId:'ielts-speaking',categories:['opinion','balance']},
        {id:'s-causes-effects',name:'Nguyên nhân & tác động',icon:'🔗',packId:'ielts-speaking',categories:['causes','effects']},
        {id:'s-future-society',name:'Tương lai & xã hội',icon:'🌍',packId:'ielts-speaking',categories:['future','society']},
        {id:'s-fluency',name:'Cụm từ hỗ trợ độ trôi chảy',icon:'✨',packId:'ielts-speaking',categories:['fluency']}
      ]}
    ]},
    {id:'everyday',name:'Everyday English',icon:'🌷',children:[
      {id:'everyday-topics',name:'Everyday Topics',icon:'📁',children:[]}
    ]},
    {id:'school',name:'School English',icon:'🏫',children:[
      {id:'school-core',name:'KatLearn School English',icon:'📚',packId:'katlearn-school-english'}
    ]},
    {id:'global-success-english',name:'TIẾNG ANH_Global Success',icon:'📚',children:[
      {id:'global-success-english-1',name:'TIẾNG ANH 1',icon:'📘',packId:'global-success-english-1'},
      {id:'global-success-english-2',name:'TIẾNG ANH 2',icon:'📗',packId:'global-success-english-2'},
      {id:'global-success-english-3',name:'TIẾNG ANH 3',icon:'📙',packId:'global-success-english-3'}
    ]},
    {id:'cefr',name:'CEFR',icon:'📈',children:[
      {id:'cefr-builder',name:'CEFR B1–B2 Builder',icon:'📈',packId:'katlearn-cefr-builder'}
    ]},
    {id:'academic',name:'Academic English',icon:'✍️',children:[
      {id:'academic-writing',name:'Academic & Writing',icon:'📝',packId:'katlearn-academic-writing'}
    ]},
    {id:'skills',name:'English Skills',icon:'🧩',children:[
      {id:'collocations',name:'Collocations & Phrasal Verbs',icon:'🔗',packId:'katlearn-collocations-phrasal'}
    ]},
    {id:'exam-specialized',name:'Exam & Specialized',icon:'📝',children:[
      {id:'exam-workplace-specialized',name:'Exam · Workplace · Specialized',icon:'🛠️',packId:'katlearn-exam-workplace-specialized'}
    ]},
    {id:'foundations',name:'Foundations',icon:'🧱',children:[
      {id:'irregular-verbs',name:'Irregular Verbs',icon:'🔤',packId:'katlearn-irregular-verbs'}
    ]}
  ];

  window.katlearnCoreVocabulary={
    topics:TOPICS.map(({id,name,category})=>({id,name,category})),
    library:LIBRARY_TREE,
    load:loadCoreVocabulary,
    clear:()=>cache.clear()
  };
})();