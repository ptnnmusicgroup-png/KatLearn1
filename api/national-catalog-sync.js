const{requireAdmin,send,clean,corsHeaders}=require("./_admin");
const crypto=require("crypto");

const OFFICIAL_PROVINCES=[
  ["01","Thành phố Hà Nội"],["04","Tỉnh Cao Bằng"],["08","Tỉnh Tuyên Quang"],["11","Tỉnh Điện Biên"],
  ["12","Tỉnh Lai Châu"],["14","Tỉnh Sơn La"],["15","Tỉnh Lào Cai"],["19","Tỉnh Thái Nguyên"],
  ["20","Tỉnh Lạng Sơn"],["22","Tỉnh Quảng Ninh"],["24","Tỉnh Bắc Ninh"],["25","Tỉnh Phú Thọ"],
  ["31","Thành phố Hải Phòng"],["33","Tỉnh Hưng Yên"],["37","Tỉnh Ninh Bình"],["38","Tỉnh Thanh Hóa"],
  ["40","Tỉnh Nghệ An"],["42","Tỉnh Hà Tĩnh"],["44","Tỉnh Quảng Trị"],["46","Thành phố Huế"],
  ["48","Thành phố Đà Nẵng"],["51","Tỉnh Quảng Ngãi"],["52","Tỉnh Gia Lai"],["56","Tỉnh Khánh Hòa"],
  ["66","Tỉnh Đắk Lắk"],["68","Tỉnh Lâm Đồng"],["75","Tỉnh Đồng Nai"],["79","Thành phố Hồ Chí Minh"],
  ["80","Tỉnh Tây Ninh"],["82","Tỉnh Đồng Tháp"],["86","Tỉnh Vĩnh Long"],["91","Tỉnh An Giang"],
  ["92","Thành phố Cần Thơ"],["96","Tỉnh Cà Mau"]
].map(([code,name])=>({code,name}));

const SCHOOL_TREE_URL="https://raw.githubusercontent.com/ptnnmusicgroup-png/KatLearn.Teacher/main/data/national-catalog/full-school-tree.json";
const WARD_LIST_URL="https://raw.githubusercontent.com/ptnnmusicgroup-png/KatLearn.Teacher/main/data/national-catalog/official-ward-list.json";

const provinceCodeByName=new Map(OFFICIAL_PROVINCES.flatMap(p=>[
  [norm(p.name),p.code],
  [norm(p.name.replace(/^(Tỉnh|Thành phố)\s+/i,"")),p.code]
]));

const gradeTemplates={
  primary:["1","2","3","4","5"],
  middle:["6","7","8","9"],
  high:["10","11","12"],
  combined:["1","2","3","4","5","6","7","8","9","10","11","12"]
};

function norm(value){
  let s=String(value??"").trim();
  s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase();
  return s.replace(/[^a-z0-9]+/g," ").trim();
}

function htmlText(value){
  return String(value??"")
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/g,"'")
    .replace(/\s+/g," ")
    .trim();
}

function slugId(value){
  return "sch_"+crypto.createHash("sha256").update(String(value)).digest("hex").slice(0,28);
}

function inferLevel(name){
  const n=norm(name);
  if(n.includes("thcs&thpt")||n.includes("thcs thpt")||n.includes("th&thcs")||n.includes("th thcs"))return"combined";
  if(n.includes("thpt")||n.includes("trung hoc pho thong"))return"high";
  if(n.includes("thcs")||n.includes("trung hoc co so"))return"middle";
  if(n.includes("tieu hoc")||/(^| )th( |$)/.test(n)||n.startsWith("th "))return"primary";
  return"combined";
}

function wardKey(value){
  return norm(String(value||"").replace(/^(Xã|Phường|Đặc khu)\s+/i,""));
}

async function fetchJson(url,label){
  const r=await fetch(url,{headers:{"User-Agent":"KatLearn-National-Catalog/2026"}});
  if(!r.ok)throw new Error(`Không tải được ${label} (${r.status}).`);
  return r.json();
}

