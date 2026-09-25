// Local KatLearn server. AI is Gemini-only and shares the authenticated API handlers used by deployment.
require('dotenv').config();
const express=require('express');
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));
app.use(express.static(__dirname,{dotfiles:'ignore'}));

const routes={
  '/api/vocab-assist':require('./api/vocab-assist'),
  '/api/ai-pack':require('./api/ai-pack'),
  '/api/ai-regenerate-word':require('./api/ai-regenerate-word'),
  '/api/context-example':require('./api/context-example'),
  '/api/student-assigned-packs':require('./api/student-assigned-packs'),
  '/api/game-action':require('./api/game-action')
};
for(const [path,handler] of Object.entries(routes)){
  const method=path==='/api/student-assigned-packs'?'get':'post';
  app[method](path,(req,res)=>handler(req,res));
}

app.get('/api/health',(req,res)=>res.json({ok:true,ai:!!String(process.env.GEMINI_API_KEY||'').trim()}));
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log('KatLearn: http://'+host+':'+String(port)));