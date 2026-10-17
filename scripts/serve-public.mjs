// Local preview serves only the release inventory, never migration material,
// Git objects, emulator logs, or dependencies. Bind to loopback only.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),context);
const allowed=new Set([...context.self.JPY5_OFFLINE_MANIFEST.assets,'sw.js','assets/offline-assets.js']);
const types={html:'text/html',js:'text/javascript',mjs:'text/javascript',css:'text/css',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',md:'text/plain'};
createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(req.method!=='GET'||!allowed.has(path))return res.writeHead(404).end();
  try{res.writeHead(200,{'Content-Type':types[path.split('.').at(-1)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));}catch{res.writeHead(404).end();}
}).listen(8000,'127.0.0.1',()=>console.log('Public-only preview: http://127.0.0.1:8000'));
