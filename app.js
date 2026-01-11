
// --- État global ---
const state = {
  sceneIndex: 0,
  scenes: [],
  qcmScore: 0,
  character: {},
  cards: {},
  qcms: {},
  qcmLog: [],
  sceneImages: {},
  qcmPlan: {},
  scores: { blanc:0, bleu:0, rouge:0, or:0 }
};

// --- Chargement des données (version standard, via fetch des .json) ---
async function loadData(){
  state.scenes = await fetch('scenes.json').then(r=>r.json());
  state.cards  = await fetch('cards.json').then(r=>r.json());
  const q = await fetch('qcm.json').then(r=>r.json());
  state.qcms   = Object.fromEntries(q.map(it=>[it.topic, it]));
  state.qcmPlan= await fetch('qcm_plan.json').then(r=>r.json());
  state.sceneImages = await fetch('scene_images.json').then(r=>r.json()).catch(()=>({}));
}

// --- Affichages de scores ---
function updateQcmScore(){ document.getElementById('score-qcm').textContent = state.qcmScore; }
function updateTopScores(){
  const s=state.scores; const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  set('score-blanc', s.blanc); set('score-bleu', s.bleu); set('score-rouge', s.rouge); set('score-or', s.or);
}

// --- Substitutions & mise en forme ---
function substituteTokens(text){
  const c = state.character;
  return (text||'')
    .replaceAll('{{nom}}',    c.nom||'')
    .replaceAll('{{prenom}}', c.prenom||'')
    .replaceAll('{{lieu}}',   c.lieu||'')
    .replaceAll('{{metier}}', c.metier||'');
}
function cleanNarrative(text){
  const lines = (text||'').split(/\n/);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

// --- Carte (pédagogie) + QCM ---
function openCarteThenQcm(topic){
  const q = state.qcms[topic];
  const cardKey = q?.card || topic;
  const card = state.cards[cardKey];
  if(!card){ openQCM(topic); return; }

  document.getElementById('carte-title').textContent = card.titre || '';
  document.getElementById('carte-type').textContent  = card.type  || '';
  document.getElementById('carte-annee').textContent = card.annee || '';
  const img = document.getElementById('carte-image');
  if(card.image){ img.src = card.image; img.classList.remove('hidden'); } else { img.classList.add('hidden'); }

  const ul = document.getElementById('carte-contenu'); ul.innerHTML='';
  (card.contenu||[]).forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); });
  const pts = document.getElementById('carte-points');
  pts.textContent = (card.points_cles && card.points_cles.length) ? `À retenir : ${card.points_cles.join(' • ')}` : '';
  document.getElementById('carte-credit').textContent = card.credit || '';

  const dlg = document.getElementById('dlg-carte'); dlg.showModal();
  document.getElementById('carte-close').onclick   = ()=> dlg.close();
  document.getElementById('carte-to-qcm').onclick  = ()=>{ dlg.close(); openQCM(topic); };
}

function openQCM(topic){
  const q = state.qcms[topic]; if(!q) return;
  const area = document.getElementById('qcm-area'); area.classList.remove('hidden');
  document.getElementById('qcm-question').textContent = q.question;

  const ul = document.getElementById('qcm-choices'); ul.innerHTML='';
  q.choices.forEach((c,i)=>{
    const li = document.createElement('li');
    const lbl= document.createElement('label');
    const r  = document.createElement('input'); r.type='radio'; r.name='qcm'; r.value=i;
    lbl.appendChild(r); lbl.appendChild(document.createTextNode(' '+c)); li.appendChild(lbl); ul.appendChild(li);
  });
  document.getElementById('qcm-feedback').textContent='';

  document.getElementById('qcm-card').onclick = ()=> openCarteThenQcm(topic);
  document.getElementById('qcm-validate').onclick = ()=>{
    const sel=document.querySelector('input[name="qcm"]:checked');
    if(!sel){ document.getElementById('qcm-feedback').textContent='Choisis une réponse.'; return; }
    const idx = parseInt(sel.value,10);
    const ok  = (idx === q.correct);

    state.qcmLog.push({ topic, question:q.question, choices:q.choices, selected:idx, correctIndex:q.correct, correct:ok });
    if(ok){ state.qcmScore += 1; updateQcmScore(); }
    document.getElementById('qcm-feedback').textContent = ok ? '✅ Bonne réponse !' : '❌ Mauvaise réponse.';

    setTimeout(()=>{ area.classList.add('hidden'); showScene(state.sceneIndex+1); }, 600);
  };
  document.getElementById('qcm-close').onclick = ()=> area.classList.add('hidden');
}

