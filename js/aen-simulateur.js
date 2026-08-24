/* ============================================
   ACOMPIA — Simulateur AEN véhicule : parcours et rendu
   Dépend de js/config.js, js/socle.js et js/aen-bareme.js.
   ============================================ */
/* ============================================================
   WIZARD : une question à la fois, barre de progression.
   Réutilise le moteur calculer(etat) / BAREME ci-dessus.
   ============================================================ */
const overlay = document.getElementById('overlay');
const corps = document.getElementById('corps');
const progressFill = document.getElementById('progress-fill');
const progressLib = document.getElementById('progress-lib');
const progressWrap = document.getElementById('progress-wrap');
const btnRetour = document.getElementById('retour');
const btnSuivant = document.getElementById('suivant');
const pied = document.getElementById('pied');

/* Taux de cotisations patronales retenu pour la traduction en euros (hypothèse pédagogique, à valider). */
const TAUX_COTIS_PATRONALES = 0.45;

let etat = {};
function neuf(){
  etat = { typevhc:null, attribution:null, beneficiaire:null, mode:null, periode:'post',
    energie:null, ecoscore:null, age:'jeune', carburant:'non', borne:'non', restitution:false,
    participation:0, prixAchat:null, coutLocation:null, prixLoueur:null, prixCatalogue:null, prorata:12 };
}
const qualifie = s => s.typevhc==='vp' && s.attribution==='oui' && (s.beneficiaire==='salarie'||s.beneficiaire==='assimile');

const STEPS = [
  { id:'typevhc', applies:()=>true, titre:"De quel type de véhicule s'agit-il ?",
    options:[
      {v:'vp',t:'Voiture particulière',s:"Véhicule de fonction fourni par l'entreprise"},
      {v:'vu',t:'Véhicule utilitaire',s:'Fourgon, camionnette, VU 2 places'},
      {v:'deuxroues',t:'Deux-roues ou vélo',s:'Scooter, moto, vélo de fonction'},
      {v:'salarie',t:'Véhicule du salarié',s:'Le véhicule appartient au salarié'},
    ]},
  { id:'attribution', applies:s=>s.typevhc==='vp', titre:"Le salarié conserve-t-il le véhicule en dehors du travail (soirs, week-ends) ?",
    options:[
      {v:'oui',t:'Oui',s:'Mise à disposition permanente, usage privé possible'},
      {v:'non',t:'Non',s:'Véhicule partagé (pool) ou restitué chaque soir'},
    ]},
  { id:'beneficiaire', applies:s=>s.typevhc==='vp'&&s.attribution==='oui', titre:'Qui utilise le véhicule ?',
    options:[
      {v:'salarie',t:'Un salarié'},
      {v:'assimile',t:'Un dirigeant assimilé salarié',s:'Président de SAS, gérant minoritaire ou égalitaire'},
      {v:'tns',t:'Un gérant majoritaire ou autre TNS',s:'Travailleur non salarié'},
    ]},
  { id:'mode', applies:s=>qualifie(s), titre:"Le véhicule est-il acheté ou loué par l'entreprise ?",
    options:[
      {v:'achat',t:'Acheté',s:'Détenu par l\'entreprise, y compris à crédit'},
      {v:'location',t:'Loué',s:'LLD, LOA (leasing) ou crédit-bail'},
    ]},
  { id:'periode', applies:s=>qualifie(s), titre:'À quelle date le véhicule a-t-il été mis à la disposition du salarié ?',
    options:[
      {v:'post',t:'À partir du 1er février 2025',s:'Barème renforcé (arrêté du 25 février 2025)'},
      {v:'pre',t:'Avant le 1er février 2025',s:'Ancien barème, conservé tant que la mise à disposition se poursuit'},
    ]},
  { id:'energie', applies:s=>qualifie(s), titre:'Quelle est la motorisation du véhicule ?',
    options:[
      {v:'thermique',t:'Thermique',s:'Essence, diesel, GPL'},
      {v:'hybride',t:'Hybride',s:'Y compris hybride rechargeable'},
      {v:'electrique',t:'100 % électrique'},
    ]},
  { id:'ecoscore', applies:s=>qualifie(s)&&s.energie==='electrique'&&s.periode==='post', titre:'Le véhicule atteint-il le score environnemental requis (éco-score) ?',
    aide:"Il doit figurer sur la liste ADEME des versions éligibles. Votre loueur ou concessionnaire peut le confirmer.",
    options:[{v:'oui',t:'Oui'},{v:'non',t:'Non'},{v:'nsp',t:'Je ne sais pas',s:'Nous affichons alors le montant le plus prudent'}]},
  { id:'age', applies:s=>qualifie(s)&&(s.mode==='achat'||s.mode==='location'), titre:'Le véhicule a-t-il plus de 5 ans ?',
    aide:"L'âge se compte depuis la première mise en circulation, et s'apprécie à la mise à disposition au salarié.",
    options:[{v:'jeune',t:'5 ans ou moins'},{v:'ancien',t:'Plus de 5 ans'},{v:'bascule',t:'Il franchit les 5 ans cette année'}]},
  { id:'carburant', applies:s=>qualifie(s)&&s.energie&&s.energie!=='electrique', titre:"L'entreprise prend-elle en charge le carburant des trajets privés ?",
    options:[{v:'non',t:'Non'},{v:'oui',t:'Oui'},{v:'partiel',t:'En partie',s:'Carte plafonnée, prise en charge partielle'}]},
  { id:'montant', applies:s=>qualifie(s)&&!!s.mode, montant:true },
];

