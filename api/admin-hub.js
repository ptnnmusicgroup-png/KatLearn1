const{requireAdmin,send,corsHeaders,clean}=require("./_admin");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const ADMIN_EMAIL="katlearn.admin@gmail.com"; // rebuilt admin hub
const LIMITS={users:300,teachers:300,classes:300,packs:300,schools:300,pending:100};
const DATA_DIR=path.join(__dirname,"../data/national-catalog");
const PROVINCES=[
  ["01","Thành phố Hà Nội",2828,"province-01.json"],["04","Tỉnh Cao Bằng",150,"province-04.json"],["08","Tỉnh Tuyên Quang",300,"province-08.json"],
  ["11","Tỉnh Điện Biên",182,"province-11.json"],["12","Tỉnh Lai Châu",137,"province-12.json"],["14","Tỉnh Sơn La",278,"province-14.json"],
  ["15","Tỉnh Lào Cai",216,"province-15.json"],["19","Tỉnh Thái Nguyên",261,"province-19.json"],["20","Tỉnh Lạng Sơn",200,"province-20.json"],
  ["22","Tỉnh Quảng Ninh",266,"province-22.json"],["24","Tỉnh Bắc Ninh",1039,"province-24.json"],["25","Tỉnh Phú Thọ",759,"province-25.json"],
  ["31","Thành phố Hải Phòng",1041,"province-31.json"],["33","Tỉnh Hưng Yên",548,"province-33.json"],["37","Tỉnh Ninh Bình",1178,"province-37.json"],
  ["38","Tỉnh Thanh Hóa",2002,"province-38.json"],["40","Tỉnh Nghệ An",372,"province-40.json"],["42","Tỉnh Hà Tĩnh",444,"province-42.json"],
  ["44","Tỉnh Quảng Trị",290,"province-44.json"],["46","Thành phố Huế",383,"province-46.json"],["48","Thành phố Đà Nẵng",550,"province-48.json"],
  ["51","Tỉnh Quảng Ngãi",127,"province-51.json"],["52","Tỉnh Gia Lai",261,"province-52.json"],["56","Tỉnh Khánh Hòa",296,"province-56.json"],
  ["66","Tỉnh Đắk Lắk",616,"province-66.json"],["68","Tỉnh Lâm Đồng",1021,"province-68.json"],["75","Tỉnh Đồng Nai",691,"province-75.json"],
  ["79","Thành phố Hồ Chí Minh",2382,"province-79.json"],["80","Tỉnh Tây Ninh",406,"province-80.json"],["82","Tỉnh Đồng Tháp",275,"province-82.json"],
  ["86","Tỉnh Vĩnh Long",723,"province-86.json"],["91","Tỉnh An Giang",1322,"province-91.json"],["92","Thành phố Cần Thơ",713,"province-92.json"],
  ["96","Tỉnh Cà Mau",593,"province-96.json"]
];
const PROVINCE_MAP=new Map(PROVINCES.map(p=>[p[0],{code:p[0],name:p[1],total:p[2],file:p[3]}]));
const TOTAL_SCHOOLS=22850;
const USER_FIELDS=["displayName","name","email","role","schoolName","className","accountCode","coins","energy","streak","province","ward","teacherVerification","createdAt","updatedAt","schoolId","classIds","catalogClassId","studentAccountType"];
const CLASS_FIELDS=["name","grade","teacherEmail","teacherUid","schoolName","schoolId","joinCode","studentCount","createdAt","updatedAt","province","ward","catalogClassId","deletingAt"];
const PACK_FIELDS=["name","createdBy","createdByEmail","createdByUid","createdAt","updatedAt","wordCount"];
const SCHOOL_FIELDS=["name","province","ward","schoolId","schoolLevel","createdAt","updatedAt","source","provinceId","wardId"];

