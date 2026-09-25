// Minimal local server for Firebase Authentication testing; no npm packages required.
const http=require('http');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
http.createServer((req,res)=>{
  const raw=(req.url||'/').split('?')[0];
  let relative;
  try{relative=raw==='/'?'index.html':decodeURIComponent(raw).replace(/^[/\\]+/,'')}catch(_){res.writeHead(400);return res.end('Bad request')}
  const parts=relative.split(/[\\/]+/).filter(Boolean);
  if(parts.some(part=>part.startsWith('.'))){res.writeHead(403);return res.end('Forbidden')}
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('KatLearn is running at http://127.0.0.1:'+String(process.env.PORT||3000)));