let parcours = [];
let etapeActuelle = null;

/* Mémoire du dernier résultat pour le comparateur réel et le rapport */
let dernierResultat = null, dernierEtat = null, dernierForfait = null, dernierReel = null;

function etapesApplicables(){ return STEPS.filter(st=>st.applies(etat)); }

function ouvrirModale(){ neuf(); parcours=[]; etapesVues=new Set(); dernierReel=null;
  capturerEvenement('aen_ouvert');
  overlay.classList.add('open'); document.body.style.overflow='hidden'; aller(STEPS[0]);
  /* A11Y : le focus entre dans le dialogue */
  document.getElementById('fermer').focus(); }
function fermerModale(){ overlay.classList.remove('open'); document.body.style.overflow='';
  /* A11Y : le focus revient au déclencheur */
  var o = document.getElementById('ouvrir'); if (o) o.focus(); }
/* A11Y : le focus reste piégé dans la modale tant qu'elle est ouverte (aria-modal ne bloque pas le clavier).
   Garde focusin : tout focus qui sort du dialogue y est ramené, quel que soit l'ordre DOM des étapes. */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Tab' || !overlay.classList.contains('open')) return;
  var focusables = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  var vis = Array.prototype.filter.call(focusables, function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; });
  if (!vis.length) return;
  e.preventDefault();
  var i = vis.indexOf(document.activeElement);
  var n = e.shiftKey ? i - 1 : i + 1;
  if (n < 0) n = vis.length - 1;
  if (n >= vis.length || i === -1) n = e.shiftKey ? vis.length - 1 : 0;
  vis[n].focus();
});

/* Le parcours fait 10 étapes et tient en un seul chargement de page : son tunnel
   est donc entièrement mesurable, contrairement à tout ce qui traverse deux pages. */
let etapesVues = new Set();

function aller(step){
  etapeActuelle = step;
  if(!parcours.includes(step.id)) parcours.push(step.id);
  if(!etapesVues.has(step.id)){
    etapesVues.add(step.id);
    capturerEvenement('aen_etape_vue', {
      etape: step.id,
      rang: etapesApplicables().findIndex(s=>s.id===step.id) + 1,
      total: etapesApplicables().length
    });
  }
  majProgress();
  rendre(step);
  pied.style.display='';
  btnRetour.disabled = parcours.length<=1;
}

function majProgress(){
  const list = etapesApplicables();
  let n, total;
  if(qualifie(etat) && etat.energie){
    const idx = list.findIndex(s=>s.id===etapeActuelle.id);
    n = idx>=0 ? idx+1 : parcours.length;
    total = list.length;
  } else {
    n = parcours.length;
    const deadEnd = (etat.typevhc && etat.typevhc!=='vp') || etat.attribution==='non' || etat.beneficiaire==='tns';
    total = deadEnd ? n : 9;
  }
  total = Math.max(total, n);
  progressWrap.style.display='';
  progressLib.textContent = 'Étape ' + n + ' sur ' + total;
  progressFill.style.width = Math.round(n/total*100) + '%';
}

function rendre(step){
  if(step.montant){ rendreMontant(); return; }
  btnSuivant.hidden = true;
  let h = '<h2 class="q-titre">'+step.titre+'</h2>';
  if(step.aide) h += '<p class="q-aide">'+step.aide+'</p>';
  h += '<div class="q-options">';
  step.options.forEach(o=>{
    const on = etat[step.id]===o.v ? ' on' : '';
    h += '<button class="opt'+on+'" data-v="'+o.v+'"><span class="puce"></span><span class="lib"><b>'+o.t+'</b>'+(o.s?'<span>'+o.s+'</span>':'')+'</span><span class="fleche">→</span></button>';
  });
  h += '</div>';
  corps.innerHTML = h;
  corps.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>{
    etat[step.id] = b.dataset.v;
    repondre();
  }));
}

