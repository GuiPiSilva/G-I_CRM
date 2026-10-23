(function(){
'use strict';
let filter='Todos';
const statuses=['Todos','Ideia','Em roteiro','Em revisão','Aprovado','Gravado','Publicado'];
function page(c){
  const {db,e,I,header,toolbar,btn,clientName,dateShort}=c;
  const all=db.scripts||[];
  const term=String(c.query||'').trim().toLocaleLowerCase('pt-BR');
  const items=all.filter(x=>(filter==='Todos'||x.status===filter)&&(!term||[x.title,x.format,x.status,x.hook,x.scenes,x.script,x.caption,clientName(x.clientId)].some(t=>String(t||'').toLocaleLowerCase('pt-BR').includes(term)))).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const counters='<div class="rs-stats">'+[['Total',all.length],['Em produção',all.filter(x=>['Em roteiro','Em revisão','Gravado'].includes(x.status)).length],['Aprovados',all.filter(x=>x.status==='Aprovado').length],['Publicados',all.filter(x=>x.status==='Publicado').length]].map(([label,value])=>'<div class="rs-stat"><span>'+e(label)+'</span><strong>'+value+'</strong></div>').join('')+'</div>';
  const filterControl='<div class="rs-filter"><label for="scripts-filter">Etapa</label><select class="control" id="scripts-filter" aria-label="Filtrar roteiros por etapa">'+statuses.map(st=>'<option value="'+e(st)+'"'+(filter===st?' selected':'')+'>'+e(st)+'</option>').join('')+'</select></div>';
  const cards=items.map(x=>{
    const stage=String(x.status||'Ideia');
    const meta=[x.format||'Reels',x.clientId?clientName(x.clientId):'G&I Agência (interno)',x.shootDate?'Gravação: '+dateShort(x.shootDate):'Sem data de gravação'].join(' · ');
    const hook=(x.hook||x.script||'Adicione o gancho e as falas para começar.').slice(0,190);
    return '<article class="rs-card"><div class="rs-card-top"><span class="rs-format">'+e(x.format||'Reels')+'</span><span class="pill '+(stage==='Publicado'||stage==='Aprovado'?'green':stage==='Gravado'?'blue':stage==='Em revisão'?'orange':'gray')+'">'+e(stage)+'</span></div>'+
    '<h3>'+e(x.title||'Sem título')+'</h3><p class="rs-hook">'+e(hook)+'</p><p class="rs-meta">'+e(meta)+'</p><div class="rs-card-actions">'+
    '<button class="btn small primary" data-action="edit" data-type="scripts" data-id="'+e(x.id)+'">'+I('edit',14)+' Editar</button>'+
    '<button class="btn small" data-action="script-copy" data-id="'+e(x.id)+'">'+I('file',14)+' Copiar</button>'+
    '<button class="btn small" data-action="script-pdf" data-id="'+e(x.id)+'">'+I('download',14)+' PDF</button>'+
    '<button class="btn small danger" data-action="delete" data-type="scripts" data-id="'+e(x.id)+'" aria-label="Excluir roteiro">'+I('trash',14)+'</button></div></article>';
  }).join('');
  return header('PRODUÇÃO CRIATIVA','Roteiros','Organize Reels, Stories, anúncios e vídeos de cada cliente.',btn('Novo roteiro','new-scripts','plus','primary'))+
    counters+'<div class="rs-bar">'+toolbar('scripts','Buscar título, cliente, fala ou assunto...')+filterControl+'</div>'+
    (cards?'<section class="rs-grid">'+cards+'</section>':'<div class="panel"><div class="empty"><strong>'+e(filter==='Todos'?'Nenhum roteiro cadastrado':'Nenhum roteiro nesta etapa')+'</strong><p>'+e(filter==='Todos'?'Crie o primeiro roteiro e acompanhe toda a produção, da ideia até a publicação.':'Altere o filtro ou cadastre um novo roteiro.')+'</p><button class="btn primary small" data-action="new-scripts">'+I('plus',14)+' Novo roteiro</button></div></div>')+
    '<p class="g-note" style="margin-top:18px">Os roteiros são salvos no CRM e sincronizados na aba Roteiros da planilha central quando o Google estiver conectado. Para gerar PDF, escolha “Salvar como PDF” na janela de impressão.</p>';
}
function setFilter(v){filter=statuses.includes(v)?v:'Todos';}
function getText(x,ctx){
const client=x.clientId?ctx.clientName(x.clientId):'G&I Agência (interno)';
return [x.title||'Roteiro', 'Cliente: '+client, 'Formato: '+(x.format||'Reels'), 'Etapa: '+(x.status||'Ideia'),'Data de gravação: '+(x.shootDate||'A definir'),'', 'GANCHO',x.hook||'', '', 'CENAS / ENQUADRAMENTOS',x.scenes||'', '', 'FALAS / NARRAÇÃO',x.script||'', '', 'CHAMADA PARA AÇÃO',x.cta||'', '', 'LEGENDA',x.caption||'', '', 'OBSERVAÇÕES',x.notes||''].join('\n');
}
function copy(id,ctx){
 const x=(ctx.db.scripts||[]).find(v=>v.id===id);if(!x)return;
 const txt=getText(x,ctx);
 if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(txt).then(()=>ctx.toast('Roteiro copiado.')).catch(()=>{ctx.download('roteiro-'+String(x.id).slice(0,8)+'.txt',txt,'text/plain;charset=utf-8');ctx.toast('Arquivo de texto baixado.');});
 else{ctx.download('roteiro-'+String(x.id).slice(0,8)+'.txt',txt,'text/plain;charset=utf-8');ctx.toast('Arquivo de texto baixado.');}
}
function pdf(id,ctx){
 const x=(ctx.db.scripts||[]).find(v=>v.id===id);if(!x)return;
 const win=window.open('','_blank');if(!win){ctx.toast('Permita pop-ups para salvar o roteiro em PDF.',true);return;}
 const esc=ctx.e,body=[
 ['Gancho',x.hook],['Cenas e enquadramentos',x.scenes],['Falas e narração',x.script],['Chamada para ação',x.cta],['Legenda',x.caption],['Observações',x.notes]
 ].map(p=>'<section><h2>'+esc(p[0])+'</h2><p>'+esc(p[1]||'Não preenchido').replace(/\n/g,'<br>')+'</p></section>').join('');
 win.document.open();
 win.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(x.title)+'</title><style>@page{size:A4;margin:18mm}body{font:14px/1.55 Arial,sans-serif;color:#112a38}header{border-bottom:4px solid #014b70;padding-bottom:20px;margin-bottom:22px}small{color:#608fad;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold}h1{font-size:28px;margin:8px 0}h2{font-size:13px;color:#014b70;text-transform:uppercase;letter-spacing:.5px}p{white-space:normal;overflow-wrap:anywhere}section{break-inside:avoid;margin-bottom:18px;padding-bottom:8px;border-bottom:1px solid #e3edf3} .meta{font-size:12px;color:#556d7a}@media print{button{display:none}}</style></head><body><header><small>G&I Agência · Roteiros</small><h1>'+esc(x.title)+'</h1><div class="meta">Cliente: '+esc(x.clientId?ctx.clientName(x.clientId):'G&I Agência (interno)')+' · '+esc(x.format||'Reels')+' · '+esc(x.status||'Ideia')+' · Gravação: '+esc(ctx.dateShort(x.shootDate))+'</div></header>'+body+'<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
 win.document.close();
}
const style=document.createElement('style');style.textContent='.rs-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:22px}.rs-stat{background:white;border:1px solid #e4edf2;border-radius:16px;padding:19px}.rs-stat span{display:block;color:#7992a1;font-size:11px;font-weight:700}.rs-stat strong{display:block;color:#014b70;font:800 26px Manrope,Arial,sans-serif;margin-top:6px}.rs-bar{display:flex;align-items:start;justify-content:space-between;gap:16px}.rs-bar .toolbar{flex:1}.rs-filter{display:flex;align-items:center;gap:10px}.rs-filter label{font-size:12px;font-weight:700;color:#567387}.rs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.rs-card{background:white;border:1px solid #e5edf2;border-radius:18px;padding:23px;box-shadow:0 8px 25px rgba(10,34,58,.04);min-width:0}.rs-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.rs-format{font-size:11px;letter-spacing:.4px;font-weight:800;color:#07628a;text-transform:uppercase}.rs-card h3{font:800 18px/1.35 Manrope,Arial,sans-serif;margin:16px 0 8px}.rs-hook{font-size:12px;line-height:1.7;color:#4c6878;min-height:42px;overflow-wrap:anywhere;white-space:pre-line}.rs-meta{font-size:11px;color:#8b9eab;line-height:1.6}.rs-card-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px;padding-top:14px;border-top:1px solid #edf2f5}.rs-card-actions .btn{flex-shrink:0}#entity-form[data-type="scripts"] .field-textarea{min-height:115px;line-height:1.65}#entity-form[data-type="scripts"] textarea[name="script"],#entity-form[data-type="scripts"] textarea[name="scenes"]{min-height:160px}#entity-form[data-type="scripts"] .form-field:has(textarea){grid-column:1/-1}@media(max-width:1100px){.rs-stats{grid-template-columns:repeat(2,1fr)}.rs-grid{grid-template-columns:1fr}}@media(max-width:600px){.rs-bar{display:block}.rs-filter{margin-bottom:15px}.rs-stats{gap:8px}.rs-stat{padding:14px}.rs-card{padding:17px}.rs-card-actions .btn{flex:1}}';document.head.appendChild(style);
window.GIRoteiros={page,setFilter,copy,pdf};
})();