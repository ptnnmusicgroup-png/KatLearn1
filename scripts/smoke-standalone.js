"use strict";
const assert=require("node:assert/strict");
const{createServer}=require("../server.js");
async function main(){
 const server=createServer();
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
 const base="http://127.0.0.1:"+server.address().port;
 try{
  const health=await fetch(base+"/healthz");assert.equal(health.status,200);assert.equal((await health.json()).service,"katlearn-standalone");
  const home=await fetch(base+"/");assert.equal(home.status,200);const html=await home.text();assert.match(html,/deployment-config\\.js/);assert.match(html,/katlearn-motion\\.js/);
  const cfg=await fetch(base+"/deployment-config.js");assert.equal(cfg.status,200);const cfgText=await cfg.text();assert.match(cfgText,/KATLEARN_DEPLOYMENT_CONFIG/);assert.doesNotMatch(cfgText,/netlify\\.app/i);
  const admin=await fetch(base+"/api/admin-hub?section=overview");assert.equal(admin.status,401);assert.equal((await admin.json()).code,"missing_admin_token");
  assert.equal((await fetch(base+"/api/no-such-api")).status,404);
  assert.equal((await fetch(base+"/api/_admin.js")).status,404);
  assert.equal((await fetch(base+"/.env.local")).status,404);
  console.log("Standalone smoke test passed: health, HTML runtime scripts, API routing, and private-file protection.");
 }finally{await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error("Standalone smoke test failed:",error.message);process.exitCode=1});