function rendreMontant(){
  const loc = etat.mode==='location';
  btnSuivant.hidden = false; btnSuivant.textContent = 'Voir mon résultat';
  corps.innerHTML =
    '<h2 class="q-titre">'+(loc?'Coût annuel de la location (TTC)':"Prix d'achat du véhicule (TTC)")+'</h2>'+
    '<div class="champ"><p class="aide">'+(loc?'Loyers de l\'année, entretien et assurance compris.':'Prix effectivement payé, remises et reprises déduites.')+'</p>'+
    '<div class="champ-input"><input type="text" inputmode="decimal" id="montant-input" placeholder="'+(loc?'9 600':'38 000')+'" autofocus><span class="suf">€</span></div></div>';
  const inp = document.getElementById('montant-input');
  const val = loc?etat.coutLocation:etat.prixAchat;
  if(val) inp.value = (val/100).toLocaleString('fr-FR');
  const sync=()=>{ const c=parseMontant(inp.value); if(loc) etat.coutLocation=c; else etat.prixAchat=c; btnSuivant.disabled = !c || isNaN(c); };
  inp.addEventListener('input',sync); sync();
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!btnSuivant.disabled) repondre(); });
}

function repondre(){
  const r = calculer(etat);
  if(r.analyse){ rendreAnalyse(r); return; }
  const list = etapesApplicables();
  const idx = list.findIndex(s=>s.id===etapeActuelle.id);
  const suite = list[idx+1];
  if(suite){ aller(suite); }
  else { rendreResultat(r); }
}

function retourWizard(){
  if(parcours.length<=1) return;
  parcours.pop();
  const prevId = parcours[parcours.length-1];
  const step = STEPS.find(s=>s.id===prevId);
  etapeActuelle = step; majProgress(); rendre(step);
  btnRetour.disabled = parcours.length<=1;
}
btnSuivant.onclick = repondre;
btnRetour.onclick = retourWizard;

function finProgress(){ progressLib.textContent='Résultat'; progressFill.style.width='100%'; }

/* Formulaire de capture (prénom, nom, fonction, e-mail) réutilisé partout */
function formCapture(intro){
  return '<div class="rap-form">'+
    '<div class="rap-row"><input type="text" id="l-prenom" placeholder="Prénom" autocomplete="given-name"><input type="text" id="l-nom" placeholder="Nom" autocomplete="family-name"></div>'+
    '<select id="l-fonction" aria-label="Votre fonction">'+
      '<option value="" selected disabled>Votre fonction</option>'+
      '<option>Direction générale</option>'+
      '<option>Direction administrative et financière</option>'+
      '<option>Ressources humaines / Paie</option>'+
      '<option>Gestionnaire de flotte</option>'+
      '<option>Expert-comptable</option>'+
      '<option>Autre</option>'+
    '</select>'+
    '<input type="email" id="l-email" placeholder="E-mail professionnel" autocomplete="email">'+
    '<label class="opt-mini"><input type="checkbox" id="l-veille"><span>M\'avertir si le barème de l\'avantage en nature véhicule change. Un message seulement quand le droit évolue, pas de démarchage.</span></label>'+
    '<div class="rap-btns"><button class="btn-p" id="l-email-btn">'+intro+'</button><button class="btn-s" id="l-pdf-btn">Télécharger le PDF</button></div>'+
    '<p class="rap-ok" id="l-ok" hidden></p>'+
    '<p class="rap-rgpd">Prénom, nom, fonction et e-mail traités par ComplyDB SAS (ACOMPIA) pour vous adresser ce document. Conservation 6 mois. Droits d\'accès, de rectification et d\'effacement : contact@acompia.fr.</p>'+
  '</div>';
}

/* Récupère et valide les coordonnées ; renvoie {p,n,f,e} ou null */
function okForm(){
  const p = (document.getElementById('l-prenom')||{}).value?.trim();
  const n = (document.getElementById('l-nom')||{}).value?.trim();
  const f = (document.getElementById('l-fonction')||{}).value;
  const e = (document.getElementById('l-email')||{}).value?.trim();
  return p && n && f && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e||'') ? { p, n, f, e } : null;
}
function direOk(msg, err){
  const el = document.getElementById('l-ok'); if(!el) return;
  el.hidden = false;
  el.style.color = err ? 'var(--ambre)' : '';
  el.style.background = err ? 'var(--ambre-pale)' : '';
  el.style.borderColor = err ? 'color-mix(in srgb,var(--ambre) 26%,transparent)' : '';
  el.textContent = msg;
}

/* ===== Fins de qualification : réponse utile + capture ===== */
const FAIRE = {
  aucun: ["Formalisez par écrit l'usage (règlement, note de service ou avenant) : c'est la pièce qui vous protège en contrôle.",
          "Conservez la preuve de la restitution ou de l'usage professionnel (carte grise, planning, suivi kilométrique).",
          "Vérifiez qu'aucun usage privé de fait ne s'est installé : c'est le premier motif de redressement."],
  specifique: ["Faites confirmer le régime exact applicable à votre situation avant la prochaine paie.",
               "Rassemblez les justificatifs propres à ce type de véhicule (contrat, facture, caractéristiques techniques).",
               "Sécurisez le traitement en paie pour éviter une régularisation sur les trois dernières années."],
  complexe: ["Faites établir le calcul au cas par cas : quelques centaines d'euros d'assiette peuvent changer selon la méthode retenue.",
             "Documentez la date de mise à disposition et les paramètres du véhicule, ils déterminent le taux.",
             "Comparez forfait et réel : la méthode la plus basse est admise, à condition de pouvoir la justifier."]
};

