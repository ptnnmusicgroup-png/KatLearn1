// Local KatLearn server. AI is Gemini-only and shares the authenticated API handlers used by deployment.
require('dotenv').config();
const express=require('express');
const app=express();
app.use(express.json({limit:'1mb'}));
app.use(express.static(__dirname));

const routes={
  '/api/vocab-assist':require('./api/vocab-assist'),
  '/api/ai-pack':require('./api/ai-pack'),
  '/api/ai-regenerate-word':require('./api/ai-regenerate-word'),
  '/api/context-example':require('./api/context-example')
};
for(const [path,handler] of Object.entries(routes)){
  const route=path==='/api/student-assigned-packs'?'get':'post';
  app[route](path,(req,res)=>handler(req,res));
}
app.get('/api/student-assigned-packs',(req,res)=>require('./api/student-assigned-packs')(req,res));

app.get('/api/health',(req,res)=>res.json({ok:true,ai:!!String(process.env.GEMINI_API_KEY||'').trim()}));
app.listen(process.env.PORT||3000,()=>console.log('KatLearn: http://localhost:'+String(process.env.PORT||3000)));