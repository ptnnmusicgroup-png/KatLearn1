import 'dotenv/config';
import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const TOPICS = [
  ['Daily_Life_Topic_Dùng hằng ngày','daily routines, errands, common actions, time, habits and everyday situations'],
  ['Family_Topic_Dùng hằng ngày','family members, relationships, household roles, relatives and common family situations'],
  ['Home_Topic_Dùng hằng ngày','rooms, furniture, appliances, cleaning, repairs, household objects and home activities'],
  ['Food_Topic_Dùng hằng ngày','common foods, meals, ingredients, eating, taste, restaurants and food-related situations'],
  ['Cooking_Topic_Dùng hằng ngày','ingredients, kitchen tools, cooking methods, recipes, preparation and serving'],
  ['Shopping_Topic_Dùng hằng ngày','shops, products, prices, payment, customers, buying, selling, returns and discounts'],
  ['Clothes_Fashion_Topic_Dùng hằng ngày','clothing, shoes, accessories, sizes, materials, appearance, dressing and laundry'],
  ['School_Education_Topic_Dùng hằng ngày','school subjects, classroom, studying, homework, exams, teachers, students and education'],
  ['Work_Career_Topic_Dùng hằng ngày','jobs, workplaces, tasks, meetings, applications, careers, schedules and common work communication'],
  ['Technology_Topic_Dùng hằng ngày','computers, phones, tablets, hardware, software, apps, files, devices and common technology actions'],
  ['Internet_SocialMedia_Topic_Dùng hằng ngày','websites, accounts, posts, messages, comments, videos, creators, privacy and online actions'],
  ['Health_Medicine_Topic_Dùng hằng ngày','body, symptoms, illness, doctors, hospitals, medicine, treatment and healthy habits'],
  ['Sports_Fitness_Topic_Dùng hằng ngày','sports, exercise, training, equipment, games, teams, competition and fitness'],
  ['Travel_Tourism_Topic_Dùng hằng ngày','trips, hotels, airports, tickets, luggage, sightseeing, bookings and common travel situations'],
  ['Transport_Topic_Dùng hằng ngày','cars, buses, trains, motorbikes, bicycles, roads, traffic, directions and public transport'],
  ['Weather_Seasons_Topic_Dùng hằng ngày','weather conditions, temperature, seasons, forecasts, natural weather events and daily weather talk'],
  ['Environment_Topic_Dùng hằng ngày','nature, pollution, waste, recycling, energy, climate, conservation and everyday environmental actions'],
  ['Animals_Nature_Topic_Dùng hằng ngày','pets, farm animals, wild animals, insects, habitats, plants and common nature vocabulary'],
  ['Feelings_Personality_Topic_Dùng hằng ngày','emotions, moods, personality traits, reactions, preferences and interpersonal behavior'],
  ['Entertainment_Culture_Topic_Dùng hằng ngày','music, films, television, books, games, art, festivals, hobbies and popular culture'],
  ['City_Community_Topic_Dùng hằng ngày','streets, buildings, services, neighborhoods, public places, community activities and city life'],
  ['Money_Finance_Topic_Dùng hằng ngày','money, prices, income, spending, saving, banking, cards, bills and everyday financial situations'],
  ['Communication_Topic_Dùng hằng ngày','speaking, listening, writing, texting, phone calls, conversations, requests, opinions and common expressions'],
  ['People_Relationships_Topic_Dùng hằng ngày','friends, classmates, neighbors, social situations, cooperation, conflict, invitations and relationships'],
  ['Places_Topic_Dùng hằng ngày','common places and facilities such as shops, schools, hospitals, parks, stations, offices and public buildings']
];

const MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const BATCH=100;
const TARGET=500;
const MECHANICAL_PREFIXES=new Set(['daily','common','basic','simple','important','useful','new','old','good','bad']);

