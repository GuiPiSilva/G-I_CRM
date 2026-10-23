// Google Sign-In authentication; HTTP-only signed session, owner allowlist.
const crypto = require('node:crypto');
const secret = () => process.env.GI_SESSION_SECRET || '';
const allowed = () => (process.env.GI_ALLOWED_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const sign = data => crypto.createHmac('sha256', secret()).update(data).digest('base64url');
const cookieAttrs = 'Path=/; HttpOnly; Secure; SameSite=Strict';
const originOkay = req => {const o=req.headers.origin; if(!o) return true; try {return new URL(o).host===req.headers.host;}catch{return false;}};
function authenticate(req){
  if(!secret()||!allowed().length||!process.env.GOOGLE_CLIENT_ID)return null;
  const c=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gi_session='));
  if(!c)return null;const token=c.slice('gi_session='.length);const [data,mac]=token.split('.');
  if(!data||!mac)return null;
  const ours=Buffer.from(sign(data));const theirs=Buffer.from(mac);
  if(ours.length!==theirs.length||!crypto.timingSafeEqual(ours,theirs))return null;
  try{const u=JSON.parse(Buffer.from(data,'base64url').toString());if(!u.exp||u.exp<Date.now()||!allowed().includes(u.email))return null;return {email:u.email,name:u.name,picture:u.picture};}catch{return null;}
}
module.exports = async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return res.status(405).json({error:'Método não permitido.'});}
  if(req.method==='GET'){const u=authenticate(req);return u?res.status(200).json({user:u}):res.status(401).json({error:'Sessão não autenticada.'});}
  if(!originOkay(req))return res.status(403).json({error:'Origem inválida.'});
  if(req.method==='DELETE'){res.setHeader('Set-Cookie',`gi_session=; ${cookieAttrs}; Max-Age=0`);return res.status(200).json({ok:true});}
  if(!secret()||!allowed().length||!process.env.GOOGLE_CLIENT_ID)return res.status(503).json({error:'Login não configurado na Vercel.'});
  try{
    const accessToken=String(req.body?.access_token||'');
    const credential=String(req.body?.credential||'');
    let email,name,picture;
    if(accessToken){
      // One-step sign-in: the same Google OAuth popup grants access to Drive/Sheets.
      // Validate the token's client, permissions, identity and expiry on the server.
      if(accessToken.length>10000)return res.status(400).json({error:'Token de acesso inválido.'});
      const google=await fetch('https://oauth2.googleapis.com/tokeninfo?access_token='+encodeURIComponent(accessToken),{signal:AbortSignal.timeout(7000)});
      if(!google.ok)return res.status(401).json({error:'Não foi possível confirmar a conta Google.'});
      const claims=await google.json();
      const issuedTo=String(claims.azp||claims.issued_to||claims.audience||claims.aud||'');
      if(issuedTo!==process.env.GOOGLE_CLIENT_ID||Number(claims.expires_in)<=0||
         (claims.exp&&Number(claims.exp)*1000<Date.now()))
        return res.status(401).json({error:'Token Google inválido ou expirado.'});
      const scopes=new Set(String(claims.scope||'').split(/\s+/));
      if(!['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/spreadsheets'].every(scope=>scopes.has(scope)))
        return res.status(403).json({error:'Autorize Google Drive e Planilhas para entrar com conexão automática.'});
      const profileResult=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
        headers:{Authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(7000)
      });
      if(!profileResult.ok)return res.status(401).json({error:'Identidade Google não confirmada.'});
      const profile=await profileResult.json();
      email=String(profile.email||'').trim().toLowerCase();
      if(!email||String(profile.email_verified)!=='true'||(claims.email&&String(claims.email).toLowerCase()!==email))
        return res.status(401).json({error:'E-mail Google não verificado.'});
      name=String(profile.name||email);
      picture=String(profile.picture||'');
    }else{
      // Backwards-compatible credential login for browsers that decline Drive access.
      if(!credential||credential.length>10000)return res.status(400).json({error:'Token Google ausente.'});
      const google=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(credential),{signal:AbortSignal.timeout(7000)});
      if(!google.ok)return res.status(401).json({error:'Autenticação Google inválida.'});
      const claims=await google.json();
      if(claims.aud!==process.env.GOOGLE_CLIENT_ID||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||String(claims.email_verified)!=='true'||Number(claims.exp)*1000<Date.now())
        return res.status(401).json({error:'Credencial Google inválida.'});
      email=String(claims.email||'').toLowerCase();
      name=claims.name||email;picture=claims.picture||'';
    }
    if(!allowed().includes(email))return res.status(403).json({error:'Este e-mail não está autorizado na G&I Central.'});
    const u={email,name,picture,exp:Date.now()+7*24*3600*1000};
    const data=Buffer.from(JSON.stringify(u)).toString('base64url');
    res.setHeader('Set-Cookie',`gi_session=${data}.${sign(data)}; ${cookieAttrs}; Max-Age=604800`);
    return res.status(200).json({user:{email:u.email,name:u.name,picture:u.picture}});
  }catch{return res.status(502).json({error:'Não foi possível confirmar o login com o Google.'});}
};