function rendreAnalyse(r){
  // Cas écarté par le moteur (utilitaire, deux-roues, TNS, électrique pré-2025) :
  // le visiteur se heurte à un mur. En mesurer la part dit s'il faut élargir l'outil.
  capturerEvenement('aen_hors_perimetre', { genre: r.genre, etapes_faites: parcours.length });
  finProgress(); btnSuivant.hidden=true;
  const titres = {
    aucun: "A priori, pas d'avantage en nature à déclarer",
    specifique: 'Votre véhicule obéit à des règles particulières',
    complexe: 'Votre situation demande un calcul sur mesure'
  };
  const faire = FAIRE[r.genre] || FAIRE.complexe;
  dernierResultat = r; dernierEtat = {...etat};
  let h =
    '<h2 class="res-analyse-t">'+(titres[r.genre]||'Votre situation mérite une analyse individuelle')+'</h2>'+
    '<p class="res-analyse-m">'+r.motif+'</p>'+
    '<div class="analyse-faire"><h4>Ce que vous pouvez faire</h4><ul>'+
      faire.map(x=>'<li>'+x+'</li>').join('')+
    '</ul></div>'+
    '<div class="res-rapport">'+
      '<h3>Recevez la note sur votre cas</h3>'+
      '<p>Une note claire qui explique la règle applicable à votre situation, ce qui déclenche ou écarte l\'avantage en nature, et la liste des pièces à conserver en cas de contrôle.</p>'+
      formCapture('Recevoir la note par e-mail')+
    '</div>'+
    '<div class="res-flotte">'+
      '<p class="rf-intro">Besoin d\'une réponse ferme ?</p>'+
      '<p class="rf-sous">Un échange court avec notre équipe pour sécuriser le traitement de ce véhicule.</p>'+
      '<div class="res-cta">'+
        '<a class="btn-p" href="'+ACOMPIA_CONFIG.rdvURL+'" target="_blank" rel="noopener">Prendre un rendez-vous</a>'+
        '<button class="btn-s" id="recommencer">Tester un autre véhicule</button>'+
      '</div>'+
    '</div>';
  corps.innerHTML = h;
  document.getElementById('recommencer').addEventListener('click',ouvrirModale);
  wireCapture('note');
}

