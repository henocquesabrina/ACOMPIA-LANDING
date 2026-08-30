const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerScripts } = require('./charger.js');

const { computeScoring, generateReportHTML, ACOMPIA_CONFIG } =
  chargerScripts('js/config.js', 'js/socle.js', 'js/scoring.js');

const themeDe = (scoring, key) => scoring.themes.find(theme => theme.key === key);
const nombreDe = (texte, motif) => (texte.match(motif) || []).length;

test('sans réponse, le résultat reste réduit et aucun thème artificiel n’est créé', () => {
  const scoring = computeScoring({});

  assert.equal(scoring.themes.length, 0);
  assert.equal(scoring.seuil, 'reduite');
  assert.equal(scoring.seuilLabel, 'Vigilance réduite');
});

test('le résultat global suit toujours le pire signal', () => {
  const critiqueSeul = computeScoring({ 'Q1bis.1': 'oui', 'Q1bis.2': 'non' });
  const critiqueEntoureDeSignauxReduits = computeScoring({
    'Q1bis.1': 'oui', 'Q1bis.2': 'non',
    'Q2.1a': 'accord',
    'Q6.1': 'oui', 'Q6.2': 'revue-complete',
    'Q4.2': 'oui-regulier',
    'Q1.1': 'oui', 'Q1.4': 'oui-tous'
  });

  assert.equal(critiqueSeul.seuil, 'forte');
  assert.equal(critiqueEntoureDeSignauxReduits.seuil, 'forte');
  assert.equal(themeDe(critiqueEntoureDeSignauxReduits, 'titres-resto').level, 'CRITIQUE');
});

test('un thème retient le niveau le plus élevé de ses réponses', () => {
  const scoring = computeScoring({
    'Q3.1': 'oui-reg',
    'Q3.2': 'pas-toujours-decl',
    'Q3.3': 'oui-tous',
    'Q3.5': 'oui-sans-exc'
  });

  const tempsTravail = themeDe(scoring, 'temps-travail');
  assert.equal(tempsTravail.level, 'CRITIQUE');
  assert.equal(tempsTravail.verdicts.length, 3);
});

test('les questions de filtre ne créent pas de thème non concerné', () => {
  const sansTitres = computeScoring({ 'Q1bis.1': 'non', 'Q1bis.2': 'non' });
  const petiteEntreprise = computeScoring({
    'Q0.1': '1-10', 'Q7.0bis': 'oui', 'Q7.1': 'non'
  });
  const horsZoneOuSeuil = computeScoring({
    'Q0.1': '50-249', 'Q7.0bis': 'non', 'Q7.1': 'non'
  });

  assert.equal(themeDe(sansTitres, 'titres-resto'), undefined);
  assert.equal(themeDe(petiteEntreprise, 'vm'), undefined);
  assert.equal(themeDe(horsZoneOuSeuil, 'vm'), undefined);
});

test('le versement mobilité combine effectif, zone, durée du seuil et contrôle du taux', () => {
  const expose = computeScoring({
    'Q0.1': '50-249', 'Q7.0bis': 'oui', 'Q7.1': 'non'
  });
  const controle = computeScoring({
    'Q0.1': '50-249', 'Q7.0bis': 'oui', 'Q7.1': 'oui'
  });
  const incertain = computeScoring({
    'Q0.1': '50-249', 'Q7.0bis': 'nsp', 'Q7.1': 'nsp'
  });

  assert.equal(themeDe(expose, 'vm').level, 'ELEVE');
  assert.equal(themeDe(controle, 'vm').level, 'REDUIT');
  assert.equal(themeDe(incertain, 'vm').level, 'ELEVE');
});

test('l’usage strictement professionnel du véhicule dépend de la preuve disponible', () => {
  const prouve = computeScoring({ 'Q5.1': 'strict-pro', 'Q5.1b': 'oui-tous' });
  const partiel = computeScoring({ 'Q5.1': 'strict-pro', 'Q5.1b': 'certains' });
  const nonProuve = computeScoring({ 'Q5.1': 'strict-pro', 'Q5.1b': 'non' });

  assert.equal(themeDe(prouve, 'aen-vehicule').level, 'REDUIT');
  assert.equal(themeDe(partiel, 'aen-vehicule').level, 'ELEVE');
  assert.equal(themeDe(nonProuve, 'aen-vehicule').level, 'CRITIQUE');
});

test('une DUE est évaluée sur l’écrit et sa remise individuelle', () => {
  const complet = computeScoring({ 'Q2.1a': 'due', 'Q2.1b': 'oui-tous' });
  const partiel = computeScoring({ 'Q2.1a': 'due', 'Q2.1b': 'certains' });
  const absent = computeScoring({ 'Q2.1a': 'due', 'Q2.1b': 'non' });

  assert.equal(themeDe(complet, 'compl-sante').level, 'REDUIT');
  assert.equal(themeDe(partiel, 'compl-sante').level, 'ELEVE');
  assert.equal(themeDe(absent, 'compl-sante').level, 'CRITIQUE');
});

test('les éléments de contexte sont conservés séparément du niveau de vigilance', () => {
  const scoring = computeScoring({
    'Q0.4': 'oui-redress', 'Q0.3bis': 'multi', 'Q0.1': '11-49', 'Q0.3': 'btp'
  });

  assert.equal(scoring.meta.reiteration, true);
  assert.equal(scoring.meta.multiSite, true);
  assert.equal(scoring.meta.effectif, '11-49');
  assert.equal(scoring.meta.secteur, 'btp');
});

