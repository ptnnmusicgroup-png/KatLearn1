const{initializeApp,cert,getApps}=require("firebase-admin/app");
const{getAuth}=require("firebase-admin/auth");
const{getFirestore}=require("firebase-admin/firestore");

const ADMIN_EMAIL="katlearn.admin@gmail.com";
const ALLOWED_ORIGINS=new Set([
  "https://teacher-katlearn.vercel.app",
  "https://lms-katlearn.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
]);

function init(){
  if(!getApps().length){
    const raw=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||"").trim();
    if(!raw)throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the lms-katlearn server."),{status:503});
    let serviceAccount;
    try{serviceAccount=JSON.parse(raw)}catch(_){throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid on the lms-katlearn server."),{status:503})}
    if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key){
      throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing project_id, client_email, or private_key."),{status:503});
    }
    initializeApp({credential:cert(serviceAccount)});
  }
  return{auth:getAuth(),db:getFirestore()};
}

function corsHeaders(origin){
  const h={"Content-Type":"application/json","Cache-Control":"no-store"};
  if(ALLOWED_ORIGINS.has(origin)){
    h["Access-Control-Allow-Origin"]=origin;
    h["Access-Control-Allow-Methods"]="GET,POST,OPTIONS";
    h["Access-Control-Allow-Headers"]="authorization,content-type";
    h["Vary"]="Origin";
  }
  return h;
}

function send(res,status,body,origin=""){
  return res.status(status).set(corsHeaders(origin)).json(body);
}

async function requireAdmin(req){
  const match=/^Bearer\s+(.+)$/i.exec(String(req.headers?.authorization||""));
  if(!match)throw Object.assign(new Error("Bạn cần đăng nhập Admin."),{status:401});
  const{auth,db}=init();
  const decoded=await auth.verifyIdToken(match[1]);
  if(String(decoded.email||"").toLowerCase()!==ADMIN_EMAIL){
    throw Object.assign(new Error("Tài khoản không có quyền Admin."),{status:403});
  }
  return{auth,db,decoded};
}

function clean(value,max=200){
  return String(value??"").trim().slice(0,max);
}

function serialize(value){
  if(value&&typeof value.toMillis==="function")return value.toMillis();
  if(Array.isArray(value))return value.map(serialize);
  if(value&&typeof value==="object"){
    const out={};
    for(const[k,v]of Object.entries(value))out[k]=serialize(v);
    return out;
  }
  return value;
}

module.exports={ADMIN_EMAIL,ALLOWED_ORIGINS,init,corsHeaders,send,requireAdmin,clean,serialize};
