"use strict";
const crypto=require("crypto");
const net=require("node:net");
const{init,send,clean}=require("./_admin");

const MAX_NAME=180;
const MAX_NOTE=500;
const ALLOWED_METHODS=new Set(["POST","OPTIONS"]);

function clientAddress(req){
  const remote=String(req.socket?.remoteAddress||req.connection?.remoteAddress||req.ip||"").trim();
  // Only trust Cloudflare's client-IP header when the operator explicitly
  // enables it. Never trust caller-controlled X-Forwarded-For/X-Real-IP.
  if(String(process.env.KATLEARN_TRUST_CF_CONNECTING_IP||"").toLowerCase()==="true"){
    const forwarded=String(req.headers?.["cf-connecting-ip"]||"").trim();
    if(net.isIP(forwarded))return forwarded;
  }
  return net.isIP(remote)?remote:"unknown";
}

function ipKey(req){
  return crypto.createHash("sha256").update(clientAddress(req)).digest("hex").slice(0,32);
}

function normalize(value){
  return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

module.exports=async function handler(req,res){
  const origin=String(req.headers?.origin||"");
  const method=String(req.method||"").toUpperCase();
  if(method==="OPTIONS")return send(res,204,{ok:true},origin);
  if(!ALLOWED_METHODS.has(method))return send(res,405,{ok:false,error:"Method not allowed."},origin);

  try{
    const body=typeof req.body==="string"?(JSON.parse(req.body||"{}")||{}):(req.body||{});
    const name=clean(body.schoolName,MAX_NAME);
    const province=clean(body.province,MAX_NAME);
    const ward=clean(body.ward,MAX_NAME);
    const note=clean(body.note,MAX_NOTE);
    const studentName=clean(body.studentName,MAX_NAME);
    const studentEmail=clean(body.studentEmail,MAX_NAME).toLowerCase();

    if(name.length<2)return send(res,400,{ok:false,error:"Vui lòng nhập tên trường."},origin);
    if(province.length<2)return send(res,400,{ok:false,error:"Vui lòng nhập tỉnh/thành phố."},origin);
    if(ward.length<2)return send(res,400,{ok:false,error:"Vui lòng nhập xã/phường."},origin);

    const{db}=init();
    const now=Date.now();
    const rateRef=db.collection("studentSchoolRequestRate").doc(ipKey(req));
    const requestRef=db.collection("studentSchoolRequests").doc();
    const normalizedKey=normalize(province)+"|"+normalize(ward)+"|"+normalize(name);
    const duplicateQuery=db.collection("studentSchoolRequests")
      .where("normalizedKey","==",normalizedKey)
      .where("status","==","pending")
      .limit(1);

    // Rate check, duplicate check, request creation and timestamp update are
    // one transaction so concurrent requests cannot bypass the 60-second cap.
    const outcome=await db.runTransaction(async transaction=>{
      const rateSnap=await transaction.get(rateRef);
      const last=Number(rateSnap.exists?rateSnap.data()?.lastSubmittedAt||0:0);
      if(now-last<60000)return{limited:true};

      const duplicateSnap=await transaction.get(duplicateQuery);
      transaction.set(rateRef,{lastSubmittedAt:now},{merge:true});
      if(!duplicateSnap.empty)return{duplicate:true};

      transaction.create(requestRef,{
        schoolName:name,
        province,
        ward,
        note,
        studentName,
        studentEmail,
        normalizedKey,
        source:"student_signup",
        status:"pending",
        createdAt:now,
        updatedAt:now
      });
      return{created:true};
    });

    if(outcome.limited)return send(res,429,{ok:false,error:"Bạn vừa gửi một góp ý. Hãy thử lại sau khoảng 1 phút nhé."},origin);
    if(outcome.duplicate)return send(res,200,{ok:true,duplicate:true,message:"Trường này đã có một góp ý đang chờ Admin kiểm tra rồi."},origin);
    return send(res,201,{ok:true,requestId:requestRef.id,message:"Đã gửi góp ý thêm trường cho Admin."},origin);
  }catch(error){
    console.error("[student-school-request]",error?.code||"request_failed");
    return send(res,500,{ok:false,error:"Không thể gửi góp ý lúc này."},origin);
  }
};
