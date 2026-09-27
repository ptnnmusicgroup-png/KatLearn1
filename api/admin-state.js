const{requireAdmin,send,serialize}=require("./_admin");

function rows(snapshot){
  return snapshot.docs.map(d=>({id:d.id,...serialize(d.data()||{})}));
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
    const[usersSnap,classesSnap,packsSnap,schoolsSnap]=await Promise.all([
      db.collection("users").get(),
      db.collection("classes").get(),
      db.collection("publicPacks").select("name","createdBy","createdByEmail","createdByUid","createdAt","wordCount").get(),
      db.collection("schools").select("name","province","ward").limit(500).get()
    ]);
    const users=rows(usersSnap);
    const classes=rows(classesSnap);
    const packs=packsSnap.docs.map(d=>{
      const data=d.data()||{};
      return{
        id:d.id,
        name:data.name,
        createdBy:data.createdBy,
        createdByEmail:data.createdByEmail,
        createdByUid:data.createdByUid,
        createdAt:serialize(data.createdAt),
        wordCount:Number(data.wordCount||0)
      };
    });
    const schools=rows(schoolsSnap);
    const pending=users
      .filter(u=>String(u.role||"").toLowerCase()==="pending_teacher_verification")
      .sort((a,b)=>Number(a.teacherVerification?.submittedAt||a.createdAt||0)-Number(b.teacherVerification?.submittedAt||b.createdAt||0));
    return send(res,200,{
      ok:true,
      stats:{
        users:users.length,
        teachers:users.filter(u=>String(u.role||"").toLowerCase()==="teacher").length,
        students:users.filter(u=>String(u.role||"").toLowerCase()==="student").length,
        pending:pending.length,
        classes:classes.length,
        packs:packs.length,
        schools:schools.length,
        schoolsLimited:true
      },
      users,classes,packs,schools,pending
    },origin);
  }catch(error){
    const status=Number(error?.status||error?.statusCode)||500;
    console.error("[KatLearn admin state]",error);
    return send(res,status,{ok:false,error:String(error?.message||"Không thể tải dữ liệu quản trị."),code:error?.code||null},origin);
  }
};
