// Local preview serves only the release inventory, never migration material,
// Git objects, emulator logs, or dependencies. Bind to loopback only.
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const context={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),context);
const allowed=new Set([...context.self.JPY5_OFFLINE_MANIFEST.assets,'sw.js','assets/offline-assets.js']);
// Publish only the two public recording directories, not protected quiz audio.
for(const directory of ['assets/audio/reading','assets/audio/listening']) {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    if(entry.isFile() && entry.name.endsWith('.mp3')) allowed.add(`${directory}/${entry.name}`);
  }
}
const types={html:'text/html',js:'text/javascript',mjs:'text/javascript',css:'text/css',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',md:'text/plain',mp3:'audio/mpeg'};
createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!['GET','HEAD'].includes(req.method)||!allowed.has(path))return res.writeHead(404).end();
  try{
    const bytes=await readFile(path),headers={'Content-Type':types[path.split('.').at(-1)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':bytes.length};
    let start=0,end=bytes.length-1,status=200;
    if(path.endsWith('.mp3')) {
      headers['Accept-Ranges']='bytes';
      if(req.headers.range && req.method==='GET') {
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!range || (!range[1]&&!range[2])) return res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`}).end();
        start=range[1]?Number(range[1]):Math.max(0,bytes.length-Number(range[2]));
        end=range[1]&&range[2]?Math.min(Number(range[2]),end):end;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length) return res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`}).end();
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;headers['Content-Length']=end-start+1;
      }
    }
    res.writeHead(status,headers);res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));
  }catch{res.writeHead(404).end();}
}).listen(8000,'127.0.0.1',()=>console.log('Public-only preview: http://127.0.0.1:8000'));
