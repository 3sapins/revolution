
const state = { sceneIndex:0, scenes:[], scores:{blanc:0,bleu:0,rouge:0,or:0}, qcmScore:0, character:{}, cards:{}, qcms:{}, qcmLog:[], sceneImages:{} };
let qcmPlan = {};

async function loadData(){
  state.scenes = await fetch('scenes.json').then(r=>r.json());
  state.cards = await fetch('cards.json').then(r=>r.json());
  const q = await fetch('qcm.json').then(r=>r.json());
  state.qcms = Object.fromEntries(q.map(it=>[it.topic, it]));
  qcmPlan = await fetch('qcm_plan.json').then(r=>r.json());
  state.sceneImages = await fetch('scene_images.json').then(r=>r.json()).catch(()=>({}));
}

function updateTopScores(){
  document.getElementById('score-blanc').textContent = state.scores.blanc;
  document.getElementById('score-bleu').textContent = state.scores.bleu;
  document.getElementById('score-rouge').textContent = state.scores.rouge;
  document.getElementById('score-or').textContent = state.scores.or;
  document.getElementById('score-qcm').textContent = state.qcmScore;
}

function cleanNarrative(text){
  if(!document.getElementById('toggle-blanks')?.checked) return text;
  const lines = text.split(/\n/);
  const filtered = lines.filter(l=>!/^[_\s]{6,}$/.test(l));
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n');
}

function applyFlow(sceneId){
  const topicKey = qcmPlan[sceneId];
  if(topicKey){ openCarteThenQcm(topicKey); } else { showScene(state.sceneIndex+1); }
}

function showScene(idx){
  state.sceneIndex = idx;
  const scene = state.scenes[idx];
  if(!scene){ showEnd(); return; }
  document.getElementById('screen-game').classList.remove('hidden');
  document.getElementById('screen-end').classList.add('hidden');
  document.getElementById('screen-report').classList.add('hidden');
  document.getElementById('scene-title').textContent = `Scène ${scene.id} — ${scene.title}`;
  const imgPath = state.sceneImages[scene.id];
  const imgEl = document.getElementById('scene-image');
  if(imgPath){ imgEl.src = imgPath; imgEl.classList.remove('hidden'); } else { imgEl.classList.add('hidden'); }
  document.getElementById('scene-text').textContent = cleanNarrative(scene.narrative||'');
  const optDiv = document.getElementById('options'); optDiv.innerHTML = '';
  (scene.options||[]).forEach((opt,k)=>{
    const btn=document.createElement('button'); btn.textContent = opt.text||`Choix ${k+1}`;
    btn.onclick = ()=>{
      (opt.color_scores||[]).forEach(cs=>{ if(cs.color==='neutre') return; state.scores[cs.color]=(state.scores[cs.color]||0)+(cs.value||1); });
      updateTopScores();
      applyFlow(scene.id);
    };
    optDiv.appendChild(btn);
  });
  document.getElementById('qcm-area').classList.add('hidden');
}

function fillCarte(card){
  document.getElementById('carte-title').textContent = card.titre||'';
  document.getElementById('carte-type').textContent = card.type||'';
  document.getElementById('carte-annee').textContent = card.annee||'';
  const img = document.getElementById('carte-image');
  if(card.image){ img.src = card.image; img.classList.remove('hidden'); } else { img.classList.add('hidden'); }
  const ul = document.getElementById('carte-contenu'); ul.innerHTML='';
  (card.contenu||[]).forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); });
  const pts = document.getElementById('carte-points');
  pts.textContent = (card.points_cles&&card.points_cles.length) ? `À retenir : ${card.points_cles.join(' • ')}` : '';
  document.getElementById('carte-credit').textContent = card.credit||'';
}

function openCarteThenQcm(topic){
  const q = state.qcms[topic];
  const cardKey = q?.card || topic;
  const card = state.cards[cardKey];
  if(card){
    fillCarte(card);
    const dlg = document.getElementById('dlg-carte');
    dlg.showModal();
    document.getElementById('carte-close').onclick = ()=>{ dlg.close(); };
    document.getElementById('carte-to-qcm').onclick = ()=>{ dlg.close(); openQCM(topic); };
  } else {
    openQCM(topic);
  }
}

