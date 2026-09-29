const crypto=require("crypto");
const{init,corsHeaders,send,clean}=require("./_admin");

const MAX_NAME=180;
const MAX_NOTE=500;
const ALLOWED_METHODS=new Set(["POST","OPTIONS"]);

function ipKey(req){
  const raw=String(req.headers?.["x-forwarded-for"]||req.headers?.["x-real-ip"]||"unknown").split(",")[0].trim();
  return crypto.createHash("sha256").update(raw||"unknown").digest("hex").slice(0,32);
}

function normalize(value){
  return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

module.exports=async function handler(req,res){
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS")return send(res,204,{ok:true},origin);
  if(!ALLOWED_METHODS.has(String(req.method||"").toUpperCase()))return send(res,405,{ok:false,error:"Method not allowed."},origin);
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
    const key=ipKey(req);
    const rateRef=db.collection("studentSchoolRequestRate").doc(key);
    const rateSnap=await rateRef.get();
    const last=Number(rateSnap.exists?rateSnap.data()?.lastSubmittedAt||0:0);
    if(Date.now()-last<60000)return send(res,429,{ok:false,error:"Bạn vừa gửi một góp ý. Hãy thử lại sau khoảng 1 phút nhé."},origin);

    const duplicateQuery=await db.collection("studentSchoolRequests")
      .where("normalizedKey","==",normalize(province)+"|"+normalize(ward)+"|"+normalize(name))
      .where("status","==","pending")
      .limit(1).get();
    if(!duplicateQuery.empty){
      await rateRef.set({lastSubmittedAt:Date.now()},{merge:true});
      return send(res,200,{ok:true,duplicate:true,message:"Trường này đã có một góp ý đang chờ Admin kiểm tra rồi."},origin);
    }

    const ref=db.collection("studentSchoolRequests").doc();
    await ref.set({
      schoolName:name,
      province,
      ward,
      note,
      studentName,
      studentEmail,
      normalizedKey:normalize(province)+"|"+normalize(ward)+"|"+normalize(name),
      source:"student_signup",
      status:"pending",
      createdAt:Date.now(),
      updatedAt:Date.now()
    });
    await rateRef.set({lastSubmittedAt:Date.now()},{merge:true});
    return send(res,201,{ok:true,requestId:ref.id,message:"Đã gửi góp ý thêm trường cho Admin."},origin);
  }catch(error){
    console.error("[student-school-request]",error);
    return send(res,500,{ok:false,error:"Không thể gửi góp ý lúc này."},origin);
  }
};