/* ===== Résultat chiffré ===== */
function rendreResultat(r){
  capturerEvenement('aen_resultat', {
    mode: etat.mode,
    energie: etat.energie,
    periode: etat.periode,
    etapes_faites: parcours.length
  });
  finProgress(); btnSuivant.hidden=true;
  btnSuivant.onclick = repondre; btnRetour.onclick = retourWizard; btnRetour.disabled = false;
  dernierResultat = r; dernierEtat = {...etat}; dernierReel = null;
  const sortie = r.double ? r.double.sans : r.simple;
  const m = sortie.montant;
  dernierForfait = m;
  const expo = m*3;
  const cotis = Math.round(m * TAUX_COTIS_PATRONALES);

  let h = '<p class="res-lib">Avantage en nature à réintégrer, par an</p>';
  h += '<div class="res-montant">'+fmt(m)+'</div>';
  h += '<div class="res-mens">soit '+fmtMois(m, r.prorataMois)+' par mois d\'assiette de cotisations</div>';
  h += '<div class="res-cotis">Pour l\'employeur, cela représente environ <b>'+fmt(cotis)+'</b> de cotisations patronales par an (estimation à 45 %). Ce montant s\'ajoute chaque année, par véhicule concerné.</div>';

  /* Aperçu du calcul (le détail complet est dans le rapport) */
  h += '<div class="res-apercu"><div class="res-apercu-t">D\'où vient ce montant</div>';
  sortie.lignes.forEach((l,i)=>{
    const dernier = i===sortie.lignes.length-1;
    h += '<div class="res-ligne'+(l.negatif?' neg':'')+(dernier&&sortie.lignes.length>1?'':'')+'"><span class="l">'+l.lib+'</span><span class="v">'+(l.mnt<0?'− '+fmt(-l.mnt):fmt(l.mnt))+'</span></div>';
  });
  h += '<div class="res-ligne tot"><span class="l">Assiette retenue</span><span class="v">'+fmt(m)+'</span></div>';
  h += '</div>';

  h += '<div class="res-expo">En cas de contrôle, l\'URSSAF peut vérifier les trois dernières années : jusqu\'à <b>'+fmt(expo)+'</b> d\'assiette pourraient être réintégrés si l\'avantage n\'a pas été déclaré, hors majorations de redressement.</div>';
  (r.alertes||[]).forEach(a=>{ h += '<div class="res-alerte-ind">'+a+'</div>'; });

  /* HOOK réel : comparaison forfait / réel accessible à la demande */
  h += '<div class="reel-hook" id="reel-hook">'+
    '<button class="reel-toggle" id="reel-toggle" type="button"><span class="rt-txt"><b>Pourriez-vous payer moins au réel ?</b><span>L\'employeur retient la méthode la plus basse. Comparez en 4 chiffres.</span></span><span class="rt-chevron">▾</span></button>'+
    '<div class="reel-panel">'+
      '<div class="reel-champs">'+
        '<div class="rc"><label for="km-total">Kilométrage annuel total</label><input type="text" inputmode="numeric" id="km-total" placeholder="25 000"></div>'+
        '<div class="rc"><label for="km-prive">Kilométrage à titre privé</label><input type="text" inputmode="numeric" id="km-prive" placeholder="8 000"></div>'+
        '<div class="rc full"><label for="cout-reel">Coût annuel réel (amortissement ou loyers, assurance, entretien, hors carburant)</label><input type="text" inputmode="decimal" id="cout-reel" placeholder="7 400"></div>'+
        '<div class="rc full"><label for="carb-prive">Carburant payé par l\'employeur pour l\'usage privé (réel annuel)</label><input type="text" inputmode="decimal" id="carb-prive" placeholder="0"></div>'+
      '</div>'+
      '<p class="comp-attente" id="comp-attente">Renseignez vos données pour comparer.</p>'+
      '<div class="comp-resultat" id="comp-resultat">'+
        '<div class="comp-vs">'+
          '<div class="comp-carte" id="carte-forfait"><span class="lib">Forfait <span class="comp-reco" id="reco-forfait" hidden>le plus bas</span></span><div class="val" id="comp-forfait">·</div></div>'+
          '<div class="comp-carte" id="carte-reel"><span class="lib">Réel (quote-part privée) <span class="comp-reco" id="reco-reel" hidden>le plus bas</span></span><div class="val" id="comp-reel">·</div></div>'+
        '</div>'+
        '<p class="comp-verdict" id="comp-verdict"></p>'+
        '<p class="comp-rappel">Formule : (amortissement + assurance + entretien) × km privés / km totaux, puis carburant privé réellement payé par l\'employeur (arrêté du 25 février 2025, art. 3, II ; prorata kilométrique : doctrine BOSS). Véhicule 100 % électrique éligible à l\'éco-score : abattement de 50 % plafonné à 2 026,30 € en 2026 appliqué au réel. L\'évaluation au réel suppose de pouvoir justifier chaque élément ; à défaut, l\'URSSAF retient le forfait.</p>'+
      '</div>'+
    '</div>'+
  '</div>';

  /* Rapport = lead magnet, au moment le plus opportun */
  h += '<div class="res-rapport">'+
    '<h3>Votre rapport complet</h3>'+
    '<p>Le détail chiffré de votre calcul, la comparaison entre le forfait et l\'évaluation au réel, les règles applicables à votre situation (barème, seuil des 5 ans, abattements, plafonnement) et la liste des pièces à conserver en cas de contrôle. Utile à joindre à votre dossier de paie.</p>'+
    formCapture('Recevoir le rapport par e-mail')+
  '</div>';

  /* Flotte */
  h += '<div class="res-flotte">'+
    '<p class="rf-intro">Vous gérez plusieurs véhicules ?</p>'+
    '<p class="rf-sous">Multipliez ce montant par votre flotte : l\'enjeu se compte souvent en dizaines de milliers d\'euros d\'assiette. Deux façons d\'y voir clair.</p>'+
    '<div class="res-cta">'+
      '<a class="btn-p" href="'+ACOMPIA_CONFIG.rdvURL+'" target="_blank" rel="noopener">Demander un devis pour l\'audit de votre flotte</a>'+
      '<a class="btn-s" href="/outils/pilotage-flotte-tarifs/">Découvrir l\'outil de pilotage continu</a>'+
    '</div>'+
  '</div>';

  h += '<p class="res-caution">'+(r.regime||'')+'.<br>Barèmes établis d\'après boss.gouv.fr, urssaf.fr et legifrance.gouv.fr. Estimation indicative, non constitutive d\'une consultation juridique.</p>';
  h += '<p class="res-source">Source : '+(r.artRef||'arrêté du 25 février 2025')+' · BOSS, rubrique Avantages en nature. À jour des derniers arrêtés et mises à jour du BOSS en la matière.</p>';

  corps.innerHTML = h;

  /* Réel : ouverture + recalcul en direct */
  const hook = document.getElementById('reel-hook');
  document.getElementById('reel-toggle').addEventListener('click',()=>{
    const ouvert = hook.classList.toggle('open');
    if(ouvert) capturerEvenement('aen_comparateur_ouvert');
  });
  ['km-total','km-prive','cout-reel','carb-prive'].forEach(id=>{
    document.getElementById(id).addEventListener('input', majComparateur);
  });

  wireCapture('rapport');
}