function openQCM(topic){
  const q = state.qcms[topic]; if(!q) return;
  const area = document.getElementById('qcm-area'); area.classList.remove('hidden');
  document.getElementById('qcm-question').textContent = q.question;
  const ul = document.getElementById('qcm-choices'); ul.innerHTML='';
  q.choices.forEach((c,i)=>{
    const li=document.createElement('li'); const lbl=document.createElement('label'); const r=document.createElement('input'); r.type='radio'; r.name='qcm'; r.value=i; lbl.appendChild(r); lbl.appendChild(document.createTextNode(' '+c)); li.appendChild(lbl); ul.appendChild(li);
  });
  document.getElementById('qcm-feedback').textContent='';
  document.getElementById('qcm-card').onclick = ()=>{ openCarteThenQcm(topic); };
  document.getElementById('qcm-validate').onclick = ()=>{
    const sel=document.querySelector('input[name="qcm"]:checked');
    if(!sel){ document.getElementById('qcm-feedback').textContent='Choisis une réponse.'; return; }
    const idx=parseInt(sel.value,10);
    const ok = idx===q.correct;
    state.qcmLog.push({ topic, question:q.question, choices:q.choices, selected:idx, correctIndex:q.correct, correct:ok });
    if(ok){ state.qcmScore += 1; updateTopScores(); }
    document.getElementById('qcm-feedback').textContent = ok ? '✅ Bonne réponse !' : '❌ Mauvaise réponse.';
    setTimeout(()=>{ document.getElementById('qcm-area').classList.add('hidden'); showScene(state.sceneIndex+1); }, 600);
  };
  document.getElementById('qcm-close').onclick = ()=>{ area.classList.add('hidden'); };
}

function showEnd(){
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-end').classList.remove('hidden');
  document.getElementById('screen-report').classList.add('hidden');
  document.getElementById('sum-blanc').textContent = state.scores.blanc;
  document.getElementById('sum-bleu').textContent = state.scores.bleu;
  document.getElementById('sum-rouge').textContent = state.scores.rouge;
  document.getElementById('sum-or').textContent = state.scores.or;
  document.getElementById('sum-qcm').textContent = state.qcmScore;
}

function renderReport(){
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-end').classList.add('hidden');
  document.getElementById('screen-report').classList.remove('hidden');
  const c = state.character;
  document.getElementById('rep-nom').textContent = c.nom||'';
  document.getElementById('rep-prenom').textContent = c.prenom||'';
  document.getElementById('rep-personnage').textContent = `${c.ordre||''}, ${c.metier||''}, ${c.lieu||''}`;
  document.getElementById('rep-blanc').textContent = state.scores.blanc;
  document.getElementById('rep-bleu').textContent = state.scores.bleu;
  document.getElementById('rep-rouge').textContent = state.scores.rouge;
  document.getElementById('rep-or').textContent = state.scores.or;
  document.getElementById('rep-qcm').textContent = state.qcmScore;
  const ol = document.getElementById('rep-qcm-list'); ol.innerHTML='';
  state.qcmLog.forEach((row,i)=>{
    const li=document.createElement('li');
    const correctLabel = row.correct? '✅' : '❌';
    const chosen = row.choices[row.selected];
    const good = row.choices[row.correctIndex];
    li.textContent = `${row.question} — Ta réponse: "${chosen}" ${correctLabel} (Bonne: "${good}")`;
    ol.appendChild(li);
  });
  document.getElementById('btn-print').onclick = ()=>window.print();
  document.getElementById('btn-back').onclick = ()=>{ document.getElementById('screen-report').classList.add('hidden'); document.getElementById('screen-end').classList.remove('hidden'); };
}

function exportCSV(){
  const lines = [['Nom','Prénom','Ordre','Métier','Lieu','Lire/écrire','Religion','Blanc','Bleu','Rouge','Or','QCM','QCM_Détails'].join(',')];
  const c = state.character;
  const details = state.qcmLog.map((q,i)=>`Q${i+1}:${q.correct?'OK':'KO'}`).join('|');
  lines.push([c.nom||'', c.prenom||'', c.ordre||'', c.metier||'', c.lieu||'', c.lire||'', c.religion||'', state.scores.blanc, state.scores.bleu, state.scores.rouge, state.scores.or, state.qcmScore, details].join(','));
  const blob = new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='resultat_revolution.csv'; a.click();
}

function initUI(){
  const form=document.getElementById('char-form');
  form.addEventListener('submit',(e)=>{ e.preventDefault(); const fd=new FormData(form); state.character=Object.fromEntries(fd.entries()); document.getElementById('screen-start').classList.add('hidden'); showScene(0); updateTopScores(); });
  document.getElementById('prev').onclick = ()=>{ showScene(Math.max(0, state.sceneIndex-1)); };
  document.getElementById('next').onclick = ()=>{ showScene(state.sceneIndex+1); };
  document.getElementById('btn-restart').onclick = ()=>location.reload();
  document.getElementById('btn-export').onclick = exportCSV;
  document.getElementById('btn-report').onclick = renderReport;
}

window.addEventListener('DOMContentLoaded', async ()=>{ await loadData(); initUI(); });
