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
    let serviceAccount=null;
    if(raw){
      try{serviceAccount=JSON.parse(raw)}catch(_){throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid on the lms-katlearn server."),{status:503,code:"firebase_credentials_invalid"})}
    }else{
      const projectId=String(process.env.FIREBASE_PROJECT_ID||process.env.FIREBASE_ADMIN_PROJECT_ID||"").trim();
      const clientEmail=String(process.env.FIREBASE_CLIENT_EMAIL||process.env.FIREBASE_ADMIN_CLIENT_EMAIL||"").trim();
      const privateKey=String(process.env.FIREBASE_PRIVATE_KEY||process.env.FIREBASE_ADMIN_PRIVATE_KEY||"").replace(/\\n/g,"\n").trim();
      if(projectId&&clientEmail&&privateKey)serviceAccount={project_id:projectId,client_email:clientEmail,private_key:privateKey};
    }
    if(!serviceAccount)throw Object.assign(new Error("Firebase Admin credentials are not configured on the lms-katlearn server. Configure FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."),{status:503,code:"firebase_credentials_missing"});
    if(!serviceAccount.project_id||!serviceAccount.client_email||!serviceAccount.private_key){
      throw Object.assign(new Error("Firebase Admin credentials are incomplete: project_id, client_email, and private_key are required."),{status:503,code:"firebase_credentials_incomplete"});
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
    h["Access-Control-Allow-Headers"]="authorization,content-type,accept";
    h["Vary"]="Origin";
  }
  return h;
}

function send(res,status,body,origin=""){
  const headers=corsHeaders(origin);
  const payload=JSON.stringify(body);
  if(res&&typeof res.setHeader==="function"){
    for(const[key,value]of Object.entries(headers))res.setHeader(key,value);
    res.statusCode=Number(status)||200;
    if(typeof res.end==="function")return res.end(payload);
  }
  return new Response(payload,{status:Number(status)||200,headers});
}

async function requireAdmin(req){
  const match=/^Bearer\s+(.+)$/i.exec(String(req.headers?.authorization||""));
  if(!match)throw Object.assign(new Error("Bạn cần đăng nhập Admin."),{status:401,code:"missing_admin_token"});
  const{auth,db}=init();
  let decoded;
  try{
    decoded=await auth.verifyIdToken(match[1],true);
  }catch(error){
    const code=String(error?.code||"auth_error");
    const message=code==="auth/id-token-expired"||code==="auth/id-token-revoked"
      ?"Phiên Admin đã hết hạn. Hãy tải lại trang và đăng nhập lại."
      :"Không xác thực được phiên Admin trên máy chủ: "+String(error?.message||code);
    throw Object.assign(new Error(message),{status:401,code});
  }
  if(String(decoded.email||"").toLowerCase()!==ADMIN_EMAIL){
    throw Object.assign(new Error("Tài khoản không có quyền Admin."),{status:403,code:"admin_forbidden"});
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
