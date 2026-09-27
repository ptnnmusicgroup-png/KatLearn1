const{requireAdmin,send,clean,corsHeaders}=require("./_admin");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const CATALOG_INDEX=require("../data/national-catalog/catalog-index.json");
const PROVINCES=Array.isArray(CATALOG_INDEX.provinces)?CATALOG_INDEX.provinces:[];
const PROVINCE_BY_CODE=new Map(PROVINCES.map(p=>[String(p.code),p]));
const DATA_DIR=path.join(__dirname,"../data/national-catalog");
const gradeTemplates={
  primary:["1","2","3","4","5"],
  middle:["6","7","8","9"],
  high:["10","11","12"],
  combined:["1","2","3","4","5","6","7","8","9","10","11","12"]
};

function slugId(value){
  return "sch_"+crypto.createHash("sha256").update(String(value)).digest("hex").slice(0,28);
}

function readProvince(code){
  const meta=PROVINCE_BY_CODE.get(String(code));
  if(!meta)throw Object.assign(new Error("Mã tỉnh/thành không hợp lệ."),{status:400});
  const file=path.join(DATA_DIR,String(meta.file||("province-"+code+".json")));
  try{
    const rows=JSON.parse(fs.readFileSync(file,"utf8"));
    if(!Array.isArray(rows))throw new Error("Dữ liệu tỉnh không phải mảng.");
    return rows;
  }catch(error){
    throw Object.assign(new Error("Không đọc được dữ liệu danh mục "+meta.name+": "+String(error?.message||error)),{status:500});
  }
}

async function writeChunk(db,rows){
  const writer=db.bulkWriter();
  let successful=0;
  writer.onWriteResult(()=>{successful++});
  writer.onWriteError(error=>{
    console.error("[KatLearn national sync write]",error);
    return error.failedAttempts<3;
  });
  const now=Date.now();
  for(const r of rows){
    const schoolId=slugId(r.provinceCode+"|"+r.sourceSchoolId+"|"+String(r.name||"").trim().toLowerCase());
    const schoolData={
      name:r.name,schoolId,province:r.provinceName,provinceId:r.provinceCode,
      ward:r.wardName,wardId:r.wardId,sourceSchoolId:r.sourceSchoolId,
      schoolLevel:r.level,source:"thanhtungct7/data-school-in-ward",
      sourceType:"community_national_school_tree",updatedAt:now
    };
    writer.set(db.collection("KatLearn_TRUONGHOC_1").doc(schoolId),schoolData,{merge:true});
    writer.set(db.collection("schools").doc(schoolId),{...schoolData,createdAt:now},{merge:true});
    for(const grade of gradeTemplates[r.level]||gradeTemplates.combined){
      const classId=schoolId+"-"+grade;
      const classData={
        classId,name:"Lớp "+grade,grade:String(grade),schoolId,schoolName:r.name,
        province:r.provinceName,provinceId:r.provinceCode,ward:r.wardName,
        schoolLevel:r.level,isTemplate:true,source:"national_catalog_template",updatedAt:now
      };
      writer.set(db.collection("KatLearn_LOPHOC_1").doc(classId),classData,{merge:true});
      writer.set(db.collection("schools").doc(schoolId).collection("classes").doc(classId),classData,{merge:true});
    }
  }
  await writer.close();
  return successful;
}

module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  if(req.method==="OPTIONS")return res.status(204).set({...corsHeaders(origin),"Content-Length":"0"}).end();
  if(req.method!=="POST")return send(res,405,{ok:false,error:"Method not allowed"},origin);
  try{
    const{db}=await requireAdmin(req);
    const action=clean(req.body?.action,20)||"plan";

    if(action==="plan"){
      return send(res,200,{
        ok:true,
        provinces:PROVINCES.map(p=>({code:String(p.code),name:p.name,total:Number(p.total||0)})),
        totalSchools:Number(CATALOG_INDEX.totalSchools||PROVINCES.reduce((sum,p)=>sum+Number(p.total||0),0)),
        totalProvinces:PROVINCES.length
      },origin);
    }

    if(action!=="chunk")return send(res,400,{ok:false,error:"Action không hợp lệ."},origin);

    const provinceCode=clean(req.body?.provinceCode,10);
    const rows=readProvince(provinceCode);
    const offset=Math.max(0,Number(req.body?.offset)||0);
    const requestedLimit=Math.max(1,Math.min(250,Number(req.body?.limit)||150));
    const chunk=rows.slice(offset,offset+requestedLimit);
    const writes=await writeChunk(db,chunk);
    const nextOffset=offset+chunk.length;
    return send(res,200,{
      ok:true,provinceCode,provinceTotal:rows.length,offset,nextOffset,
      done:nextOffset>=rows.length,processed:chunk.length,writes
    },origin);
  }catch(error){
    const status=Number(error?.status||error?.statusCode)||500;
    console.error("[KatLearn national catalog sync]",error);
    return send(res,status,{ok:false,error:String(error?.message||"National catalog sync failed"),code:error?.code||null},origin);
  }
};
