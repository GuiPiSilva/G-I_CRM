// G&I Agência: links públicos para receber arquivos diretamente nas pastas privadas do Drive.
// Secrets and Drive OAuth tokens exist only in Vercel environment variables.
const crypto=require('node:crypto');
const LIMIT=100*1024*1024;
const CHUNK=1024*1024;
const ROOT=process.env.GI_UPLOADS_PARENT_FOLDER_ID||'1XNm3H5jIehlIzaXGYG5KDJgSgn72Q9Rq';
const ALLOWED=new Map([
 ['image/jpeg',['jpg','jpeg']],['image/png',['png']],['image/webp',['webp']],
 ['image/heic',['heic']],['image/heif',['heif']],
 ['application/pdf',['pdf']],['application/zip',['zip']],
 ['video/mp4',['mp4']],['video/quicktime',['mov']],
 ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',['docx']],
 ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',['xlsx']]
]);
const secret=()=>process.env.GI_SESSION_SECRET||'';
const configured=()=>!!(secret()&&process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GI_DRIVE_REFRESH_TOKEN);
const fail=(res,code,message)=>res.status(code).json({error:message});
const mac=(scope,data)=>crypto.createHmac('sha256',secret()).update(scope+':'+data).digest('base64url');
const eq=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y)};
function issue(scope,obj){const raw=Buffer.from(JSON.stringify(obj)).toString('base64url');return raw+'.'+mac(scope,raw)}
function parse(scope,token){
 if(!secret()||typeof token!=='string'||token.length>2200)return null;
 const parts=token.split('.');if(parts.length!==2||!eq(mac(scope,parts[0]),parts[1]))return null;
 try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));if(!Number.isSafeInteger(p.exp)||p.exp<Date.now())return null;return p}catch{return null}
}
function owner(req){
 if(!secret())return false;
 const allowed=(process.env.GI_ALLOWED_EMAILS||'').split(',').map(v=>v.trim().toLowerCase());
 const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('gi_session='));
 if(!cookie)return false;
 const [data,sig]=cookie.slice('gi_session='.length).split('.');
 if(!data||!sig||!eq(crypto.createHmac('sha256',secret()).update(data).digest('base64url'),sig))return false;
 try{const p=JSON.parse(Buffer.from(data,'base64url').toString());return !!(p.exp>Date.now()&&allowed.includes(String(p.email).toLowerCase()))}catch{return false}
}
function sameOrigin(req){
 if(!req.headers.origin)return true;
 try{return new URL(req.headers.origin).host===req.headers.host}catch{return false}
}
const validFolder=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{10,160}$/.test(id);
const cleanName=name=>String(name||'').normalize('NFC').replace(/[\/\\<>:"|?*\x00-\x1f]/g,'_').replace(/^\.+/,'').trim().slice(0,130);
function safeFile(name,type,size){
 if(!Number.isSafeInteger(size)||size<1||size>LIMIT||!ALLOWED.has(type))return null;
 const file=cleanName(name),ext=file.split('.').pop().toLowerCase();
 return file.length>=3&&ALLOWED.get(type).includes(ext)?file:null;
}
async function raw(req,max){
 const parts=[];let length=0;
 for await(const part of req){length+=part.length;if(length>max)throw Error('too_large');parts.push(part)}
 return Buffer.concat(parts);
}
async function googleToken(){
 const body=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||'',client_secret:process.env.GOOGLE_CLIENT_SECRET||'',refresh_token:process.env.GI_DRIVE_REFRESH_TOKEN||'',grant_type:'refresh_token'});
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('oauth');const j=await r.json();if(!j.access_token)throw Error('oauth');return j.access_token;
}
async function driveFolder(token,id){
 const u='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,mimeType,parents,trashed&supportsAllDrives=true';
 const r=await fetch(u,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('folder');const x=await r.json();
 return x.id===id&&x.mimeType==='application/vnd.google-apps.folder'&&!x.trashed&&Array.isArray(x.parents)&&x.parents.includes(ROOT);
}
const checkLink=t=>{const p=parse('link',t);return p&&p.v===1&&validFolder(p.fid)&&typeof p.name==='string'&&p.name.length<=100&&p.exp<=Date.now()+32*86400000?p:null};
const handler=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return fail(res,405,'Método não permitido.')}
 const url=new URL(req.url,'https://local.invalid');
 if(req.method==='GET'){
  if(url.searchParams.get('admin')==='1'){
   if(!owner(req))return fail(res,401,'Acesse o CRM para continuar.');
   return res.status(200).json({configured:configured(),maxMb:100,chunkSize:CHUNK});
  }
  const p=checkLink(url.searchParams.get('t'));if(!p)return fail(res,410,'Este link expirou ou é inválido.');
  return res.status(200).json({client:p.name,expiresAt:new Date(p.exp).toISOString(),maxMb:100});
 }
 if(!sameOrigin(req))return fail(res,403,'Origem não autorizada.');
 const action=url.searchParams.get('action');
 if(action==='chunk'){
  const session=parse('session',req.headers['x-gi-upload-session']);
  if(!session||!configured()||!Number.isSafeInteger(session.n)||session.n>LIMIT||session.n<1||!/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(session.u))return fail(res,403,'Envio expirado ou inválido.');
  const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(req.headers['content-range']||'');
  if(!match)return fail(res,400,'Intervalo de arquivo inválido.');
  const start=Number(match[1]),end=Number(match[2]),total=Number(match[3]);
  if(total!==session.n||end<start||end>=total||start%CHUNK!==0||(end+1<total&&(end-start+1)!==CHUNK)||end-start+1>CHUNK)return fail(res,400,'Bloco inválido.');
  let bytes;
  try{bytes=await raw(req,CHUNK)}catch{return fail(res,413,'Bloco grande demais.')}
  if(bytes.length!==end-start+1)return fail(res,400,'Tamanho do bloco incorreto.');
  try{
   const token=await googleToken();
   const r=await fetch(session.u,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':session.type,'Content-Length':String(bytes.length),'Content-Range':'bytes '+start+'-'+end+'/'+total},body:bytes,signal:AbortSignal.timeout(50000),redirect:'manual'});
   if(r.status===308){
    const range=/bytes=0-(\d+)/.exec(r.headers.get('range')||'');
    return res.status(200).json({done:false,next:range?Number(range[1])+1:end+1});
   }
   if(!r.ok)throw Error('upload_failed');
   const f=await r.json().catch(()=>({}));
   return res.status(200).json({done:true,next:total,file:{id:f.id||'',name:f.name||''}});
  }catch{return fail(res,502,'Falha ao transferir o arquivo ao Google Drive. Tente novamente.')}
 }
 let body;
 try{const bytes=await raw(req,16384);body=JSON.parse(bytes.toString('utf8'));}catch{return fail(res,400,'Requisição inválida.')}
 if(action==='create'){
  if(!owner(req))return fail(res,401,'Sessão de administrador necessária.');
  if(!configured())return fail(res,503,'Configure GOOGLE_CLIENT_SECRET e GI_DRIVE_REFRESH_TOKEN na Vercel para ativar links de envio.');
  const days=Number(body.days||7),fid=String(body.folderId||''),name=String(body.clientName||'').trim().slice(0,100);
  if(![1,7,15,30].includes(days)||!validFolder(fid)||!name)return fail(res,400,'Cliente, pasta ou validade inválida.');
  try{const token=await googleToken();if(!(await driveFolder(token,fid)))return fail(res,403,'A pasta informada não pertence à área de clientes do Drive.');}
  catch{return fail(res,502,'Não foi possível confirmar o acesso à pasta no Google Drive.');}
  const exp=Date.now()+days*86400000;
  const t=issue('link',{v:1,fid,name,exp,nonce:crypto.randomBytes(16).toString('base64url')});
  return res.status(200).json({token:t,expiresAt:new Date(exp).toISOString()});
 }
 if(action==='start'){
  const p=checkLink(body.token);
  if(!p)return fail(res,410,'Link inválido ou expirado.');
  if(!configured())return fail(res,503,'O recebimento de arquivos está temporariamente indisponível.');
  const type=String(body.type||''),size=Number(body.size),name=safeFile(body.name,type,size);
  if(!name)return fail(res,400,'Formato não permitido ou arquivo maior que 100 MB.');
  try{
   const token=await googleToken();
   const meta={name,parents:[p.fid],description:'Recebido pelo link público de envio G&I Central'};
   const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink&supportsAllDrives=true',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':type,'X-Upload-Content-Length':String(size)},
    body:JSON.stringify(meta),signal:AbortSignal.timeout(15000),redirect:'manual'
   });
   const location=r.headers.get('location');
   if(!r.ok||!location||!/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(location))throw Error('drive_session');
   return res.status(200).json({session:issue('session',{u:location,n:size,type,exp:Math.min(p.exp,Date.now()+60*60000)}),chunkSize:CHUNK});
  }catch{return fail(res,502,'Não foi possível iniciar o envio no Google Drive.')}
 }
 return fail(res,400,'Ação desconhecida.');
};
handler.config={api:{bodyParser:false}};
module.exports=handler;
