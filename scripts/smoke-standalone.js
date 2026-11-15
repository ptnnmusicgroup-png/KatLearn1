"use strict";
const assert=require("node:assert/strict");
const{createServer}=require("../server.js");
const{createRateLimiter}=require("../api/_rate-limit.js");
async function main(){
 // Regression checks for study features that can otherwise fail silently in the browser.
 const fs=require('node:fs');
 const studyCoach=fs.readFileSync(require.resolve('../api/study-coach.js'),'utf8');
 const studyStudio=fs.readFileSync(require.resolve('../study-studio.js'),'utf8');
 const revisionExam=fs.readFileSync(require.resolve('../revision-exam.js'),'utf8');
 const app=fs.readFileSync(require.resolve('../app.js'),'utf8');
 const firebaseService=fs.readFileSync(require.resolve('../firebase-service.js'),'utf8');
 const coreVocabulary=fs.readFileSync(require.resolve('../core-vocabulary.js'),'utf8');
 assert.ok(studyCoach.includes('&&answer))throw'));
 assert.ok(studyStudio.includes('&&String(answer||"").trim())){'));
 assert.ok(studyStudio.includes('!String(focusOverride||"").trim()'));
 assert.ok(revisionExam.includes('answerResults[index]=good'));
 assert.ok(revisionExam.includes('answerResults[idx]===false'));
 assert.ok(!revisionExam.includes('katlearn-revision-answer-'));
 assert.ok(studyCoach.includes('answerIndex:Number.isInteger(x?.answerIndex)?x.answerIndex:-1'));
 assert.ok(studyCoach.includes('study_assessment_invalid'));
 assert.ok(app.includes('if(knownValue)void recordStudyActivity()'));
 assert.ok(!app.includes('\n    void recordStudyActivity();'));
 assert.ok(!firebaseService.includes("key.startsWith('katlearn-known:')"));
 const topicPaths=[...coreVocabulary.matchAll(/path:'([^']+)'/g)].map(match=>match[1]).filter(file=>file.endsWith('.json')).map(file=>require('node:path').join(__dirname,'..','data','vocabulary',file));
 assert.ok(topicPaths.length>0,'Core vocabulary registry should not be empty');
 for(const file of topicPaths)assert.ok(fs.existsSync(file),'Missing core vocabulary file: '+file);
 const limiter=createRateLimiter({cleanupEvery:1,maxBuckets:100});
 assert.equal(limiter.check("student",2,1000,1000),0);
 assert.equal(limiter.check("student",2,1000,1001),0);
 assert.equal(limiter.check("student",2,1000,1002),1);
 assert.equal(limiter.check("student",2,1000,2001),0);
 for(let i=0;i<99;i++)limiter.check("uid-"+i,1,60000,2500);
 assert.equal(limiter.size,100);
 assert.equal(limiter.check("new-uid",1,60000,2501),60);
 const server=createServer();
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
 const base="http://127.0.0.1:"+server.address().port;
 try{
  const health=await fetch(base+"/healthz");assert.equal(health.status,200);assert.equal((await health.json()).service,"katlearn-standalone");
  const home=await fetch(base+"/");assert.equal(home.status,200);const html=await home.text();assert.match(html,/deployment-config\.js/);assert.match(html,/katlearn-motion\.js/);
  const cfg=await fetch(base+"/deployment-config.js");assert.equal(cfg.status,200);const cfgText=await cfg.text();assert.match(cfgText,/KATLEARN_DEPLOYMENT_CONFIG/);assert.doesNotMatch(cfgText,/netlify\.app/i);
  const admin=await fetch(base+"/api/admin-hub?section=overview");assert.equal(admin.status,401);assert.equal((await admin.json()).code,"missing_admin_token");
  assert.equal((await fetch(base+"/api/no-such-api")).status,404);
  assert.equal((await fetch(base+"/api/_admin.js")).status,404);
  assert.equal((await fetch(base+"/.env.local")).status,404);
  console.log("Standalone smoke test passed: bounded rate limiter, health, HTML runtime scripts, API routing, and private-file protection.");
 }finally{await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error("Standalone smoke test failed:",error.message);process.exitCode=1});
