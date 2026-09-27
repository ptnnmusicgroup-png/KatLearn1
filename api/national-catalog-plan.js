const PROVINCES=[
  ["01","Thành phố Hà Nội",2828],["04","Tỉnh Cao Bằng",150],["08","Tỉnh Tuyên Quang",300],
  ["11","Tỉnh Điện Biên",182],["12","Tỉnh Lai Châu",137],["14","Tỉnh Sơn La",278],
  ["15","Tỉnh Lào Cai",216],["19","Tỉnh Thái Nguyên",261],["20","Tỉnh Lạng Sơn",200],
  ["22","Tỉnh Quảng Ninh",266],["24","Tỉnh Bắc Ninh",1039],["25","Tỉnh Phú Thọ",759],
  ["31","Thành phố Hải Phòng",1041],["33","Tỉnh Hưng Yên",548],["37","Tỉnh Ninh Bình",1178],
  ["38","Tỉnh Thanh Hóa",2002],["40","Tỉnh Nghệ An",372],["42","Tỉnh Hà Tĩnh",444],
  ["44","Tỉnh Quảng Trị",290],["46","Thành phố Huế",383],["48","Thành phố Đà Nẵng",550],
  ["51","Tỉnh Quảng Ngãi",127],["52","Tỉnh Gia Lai",261],["56","Tỉnh Khánh Hòa",296],
  ["66","Tỉnh Đắk Lắk",616],["68","Tỉnh Lâm Đồng",1021],["75","Tỉnh Đồng Nai",691],
  ["79","Thành phố Hồ Chí Minh",2382],["80","Tỉnh Tây Ninh",406],["82","Tỉnh Đồng Tháp",275],
  ["86","Tỉnh Vĩnh Long",723],["91","Tỉnh An Giang",1322],["92","Thành phố Cần Thơ",713],
  ["96","Tỉnh Cà Mau",593]
];

module.exports=async(req,res)=>{
  const origin=String(req.headers?.origin||"");
  const headers={
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin":origin==="https://teacher-katlearn.vercel.app"?origin:"",
    "Access-Control-Allow-Headers":"content-type",
    "Access-Control-Allow-Methods":"GET,OPTIONS",
    "Vary":"Origin"
  };
  if(req.method==="OPTIONS")return res.status(204).set(headers).end();
  if(req.method!=="GET")return res.status(405).set(headers).json({ok:false,error:"Method not allowed"});
  const provinces=PROVINCES.map(([code,name,total])=>({code,name,total}));
  return res.status(200).set(headers).json({
    ok:true,
    provinces,
    totalSchools:22850,
    totalProvinces:provinces.length,
    version:"2026-09-27"
  });
};
