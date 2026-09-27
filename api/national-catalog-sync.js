const{requireAdmin,send,clean,corsHeaders}=require("./_admin");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const PROVINCES=[
  {code:"01",name:"Thành phố Hà Nội",total:2828,file:"province-01.json"},
  {code:"04",name:"Tỉnh Cao Bằng",total:150,file:"province-04.json"},
  {code:"08",name:"Tỉnh Tuyên Quang",total:300,file:"province-08.json"},
  {code:"11",name:"Tỉnh Điện Biên",total:182,file:"province-11.json"},
  {code:"12",name:"Tỉnh Lai Châu",total:137,file:"province-12.json"},
  {code:"14",name:"Tỉnh Sơn La",total:278,file:"province-14.json"},
  {code:"15",name:"Tỉnh Lào Cai",total:216,file:"province-15.json"},
  {code:"19",name:"Tỉnh Thái Nguyên",total:261,file:"province-19.json"},
  {code:"20",name:"Tỉnh Lạng Sơn",total:200,file:"province-20.json"},
  {code:"22",name:"Tỉnh Quảng Ninh",total:266,file:"province-22.json"},
  {code:"24",name:"Tỉnh Bắc Ninh",total:1039,file:"province-24.json"},
  {code:"25",name:"Tỉnh Phú Thọ",total:759,file:"province-25.json"},
  {code:"31",name:"Thành phố Hải Phòng",total:1041,file:"province-31.json"},
  {code:"33",name:"Tỉnh Hưng Yên",total:548,file:"province-33.json"},
  {code:"37",name:"Tỉnh Ninh Bình",total:1178,file:"province-37.json"},
  {code:"38",name:"Tỉnh Thanh Hóa",total:2002,file:"province-38.json"},
  {code:"40",name:"Tỉnh Nghệ An",total:372,file:"province-40.json"},
  {code:"42",name:"Tỉnh Hà Tĩnh",total:444,file:"province-42.json"},
  {code:"44",name:"Tỉnh Quảng Trị",total:290,file:"province-44.json"},
  {code:"46",name:"Thành phố Huế",total:383,file:"province-46.json"},
  {code:"48",name:"Thành phố Đà Nẵng",total:550,file:"province-48.json"},
  {code:"51",name:"Tỉnh Quảng Ngãi",total:127,file:"province-51.json"},
  {code:"52",name:"Tỉnh Gia Lai",total:261,file:"province-52.json"},
  {code:"56",name:"Tỉnh Khánh Hòa",total:296,file:"province-56.json"},
  {code:"66",name:"Tỉnh Đắk Lắk",total:616,file:"province-66.json"},
  {code:"68",name:"Tỉnh Lâm Đồng",total:1021,file:"province-68.json"},
  {code:"75",name:"Tỉnh Đồng Nai",total:691,file:"province-75.json"},
  {code:"79",name:"Thành phố Hồ Chí Minh",total:2382,file:"province-79.json"},
  {code:"80",name:"Tỉnh Tây Ninh",total:406,file:"province-80.json"},
  {code:"82",name:"Tỉnh Đồng Tháp",total:275,file:"province-82.json"},
  {code:"86",name:"Tỉnh Vĩnh Long",total:723,file:"province-86.json"},
  {code:"91",name:"Tỉnh An Giang",total:1322,file:"province-91.json"},
  {code:"92",name:"Thành phố Cần Thơ",total:713,file:"province-92.json"},
  {code:"96",name:"Tỉnh Cà Mau",total:593,file:"province-96.json"}
];
const TOTAL_SCHOOLS=22850;
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
  const provinceMeta=rows[0]&&PROVINCE_BY_CODE.get(String(rows[0].provinceCode));
  if(provinceMeta){
    writer.set(db.collection("KatLearn_TINHTHANH_1").doc(String(provinceMeta.code)),{
      provinceId:String(provinceMeta.code),
      name:provinceMeta.name,
      code:String(provinceMeta.code),
      schoolCount:Number(provinceMeta.total||0),
      source:"national_catalog_2026",
      updatedAt:Date.now()
    },{merge:true});
  }
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
  const action=clean(req.method==="GET"?req.query?.action:req.body?.action,20)||"plan";
  if(req.method==="GET"&&action==="plan"){
    return send(res,200,{
      ok:true,
      provinces:PROVINCES.map(p=>({code:String(p.code),name:p.name,total:Number(p.total||0)})),
      totalSchools:TOTAL_SCHOOLS,
      totalProvinces:PROVINCES.length
    },origin);
  }
  if(req.method!=="POST")return send(res,405,{ok:false,error:"Method not allowed"},origin);
  try{

    // The plan contains only public catalog metadata. Keep it outside Admin auth
    // so the initial planning request cannot fail because of Firebase Admin auth.
    if(action==="plan"){
      return send(res,200,{
        ok:true,
        provinces:PROVINCES.map(p=>({code:String(p.code),name:p.name,total:Number(p.total||0)})),
        totalSchools:TOTAL_SCHOOLS,
        totalProvinces:PROVINCES.length
      },origin);
    }

    if(action!=="chunk")return send(res,400,{ok:false,error:"Action không hợp lệ."},origin);

    const{db}=await requireAdmin(req);

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
