// Expose public OAuth identifier and selected spreadsheet ID only.
module.exports = (req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Método não permitido.'});}
 const googleClientId=String(process.env.GOOGLE_CLIENT_ID||'').trim();
 if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(googleClientId))return res.status(503).json({error:'Defina GOOGLE_CLIENT_ID nas Environment Variables da Vercel.'});
 res.status(200).json({googleClientId,clientsSheetId:String(process.env.GI_CLIENTS_SHEET_ID||''),crmSheetId:String(process.env.GI_BASE_SHEET_ID||'')});
};
