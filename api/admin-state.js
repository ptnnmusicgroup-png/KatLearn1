const{requireAdmin,send}=require("./_admin");

const USER_FIELDS=[
  "displayName","name","email","role","schoolName","className","accountCode",
  "coins","energy","province","ward","teacherVerification","createdAt","schoolId",
  "classIds","catalogClassId"
];
const CLASS_FIELDS=[
  "name","grade","teacherEmail","teacherUid","schoolName","schoolId","joinCode",
  "studentCount","createdAt","province","ward","catalogClassId"
];
const PACK_FIELDS=["name","createdBy","createdByEmail","createdByUid","createdAt","wordCount"];
const SCHOOL_FIELDS=["name","province","ward","schoolId","schoolLevel"];

const LIMITS={users:500,classes:500,packs:500,schools:500,pending:200};

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

function rows(snapshot){
  return snapshot.docs.map(d=>({id:d.id,...serialize(d.data()||{})}));
}

async function runQuery(label,query){
  try{return await query.get();}
  catch(error){
    console.error("[KatLearn admin state] "+label,error);
    throw Object.assign(new Error("Không đọc được "+label+": "+String(error?.message||"Firestore error")),{
      status:Number(error?.status||error?.statusCode)||502,
      code:error?.code||"firestore_error"
    });
  }
}

async function countQuery(label,query){
  try{
    const snapshot=await query.count().get();
    return Number(snapshot.data()?.count||0);
  }catch(error){
    console.error("[KatLearn admin state] count "+label,error);
    throw Object.assign(new Error("Không đếm được "+label+": "+String(error?.message||"Firestore error")),{
      status:Number(error?.status||error?.statusCode)||502,
      code:error?.code||"firestore_count_error"
    });
  }
}

module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS")return res.status(204).set({
    ...require("./_admin").corsHeaders(origin),
    "Content-Length":"0"
  }).end();
  if(req.method!=="GET")return send(res,405,{ok:false,error:"Method not allowed"},origin);

  try{
    const{db}=await requireAdmin(req);

    const usersRef=db.collection("users");
    const classesRef=db.collection("classes");
    const packsRef=db.collection("publicPacks");
    const schoolsRef=db.collection("schools");

    const[
      userCount,
      teacherCount,
      studentCount,
      pendingCount,
      classCount,
      packCount,
      schoolCount,
      usersSnap,
      classesSnap,
      packsSnap,
      schoolsSnap,
      pendingSnap
    ]=await Promise.all([
      countQuery("tài khoản",usersRef),
      countQuery("giáo viên",usersRef.where("role","==","teacher")),
      countQuery("học sinh",usersRef.where("role","==","student")),
      countQuery("hồ sơ chờ xác minh",usersRef.where("role","==","pending_teacher_verification")),
      countQuery("lớp học",classesRef),
      countQuery("bộ từ công khai",packsRef),
      countQuery("danh mục trường",schoolsRef),
      runQuery("danh sách tài khoản",usersRef.select(...USER_FIELDS).limit(LIMITS.users)),
      runQuery("danh sách lớp học",classesRef.select(...CLASS_FIELDS).limit(LIMITS.classes)),
      runQuery("danh sách bộ từ",packsRef.select(...PACK_FIELDS).limit(LIMITS.packs)),
      runQuery("danh sách trường",schoolsRef.select(...SCHOOL_FIELDS).limit(LIMITS.schools)),
      runQuery("hồ sơ giáo viên chờ xác minh",usersRef.where("role","==","pending_teacher_verification").select(...USER_FIELDS).limit(LIMITS.pending))
    ]);

    const users=rows(usersSnap);
    const classes=rows(classesSnap);
    const packs=packsSnap.docs.map(d=>({
      id:d.id,...serialize(d.data()||{}),
      wordCount:Number(d.data()?.wordCount||0)
    }));
    const schools=rows(schoolsSnap);
    const pending=rows(pendingSnap).sort((a,b)=>{
      const av=Number(a.teacherVerification?.submittedAt||a.createdAt||0);
      const bv=Number(b.teacherVerification?.submittedAt||b.createdAt||0);
      return av-bv;
    });

    return send(res,200,{
      ok:true,
      limits:LIMITS,
      stats:{
        users:userCount,
        teachers:teacherCount,
        students:studentCount,
        pending:pendingCount,
        classes:classCount,
        packs:packCount,
        schools:schoolCount,
        usersLimited:userCount>LIMITS.users,
        classesLimited:classCount>LIMITS.classes,
        packsLimited:packCount>LIMITS.packs,
        schoolsLimited:schoolCount>LIMITS.schools,
        pendingLimited:pendingCount>LIMITS.pending
      },
      users,classes,packs,schools,pending
    },origin);
  }catch(error){
    const status=Number(error?.status||error?.statusCode)||500;
    console.error("[KatLearn admin state]",error);
    return send(res,status,{
      ok:false,
      error:String(error?.message||"Không thể tải dữ liệu quản trị."),
      code:error?.code||"admin_state_error"
    },origin);
  }
};
