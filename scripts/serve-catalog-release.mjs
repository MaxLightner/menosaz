// Local staging for authenticated dashboard file transfer. Serves only authored SQL/Edge source, never backups.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const route='/'+randomUUID();
const files={sql:new URL('../review/catalog-release.sql',import.meta.url),edge:new URL('../review/menu-api-deploy.ts',import.meta.url)};
const server=http.createServer(async(req,res)=>{
 const type=req.url===route+'/sql'?'sql':req.url===route+'/edge'?'edge':null;
 if(!type||req.method!=='GET'){res.writeHead(404);res.end();return;}
 try{res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(files[type]));}catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port+route));