/* Comparateur réel — logique VERROUILLÉE, portée à l'identique de la version vérifiée conforme */
function majComparateur(){
  const kmT = parseMontant(document.getElementById('km-total').value);
  const kmP = parseMontant(document.getElementById('km-prive').value);
  const coutReel = parseMontant(document.getElementById('cout-reel').value);
  const carbP = parseMontant(document.getElementById('carb-prive').value) || 0;
  const attente = document.getElementById('comp-attente');
  const resDiv = document.getElementById('comp-resultat');
  const forfait = dernierForfait;
  if(!kmT || !kmP || !coutReel || !forfait || kmP > kmT){
    attente.style.display=''; resDiv.classList.remove('visible'); dernierReel = null;
    if(kmP && kmT && kmP > kmT) attente.textContent = 'Le kilométrage privé ne peut pas dépasser le kilométrage total.';
    else attente.textContent = 'Renseignez vos données pour comparer.';
    return;
  }
  attente.style.display='none'; resDiv.classList.add('visible');
  const mois = dernierEtat.prorata ?? 12;
  let reel = Math.round(coutReel * (kmP / 100) / (kmT / 100)) + carbP;
  if(mois < 12) reel = Math.round(reel * mois / 12);
  const elecEligible = dernierEtat.energie === 'electrique' && dernierEtat.periode === 'post' && dernierEtat.ecoscore === 'oui';
  if(elecEligible){
    const plafondReel = Math.round(BAREME.constantes[BAREME.annee].plafondElecReelNouveau * mois / 12);
    reel = reel - Math.min(Math.round(reel * 50 / 100), plafondReel);
  }
  if(dernierEtat.participation > 0) reel = Math.max(0, reel - dernierEtat.participation);
  dernierReel = reel;
  document.getElementById('comp-forfait').textContent = fmt(forfait);
  document.getElementById('comp-reel').textContent = fmt(reel);
  const forfaitBas = forfait <= reel;
  document.getElementById('reco-forfait').hidden = !forfaitBas;
  document.getElementById('reco-reel').hidden = forfaitBas;
  document.getElementById('carte-forfait').classList.toggle('reco', forfaitBas);
  document.getElementById('carte-reel').classList.toggle('reco', !forfaitBas);
  const verdict = document.getElementById('comp-verdict');
  if(reel < forfait){
    verdict.textContent = "Ici, l'évaluation au réel est plus basse : " + fmt(reel) + " contre " + fmt(forfait) + " au forfait, soit " + fmt(forfait - reel) + " d'assiette en moins. L'employeur peut retenir la méthode la plus favorable, par salarié et par an, à condition de pouvoir justifier chaque montant.";
  } else if(reel > forfait){
    verdict.textContent = "Ici, le forfait est plus bas : " + fmt(forfait) + " contre " + fmt(reel) + " au réel. Le forfait est alors le plus avantageux, et il évite d'avoir à justifier le détail des dépenses.";
  } else {
    verdict.textContent = "Les deux méthodes donnent la même assiette. Le forfait évite d'avoir à justifier le détail des dépenses.";
  }
}

/* Envoi du lead au Cloudflare Worker (Notion + email), comme le prédiagnostic.
   Le Worker route déjà le type 'devis' vers Notion + notification email.
   En local (démo) rien n'est transmis, pour ne pas polluer le Notion pendant les tests. */
const DEMO = ['127.0.0.1','localhost',''].includes(location.hostname) || location.protocol==='file:';
function envoyerLead(f, type){
  if(DEMO) return; // local : pas d'envoi réel
  const veille = !!(document.getElementById('l-veille')||{}).checked;
  let resume = '';
  if(type==='rapport' && dernierResultat){
    const s = dernierResultat.double ? dernierResultat.double.sans : dernierResultat.simple;
    if(s) resume = 'Assiette forfait ' + fmt(s.montant) + '/an' + (dernierReel!=null ? ' · réel ' + fmt(dernierReel) + '/an' : '');
  } else if(dernierResultat && dernierResultat.motif){
    resume = 'Cas hors calcul : ' + dernierResultat.motif.slice(0,140);
  }
  envoyerAuWorker('devis', {
    name: f.p + ' ' + f.n,
    email: f.e,
    audit_type: type==='rapport' ? 'Simulateur AEN — rapport' : 'Simulateur AEN — note',
    message: 'Fonction : ' + f.f + ' | Veille barème : ' + (veille?'oui':'non') + (resume ? ' | ' + resume : '')
  }).catch(() => signalerEchecEnvoi(document.querySelector('.rap-form')));
  capturerEvenement('aen_lead', { source: type });
}