// --- v6.1c : utilitaires pour sécuriser la page 1 → Scène 0 ---
function cap(s){ return (s||'').toString().trim(); }
function ensureDefaults(){
  const c = state.character || (state.character={});
  c.prenom = cap(c.prenom) || 'Jean';
  c.nom    = cap(c.nom)    || 'Dupont';
  c.lieu   = cap(c.lieu)   || 'un village de France';
  c.metier = cap(c.metier) || 'artisan';
}
function setupPreview(form){
  const pv = document.getElementById('preview');
  if(!pv) return;
  const fmt = (p,n,l,m)=>`Tu incarnes ${cap(p)||'…'} ${cap(n)||'…'}, vivant à ${cap(l)||'…'} et exerçant le métier de ${cap(m)||'…'}.`;
  const upd = ()=>{ pv.textContent = fmt(form.prenom.value, form.nom.value, form.lieu.value, form.metier.value); };
  ['prenom','nom','lieu','metier'].forEach(k=>{ if(form[k]) form[k].addEventListener('input', upd); });
  upd();
}

// --- Affichage d'une scène ---
function showScene(idx){
  state.sceneIndex = idx;
  const scene = state.scenes[idx];

  // v6.1c : si on arrive sur l'intro, garantir des valeurs lisibles
  if(idx === 0){ ensureDefaults(); }

  if(!scene){
    // Fin de partie → résumé
    document.getElementById('screen-end').classList.remove('hidden');
    document.getElementById('sum-qcm').textContent = state.qcmScore;
    const s=state.scores; const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('sum-blanc', s.blanc||0); set('sum-bleu', s.bleu||0); set('sum-rouge', s.rouge||0); set('sum-or', s.or||0);
    return;
  }

  // Écran jeu ON / écran fin OFF
  document.getElementById('screen-game').classList.remove('hidden');
  document.getElementById('screen-end').classList.add('hidden');

  // Titre + image
  document.getElementById('scene-title').textContent = `Scène ${scene.id} — ${scene.title}`;
  const imgPath = state.sceneImages[scene.id];
  const imgEl = document.getElementById('scene-image');
  if(imgPath){ imgEl.src = imgPath; imgEl.classList.remove('hidden'); } else { imgEl.classList.add('hidden'); }

  // Texte + options
  const text = substituteTokens(cleanNarrative(scene.narrative||'')); 
  document.getElementById('scene-text').textContent = text;

  const optDiv = document.getElementById('options'); optDiv.innerHTML = '';
  (scene.options||[]).forEach((opt,k)=>{
    const btn = document.createElement('button'); btn.textContent = opt.text || `Choix ${k+1}`;
    btn.onclick = ()=>{
      // v6.1 : profils couleur (invisible) — pondération simple +2/+1, parfois double profil
      const hint = (opt && opt.profile_hint) || {};
      for(const key of Object.keys(hint)){ if(state.scores[key]===undefined) state.scores[key]=0; state.scores[key] += (hint[key]||0); }
      updateTopScores();

      const flowTopic = (scene.flow && scene.flow.type==='card_then_qcm') ? scene.flow.topic : null;
      if(flowTopic){ openCarteThenQcm(flowTopic); }
      else { showScene(idx+1); }
    };
    optDiv.appendChild(btn);
  });
}

// --- Initialisation UI ---
function initUI(){
  const form = document.getElementById('char-form');

  // Restaure le formulaire si reload
  try {
    const saved = localStorage.getItem('revo_character');
    if(saved){
      const c = JSON.parse(saved);
      ['nom','prenom','lieu','metier'].forEach(k=>{ if(form[k] && c[k]) form[k].value = c[k]; });
    }
  } catch {}

  // Prévisualisation en direct
  setupPreview(form);

  // Soumission → normalisation + mémoire + lancer l'intro
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    state.character = Object.fromEntries(fd.entries());
    ensureDefaults();
    try{ localStorage.setItem('revo_character', JSON.stringify(state.character)); }catch{}
    document.getElementById('screen-start').classList.add('hidden');
    showScene(0); updateQcmScore(); updateTopScores();
  });

  // Navigation
  document.getElementById('prev').onclick = ()=> showScene(Math.max(0, state.sceneIndex-1));
  document.getElementById('next').onclick = ()=> showScene(state.sceneIndex+1);
}

// --- Lancement ---
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadData();
  initUI();
});