test('le rapport V2 fournit une décision, trois priorités et les huit thèmes', () => {
  const scoring = computeScoring({
    'Q0.1': '11-49', 'Q0.4': 'oui-obs',
    'Q1.1': 'oui', 'Q1.4': 'certains',
    'Q2.1a': 'due', 'Q2.1b': 'non', 'Q2.3': 'certains',
    'Q3.3': 'partiel', 'Q3.5': 'principalement',
    'Q4.2': 'ponctuel',
    'Q5.1': 'strict-pro', 'Q5.1b': 'certains', 'Q5.fleet': '16-40',
    'Q6.1': 'oui', 'Q6.2': 'revue-ant',
    'Q7.0bis': 'oui', 'Q7.1': 'non'
  });
  const html = generateReportHTML(scoring, { name: 'Sophie Martin' });

  assert.ok(html.includes('class="acompia-report rpt-v2"'));
  assert.ok(html.includes('Votre ordre de vérification'));
  assert.ok(html.includes('Vigilance forte'));
  assert.ok(html.includes('<strong>1</strong><span>priorité forte</span>'));
  assert.ok(html.includes('<strong>6</strong><span>à vérifier</span>'));
  assert.ok(html.includes('<strong>1</strong><span>sans alerte haute</span>'));
  assert.equal(nombreDe(html, /class="rpt-priority"/g), 3);
  assert.equal(nombreDe(html, /<th scope="row">/g), 8);
  assert.ok(html.includes('Plan d\'action sur 30 jours'));
  assert.ok(html.includes('Ce que ce prédiagnostic ne vérifie pas'));
  assert.ok(html.includes('Préparé pour Sophie Martin'));
});

test('les priorités sont classées par gravité puis par ordre métier', () => {
  const scoring = computeScoring({
    'Q1.1': 'oui', 'Q1.4': 'certains',
    'Q2.1a': 'due', 'Q2.1b': 'non',
    'Q3.3': 'partiel', 'Q3.5': 'oui-sans-exc',
    'Q4.2': 'ponctuel'
  });
  const html = generateReportHTML(scoring, null);

  const sante = html.indexOf('<h4>Complémentaire santé</h4>');
  const frais = html.indexOf('<h4>Frais professionnels</h4>');
  const temps = html.indexOf('<h4>Temps de travail et rémunérations</h4>');

  assert.ok(sante !== -1 && frais !== -1 && temps !== -1);
  assert.ok(sante < frais && frais < temps);
  assert.equal(nombreDe(html, /class="rpt-priority"/g), 3);
  assert.ok(!html.includes('<h4>Réduction générale dégressive unique</h4>'));
});

test('chaque priorité affiche sa règle, ses preuves, son action et sa fiabilité', () => {
  const scoring = computeScoring({
    'Q2.1a': 'due', 'Q2.1b': 'non', 'Q2.3': 'certains'
  });
  const html = generateReportHTML(scoring, null);

  assert.ok(html.includes('Règle de contrôle'));
  assert.ok(html.includes('Pièces à réunir'));
  assert.ok(html.includes('Prochaine action'));
  assert.ok(html.includes('Fiabilité du signal : Déclarative'));
  assert.ok(html.includes('LEGIARTI000006745463'));
  assert.ok(html.includes('LEGIARTI000029217401'));
});

test('une réponse incertaine produit une fiabilité faible', () => {
  const scoring = computeScoring({ 'Q4.2': 'nsp' });
  const html = generateReportHTML(scoring, null);

  assert.ok(html.includes('Fiabilité du signal : Faible'));
  assert.ok(html.includes('Une ou plusieurs réponses sont incertaines'));
});

test('le rapport ne réintroduit ni score sur 100 ni conclusion de conformité', () => {
  const scoring = computeScoring({ 'Q2.1a': 'accord', 'Q2.3': 'oui-tous' });
  const html = generateReportHTML(scoring, null);

  assert.ok(!html.includes('rpt-gauge'));
  assert.ok(!html.includes('/100'));
  assert.ok(html.includes('ne signifie pas « conforme »'));
  assert.ok(html.includes('ne constitue donc ni une validation de conformité'));
});

test('les recommandations des verdicts restent neutres et sans autopromotion répétée', () => {
  const scoring = computeScoring({
    'Q1.1': 'oui', 'Q1.4': 'certains',
    'Q4.2': 'ponctuel'
  });
  const html = generateReportHTML(scoring, null);

  assert.ok(!html.includes('ACOMPIA propose'));
  assert.ok(!html.includes('ACOMPIA recommande'));
});

test('le rapport utilise les coordonnées partagées et reste valide sans contact', () => {
  const html = generateReportHTML(computeScoring({}), null);

  assert.ok(html.includes(ACOMPIA_CONFIG.rdvURL));
  assert.ok(html.includes(ACOMPIA_CONFIG.contactEmail));
  assert.ok(html.includes('Aucune priorité forte détectée'));
  assert.ok(html.includes('Confirmer votre résultat avec vos données'));
  assert.ok(!html.includes('Préparé pour'));
});

test('le nom du visiteur est toujours échappé dans le rapport', () => {
  const scoring = computeScoring({ 'Q1bis.1': 'oui', 'Q1bis.2': 'non' });
  const html = generateReportHTML(scoring, { name: '<img src=x onerror=alert(1)>' });

  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('les sources officielles des priorités principales restent présentes', () => {
  const scoring = computeScoring({
    'Q1.1': 'oui', 'Q1.4': 'certains',
    'Q2.1a': 'due', 'Q2.1b': 'non',
    'Q3.3': 'partiel', 'Q3.5': 'principalement'
  });
  const html = generateReportHTML(scoring, null);

  assert.ok(html.includes('https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/frais-professionnels.html'));
  assert.ok(html.includes('LEGIARTI000006745463'));
  assert.ok(html.includes('LEGIARTI000029217401'));
  assert.ok(html.includes('LEGIARTI000036262805'));
  assert.ok(html.includes('LEGIARTI000038836902'));
});