async function sourceRows(){
  const[tree,wardCatalog]=await Promise.all([
    fetchJson(SCHOOL_TREE_URL,"school tree"),
    fetchJson(WARD_LIST_URL,"danh sách xã/phường")
  ]);
  if(!Array.isArray(tree)||tree.length!==34)throw new Error("School tree không hợp lệ: cần 34 tỉnh/thành.");
  if(!wardCatalog||!Array.isArray(wardCatalog.provinces)||wardCatalog.provinceCount!==34)throw new Error("Danh sách xã/phường không hợp lệ.");
  const officialByProvince=new Map(wardCatalog.provinces.map(p=>[String(p.code||"").trim(),p]));
  const result=[];
  for(const province of tree){
    const code=provinceCodeByName.get(norm(province.name));
    if(!code)continue;
    const officialProvince=officialByProvince.get(code);
    const officialByWard=new Map((officialProvince?.wards||[]).map(w=>[wardKey(w.name),w]));
    for(const ward of province.wards||[]){
      const legacyWardName=htmlText(ward.name);
      const canonical=officialByWard.get(wardKey(legacyWardName));
      for(const school of ward.schools||[]){
        const name=htmlText(school.name);
        if(!name)continue;
        result.push({
          provinceCode:code,
          provinceName:OFFICIAL_PROVINCES.find(p=>p.code===code)?.name||province.name,
          wardId:String(canonical?.id||ward.id||""),
          wardName:htmlText(canonical?.name||legacyWardName),
          sourceSchoolId:String(school.id||""),
          name,
          level:inferLevel(name)
        });
      }
    }
  }
  return result;
}

async function writeChunk(db,rows){
  const writer=db.bulkWriter();
  let successful=0;
  writer.onWriteResult(()=>{successful++});
  writer.onWriteError(error=>{
    console.error("[KatLearn national sync write]",error);
    if(error.failedAttempts<3)return true;
    return false;
  });
  const now=Date.now();
  for(const r of rows){
    const schoolId=slugId(r.provinceCode+"|"+r.sourceSchoolId+"|"+norm(r.name));
    const schoolData={
      name:r.name,schoolId,province:r.provinceName,provinceId:r.provinceCode,
      ward:r.wardName,wardId:r.wardId,sourceSchoolId:r.sourceSchoolId,
      schoolLevel:r.level,source:"thanhtungct7/data-school-in-ward",
      sourceType:"community_national_school_tree",updatedAt:now
    };
    writer.set(db.collection("KatLearn_TRUONGHOC_1").doc(schoolId),schoolData,{merge:true});
    writer.set(db.collection("schools").doc(schoolId),{...schoolData,createdAt:now},{merge:true});
    for(const grade of gradeTemplates[r.level]){
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
    const all=await sourceRows();
    const grouped=new Map(OFFICIAL_PROVINCES.map(p=>[p.code,[]]));
    for(const row of all)grouped.get(row.provinceCode)?.push(row);

    if(action==="plan"){
      return send(res,200,{
        ok:true,
        provinces:OFFICIAL_PROVINCES.map(p=>({
          code:p.code,name:p.name,total:grouped.get(p.code)?.length||0
        })),
        totalSchools:all.length,
        totalProvinces:OFFICIAL_PROVINCES.length
      },origin);
    }

    if(action!=="chunk")return send(res,400,{ok:false,error:"Action không hợp lệ."},origin);

    const provinceCode=clean(req.body?.provinceCode,10);
    const offset=Math.max(0,Number(req.body?.offset)||0);
    const requestedLimit=Math.max(1,Math.min(250,Number(req.body?.limit)||150));
    const province=grouped.get(provinceCode);
    if(!province)throw Object.assign(new Error("Mã tỉnh/thành không hợp lệ."),{status:400});

    const chunk=province.slice(offset,offset+requestedLimit);
    const writes=await writeChunk(db,chunk);
    const nextOffset=offset+chunk.length;
    return send(res,200,{
      ok:true,provinceCode,provinceTotal:province.length,offset,nextOffset,
      done:nextOffset>=province.length,processed:chunk.length,writes
    },origin);
  }catch(error){
    const status=Number(error?.status||error?.statusCode)||500;
    console.error("[KatLearn national catalog sync]",error);
    return send(res,status,{ok:false,error:String(error?.message||"National catalog sync failed"),code:error?.code||null},origin);
  }
};
