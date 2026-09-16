// Minimal local server for Firebase Authentication testing; no npm packages required.
const http=require('http');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer((req,res)=>{
  const raw=(req.url||'/').split('?')[0];
  const relative=raw==='/'?'index.html':decodeURIComponent(raw).replace(/^[/\\]+/,'');
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)});
}).listen(3000,()=>console.log('KatLearn is running at http://localhost:3000'));
