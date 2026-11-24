"use strict";
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname);
const HOST=String(process.env.HOST||"127.0.0.1").trim()||"127.0.0.1";
const PORT=Number.parseInt(process.env.PORT||"3000",10);
const MAX_BODY_BYTES=10*1024*1024;
const API_ENDPOINTS=new Set(["admin-hub","ai-pack","ai-regenerate-word","context-example","game-action","personal-pack-action","personal-pack","personal-packs","student-assigned-packs","student-school-request","study-coach","katai-chat","study-progress","vocab-assist"]);
const MIME_TYPES=Object.freeze({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf",".otf":"font/otf",".txt":"text/plain; charset=utf-8",".xml":"application/xml; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",".map":"application/json; charset=utf-8"});
const BLOCKED_SEGMENTS=new Set([".git",".github","api","dist","node_modules","scripts"]);
const BLOCKED_FILES=new Set(["server.js","dev-server.js","local-server.js","package.json","package-lock.json","pnpm-lock.yaml","yarn.lock","firestore.rules"]);

function normaliseOrigin(value){try{const url=new URL(String(value||"").trim());return url.protocol==="http:"||url.protocol==="https:"?url.origin:""}catch(_){return""}}
function allowedOrigins(){
 const configured=String(process.env.KATLEARN_ALLOWED_ORIGINS||"").split(",").map(normaliseOrigin).filter(Boolean);
 const optional=[process.env.KATLEARN_LMS_SITE_URL,process.env.KATLEARN_TEACHER_SITE_URL].map(normaliseOrigin).filter(Boolean);
 return new Set(["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173",...optional,...configured]);
}
function corsHeaders(origin){
 const value=normaliseOrigin(origin);if(!value||!allowedOrigins().has(value))return{};
 return{"access-control-allow-origin":value,"access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"authorization, content-type, accept","access-control-max-age":"600","vary":"Origin"};
}
function securityHeaders(){return{"x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","x-frame-options":"SAMEORIGIN"}}
function sendJson(res,status,value,extra={}){
 res.writeHead(status,{...securityHeaders(),"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra});
 res.end(JSON.stringify(value));
}
function parseQuery(url){
 const out={};for(const[k,v]of url.searchParams.entries()){
  if(Object.prototype.hasOwnProperty.call(out,k))out[k]=Array.isArray(out[k])?[...out[k],v]:[out[k],v];else out[k]=v;
 }return out;
}
function readRequestBody(req){
 return new Promise((resolve,reject)=>{
  const chunks=[];let size=0,tooLarge=false;
  req.on("data",chunk=>{size+=chunk.length;if(size>MAX_BODY_BYTES){tooLarge=true;chunks.length=0}else if(!tooLarge)chunks.push(chunk)});
  req.on("end",()=>{
   if(tooLarge){reject(Object.assign(new Error("Request body too large"),{status:413}));return}
   if(!size){resolve(undefined);return}
   const raw=Buffer.concat(chunks).toString("utf8"),type=String(req.headers["content-type"]||"").toLowerCase();
   if(type.includes("application/json")||/^[\s]*[\[{]/.test(raw)){try{resolve(JSON.parse(raw))}catch(_){resolve(raw)}}else resolve(raw);
  });
  req.on("error",reject);
 });
}
function createApiResponse(){
 const state={statusCode:200,headers:{},body:"",ended:false};
 const response={
  get statusCode(){return state.statusCode},set statusCode(v){state.statusCode=Number(v)||200},
  get headersSent(){return state.ended},
  setHeader(name,value){if(name!=null&&value!=null)state.headers[String(name).toLowerCase()]=String(value);return this},
  getHeader(name){return state.headers[String(name).toLowerCase()]},
  set(name,value){if(name&&typeof name==="object"){for(const[k,v]of Object.entries(name))this.setHeader(k,v)}else this.setHeader(name,value);return this},
  header(name,value){return this.setHeader(name,value)},
  status(code){state.statusCode=Number(code)||200;return this},
  json(value){state.headers["content-type"]||="application/json; charset=utf-8";state.body=JSON.stringify(value);state.ended=true;return this},
  send(value){if(value!=null&&typeof value==="object"&&!Buffer.isBuffer(value))return this.json(value);state.headers["content-type"]||="text/plain; charset=utf-8";state.body=value==null?"":value;state.ended=true;return this},
  end(value){state.body=value==null?"":value;state.ended=true;return this},
  writeHead(code,headers){state.statusCode=Number(code)||state.statusCode;if(headers)this.set(headers);return this}
 };
 return{response,state};
}
async function applyHandlerResult(value,state){
 if(state.ended||value==null)return;
 if(typeof Response!=="undefined"&&value instanceof Response){
  state.statusCode=value.status||state.statusCode;value.headers.forEach((v,k)=>state.headers[String(k).toLowerCase()]=v);
  state.body=Buffer.from(await value.arrayBuffer());state.ended=true;return;
 }
 if(typeof value==="object"&&"statusCode"in value){
  state.statusCode=Number(value.statusCode)||state.statusCode;
  for(const[k,v]of Object.entries(value.headers||{}))state.headers[String(k).toLowerCase()]=String(v);
  state.body=value.body==null?"":String(value.body);state.ended=true;return;
 }
 if(typeof value==="object"){state.headers["content-type"]||="application/json; charset=utf-8";state.body=JSON.stringify(value)}
 else state.body=String(value);
 state.ended=true;
}
async function handleApi(req,res,url,endpoint){
 if(!API_ENDPOINTS.has(endpoint)){sendJson(res,404,{ok:false,error:"API endpoint not found."});return}
 const method=String(req.method||"GET").toUpperCase();
 if(!["GET","POST","OPTIONS"].includes(method)){sendJson(res,405,{ok:false,error:"Method not allowed."},{allow:"GET, POST, OPTIONS"});return}
 const cors=corsHeaders(req.headers.origin);
 if(method==="OPTIONS"){res.writeHead(204,{...securityHeaders(),...cors,"cache-control":"no-store"});res.end();return}
 let body;try{body=method==="POST"?await readRequestBody(req):undefined}catch(error){
  sendJson(res,Number(error.status)||400,{ok:false,error:error.status===413?"Request body quá lớn.":"Request body không hợp lệ."},cors);return;
 }
 const headers={};for(const[k,v]of Object.entries(req.headers||{}))headers[String(k).toLowerCase()]=Array.isArray(v)?v.join(", "):String(v??"");
 const apiReq={method,headers,body,query:parseQuery(url),path:url.pathname,url:req.url||url.pathname,originalUrl:req.url||url.pathname,ip:req.socket?.remoteAddress||"",socket:req.socket,get(name){return headers[String(name).toLowerCase()]}};
 const{response,state}=createApiResponse();
 try{
  const handler=require(path.join(ROOT,"api",endpoint+".js"));
  await applyHandlerResult(await handler(apiReq,response),state);
  if(!state.ended){state.statusCode=state.statusCode||204;state.ended=true}
 }catch(error){
  console.error("[KatLearn API]",endpoint,error?.code||"handler_error",Number(error?.status)||500);
  if(!state.ended){state.statusCode=Number(error?.status||error?.statusCode)||500;state.headers["content-type"]="application/json; charset=utf-8";state.body=JSON.stringify({ok:false,error:state.statusCode>=500?"Server gặp lỗi khi xử lý yêu cầu. Hãy thử lại sau.":String(error?.message||"Yêu cầu không hợp lệ.")});state.ended=true}
 }
 const headersOut={...securityHeaders(),"cache-control":"no-store",...state.headers,...cors};
 const payload=Buffer.isBuffer(state.body)?state.body:Buffer.from(state.body==null?"":String(state.body),"utf8");
 res.writeHead(state.statusCode,headersOut);
 if(state.statusCode===204||state.statusCode===304||method==="HEAD")res.end();else res.end(payload);
}
function normalisePublicUrl(value){const raw=String(value||"").trim();if(!raw)return"";try{const u=new URL(raw);return u.protocol==="https:"||u.protocol==="http:"?u.origin:""}catch(_){return""}}
function deploymentConfigScript(){
 const config={lmsUrl:normalisePublicUrl(process.env.KATLEARN_LMS_SITE_URL),teacherUrl:normalisePublicUrl(process.env.KATLEARN_TEACHER_SITE_URL)};
 return"window.KATLEARN_DEPLOYMENT_CONFIG = Object.freeze("+JSON.stringify(config)+");\n";
}
function injectRuntimeScripts(html,relativePath=""){
 let output=html;
 if(!/src=["']\/?deployment-config\.js(?:\?[^"']*)?["']/i.test(output)){
  const script='<script src="/deployment-config.js"></script>';
  output=/<head\b[^>]*>/i.test(output)?output.replace(/<head\b[^>]*>/i,h=>h+"\n  "+script):script+"\n"+output;
 }
 if(path.basename(relativePath).toLowerCase()!=="dmca-validation.html"&&!/src=["']\/?katlearn-motion\.js(?:\?[^"']*)?["']/i.test(output)){
  const motion='<script defer src="/katlearn-motion.js?v=20261024-1"></script>';
  output=/<\/body\s*>/i.test(output)?output.replace(/<\/body\s*>/i,motion+"\n</body>"):output+"\n"+motion+"\n";
 }
 return output;
}
async function serveStatic(req,res,url){
 const method=String(req.method||"GET").toUpperCase();
 if(method!=="GET"&&method!=="HEAD"){sendJson(res,405,{ok:false,error:"Method not allowed."},{allow:"GET, HEAD"});return}
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch(_){sendJson(res,400,{ok:false,error:"Bad request."});return}
 if(pathname==="/favicon.ico")pathname="/favicon.svg";
 const relative=(pathname==="/"? "index.html":pathname).replace(/^[/\\]+/,"");
 const parts=relative.split(/[\\/]+/).filter(Boolean);
 const leaf=(parts[parts.length-1]||"").toLowerCase();
 const looksLikeServiceAccount=leaf.endsWith(".json")&&/(service.?account|firebase.*adminsdk|adminsdk)/i.test(leaf);
 if(!relative||looksLikeServiceAccount||parts.some(x=>x.startsWith(".")||BLOCKED_SEGMENTS.has(x.toLowerCase()))||BLOCKED_FILES.has(leaf)){
  sendJson(res,404,{ok:false,error:"Not found."});return;
 }
 const file=path.resolve(ROOT,relative);
 if(!file.startsWith(ROOT+path.sep)){sendJson(res,404,{ok:false,error:"Not found."});return}
 let content;try{const stat=await fs.promises.stat(file);if(!stat.isFile()){sendJson(res,404,{ok:false,error:"Not found."});return}content=await fs.promises.readFile(file)}catch(_){sendJson(res,404,{ok:false,error:"Not found."});return}
 const ext=path.extname(file).toLowerCase(),headers={...securityHeaders(),"content-type":MIME_TYPES[ext]||"application/octet-stream","cache-control":"no-store"};
 if(ext===".html")content=Buffer.from(injectRuntimeScripts(content.toString("utf8"),relative),"utf8");
 res.writeHead(200,headers);res.end(method==="HEAD"?undefined:content);
}
function createServer(){
 return http.createServer(async(req,res)=>{
  let url;try{url=new URL(req.url||"/","http://localhost")}catch(_){sendJson(res,400,{ok:false,error:"Bad request."});return}
  if(url.pathname==="/healthz"){sendJson(res,200,{ok:true,service:"katlearn-standalone"});return}
  if(url.pathname==="/deployment-config.js"){res.writeHead(200,{...securityHeaders(),"content-type":"text/javascript; charset=utf-8","cache-control":"no-store"});res.end(deploymentConfigScript());return}
  if(url.pathname==="/api"||url.pathname.startsWith("/api/")){const endpoint=url.pathname.slice("/api/".length).replace(/\/+$/,"");await handleApi(req,res,url,endpoint);return}
  await serveStatic(req,res,url);
 });
}
if(require.main===module){
 if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw new Error("PORT must be an integer between 1 and 65535.");
 const server=createServer();server.on("error",e=>{console.error("[KatLearn] Server startup failed:",e.code||"server_error");process.exitCode=1});
 server.listen(PORT,HOST,()=>{console.log("--------------------------------------");console.log(" KatLearn Standalone Node.js Server");console.log(" URL: http://localhost:"+PORT);console.log(" API: "+API_ENDPOINTS.size+" direct Node.js endpoints");console.log(" Bind: "+HOST);console.log("--------------------------------------")});
}
module.exports={createServer,deploymentConfigScript,injectRuntimeScripts};
