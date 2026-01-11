
const STORE = { character:'revo_character', scores:'revo_scores' };
function cap(s){ return (s||'').toString().trim(); }
function ensureDefaults(c){ c.prenom=cap(c.prenom)||'Jean'; c.nom=cap(c.nom)||'Dupont'; c.lieu=cap(c.lieu)||'un village de France'; c.metier=cap(c.metier)||'artisan'; return c; }
function getCharacter(){ try{ return ensureDefaults(JSON.parse(localStorage.getItem(STORE.character)||'{}')); }catch{return ensureDefaults({});} }
function setCharacter(c){ try{ localStorage.setItem(STORE.character, JSON.stringify(c)); }catch{} }
function getScores(){ try{ return JSON.parse(localStorage.getItem(STORE.scores)||'{"blanc":0,"bleu":0,"rouge":0,"or":0,"qcm":0}'); }catch{return {blanc:0,bleu:0,rouge:0,or:0,qcm:0};} }
function setScores(s){ try{ localStorage.setItem(STORE.scores, JSON.stringify(s)); }catch{} }
function renderBadges(){ const s=getScores(); const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; }; set('b-blanc',s.blanc||0); set('b-bleu',s.bleu||0); set('b-rouge',s.rouge||0); set('b-or',s.or||0); set('b-qcm',s.qcm||0); }
function incScores(hints){ const s=getScores(); Object.keys(hints||{}).forEach(k=>{ s[k]=(s[k]||0)+(hints[k]||0); }); setScores(s); renderBadges(); }
function incQcm(ok){ const s=getScores(); if(ok) s.qcm=(s.qcm||0)+1; setScores(s); renderBadges(); }
function personalize(text){ const c=getCharacter(); return (text||'').replaceAll('{{nom}}',c.nom).replaceAll('{{prenom}}',c.prenom).replaceAll('{{lieu}}',c.lieu).replaceAll('{{metier}}',c.metier); }

function initStart(){
  renderBadges();
  const form=document.getElementById('char-form'); if(!form) return;
  const c=getCharacter(); ['nom','prenom','lieu','metier'].forEach(k=>{ if(form[k]) form[k].value=c[k]||''; });
  const pv=document.getElementById('preview');
  const upd=()=>{ const c2={nom:form.nom.value,prenom:form.prenom.value,lieu:form.lieu.value,metier:form.metier.value}; ensureDefaults(c2); if(pv) pv.textContent=`Tu incarnes ${c2.prenom} ${c2.nom}, vivant à ${c2.lieu} et exerçant le métier de ${c2.metier}.`; };
  ['nom','prenom','lieu','metier'].forEach(k=>{ if(form[k]) form[k].addEventListener('input',upd); }); upd();
  form.addEventListener('submit',(e)=>{ e.preventDefault(); const fd=new FormData(form); let ch=Object.fromEntries(fd.entries()); ch=ensureDefaults(ch); setCharacter(ch); window.location.href='scenes/000-introduction-1789.html'; });
}

function initScene(){
  renderBadges();
  const el=document.querySelector('[data-scene-text]'); if(el){ el.textContent=personalize(el.textContent); }
  document.querySelectorAll('[data-choice]')?.forEach(a=>{
    a.addEventListener('click',(ev)=>{
      ev.preventDefault();
      const ph=a.getAttribute('data-ph'); let hints={}; if(ph){ ph.split(',').forEach(p=>{ const [k,v]=p.split(':'); if(k&&v) hints[k.trim()]=parseInt(v.trim(),10)||0; }); }
      incScores(hints);
      const href=a.getAttribute('href'); if(href) window.location.href=href;
    });
  });
}

function initCard(){ renderBadges(); }
function initQcm(){ renderBadges(); const form=document.getElementById('qcm-form'); if(!form) return; form.addEventListener('submit',(e)=>{ e.preventDefault(); const correct=parseInt(form.getAttribute('data-correct'),10)||0; const sel=form.querySelector('input[name="qcm"]:checked'); if(!sel){ alert('Choisis une réponse.'); return; } const ok=(parseInt(sel.value,10)===correct); incQcm(ok); const next=form.getAttribute('data-next'); if(next) window.location.href=next; }); }
function initSummary(){ renderBadges(); const s=getScores(); const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; }; set('sum-blanc',s.blanc||0); set('sum-bleu',s.bleu||0); set('sum-rouge',s.rouge||0); set('sum-or',s.or||0); set('sum-qcm',s.qcm||0); }

// --- BOOTSTRAP: detect page & init ---
document.addEventListener('DOMContentLoaded', ()=>{
  const p = location.pathname;
  if (document.getElementById('char-form')) { initStart(); return; }
  if (p.includes('/scenes/')) { initScene(); return; }
  if (p.includes('/cards/'))  { initCard();  return; }
  if (p.includes('/qcm/'))    { initQcm();   return; }
  if (p.endsWith('/summary.html') || p.endsWith('summary.html')) { initSummary(); return; }
  // Fallbacks by DOM markers
  if (document.querySelector('[data-scene-text]')) { initScene(); return; }
  if (document.getElementById('qcm-form')) { initQcm(); return; }
});
