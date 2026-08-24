const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerScripts } = require('./charger.js');

const { computeScoring, generateReportHTML, premierePhrase, levelPill, ACOMPIA_CONFIG } =
  chargerScripts('js/config.js', 'js/socle.js', 'js/scoring.js');

const clesDe = (scoring) => scoring.themes.map(t => `${t.key}:${t.level}`).join(' ');

test('sans aucune réponse, aucun thème n\'est activé et l\'indice est nul', () => {
  const s = computeScoring({});
  assert.equal(s.themes.length, 0);
  assert.equal(s.indice, 0);
  assert.equal(s.seuil, 'maitrisee');
});

test('un thème retient le niveau le plus élevé de ses verdicts', () => {
  const s = computeScoring({
    'Q3.1': 'oui-reg',
    'Q3.2': 'pas-toujours-decl', // CRITIQUE
    'Q3.3': 'oui-tous',          // REDUIT
    'Q3.5': 'oui-sans-exc'       // REDUIT
  });
  const bloc3 = s.themes.find(t => t.key === 'temps-travail');
  assert.equal(bloc3.level, 'CRITIQUE');
  assert.equal(bloc3.verdicts.length, 3);
});

test('les questions de filtre masquent les thèmes non concernés', () => {
  const sansTitres = computeScoring({ 'Q1bis.1': 'non', 'Q1bis.2': 'non' });
  assert.ok(!sansTitres.themes.some(t => t.key === 'titres-resto'));

  const sansVM = computeScoring({ 'Q0.1': '1-10', 'Q7.0': 'oui-seuil-long', 'Q7.1': 'non' });
  assert.ok(!sansVM.themes.some(t => t.key === 'vm'));
});

test('versement mobilité : l\'assujettissement combine seuil d\'effectif et zone', () => {
  const commun = { 'Q0.1': '50-249', 'Q7.1': 'non' };
  const assujetti = computeScoring({ ...commun, 'Q7.0': 'oui-seuil-long', 'Q7.0bis': 'oui' });
  const incertain = computeScoring({ ...commun, 'Q7.0': 'oui-recent', 'Q7.0bis': 'oui' });

  assert.equal(assujetti.themes.find(t => t.key === 'vm').level, 'ELEVE');
  assert.equal(incertain.themes.find(t => t.key === 'vm').level, 'MOYEN');
});

test('les seuils d\'exposition suivent les bornes documentées', () => {
  const bandeDe = (indice) =>
    indice <= 29 ? 'maitrisee' : indice <= 59 ? 'moderee' : 'forte';

  const profils = [
    { 'Q1bis.1': 'oui', 'Q1bis.2': 'non' },                                   // CRITIQUE seul
    { 'Q1bis.1': 'oui', 'Q1bis.2': 'non', 'Q6.1': 'oui', 'Q6.2': 'revue-complete' },
    { 'Q1bis.1': 'oui', 'Q1bis.2': 'nsp', 'Q6.1': 'oui', 'Q6.2': 'revue-complete' }
  ];
  profils.forEach((profil) => {
    const s = computeScoring(profil);
    assert.equal(s.seuil, bandeDe(s.indice));
  });
});

test('les aggravants transversaux sont remontés dans meta', () => {
  const s = computeScoring({ 'Q0.4': 'oui-redress', 'Q0.3bis': 'multi', 'Q0.1': '11-49', 'Q0.3': 'btp' });
  assert.equal(s.meta.reiteration, true);
  assert.equal(s.meta.multiSite, true);
  assert.equal(s.meta.effectif, '11-49');
  assert.equal(s.meta.secteur, 'btp');
});

/* CARACTÉRISATION — comportement actuel, volontairement figé pour rendre
   visible une règle métier discutable : l'indice est normalisé par le nombre
   de thèmes activés, si bien qu'un thème CRITIQUE isolé vaut 100/100 alors
   que le même thème entouré de thèmes sains redescend sous le seuil
   « Exposition maîtrisée ». À arbitrer côté métier. */
test('CARACTÉRISATION : l\'indice est dilué par les thèmes sans risque', () => {
  const seul = computeScoring({ 'Q1bis.1': 'oui', 'Q1bis.2': 'non' });
  assert.equal(seul.indice, 100);
  assert.equal(seul.seuil, 'forte');

  const dilue = computeScoring({
    'Q1bis.1': 'oui', 'Q1bis.2': 'non',        // CRITIQUE
    'Q2.1a': 'accord',                          // REDUIT
    'Q6.1': 'oui', 'Q6.2': 'revue-complete',    // REDUIT
    'Q4.1': 'majorite', 'Q4.2': 'oui-regulier', // REDUIT
    'Q1.1': 'oui', 'Q1.2': 'oui-tous', 'Q1.4': 'oui-tous' // REDUIT
  });
  assert.equal(clesDe(dilue).split(' ').filter(c => c.endsWith('CRITIQUE')).join(''), 'titres-resto:CRITIQUE');
  assert.equal(dilue.indice, 20);
  assert.equal(dilue.seuil, 'maitrisee'); // même thème CRITIQUE, verdict rassurant
});