function cleanWord(value){
  return String(value||'').trim().replace(/\\s+/g,' ');
}
function key(value){
  return cleanWord(value).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' -]/g,'');
}
function isMechanicalEntry(raw, existing){
  const word=cleanWord(raw.word), mean=cleanWord(raw.meaning_vi);
  const m=word.match(/^([a-z]+)\s+(.+)$/i);
  if(!m||!MECHANICAL_PREFIXES.has(m[1].toLowerCase()))return false;
  const base=m[2].trim().toLowerCase();
  const existingKeys=new Set(existing.map(x=>key(x)));
  if(!existingKeys.has(key(base)))return false;
  // Reject machine-built entries where the Vietnamese meaning preserves
  // the English base word instead of actually translating the entry.
  const meanLower=mean.toLowerCase();
  return meanLower.includes(base) || meanLower.startsWith(m[1].toLowerCase()+' ');
}
function setup(){
  if(!process.env.GEMINI_API_KEY)throw new Error('Thiếu GEMINI_API_KEY');
  if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)throw new Error('Thiếu FIREBASE_SERVICE_ACCOUNT_JSON');
  if(!getApps().length){
    initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))});
  }
  return getFirestore();
}
async function generateBatch(ai, topic, scope, existing){
  const avoid=existing.slice(-350).join(', ');
  const prompt=[
    `Tạo bộ từ vựng tiếng Anh cho học sinh Việt Nam về chủ đề "${topic}".`,
    `Phạm vi: ${scope}.`,
    `Mục tiêu: ${BATCH} mục từ MỚI, hữu ích và quen thuộc trong đời sống hằng ngày.`,
    'Bao quát rộng các nhánh của chủ đề; ưu tiên từ và cụm từ người học thực sự gặp khi nói, đọc, nghe và viết.',
    'Có thể gồm từ đơn, cụm từ cố định, collocation và phrasal verb nếu chúng thực sự hữu ích.',
    'Không dùng tên riêng, thương hiệu, từ quá hiếm, từ chuyên ngành quá sâu, hoặc các biến thể chỉ khác số nhiều/chia thì.',
    'Không lặp từ trong chính batch và tuyệt đối tránh các mục đã có trong danh sách loại trừ.',
    `Danh sách loại trừ: ${avoid || '(chưa có)'}`,
    'Trả về JSON hợp lệ đúng schema: {"words":[{"word":"...","meaning_vi":"...","ipa":"...","part_of_speech":"...","example":"...","notes":"..."}]}',
    'Nghĩa tiếng Việt ngắn, IPA chuẩn Anh-Anh nếu có thể, ví dụ tiếng Anh tự nhiên và ngắn.'
  ].join(' ');
  const response=await ai.models.generateContent({
    model:MODEL,
    contents:prompt,
    config:{
      responseMimeType:'application/json',
      responseSchema:{
        type:'object',
        properties:{
          words:{type:'array',items:{type:'object',properties:{
            word:{type:'string'},meaning_vi:{type:'string'},ipa:{type:'string'},
            part_of_speech:{type:'string'},example:{type:'string'},notes:{type:'string'}
          },required:['word','meaning_vi','ipa','part_of_speech','example','notes']}}
        },
        required:['words']
      },
      maxOutputTokens:12000
    }
  });
  const parsed=JSON.parse(response.text||'{"words":[]}');
  return Array.isArray(parsed.words)?parsed.words:[];
}

async function buildTopic(ai, topic, scope){
  const words=[], seen=new Set();
  let guard=0,stalled=0;
  while(words.length<TARGET && guard<10){
    guard++;
    const before=words.length;
    const batch=await generateBatch(ai,topic,scope,words.map(x=>x.word));
    for(const raw of batch){
      const word=cleanWord(raw.word), k=key(word);
      if(!word||seen.has(k)||isMechanicalEntry(raw,words.map(x=>x.word)))continue;
      const mean=cleanWord(raw.meaning_vi);
      if(!mean)continue;
      seen.add(k);
      words.push({
        word,
        mean,
        pron:cleanWord(raw.ipa),
        type:cleanWord(raw.part_of_speech),
        example:cleanWord(raw.example),
        note:cleanWord(raw.notes),
        emoji:'📚'
      });
      if(words.length===TARGET)break;
    }
    stalled=words.length===before?stalled+1:0;
    console.log(`  ${words.length}/${TARGET}`);
    if(stalled>=2)break;
  }
  if(words.length<TARGET)console.log(`  ✓ Dừng ở ${words.length} mục từ tự nhiên cho ${topic}; không nhồi thêm cho đủ 500.`);
  return words;
}

async function savePack(db,name,words,index){
  const ref=db.collection('publicPacks').doc(`core-${String(index+1).padStart(2,'0')}`);
  await ref.set({
    name,
    words,
    topic:name,
    source:'KatLearn Core Vocabulary',
    curated:true,
    wordCount:words.length,
    createdByUid:'katlearn.admin',
    createdAt:FieldValue.serverTimestamp(),
    updatedAt:FieldValue.serverTimestamp()
  },{merge:true});
  console.log(`✓ Đã lưu ${name}: ${words.length} từ → ${ref.path}`);
}

async function main(){
  const db=setup();
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  const only=process.argv.slice(2).join(' ').trim();
  const selected=only?TOPICS.filter(([name])=>name.toLowerCase().includes(only.toLowerCase())):TOPICS;
  if(!selected.length)throw new Error('Không tìm thấy topic. Dùng: node scripts/seed-public-vocabulary.mjs Environment');
  for(const [name,scope] of selected){
    const index=TOPICS.findIndex(x=>x[0]===name);
    console.log(`\\n=== ${name} ===`);
    const words=await buildTopic(ai,name,scope);
    await savePack(db,name,words,index);
  }
  console.log('\\n🎉 Hoàn tất kho KatLearn Core Vocabulary.');
}
main().catch(error=>{console.error(error);process.exit(1)});