function serialize(v){
  if(v&&typeof v.toMillis==="function")return v.toMillis();
  if(Array.isArray(v))return v.map(serialize);
  if(v&&typeof v==="object"){const o={};for(const[k,x]of Object.entries(v))o[k]=serialize(x);return o}
  return v;
}
function rows(s){return s.docs.map(d=>({id:d.id,...serialize(d.data()||{})}))}
async function count(label,q){try{return Number((await q.count().get()).data()?.count||0)}catch(e){throw Object.assign(new Error("Không đếm được "+label+": "+String(e?.message||e)),{status:502,code:"count_failed"})}}
async function list(label,q){try{return rows(await q.get())}catch(e){throw Object.assign(new Error("Không đọc được "+label+": "+String(e?.message||e)),{status:502,code:"query_failed"})}}
async function audit(db,decoded,action,target,extra={}){
  try{
    const id=Date.now()+"_"+crypto.randomBytes(5).toString("hex");
    await db.collection("adminAudit").doc(id).set({
      action,target,adminUid:decoded.uid,adminEmail:String(decoded.email||ADMIN_EMAIL).toLowerCase(),
      at:Date.now(),...extra
    });
  }catch(e){console.error("[KatLearn admin audit]",e)}
}
function plan(){
  return{provinces:PROVINCES.map(([code,name,total])=>({code,name,total})),totalSchools:TOTAL_SCHOOLS,totalProvinces:PROVINCES.length,version:"2026-09-27"};
}
function readProvince(code){
  const meta=PROVINCE_MAP.get(String(code));
  if(!meta)throw Object.assign(new Error("Mã tỉnh/thành không hợp lệ."),{status:400,code:"bad_province"});
  try{
    const data=JSON.parse(fs.readFileSync(path.join(DATA_DIR,meta.file),"utf8"));
    if(!Array.isArray(data))throw new Error("Tệp danh mục không phải mảng.");
    return data;
  }catch(e){throw Object.assign(new Error("Không đọc được danh mục "+meta.name+": "+String(e?.message||e)),{status:500,code:"catalog_read_failed"})}
}
const gradeTemplates={
  primary:["1","2","3","4","5"],
  middle:["6","7","8","9"],
  high:["10","11","12"],
  combined:["1","2","3","4","5","6","7","8","9","10","11","12"]
};
function schoolId(v){return "sch_"+crypto.createHash("sha256").update(String(v)).digest("hex").slice(0,28)}
async function writeCatalogChunk(db,items){
  if(!items.length)return 0;
  const writer=db.bulkWriter();let writes=0;
  writer.onWriteResult(()=>{writes++});
  writer.onWriteError(e=>{console.error("[KatLearn admin catalog]",e);return e.failedAttempts<3});
  const meta=PROVINCE_MAP.get(String(items[0].provinceCode));
  if(meta)writer.set(db.collection("KatLearn_TINHTHANH_1").doc(meta.code),{
    provinceId:meta.code,code:meta.code,name:meta.name,schoolCount:meta.total,source:"national_catalog_2026",updatedAt:Date.now()
  },{merge:true});
  const now=Date.now();
  for(const r of items){
    const id=schoolId(r.provinceCode+"|"+r.sourceSchoolId+"|"+String(r.name||"").trim().toLowerCase());
    const school={name:r.name,schoolId:id,province:r.provinceName,provinceId:r.provinceCode,ward:r.wardName,wardId:r.wardId,sourceSchoolId:r.sourceSchoolId,schoolLevel:r.level,source:"thanhtungct7/data-school-in-ward",sourceType:"community_national_school_tree",updatedAt:now};
    writer.set(db.collection("KatLearn_TRUONGHOC_1").doc(id),school,{merge:true});
    writer.set(db.collection("schools").doc(id),{...school,createdAt:now},{merge:true});
    for(const grade of gradeTemplates[r.level]||gradeTemplates.combined){
      const classId=id+"-"+grade;
      const cls={classId,name:"Lớp "+grade,grade:String(grade),schoolId:id,schoolName:r.name,province:r.provinceName,provinceId:r.provinceCode,ward:r.wardName,schoolLevel:r.level,isTemplate:true,source:"national_catalog_template",updatedAt:now};
      writer.set(db.collection("KatLearn_LOPHOC_1").doc(classId),cls,{merge:true});
      writer.set(db.collection("schools").doc(id).collection("classes").doc(classId),cls,{merge:true});
    }
  }
  await writer.close();
  return writes;
}
async function verifyTeacher(db,decoded,uid,mode){
  const ref=db.collection("users").doc(uid),snap=await ref.get();
  if(!snap.exists)throw Object.assign(new Error("Không tìm thấy hồ sơ giáo viên."),{status:404,code:"teacher_not_found"});
  const profile=snap.data()||{},requested=profile.teacherVerification||{};
  if(mode==="reject"){
    await ref.set({role:"teacher_rejected",teacherVerification:{...requested,status:"rejected",rejectedAt:Date.now(),rejectedBy:decoded.uid},updatedAt:Date.now()},{merge:true});
    await audit(db,decoded,"teacher.reject",uid);
    return{uid,status:"rejected"};
  }
  let schoolId=clean(profile.schoolId),schoolName=clean(profile.schoolName),province=clean(profile.province),ward=clean(profile.ward);
  const requestedSchoolName=clean(requested.requestedSchoolName),requestedClassName=clean(requested.requestedClassName);
  if(schoolId){
    const s=await db.collection("schools").doc(schoolId).get();
    if(!s.exists||clean(s.data()?.province)!==province||clean(s.data()?.ward)!==ward)schoolId="";
    else schoolName=clean(s.data()?.name)||schoolName;
  }
  if(!schoolId&&requestedSchoolName){
    const same=await db.collection("schools").where("name","==",requestedSchoolName).limit(20).get();
    const existing=same.docs.map(d=>({id:d.id,...d.data()})).find(x=>clean(x.province)===province&&clean(x.ward)===ward);
    if(existing){schoolId=existing.id;schoolName=clean(existing.name)||requestedSchoolName}
    else{const created=await db.collection("schools").add({name:requestedSchoolName,province,ward,createdBy:uid,createdAt:Date.now(),updatedAt:Date.now()});schoolId=created.id;schoolName=requestedSchoolName}
  }
  if(!schoolId)throw Object.assign(new Error("Hồ sơ chưa có trường hợp lệ."),{status:400,code:"teacher_school_missing"});
  await db.collection("KatLearn_Teacher_Schools").doc(schoolId).set({name:schoolName,schoolId,province,ward,source:"teacher_verification",updatedAt:Date.now()},{merge:true});
  let classIds=Array.isArray(profile.classIds)?profile.classIds.filter(Boolean).slice(0,20):[];
  const valid=[];
  for(const cid of classIds){const cs=await db.collection("schools").doc(schoolId).collection("classes").doc(cid).get();if(cs.exists)valid.push(cid)}
  if(!valid.length&&requestedClassName){
    const q=await db.collection("schools").doc(schoolId).collection("classes").where("name","==",requestedClassName).limit(5).get();
    if(q.docs[0])valid.push(q.docs[0].id);
    else{const created=await db.collection("schools").doc(schoolId).collection("classes").add({name:requestedClassName,createdBy:uid,teacherUid:uid,schoolId,schoolName,province,ward,createdAt:Date.now(),updatedAt:Date.now()});valid.push(created.id)}
  }
  if(!valid.length)throw Object.assign(new Error("Hồ sơ chưa có lớp hợp lệ."),{status:400,code:"teacher_class_missing"});
  const catalogClassId=clean(valid.includes(profile.catalogClassId)?profile.catalogClassId:valid[0]);
  await ref.set({role:"teacher",schoolId,schoolName,province,ward,classIds:valid,catalogClassId,teacherVerification:{...requested,status:"verified",verifiedAt:Date.now(),verifiedBy:decoded.uid},updatedAt:Date.now()},{merge:true});
  for(const cid of valid)await db.collection("schools").doc(schoolId).collection("classes").doc(cid).set({teacherUid:uid,schoolId,schoolName,province,ward,updatedAt:Date.now()},{merge:true});
  await audit(db,decoded,"teacher.verify",uid,{schoolId,classIds:valid});
  return{uid,status:"verified",schoolId,schoolName,province,ward,classIds:valid,catalogClassId};
}
async function deletePack(db,decoded,packId){
  const ref=db.collection("publicPacks").doc(packId),snap=await ref.get();
  if(!snap.exists)throw Object.assign(new Error("Không tìm thấy bộ từ."),{status:404});
  const assigns=await db.collection("packAssignments").where("packId","==",packId).get();
  for(let i=0;i<assigns.docs.length;i+=400){const b=db.batch();assigns.docs.slice(i,i+400).forEach(d=>b.delete(d.ref));await b.commit()}
  await ref.delete();await audit(db,decoded,"pack.delete",packId,{name:snap.data()?.name||""});
  return{packId};
}
async function bootstrap(db){
  const users=db.collection("users"),classes=db.collection("classes"),packs=db.collection("publicPacks"),schools=db.collection("schools");
  const out=await Promise.all([
    count("tài khoản",users),count("giáo viên",users.where("role","==","teacher")),count("học sinh",users.where("role","==","student")),
    count("chờ xác minh",users.where("role","==","pending_teacher_verification")),count("lớp học",classes),count("bộ từ",packs),count("trường",schools),
    count("trường danh mục đã đồng bộ",db.collection("KatLearn_TRUONGHOC_1")),count("tỉnh/thành đã đồng bộ",db.collection("KatLearn_TINHTHANH_1")),
    list("hồ sơ chờ xác minh",users.where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending))
  ]);
  return{
    stats:{users:out[0],teachers:out[1],students:out[2],pending:out[3],classes:out[4],packs:out[5],schools:out[6],syncedSchools:out[7],syncedProvinces:out[8]},
    pending:out[9].sort((a,b)=>Number(a.teacherVerification?.submittedAt||a.createdAt||0)-Number(b.teacherVerification?.submittedAt||b.createdAt||0)),
    catalog:plan()
  };
}
async function section(db,section){
  const key=String(section||"overview");
  if(key==="overview")return bootstrap(db);
  if(key==="teachers"){
    const pending=await list("giáo viên chờ xác minh",db.collection("users").where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending));
    const teachers=await list("giáo viên",db.collection("users").where("role","==","teacher").select(...USER_FIELDS).limit(LIMITS.teachers));
    const rejected=await list("giáo viên bị từ chối",db.collection("users").where("role","==","teacher_rejected").select(...USER_FIELDS).limit(LIMITS.pending));
    return{rows:[
      ...pending.map(x=>({...x,_status:"pending"})),
      ...teachers.map(x=>({...x,_status:"verified"})),
      ...rejected.map(x=>({...x,_status:"rejected"}))
    ],limited:pending.length>=LIMITS.pending||teachers.length>=LIMITS.teachers||rejected.length>=LIMITS.pending};
  }
  if(key==="activity"){
    return{rows:await list("nhật ký Admin",db.collection("adminAudit").orderBy("at","desc").limit(100))};
  }
  const defs={
    users:["tài khoản",db.collection("users").select(...USER_FIELDS).limit(LIMITS.users)],
    classes:["lớp học",db.collection("classes").select(...CLASS_FIELDS).limit(LIMITS.classes)],
    packs:["bộ từ công khai",db.collection("publicPacks").select(...PACK_FIELDS).limit(LIMITS.packs)],
    schools:["trường học",db.collection("schools").select(...SCHOOL_FIELDS).limit(LIMITS.schools)]
  };
  if(!defs[key])throw Object.assign(new Error("Section Admin không hợp lệ."),{status:400,code:"bad_section"});
  const [label,q]=defs[key];const data=await list(label,q);
  return{rows:data,limited:data.length>=LIMITS[key]};
}
module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS")return res.status(204).set({...corsHeaders(origin),"Content-Length":"0"}).end();
  try{
    if(req.method==="GET"){
      const{db}=await requireAdmin(req);
      const value=await section(db,req.query?.section||"overview");
      return send(res,200,{ok:true,...value,limits:LIMITS},origin);
    }
    if(req.method!=="POST")return send(res,405,{ok:false,error:"Method not allowed"},origin);
    const{db,decoded}=await requireAdmin(req),body=req.body||{},action=clean(body.action,40);
    if(action==="verify-teacher")return send(res,200,{ok:true,...await verifyTeacher(db,decoded,clean(body.uid,160),"verify")},origin);
    if(action==="reject-teacher")return send(res,200,{ok:true,...await verifyTeacher(db,decoded,clean(body.uid,160),"reject")},origin);
    if(action==="delete-pack")return send(res,200,{ok:true,...await deletePack(db,decoded,clean(body.packId,160))},origin);
    if(action==="catalog-plan")return send(res,200,{ok:true,...plan()},origin);
    if(action==="catalog-chunk"){
      const provinceCode=clean(body.provinceCode,10),data=readProvince(provinceCode);
      const offset=Math.max(0,Number(body.offset)||0),limit=Math.max(1,Math.min(220,Number(body.limit)||180)),chunk=data.slice(offset,offset+limit);
      const writes=await writeCatalogChunk(db,chunk),nextOffset=offset+chunk.length;
      if(offset===0||nextOffset>=data.length)await audit(db,decoded,nextOffset>=data.length?"catalog.complete":"catalog.start",provinceCode,{offset,nextOffset,processed:chunk.length});
      return send(res,200,{ok:true,provinceCode,provinceTotal:data.length,offset,nextOffset,done:nextOffset>=data.length,processed:chunk.length,writes},origin);
    }
    return send(res,400,{ok:false,error:"Action Admin không hợp lệ.",code:"bad_action"},origin);
  }catch(error){
    const status=Number(error?.status||error?.statusCode)||500;
    console.error("[KatLearn admin hub]",error);
    return send(res,status,{ok:false,error:String(error?.message||"Không thể xử lý Admin."),code:error?.code||"admin_hub_error"},origin);
  }
};