test('le rapport reprend l\'indice, le seuil et l\'URL de rendez-vous configurée', () => {
  const s = computeScoring({ 'Q1bis.1': 'oui', 'Q1bis.2': 'non' });
  const html = generateReportHTML(s, { name: 'Jean Dupont' });

  assert.ok(html.includes('id="acompia-report"'));
  assert.ok(html.includes('>100<'));
  assert.ok(html.includes('Exposition forte'));
  assert.ok(html.includes(ACOMPIA_CONFIG.rdvURL));
  assert.ok(html.includes(ACOMPIA_CONFIG.contactEmail));
  assert.ok(html.includes('Préparé pour Jean Dupont'));
});

test('le rapport échappe le nom saisi par le visiteur', () => {
  const s = computeScoring({ 'Q1bis.1': 'oui', 'Q1bis.2': 'non' });
  const html = generateReportHTML(s, { name: '<img src=x onerror=alert(1)>' });

  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('le rapport reste valide sans coordonnées', () => {
  const html = generateReportHTML(computeScoring({}), null);
  assert.ok(html.includes('Aucun thème activé.'));
  assert.ok(!html.includes('Préparé pour'));
});

test('un thème n\'affiche que les verdicts de son niveau maximum', () => {
  const s = computeScoring({
    'Q3.1': 'oui-reg', 'Q3.2': 'pas-toujours-decl', 'Q3.3': 'oui-tous'
  });
  const html = generateReportHTML(s, null);
  assert.ok(html.includes('rpt-verdict-critique'));
  assert.ok(!html.includes('rpt-verdict-reduit'));
});

test('l\'encart dispenses n\'apparaît que si les dispenses sont en alerte', () => {
  const enAlerte = computeScoring({ 'Q2.1a': 'accord', 'Q2.3': 'non' });
  const conforme = computeScoring({ 'Q2.1a': 'accord', 'Q2.3': 'oui-tous' });

  assert.ok(generateReportHTML(enAlerte, null).includes('rpt-encart-law'));
  assert.ok(!generateReportHTML(conforme, null).includes('rpt-encart-law'));
});

/* --- Résumé du Top 3 (F03) --- */

test('le résumé s\'arrête à une vraie fin de phrase, pas sur une abréviation', () => {
  const verdict = "Le dispositif forfait jours ne repose pas sur les trois conditions "
    + "cumulatives exigées par l'art. L. 3121-65 C. trav. Les conventions sont inopposables.";
  const resume = premierePhrase(verdict);

  assert.ok(!resume.endsWith("l'art."), 'ne doit pas couper après « l\'art. »');
  assert.ok(resume.includes('L. 3121-65'));
});

test('le résumé coupe bien sur une phrase ordinaire', () => {
  assert.equal(
    premierePhrase('Première phrase. Seconde phrase qui ne doit pas apparaître.'),
    'Première phrase.'
  );
});

test('un verdict d\'une seule phrase est rendu intégralement', () => {
  const texte = 'Une seule phrase sans suite.';
  assert.equal(premierePhrase(texte), texte);
});

test('aucun verdict de la matrice ne produit un résumé tronqué sur abréviation', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'js', 'scoring.js'), 'utf8');
  const textes = [...source.matchAll(/text: "((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);

  assert.ok(textes.length > 50, 'la matrice doit être lue correctement');
  textes.forEach((texte) => {
    assert.ok(!/\b(art|L|R|D|C|trav|ex|etc|al)\.$/.test(premierePhrase(texte)),
      `résumé tronqué : ${premierePhrase(texte).slice(-60)}`);
  });
});

/* --- Lisibilité des niveaux (F05) --- */

test('chaque niveau de gravité a sa propre couleur de pastille', () => {
  // La pastille est le seul indice visuel de gravité dans le rapport :
  // deux niveaux de même couleur sont indiscernables pour le lecteur.
  const couleurs = ['CRITIQUE', 'ELEVE', 'MOYEN', 'REDUIT']
    .map(niveau => levelPill(niveau).match(/color:(#[0-9A-Fa-f]{6})/)[1]);
  assert.equal(new Set(couleurs).size, 4, `couleurs partagées : ${couleurs.join(' ')}`);
});
