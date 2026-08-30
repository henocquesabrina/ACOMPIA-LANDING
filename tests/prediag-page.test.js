const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const racine = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(racine, 'outils/prediagnostic-urssaf/index.html'), 'utf8');
const questionnaire = fs.readFileSync(path.join(racine, 'js/questionnaire.js'), 'utf8');
const scoring = fs.readFileSync(path.join(racine, 'js/scoring.js'), 'utf8');

function listerPagesHtml(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap(entree => {
    if (entree.name === '.git' || entree.name === 'node_modules') return [];
    const cible = path.join(dossier, entree.name);
    if (entree.isDirectory()) return listerPagesHtml(cible);
    return entree.isFile() && entree.name.endsWith('.html') ? [cible] : [];
  });
}

test('la promesse publique annonce trois minutes de façon cohérente', () => {
  assert.ok(page.includes('Prédiagnostic URSSAF gratuit en 3 minutes'));
  assert.ok(page.includes('3 minutes environ'));
  assert.ok(!page.includes('4 minutes'));
  assert.ok(!page.includes('5 minutes'));
});

test('aucune page publique ne conserve une promesse de quatre ou cinq minutes', () => {
  const motifsObsoletes = [
    /prédiagnostic[^.\n<]{0,180}(^|[^0-9])[45]\s*(?:minutes?|min)\b/i,
    /(^|[^0-9])[45]\s*(?:minutes?|min)\b[^.\n<]{0,180}prédiagnostic/i,
    /Gratuit\s*·\s*[45]\s*minutes?/i,
    /(^|[^0-9])[45]\s+minutes?\s+pour\s+(?:évaluer|situer|repérer)/i,
    /\([45]\s+min\)/i
  ];
  const anciennesPromesses = listerPagesHtml(racine).flatMap(fichier => {
    const contenu = fs.readFileSync(fichier, 'utf8');
    return motifsObsoletes.some(motif => motif.test(contenu))
      ? [path.relative(racine, fichier)]
      : [];
  });

  assert.deepEqual(anciennesPromesses, []);
});

test('le bouton de démarrage précède l’aperçu du rapport dans le premier écran', () => {
  const bouton = page.indexOf('id="start-prediag"');
  const apercu = page.indexOf('class="prediag-showcase"');

  assert.ok(bouton !== -1 && apercu !== -1);
  assert.ok(bouton < apercu);
  assert.ok(page.includes('10 questions de base'));
  assert.ok(page.includes('Email demandé à la fin'));
});

test('le contenu critique du premier écran n’est pas masqué par reveal', () => {
  assert.ok(!page.includes('class="section-header reveal"'));
  assert.ok(!page.includes('class="prediag-container reveal"'));
});

test('l’aperçu annonce exactement les livrables présents dans le rapport', () => {
  assert.ok(page.includes('Vos trois priorités'));
  assert.ok(page.includes('Les preuves à contrôler'));
  assert.ok(page.includes('Un plan d\'action sur 30 jours'));
  assert.ok(page.includes('une vue de tous les thèmes examinés'));
});

test('les questions de preuve essentielles restent dans le parcours court', () => {
  const bloc = questionnaire.match(/const SHORT_QUESTION_IDS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(bloc, 'la liste du parcours court doit être trouvée');

  assert.ok(bloc[1].includes("'Q2.1b'"), 'preuve de remise de la DUE');
  assert.ok(bloc[1].includes("'Q5.1b'"), 'preuve de l’usage professionnel du véhicule');
  assert.ok(bloc[1].includes("'Q7.0bis'"), 'seuil et zone de versement mobilité');
  assert.ok(bloc[1].includes("'Q7.1'"), 'contrôle du taux de versement mobilité');
  assert.ok(questionnaire.includes('cinq années civiles consécutives'));
});

test('la progression ne présente plus de dénominateur mouvant', () => {
  assert.ok(questionnaire.includes('this.progressText.textContent = `${this.progressPct}%`'));
  assert.ok(questionnaire.includes('<div class="q-number">Question ${this.currentIndex + 1}</div>'));
  assert.ok(!questionnaire.includes('Question ${this.currentIndex + 1} / ${this.getTotalActive()}'));
});

test('le tunnel PostHog mesure l’entrée, le lancement, le contact et la fin', () => {
  [
    'prediag_intro_vue',
    'prediag_lance',
    'prediag_contact_vu',
    'prediag_termine',
    'prediag_enregistre',
    'prediag_envoi_echec',
    'prediag_rdv_clique'
  ].forEach(event => assert.ok(
    questionnaire.includes(event) || scoring.includes(event),
    `événement manquant : ${event}`
  ));
});

test('le filet de sécurité du lead et l’information RGPD restent présents', () => {
  assert.ok(questionnaire.includes("localStorage.setItem('acompia_prediag_pending'"));
  assert.ok(questionnaire.includes('https://acompia-worker.she-aa1.workers.dev'));
  assert.ok(questionnaire.includes('Vos données sont utilisées pour générer votre résultat'));
  assert.ok(questionnaire.includes('/politique-confidentialite.html'));
});
