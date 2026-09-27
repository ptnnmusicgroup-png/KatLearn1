const{requireAdmin,send,corsHeaders,clean}=require("./_admin");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const LIMITS={users:300,teachers:300,classes:300,packs:300,schools:300,pending:100,activity:100};
const DATA_DIR=path.join(__dirname,"../data/national-catalog");
const TOTAL_SCHOOLS=22850;
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
const PROVINCE_MAP=new Map(PROVINCES.map(([code,name,total,file])=>[code,{code,name,total,file}]));
const USER_FIELDS=["displayName","name","email","role","schoolName","className","accountCode","coins","energy","streak","province","ward","teacherVerification","createdAt","updatedAt","schoolId","classIds","catalogClassId","studentAccountType"];
const CLASS_FIELDS=["name","grade","teacherEmail","teacherUid","schoolName","schoolId","joinCode","studentCount","createdAt","updatedAt","province","ward","catalogClassId","deletingAt"];
const PACK_FIELDS=["name","createdBy","createdByEmail","createdByUid","createdAt","updatedAt","wordCount"];
const SCHOOL_FIELDS=["name","province","ward","schoolId","schoolLevel","createdAt","updatedAt","source","provinceId","wardId"];

function messageOf(error,fallback="Lỗi Admin"){
  if(error==null)return fallback;
  if(typeof error==="string")return error;
  if(error instanceof Error&&error.message)return error.message;
  if(typeof error?.message==="string"&&error.message)return error.message;
  if(typeof error?.error==="string")return error.error;
  if(typeof error?.error?.message==="string")return error.error.message;
  try{
    const value=JSON.stringify(error);
    if(value&&value!=="{}")return value;
  }catch(_){}
  return String(error);
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
function rows(snapshot){return snapshot.docs.map(doc=>({id:doc.id,...serialize(doc.data()||{})}))}
function fail(error,status=502,code="admin_backend_error"){
  const out=new Error(messageOf(error));
  out.status=Number(error?.status||error?.statusCode)||status;
  out.code=error?.code||code;
  out.details=typeof error==="object"&&error!==null?serialize(error):undefined;
  return out;
}
async function count(label,query){
  try{return Number((await query.count().get()).data()?.count||0)}
  catch(error){throw fail(error,502,"count_failed").withContext?.(label)||Object.assign(fail(error,502,"count_failed"),{label})}
}
async function list(label,query){
  try{return rows(await query.get())}
  catch(error){const e=fail(error,502,"query_failed");e.label=label;throw e}
}
async function safeCount(label,query,warnings){
  try{return await count(label,query)}
  catch(error){warnings.push({type:"count",label,message:messageOf(error)});return null}
}
async function safeList(label,query,warnings){
  try{return await list(label,query)}
  catch(error){warnings.push({type:"query",label,message:messageOf(error)});return []}
}
function plan(){
  return{
    provinces:PROVINCES.map(([code,name,total])=>({code,name,total})),
    totalSchools:TOTAL_SCHOOLS,
    totalProvinces:PROVINCES.length,
    version:"2026-09-27"
  };
}
function readProvince(code){
  const meta=PROVINCE_MAP.get(String(code));
  if(!meta)throw fail(new Error("Mã tỉnh/thành không hợp lệ."),400,"bad_province");
  try{
    const value=JSON.parse(fs.readFileSync(path.join(DATA_DIR,meta.file),"utf8"));
    if(!Array.isArray(value))throw new Error("Tệp danh mục không phải mảng.");
    return value;
  }catch(error){throw fail(new Error("Không đọc được danh mục "+meta.name+": "+messageOf(error)),500,"catalog_read_failed")}
}
function catalogSchoolId(value){
  return "sch_"+crypto.createHash("sha256").update(String(value)).digest("hex").slice(0,28);
}
const gradeTemplates={
  primary:["1","2","3","4","5"],
  middle:["6","7","8","9"],
  high:["10","11","12"],
  combined:["1","2","3","4","5","6","7","8","9","10","11","12"]
};
async function writeCatalogChunk(db,items){
  if(!items.length)return{writes:0,schools:0};
  const writer=db.bulkWriter();
  let writes=0;
  writer.onWriteResult(()=>{writes++});
  writer.onWriteError(error=>{
    console.error("[KatLearn admin catalog]",error);
    return error.failedAttempts<3;
  });
  const meta=PROVINCE_MAP.get(String(items[0].provinceCode));
  if(meta)writer.set(db.collection("KatLearn_TINHTHANH_1").doc(meta.code),{
    provinceId:meta.code,code:meta.code,name:meta.name,schoolCount:meta.total,
    source:"national_catalog_2026",updatedAt:Date.now()
  },{merge:true});
  const now=Date.now();
  for(const row of items){
    const id=catalogSchoolId(row.provinceCode+"|"+row.sourceSchoolId+"|"+String(row.name||"").trim().toLowerCase());
    const school={
      name:row.name,schoolId:id,province:row.provinceName,provinceId:row.provinceCode,
      ward:row.wardName,wardId:row.wardId,sourceSchoolId:row.sourceSchoolId,
      schoolLevel:row.level,source:"thanhtungct7/data-school-in-ward",
      sourceType:"community_national_school_tree",updatedAt:now
    };
    writer.set(db.collection("KatLearn_TRUONGHOC_1").doc(id),school,{merge:true});
    writer.set(db.collection("schools").doc(id),{...school,createdAt:now},{merge:true});
    for(const grade of gradeTemplates[row.level]||gradeTemplates.combined){
      const classId=id+"-"+grade;
      const cls={
        classId,name:"Lớp "+grade,grade:String(grade),schoolId:id,schoolName:row.name,
        province:row.provinceName,provinceId:row.provinceCode,ward:row.wardName,
        schoolLevel:row.level,isTemplate:true,source:"national_catalog_template",updatedAt:now
      };
      writer.set(db.collection("KatLearn_LOPHOC_1").doc(classId),cls,{merge:true});
      writer.set(db.collection("schools").doc(id).collection("classes").doc(classId),cls,{merge:true});
    }
  }
  try{await writer.close()}
  catch(error){throw fail(error,502,"catalog_write_failed")}
  return{writes,schools:items.length};
}
async function audit(db,decoded,action,target,extra={}){
  try{
    const id=Date.now()+"_"+crypto.randomBytes(5).toString("hex");
    await db.collection("adminAudit").doc(id).set({
      action,target,adminUid:decoded.uid,adminEmail:String(decoded.email||"").toLowerCase(),
      at:Date.now(),...serialize(extra)
    });
  }catch(error){console.error("[KatLearn admin audit]",messageOf(error))}
}
async function teacherChange(db,decoded,uid,mode){
  uid=clean(uid,160);
  if(!uid)throw fail(new Error("Thiếu UID giáo viên."),400,"missing_uid");
  const ref=db.collection("users").doc(uid);
  const snapshot=await ref.get();
  if(!snapshot.exists)throw fail(new Error("Không tìm thấy hồ sơ giáo viên."),404,"teacher_not_found");
  const profile=snapshot.data()||{};
  const verification=profile.teacherVerification||{};
  if(mode==="reject"){
    await ref.set({
      role:"teacher_rejected",
      teacherVerification:{...verification,status:"rejected",rejectedAt:Date.now(),rejectedBy:decoded.uid},
      updatedAt:Date.now()
    },{merge:true});
    await audit(db,decoded,"teacher.reject",uid);
    return{uid,status:"rejected"};
  }
  let schoolId=clean(profile.schoolId),schoolName=clean(profile.schoolName);
  const province=clean(profile.province),ward=clean(profile.ward);
  const requestedSchoolName=clean(verification.requestedSchoolName);
  const requestedClassName=clean(verification.requestedClassName);
  if(schoolId){
    const school=await db.collection("schools").doc(schoolId).get();
    if(!school.exists||clean(school.data()?.province)!==province||clean(school.data()?.ward)!==ward)schoolId="";
    else schoolName=clean(school.data()?.name)||schoolName;
  }
  if(!schoolId&&requestedSchoolName){
    const same=await db.collection("schools").where("name","==",requestedSchoolName).limit(20).get();
    const existing=same.docs.map(d=>({id:d.id,...d.data()})).find(x=>clean(x.province)===province&&clean(x.ward)===ward);
    if(existing){
      schoolId=existing.id;schoolName=clean(existing.name)||requestedSchoolName;
    }else{
      const created=await db.collection("schools").add({
        name:requestedSchoolName,province,ward,createdBy:uid,createdAt:Date.now(),updatedAt:Date.now()
      });
      schoolId=created.id;schoolName=requestedSchoolName;
    }
  }
  if(!schoolId)throw fail(new Error("Hồ sơ chưa có trường hợp lệ."),400,"teacher_school_missing");
  await db.collection("KatLearn_Teacher_Schools").doc(schoolId).set({
    name:schoolName,schoolId,province,ward,source:"teacher_verification",updatedAt:Date.now()
  },{merge:true});
  const classIds=Array.isArray(profile.classIds)?profile.classIds.filter(Boolean).slice(0,20):[];
  const valid=[];
  for(const classId of classIds){
    const classroom=await db.collection("schools").doc(schoolId).collection("classes").doc(classId).get();
    if(classroom.exists)valid.push(classId);
  }
  if(!valid.length&&requestedClassName){
    const sameClass=await db.collection("schools").doc(schoolId).collection("classes").where("name","==",requestedClassName).limit(5).get();
    if(sameClass.docs[0])valid.push(sameClass.docs[0].id);
    else{
      const created=await db.collection("schools").doc(schoolId).collection("classes").add({
        name:requestedClassName,createdBy:uid,teacherUid:uid,schoolId,schoolName,
        province,ward,createdAt:Date.now(),updatedAt:Date.now()
      });
      valid.push(created.id);
    }
  }
  if(!valid.length)throw fail(new Error("Hồ sơ chưa có lớp hợp lệ."),400,"teacher_class_missing");
  const catalogClassId=clean(valid.includes(profile.catalogClassId)?profile.catalogClassId:valid[0]);
  await ref.set({
    role:"teacher",schoolId,schoolName,province,ward,classIds:valid,catalogClassId,
    teacherVerification:{...verification,status:"verified",verifiedAt:Date.now(),verifiedBy:decoded.uid},
    updatedAt:Date.now()
  },{merge:true});
  for(const classId of valid){
    await db.collection("schools").doc(schoolId).collection("classes").doc(classId).set({
      teacherUid:uid,schoolId,schoolName,province,ward,updatedAt:Date.now()
    },{merge:true});
  }
  await audit(db,decoded,"teacher.verify",uid,{schoolId,classIds:valid});
  return{uid,status:"verified",schoolId,schoolName,province,ward,classIds:valid,catalogClassId};
}
async function deletePack(db,decoded,packId){
  packId=clean(packId,160);
  if(!packId)throw fail(new Error("Thiếu ID bộ từ."),400,"missing_pack_id");
  const ref=db.collection("publicPacks").doc(packId);
  const snap=await ref.get();
  if(!snap.exists)throw fail(new Error("Không tìm thấy bộ từ."),404,"pack_not_found");
  const assignments=await db.collection("packAssignments").where("packId","==",packId).get();
  for(let i=0;i<assignments.docs.length;i+=400){
    const batch=db.batch();
    assignments.docs.slice(i,i+400).forEach(doc=>batch.delete(doc.ref));
    await batch.commit();
  }
  await ref.delete();
  await audit(db,decoded,"pack.delete",packId,{name:snap.data()?.name||""});
  return{packId};
}
async function overview(db){
  const users=db.collection("users"),classes=db.collection("classes"),packs=db.collection("publicPacks"),schools=db.collection("schools");
  const warnings=[];
  const [
    userCount,teacherCount,studentCount,pendingCount,classCount,packCount,schoolCount,
    syncedSchoolCount,syncedProvinceCount
  ]=await Promise.all([
    safeCount("tài khoản",users,warnings),
    safeCount("giáo viên",users.where("role","==","teacher"),warnings),
    safeCount("học sinh",users.where("role","==","student"),warnings),
    safeCount("giáo viên chờ xác minh",users.where("role","==","pending_teacher_verification"),warnings),
    safeCount("lớp học",classes,warnings),
    safeCount("bộ từ công khai",packs,warnings),
    safeCount("trường ứng dụng",schools,warnings),
    safeCount("trường đã đồng bộ",db.collection("KatLearn_TRUONGHOC_1"),warnings),
    safeCount("tỉnh/thành đã đồng bộ",db.collection("KatLearn_TINHTHANH_1"),warnings)
  ]);
  const pending=await safeList(
    "hồ sơ giáo viên chờ xác minh",
    users.where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending),
    warnings
  );
  return{
    stats:{
      users:userCount,teachers:teacherCount,students:studentCount,pending:pendingCount,
      classes:classCount,packs:packCount,schools:schoolCount,
      syncedSchools:syncedSchoolCount,syncedProvinces:syncedProvinceCount
    },
    pending:pending.sort((a,b)=>Number(a.teacherVerification?.submittedAt||a.createdAt||0)-Number(b.teacherVerification?.submittedAt||b.createdAt||0)),
    catalog:plan(),
    warnings,
    degraded:warnings.length>0
  };
}
async function section(db,key){
  key=String(key||"overview");
  if(key==="overview")return overview(db);
  if(key==="catalog")return{catalog:plan()};
  if(key==="teachers"){
    const [pending,verified,rejected]=await Promise.all([
      list("giáo viên chờ xác minh",db.collection("users").where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending)),
      list("giáo viên",db.collection("users").where("role","==","teacher").select(...USER_FIELDS).limit(LIMITS.teachers)),
      list("giáo viên bị từ chối",db.collection("users").where("role","==","teacher_rejected").select(...USER_FIELDS).limit(LIMITS.pending))
    ]);
    return{
      rows:[
        ...pending.map(x=>({...x,_status:"pending"})),
        ...verified.map(x=>({...x,_status:"verified"})),
        ...rejected.map(x=>({...x,_status:"rejected"}))
      ],
      limited:pending.length>=LIMITS.pending||verified.length>=LIMITS.teachers||rejected.length>=LIMITS.pending
    };
  }
  if(key==="activity"){
    return{rows:await list("nhật ký Admin",db.collection("adminAudit").orderBy("at","desc").limit(LIMITS.activity))};
  }
  const defs={
    users:["tài khoản",db.collection("users").select(...USER_FIELDS).limit(LIMITS.users)],
    classes:["lớp học",db.collection("classes").select(...CLASS_FIELDS).limit(LIMITS.classes)],
    packs:["bộ từ công khai",db.collection("publicPacks").select(...PACK_FIELDS).limit(LIMITS.packs)],
    schools:["trường học",db.collection("schools").select(...SCHOOL_FIELDS).limit(LIMITS.schools)]
  };
  if(!defs[key])throw fail(new Error("Khu vực Admin không hợp lệ."),400,"bad_section");
  const[label,query]=defs[key];
  const data=await list(label,query);
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
    if(req.method!=="POST")return send(res,405,{ok:false,error:"Method not allowed",code:"method_not_allowed"},origin);
    const{db,decoded}=await requireAdmin(req);
    const body=req.body&&typeof req.body==="object"?req.body:{};
    const action=clean(body.action,50);
    if(action==="verify-teacher")return send(res,200,{ok:true,...await teacherChange(db,decoded,body.uid,"verify")},origin);
    if(action==="reject-teacher")return send(res,200,{ok:true,...await teacherChange(db,decoded,body.uid,"reject")},origin);
    if(action==="delete-pack")return send(res,200,{ok:true,...await deletePack(db,decoded,body.packId)},origin);
    if(action==="catalog-plan")return send(res,200,{ok:true,...plan()},origin);
    if(action==="catalog-chunk"){
      const provinceCode=clean(body.provinceCode,10);
      const data=readProvince(provinceCode);
      const offset=Math.max(0,Number(body.offset)||0);
      const limit=Math.max(1,Math.min(180,Number(body.limit)||150));
      const chunk=data.slice(offset,offset+limit);
      const result=await writeCatalogChunk(db,chunk);
      const nextOffset=offset+chunk.length;
      if(offset===0||nextOffset>=data.length){
        await audit(db,decoded,nextOffset>=data.length?"catalog.complete":"catalog.start",provinceCode,{
          offset,nextOffset,processed:chunk.length,provinceTotal:data.length
        });
      }
      return send(res,200,{
        ok:true,provinceCode,provinceTotal:data.length,offset,nextOffset,
        done:nextOffset>=data.length,processed:chunk.length,writes:result.writes
      },origin);
    }
    return send(res,400,{ok:false,error:"Action Admin không hợp lệ.",code:"bad_action"},origin);
  }catch(error){
    const status=Math.min(599,Math.max(400,Number(error?.status||error?.statusCode)||500));
    const code=typeof error?.code==="string"?error.code:"admin_hub_error";
    const details=error?.label?{label:error.label}:undefined;
    console.error("[KatLearn admin hub]",{status,code,error:messageOf(error),details});
    return send(res,status,{ok:false,error:messageOf(error,"Không thể xử lý Admin."),code,details},origin);
  }
};