/* Branchement des deux boutons de capture : envoi au Worker + affichage du rapport / confirmation */
function wireCapture(type){
  const btnMail = document.getElementById('l-email-btn');
  const btnPdf = document.getElementById('l-pdf-btn');
  if(!btnMail) return;
  const action = (pdf)=>{
    const f = okForm();
    if(!f){ direOk('Renseignez votre prénom, votre nom, votre fonction et votre e-mail professionnel.', true); return; }
    envoyerLead(f, type);
    if(type==='rapport'){ afficherRapport(f); }
    else { direOk('C\'est noté ' + f.p + '. Votre note vous sera envoyée à ' + f.e + '.'); }
  };
  btnMail.addEventListener('click',()=>action(false));
  btnPdf.addEventListener('click',()=>action(true));
}

/* ===== Le rapport (vue montrable, aérée) ===== */
function afficherRapport(f){
  const r = dernierResultat;
  const sortie = r.double ? r.double.sans : r.simple;
  const m = sortie.montant;
  const cotis = Math.round(m * TAUX_COTIS_PATRONALES);
  const d = new Date();
  const dateStr = d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });

  /* Règles applicables, formulées selon l'état */
  const regles = [];
  regles.push(['Barème', (etat.periode==='post'?'Barème renforcé applicable aux mises à disposition à compter du 1er février 2025 (arrêté du 25 février 2025, art. 3, III, B).':'Ancien barème, conservé pour les mises à disposition antérieures au 1er février 2025 (art. 3, III, A).')]);
  regles.push(['Méthode', (etat.mode==='achat'?'Véhicule acheté par l\'entreprise : taux appliqué au prix d\'achat TTC.':'Véhicule loué : taux appliqué au coût annuel de la location, plafonné à la règle achat si elle est plus favorable.')]);
  regles.push(['Taux retenu', r.taux + ' % ' + (etat.age==='ancien'?'(véhicule de plus de 5 ans)':'(véhicule de 5 ans ou moins)') + (etat.carburant==='oui'?', carburant privé pris en charge':'') + '.']);
  if(etat.energie==='electrique'){
    if(etat.ecoscore==='oui') regles.push(['Abattement électrique','Véhicule 100 % électrique éligible à l\'éco-score : abattement de 70 % sur l\'évaluation, plafonné à 4 641,60 € en 2026, jusqu\'au 31 décembre 2027 (art. 3, III, D ; BOSS § 910).']);
    else regles.push(['Abattement électrique','Abattement de 70 % non appliqué, faute d\'éco-score confirmé. Il ouvrira droit à l\'abattement dès l\'inscription du véhicule sur la liste ADEME.']);
  }
  regles.push(['Seuil des 5 ans','L\'âge se compte depuis la première mise en circulation et s\'apprécie à la mise à disposition. Il fixe le taux applicable.']);
  if(etat.participation>0) regles.push(['Participation','La participation du salarié vient en déduction de l\'évaluation, dans la limite de son montant.']);

  const bloc = (titre, corps)=>'<div class="rapport-section"><h3>'+titre+'</h3>'+corps+'</div>';

  const detailLignes = sortie.lignes.map(l=>
    '<div class="rapport-regle"><b>'+l.lib+'</b><span>'+(l.formule?l.formule+' = ':'')+(l.mnt<0?'− '+fmt(-l.mnt):fmt(l.mnt))+'</span></div>'
  ).join('') + '<div class="rapport-regle"><b>Assiette retenue</b><span>'+fmt(m)+'</span></div>';

  let comparaison;
  if(dernierReel != null){
    const reelBas = dernierReel < m;
    comparaison =
      '<div class="rapport-synth">'+
        '<div class="rapport-tuile"><div class="lab">Au forfait</div><div class="num">'+fmt(m)+'</div></div>'+
        '<div class="rapport-tuile"><div class="lab">Au réel (quote-part privée)</div><div class="num">'+fmt(dernierReel)+'</div></div>'+
      '</div>'+
      '<p class="rapport-p">'+(reelBas
        ? 'Dans votre cas, l\'évaluation au réel est plus basse de '+fmt(m-dernierReel)+' d\'assiette. L\'employeur peut retenir la méthode la plus favorable, par salarié et par an, à condition de pouvoir justifier chaque montant en cas de contrôle.'
        : 'Dans votre cas, le forfait reste la méthode la plus basse, et il évite d\'avoir à justifier le détail des dépenses.')+'</p>';
  } else {
    comparaison = '<p class="rapport-p">Vous n\'avez pas renseigné vos données réelles. L\'employeur peut aussi évaluer l\'avantage aux dépenses réellement engagées : (amortissement ou loyers + assurance + entretien) × kilométrage privé / kilométrage total, majoré du carburant privé pris en charge (arrêté du 25 février 2025, art. 3, II). La méthode la plus basse est admise, par salarié et par an. Revenez au simulateur pour comparer vos deux chiffres.</p>';
  }

  const vue =
    '<div class="rapport-vue">'+
      '<div class="rapport-tete">'+
        '<div class="rapport-kicker">Rapport ACOMPIA · Avantage en nature véhicule</div>'+
        '<div class="rapport-h1">Votre estimation et les règles applicables</div>'+
        '<div class="rapport-meta">Établi le '+dateStr+' pour '+echapperHTML(f.p)+' '+echapperHTML(f.n)+' ('+echapperHTML(f.f)+'). Année de référence 2026. Document indicatif, à conserver dans votre dossier de paie.</div>'+
      '</div>'+
      bloc('Synthèse',
        '<div class="rapport-synth">'+
          '<div class="rapport-tuile"><div class="lab">Assiette à réintégrer, par an</div><div class="num">'+fmt(m)+'</div></div>'+
          '<div class="rapport-tuile"><div class="lab">Cotisations patronales estimées (45 %)</div><div class="num">'+fmt(cotis)+'</div></div>'+
        '</div>'+
        '<p class="rapport-p">Soit '+fmtMois(m, r.prorataMois)+' d\'assiette par mois. En cas de contrôle, l\'URSSAF peut vérifier les trois dernières années : jusqu\'à '+fmt(m*3)+' d\'assiette si l\'avantage n\'a pas été déclaré, hors majorations.</p>'
      )+
      bloc('Détail du calcul au forfait', detailLignes)+
      bloc('Forfait ou réel : quelle méthode retenir ?', comparaison)+
      bloc('Règles applicables à votre situation', regles.map(x=>'<div class="rapport-regle"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join(''))+
      bloc('En cas de contrôle URSSAF',
        '<p class="rapport-p">L\'URSSAF peut en principe vérifier les trois années civiles précédant le contrôle (CSS, art. L.244-3). En cas de constatation d\'un travail dissimulé, ce délai est porté à cinq ans (art. L.244-3, dernier alinéa). Les majorations et pénalités ne sont pas chiffrées ici : elles dépendent de la procédure et de l\'analyse de l\'URSSAF.</p>')+
      bloc('Pièces à conserver',
        '<ul class="rapport-pieces">'+
          ['Carte grise et facture d\'achat ou contrat de location (loyers annuels)',
           'Contrat ou avenant d\'attribution du véhicule, politique véhicule de l\'entreprise',
           'Justificatifs d\'assurance et d\'entretien',
           'Suivi kilométrique total et privé (si évaluation au réel)',
           'Justificatifs de carburant pris en charge',
           'Preuve de la participation éventuelle du salarié',
           'Pour l\'électrique : attestation d\'éligibilité à l\'éco-score (liste ADEME)'].map(x=>'<li>'+x+'</li>').join('')+
        '</ul>')+
      bloc('Sources',
        '<p class="rapport-src">Arrêté du 25 février 2025 relatif à l\'évaluation des avantages en nature · BOSS, rubrique Avantages en nature (§ 900 et 910) · Code de la sécurité sociale, art. L.242-1 et L.244-3 · boss.gouv.fr, urssaf.fr, legifrance.gouv.fr.<br>Estimation indicative, non constitutive d\'une consultation juridique.</p>')+
      '<div class="rapport-cta no-print">'+
        '<h3>Une flotte à sécuriser ?</h3>'+
        '<p>Multiplié par vos véhicules, l\'enjeu se compte en dizaines de milliers d\'euros. Nous auditons vos pratiques sur les trois années contrôlables et vous outillons pour rester conforme en continu.</p>'+
        '<div class="rc-btns">'+
          '<a class="p" href="'+ACOMPIA_CONFIG.rdvURL+'" target="_blank" rel="noopener">Demander un devis d\'audit</a>'+
          '<a class="s" href="/outils/pilotage-flotte-tarifs/">Découvrir le pilotage de flotte</a>'+
        '</div>'+
      '</div>'+
    '</div>';

  corps.innerHTML = vue;
  progressLib.textContent = 'Rapport';
  /* pied : imprimer + revenir */
  pied.style.display='';
  btnRetour.disabled = false;
  btnSuivant.hidden = false; btnSuivant.textContent = 'Imprimer / PDF';
  btnRetour.onclick = ()=>rendreResultat(dernierResultat);
  btnSuivant.onclick = ()=>window.print();
}

document.getElementById('ouvrir').addEventListener('click',ouvrirModale);
document.getElementById('fermer').addEventListener('click',fermerModale);
overlay.addEventListener('click',e=>{ if(e.target===overlay) fermerModale(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&overlay.classList.contains('open')) fermerModale(); });
