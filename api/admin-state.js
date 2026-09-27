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
const PACK_FIELDS=["name","createdBy","createdByEmail","createdByUid","createdAt","wordCount","words"];
const SCHOOL_FIELDS=["name","province","ward","schoolId","schoolLevel"];

function rows(snapshot){
  return snapshot.docs.map(d=>({id:d.id,...d.data()}));
}

function publicPacksRows(snapshot){
  return snapshot.docs.map(d=>{
    const data=d.data()||{};
    return{
      id:d.id,
      name:data.name,
      createdBy:data.createdBy,
      createdByEmail:data.createdByEmail,
      createdByUid:data.createdByUid,
      createdAt:data.createdAt?.toMillis?.()??Number(data.createdAt||0),
      wordCount:Number(data.wordCount ?? (Array.isArray(data.words)?data.words.length:0))
    };
  });
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

module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS")return res.status(204).set({
    ...require("./_admin").corsHeaders(origin),
    "Content-Length":"0"
  }).end();
  if(req.method!=="GET")return send(res,405,{ok:false,error:"Method not allowed"},origin);

  try{
    const{db}=await requireAdmin(req);
    const usersSnap=await runQuery("tài khoản",db.collection("users").select(...USER_FIELDS).limit(5000));
    const classesSnap=await runQuery("lớp học",db.collection("classes").select(...CLASS_FIELDS).limit(5000));
    const packsSnap=await runQuery("bộ từ công khai",db.collection("publicPacks").select(...PACK_FIELDS).limit(3000));
    const schoolsSnap=await runQuery("danh mục trường",db.collection("schools").select(...SCHOOL_FIELDS).limit(500));

    const users=rows(usersSnap);
    const classes=rows(classesSnap);
    const packs=publicPacksRows(packsSnap);
    const schools=rows(schoolsSnap);
    const pending=users
      .filter(u=>String(u.role||"").toLowerCase()==="pending_teacher_verification")
      .sort((a,b)=>{
        const av=Number(a.teacherVerification?.submittedAt||a.createdAt||0);
        const bv=Number(b.teacherVerification?.submittedAt||b.createdAt||0);
        return av-bv;
      });

    return send(res,200,{
      ok:true,
      limits:{users:5000,classes:5000,packs:3000,schools:500},
      stats:{
        users:users.length,
        teachers:users.filter(u=>String(u.role||"").toLowerCase()==="teacher").length,
        students:users.filter(u=>String(u.role||"").toLowerCase()==="student").length,
        pending:pending.length,
        classes:classes.length,
        packs:packs.length,
        schools:schools.length,
        schoolsLimited:schools.length>=500
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
