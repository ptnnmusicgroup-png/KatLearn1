const{requireAdmin,send,clean}=require("./_admin");

module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS")return res.status(204).set({
    ...require("./_admin").corsHeaders(origin),
    "Content-Length":"0"
  }).end();
  if(req.method!=="POST")return send(res,405,{ok:false,error:"Method not allowed"},origin);
  try{
    const{db,decoded}=await requireAdmin(req);
    const uid=clean(req.body?.uid,160);
    if(!uid)throw Object.assign(new Error("Thiếu tài khoản giáo viên."),{status:400});

    const ref=db.collection("users").doc(uid);
    const snap=await ref.get();
    if(!snap.exists)throw Object.assign(new Error("Không tìm thấy hồ sơ giáo viên."),{status:404});

    const profile=snap.data()||{};
    const requested=profile.teacherVerification||{};
    let schoolId=clean(profile.schoolId);
    let schoolName=clean(profile.schoolName);
    const classIds=Array.isArray(profile.classIds)?profile.classIds.filter(Boolean).slice(0,20):[];
    const province=clean(profile.province);
    const ward=clean(profile.ward);
    const requestedSchoolName=clean(requested.requestedSchoolName);
    const requestedClassName=clean(requested.requestedClassName);

    if(schoolId){
      const schoolSnap=await db.collection("schools").doc(schoolId).get();
      if(!schoolSnap.exists||clean(schoolSnap.data()?.province)!==province||clean(schoolSnap.data()?.ward)!==ward)schoolId="";
      else schoolName=clean(schoolSnap.data()?.name)||schoolName;
    }

    if(!schoolId&&requestedSchoolName){
      const sameName=await db.collection("schools").where("name","==",requestedSchoolName).get();
      const existing=sameName.docs.map(d=>({id:d.id,...d.data()})).find(s=>clean(s.province)===province&&clean(s.ward)===ward);
      if(existing){
        schoolId=existing.id;
        schoolName=clean(existing.name)||requestedSchoolName;
      }else{
        const newSchool=await db.collection("schools").add({
          name:requestedSchoolName,province,ward,createdBy:uid,createdAt:Date.now(),updatedAt:Date.now()
        });
        schoolId=newSchool.id;
        schoolName=requestedSchoolName;
      }
    }

    if(!schoolId)throw Object.assign(new Error("Hồ sơ chưa có trường hợp lệ."),{status:400});

    await db.collection("KatLearn_Teacher_Schools").doc(schoolId).set({
      name:schoolName,schoolId,province,ward,source:"teacher_verification",updatedAt:Date.now()
    },{merge:true});

    const validClassIds=[];
    for(const classId of classIds){
      const cs=await db.collection("schools").doc(schoolId).collection("classes").doc(classId).get();
      if(cs.exists)validClassIds.push(classId);
    }

    if(!validClassIds.length&&requestedClassName){
      const sameClass=await db.collection("schools").doc(schoolId).collection("classes").where("name","==",requestedClassName).get();
      const existing=sameClass.docs[0];
      if(existing)validClassIds.push(existing.id);
      else{
        const newClass=await db.collection("schools").doc(schoolId).collection("classes").add({
          name:requestedClassName,createdBy:uid,teacherUid:uid,schoolId,schoolName,province,ward,createdAt:Date.now(),updatedAt:Date.now()
        });
        validClassIds.push(newClass.id);
      }
    }

    if(!validClassIds.length)throw Object.assign(new Error("Hồ sơ chưa có lớp hợp lệ."),{status:400});

    const catalogClassId=clean(profile.catalogClassId&&validClassIds.includes(profile.catalogClassId)?profile.catalogClassId:validClassIds[0]);
    await ref.set({
      role:"teacher",schoolId,schoolName,province,ward,classIds:validClassIds,catalogClassId,
      teacherVerification:{...requested,status:"verified",verifiedAt:Date.now(),verifiedBy:decoded.uid},
      updatedAt:Date.now()
    },{merge:true});

    for(const classId of validClassIds){
      await db.collection("schools").doc(schoolId).collection("classes").doc(classId).set({
        teacherUid:uid,schoolId,schoolName,province,ward,updatedAt:Date.now()
      },{merge:true});
    }

    return send(res,200,{ok:true,uid,schoolId,schoolName,province,ward,classIds:validClassIds,catalogClassId},origin);
  }catch(error){
    const status=Number(error?.status||error?.statusCode)||500;
    console.error("[KatLearn admin verify teacher]",error);
    return send(res,status,{ok:false,error:String(error?.message||"Không thể xác minh giáo viên.")},origin);
  }
};
