const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerScripts } = require('./charger.js');

const { RGDU } = chargerScripts('js/rgdu-comparateur.js');
const { calculBrut, calculerMois, comparer, coefficient, analyserLot, versCsv, lireNombre, arrondir, pointsAVerifier } = RGDU;

/* Les valeurs attendues ne viennent pas du code testé.
   Elles viennent de trois sources indépendantes :
   - le classeur publié assets/matrice-controle-rgdu-2026.xlsx (onglets Calcul salarié et Tests de bord),
     recalculé à part avec ses propres formules,
   - les trois exemples chiffrés de l'article /ressources/rgdu-cas-particuliers-calcul/,
   - le communiqué du BOSS du 05/06/2026 « Revalorisation du SMIC à compter du 1er juin 2026 ». */

/* Base mensuelle tranchée par Sabrina le 11/11/2026 : douzième non arrondi de 1 820 x 12,02 €
   (D. 241-7, IV), soit 1 823,0333... €. SMIC désigne ici une rémunération de 1 823,03 €, au centime. */
const SMIC = 1823.03;

/* ---------- Parité avec le classeur et l'article ---------- */

test('classeur, exemple 1 : temps partiel 28 h et 8 heures complémentaires', () => {
  const r = calculBrut({ fnal: 'fnal010', heuresHebdo: 28, heuresSup: 8, remuneration: 1691.73 });
  /* Classeur (base 1 823,03 €) : SMIC 1 554,58 €, plafond 4 663,75 €. Douzième non arrondi : un centime de plus. */
  assert.equal(arrondir(r.smicReference, 2), 1554.59);
  assert.equal(r.coefficient, 0.3213);
  assert.equal(r.reduction, 543.55);
  assert.equal(r.plafondIndividuel, 4663.76);
});

test('classeur, exemple 1 : le double comptage des heures complémentaires donne 633,38 €', () => {
  const r = calculerMois({ fnal: 'fnal010', heuresHebdo: 28, heuresSup: 8, remuneration: 1691.73 });
  const c = comparer(r, 633.38);
  assert.equal(c.ecart, 89.83);
  assert.equal(c.sens, 'paie_superieure');
});

test('classeur, exemple 2 : absence, rapport de correction 0,857143', () => {
  const r = calculBrut({ fnal: 'fnal010', rapportAbsence: 0.857143, remuneration: 2035.71 });
  assert.equal(arrondir(r.smicReference, 2), 1562.60);
  assert.equal(r.coefficient, 0.1986);
  assert.equal(r.reduction, 404.29);
});

test('article, exemple 2 : même résultat à partir des deux montants de l\'absence', () => {
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2035.71, remuDue: 1885.71, remuTheorique: 2200 });
  assert.equal(r.etat, 'calcule');
  /* 1 562,59 € sur la base 1 823,03 €. */
  assert.equal(r.smicReference, 1562.6);
  assert.equal(r.coefficient, 0.1986);
  assert.equal(r.reduction, 404.29);
});

test('classeur, exemple 3 : conducteur 45/35 et 10 heures supplémentaires (calcul interne)', () => {
  const r = calculBrut({ fnal: 'fnal010', facteurA: 45 / 35, heuresSup: 10, remuneration: 2500 });
  assert.equal(arrondir(r.smicReference, 2), 2464.10);
  assert.equal(r.coefficient, 0.384);
  assert.equal(r.reduction, 960);
});

test('classeur, tests de bord', () => {
  const bord = (e) => calculBrut({ fnal: 'fnal010', ...e });
  /* Juste sous le plafond : coefficient au plancher, réduction non nulle. */
  let r = bord({ remuneration: 5469 });
  assert.equal(r.coefficient, 0.02);
  assert.equal(r.reduction, 109.38);
  /* Plafond du classeur, 5 469,09 € : sur le douzième non arrondi le plafond vaut 5 469,10 €,
     donc 5 469,09 € reste éligible au coefficient plancher (0 € dans le classeur). */
  r = bord({ remuneration: 5469.09 });
  assert.equal(r.eligible, true);
  assert.equal(r.coefficient, 0.02);
  assert.equal(r.reduction, 109.38);
  assert.equal(r.plafondIndividuel, 5469.1);
  /* Au plafond, 5 469,10 € : hors champ. */
  r = bord({ remuneration: 5469.1 });
  assert.equal(r.eligible, false);
  assert.equal(r.reduction, 0);
  /* Temps partiel 50 %, 4 000 € : plafond individuel 2 734,55 €. */
  r = bord({ heuresHebdo: 17.5, remuneration: 4000 });
  assert.equal(r.plafondIndividuel, 2734.55);
  assert.equal(r.reduction, 0);
  /* Forfait 217 jours puis 218 jours. */
  r = bord({ forfaitJours: 217, remuneration: 3000 });
  assert.equal(r.coefficient, 0.0985);
  assert.equal(r.reduction, 295.5);
  r = bord({ forfaitJours: 218, remuneration: 3000 });
  assert.equal(r.coefficient, 0.0999);
  assert.equal(r.reduction, 299.7);
  /* Caisse de congés payés, facteur 100/90 (calcul interne, hors périmètre de la page). */
  r = bord({ facteurB: 100 / 90, remuneration: 2500 });
  assert.equal(r.reduction, 477.5);
  /* Conducteur 45/35. */
  r = bord({ facteurA: 45 / 35, remuneration: 2500 });
  assert.equal(r.coefficient, 0.3383);
  assert.equal(r.reduction, 845.75);
  /* Au SMIC : coefficient maximal. */
  r = bord({ remuneration: SMIC });
  assert.equal(r.coefficient, 0.3981);
  assert.equal(r.reduction, 725.75);
});

/* ---------- Bornes ---------- */

test('au SMIC et sous le SMIC, le coefficient est plafonné à Tmin + Tdelta', () => {
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: SMIC }).coefficient, 0.3981);
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: 1500 }).coefficient, 0.3981);
  assert.equal(calculerMois({ fnal: 'fnal050', remuneration: SMIC }).coefficient, 0.4021);
  assert.equal(calculerMois({ fnal: 'fnal050', remuneration: 1200 }).coefficient, 0.4021);
});

test('seuil de sortie : strictement inférieur à 3 SMIC de référence, soit 5 469,10 € pour un temps plein', () => {
  const sous = calculerMois({ fnal: 'fnal050', remuneration: 5469.09 });
  assert.equal(sous.eligible, true);
  assert.equal(sous.coefficient, 0.02);
  assert.equal(sous.reduction, 109.38);
  const au = calculerMois({ fnal: 'fnal050', remuneration: 5469.1 });
  assert.equal(au.eligible, false);
  assert.equal(au.reduction, 0);
  const dessus = calculerMois({ fnal: 'fnal050', remuneration: 6000 });
  assert.equal(dessus.reduction, 0);
});

test('arrondis : coefficient à quatre décimales, montant au centime', () => {
  assert.equal(arrondir(0.24485, 4), 0.2449);
  assert.equal(arrondir(0.24484999, 4), 0.2448);
  /* Contre-exemples de la contre-vérification : rien ne doit monter à tort. */
  assert.equal(arrondir(0.12344999999999, 4), 0.1234);
  assert.equal(arrondir(1823.0349999999, 2), 1823.03);
  assert.equal(arrondir(-1.0049999999999, 2), -1);
  assert.equal(arrondir(-1.005, 2), -1.01);
  assert.equal(arrondir(1.005, 2), 1.01);
  assert.equal(arrondir(543.545, 2), 543.55);
  const c = coefficient(2200, SMIC, 0.3781);
  assert.equal(c.coefficient, 0.2448);
  assert.equal(String(c.coefficient).length <= 6, true);
});

/* ---------- BOSS, communiqué du 05/06/2026 ---------- */

test('BOSS : salarié au SMIC toute l\'année 2026, coefficients cumulés de la régularisation progressive', () => {
  const attendus = [0.3981, 0.3981, 0.3981, 0.3981, 0.3981, 0.3941, 0.3913, 0.3892, 0.3876, 0.3863, 0.3853, 0.3844];
  const mensuelJanvier = 12.02 * 1820 / 12;
  const mensuelJuin = 12.31 * 1820 / 12;
  let cumulRemu = 0, cumulSmic = 0, cumulReduction = 0;
  for (let mois = 1; mois <= 12; mois++) {
    const remu = mois <= 5 ? mensuelJanvier : mensuelJuin;
    const r = calculerMois({
      fnal: 'fnal010', remuneration: remu, methode: 'progressive',
      cumulRemuAnterieur: cumulRemu, cumulSmicAnterieur: cumulSmic, cumulSmicDecimales: 6, cumulReductionAnterieure: cumulReduction
    });
    assert.equal(r.etat, 'calcule');
    assert.equal(r.coefficient, attendus[mois - 1], 'mois ' + mois);
    cumulRemu += remu; cumulSmic += mensuelJanvier; cumulReduction += r.reduction;
    assert.equal(arrondir(cumulReduction, 2), r.reductionCumulee, 'cumul mois ' + mois);
  }
});

test('régularisation progressive : le mois vaut le cumul recalculé moins le déjà appliqué', () => {
  const janvier = calculerMois({ fnal: 'fnal010', remuneration: 2200 });
  const fevrier = calculerMois({
    fnal: 'fnal010', remuneration: 3200, methode: 'progressive',
    cumulRemuAnterieur: 2200, cumulSmicAnterieur: SMIC, cumulReductionAnterieure: janvier.reduction
  });
  const c = coefficient(5400, 2 * SMIC, 0.3781);
  assert.equal(fevrier.reductionCumulee, arrondir(5400 * c.coefficient, 2));
  assert.equal(fevrier.reduction, arrondir(fevrier.reductionCumulee - janvier.reduction, 2));
  assert.ok(fevrier.reduction < fevrier.reductionMoisIsole + 200);
});

test('régularisation progressive : un cumul qui atteint le plafond reprend la réduction déjà appliquée', () => {
  const r = calculerMois({
    fnal: 'fnal010', remuneration: 9000, methode: 'progressive',
    cumulRemuAnterieur: 2200, cumulSmicAnterieur: SMIC, cumulReductionAnterieure: 538.56
  });
  assert.equal(r.eligible, false);
  assert.equal(r.reductionCumulee, 0);
  assert.equal(r.reduction, -538.56);
});

/* ---------- États ---------- */

test('calcul incomplet : chaque donnée manquante est nommée', () => {
  let r = calculerMois({});
  assert.equal(r.etat, 'incomplet');
  assert.equal(r.manques.length, 2);
  r = calculerMois({ fnal: 'fnal010', remuneration: 2000, remuDue: 1500 });
  assert.equal(r.etat, 'incomplet');
  assert.match(r.manques[0], /absence/);
  r = calculerMois({ fnal: 'fnal010', remuneration: 2000, methode: 'progressive' });
  assert.equal(r.etat, 'incomplet');
  assert.equal(r.manques.length, 3);
  r = calculerMois({ fnal: 'fnal010', remuneration: NaN });
  assert.equal(r.etat, 'incomplet');
  const c = comparer(calculerMois({ fnal: 'fnal010', remuneration: 2000 }), NaN);
  assert.equal(c.etat, 'incomplet');
});

test('hors périmètre : chaque situation particulière est refusée avec sa raison', () => {
  for (const code of Object.keys(RGDU.SITUATIONS_HORS_PERIMETRE)) {
    const r = calculerMois({ fnal: 'fnal010', remuneration: 2000, situations: [code] });
    assert.equal(r.etat, 'hors_perimetre', code);
    assert.equal(r.raisons.length, 1);
    assert.equal(r.reduction, undefined);
  }
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: 2000, annee: 2025 }).etat, 'hors_perimetre');
});

test('hors périmètre : valeurs que le comparateur refuse de deviner', () => {
  const hp = (e) => calculerMois({ fnal: 'fnal010', remuneration: 2000, ...e }).etat;
  assert.equal(hp({ remuneration: 0 }), 'hors_perimetre');
  assert.equal(hp({ remuneration: -50 }), 'hors_perimetre');
  assert.equal(hp({ heuresHebdo: 39 }), 'hors_perimetre');
  assert.equal(hp({ heuresHebdo: 0 }), 'hors_perimetre');
  assert.equal(hp({ heuresSup: -2 }), 'hors_perimetre');
  assert.equal(hp({ forfaitJours: 230 }), 'hors_perimetre');
  assert.equal(hp({ forfaitJours: 200, heuresHebdo: 28 }), 'hors_perimetre');
  assert.equal(hp({ remuDue: 2500, remuTheorique: 2200 }), 'hors_perimetre');
  assert.equal(hp({ remuDue: 100, remuTheorique: 0 }), 'hors_perimetre');
  assert.equal(hp({ forfaitJours: 218, heuresSup: 7 }), 'hors_perimetre');
  assert.equal(hp({ remuDue: 1000, remuTheorique: 2000, heuresSup: 8 }), 'hors_perimetre');
  assert.equal(hp({ remuneration: 1e308 }), 'hors_perimetre');
  assert.equal(hp({ heuresSup: 1e308 }), 'hors_perimetre');
  assert.equal(hp({ situations: ['code_inconnu'] }), 'hors_perimetre');
  assert.equal(hp({ methode: 'progressive', cumulRemuAnterieur: 2000, cumulSmicAnterieur: 1823.03, cumulReductionAnterieure: -10 }), 'hors_perimetre');
});

/* ---------- Comparaison ---------- */

test('comparaison : aucun écart, paie supérieure, paie inférieure', () => {
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2200 });
  assert.equal(r.reduction, 538.56);
  assert.equal(comparer(r, 538.56).sens, 'aucun');
  assert.equal(comparer(r, 600).sens, 'paie_superieure');
  assert.equal(comparer(r, 600).ecart, 61.44);
  assert.equal(comparer(r, 457.78).sens, 'paie_inferieure');
  assert.equal(comparer(r, 457.78).ecart, -80.78);
});

test('comparaison : une paie calculée sur 151,67 heures est classée « écart lié à la base »', () => {
  const entree = { fnal: 'fnal010', heuresHebdo: 28, heuresSup: 8, remuneration: 1691.73 };
  const r = calculerMois(entree);
  assert.equal(r.reduction, 543.55);
  const base151 = r.variantes.find((v) => v.code === '151_67');
  assert.equal(base151.reduction, 543.72);
  const c = comparer(r, 543.72);
  assert.equal(c.sens, 'base');
  assert.match(pointsAVerifier(r, c, entree)[0], /151,67 heures. Cette base est une tolérance/);
  /* Loin du plafond, les variantes ne s'écartent que de quelques centimes. */
  for (const remu of [1500, 1823.03, 1900, 2200, 2750.5, 3300, 4100, 5469]) {
    const x = calculerMois({ fnal: 'fnal050', remuneration: remu });
    for (const v of x.variantes) assert.ok(Math.abs(v.reduction - x.reduction) < 0.6, remu + ' ' + v.code);
  }
});

test('comparaison : le résultat du classeur publié (base 1 823,03 €) est un écart lié à la base, pas une erreur', () => {
  /* Test de plafond du classeur : 5 469,09 € donne 0 € sur 1 823,03 €, et 109,38 € sur le douzième non arrondi. */
  const auPlafond = calculerMois({ fnal: 'fnal010', remuneration: 5469.09 });
  assert.equal(auPlafond.reduction, 109.38);
  assert.equal(auPlafond.variantes.map((v) => v.code + ':' + v.reduction).join(' '), '1823_03:0 151_67:109.38');
  const c = comparer(auPlafond, 0);
  assert.equal(c.ecart, -109.38);
  assert.equal(c.sens, 'base');
  assert.equal(c.concordeAvec.code, '1823_03');
  const pts = pointsAVerifier(auPlafond, c, {});
  assert.match(pts[0], /1 823,03 €/);
  assert.match(pts[0], /Cette concordance ne suffit pas à valider la paie/);
  assert.ok(!pts.some((p) => /15 %/.test(p)), 'pas de piste d\'abattement pour un écart de base');
  assert.equal(RGDU.LIBELLES_SENS.base, 'Compatible avec une autre base mensuelle');
});

test('arrondi du montant : un centime d\'écart reste « aucun écart »', () => {
  const r = calculerMois({ fnal: 'fnal010', heuresHebdo: 28, heuresSup: 8, remuneration: 1691.73 });
  assert.equal(comparer(r, 543.56).sens, 'aucun');
  assert.equal(comparer(r, 543.56).ecart, 0.01);
  assert.equal(comparer(r, 543.54).sens, 'aucun');
  assert.equal(comparer(r, 543.57).sens, 'paie_superieure');
  assert.equal(comparer(r, 543.53).sens, 'paie_inferieure');
});

test('points à vérifier : abattement de 15 % si la paie est inférieure', () => {
  const entree = { fnal: 'fnal010', remuneration: 2200 };
  const r = calculerMois(entree);
  const pts = pointsAVerifier(r, comparer(r, 457.78), entree);
  assert.ok(pts.some((p) => /15 %/.test(p)));
  assert.ok(pts.some((p) => /régularisation progressive/.test(p)));
});

/* ---------- Lot et export ---------- */

test('lot : lignes collées, séparateur point-virgule ou tabulation, nombres à la française', () => {
  const texte = [
    'Identifiant;Heures hebdo;Heures sup;Rémunération;Réduction en paie',
    'A01;28;8;1 691,73;633,38',
    'A02\t35\t0\t2200\t538,56',
    'A03;35;0;;120',
    'A04;39;0;2500;300',
    'A05;35;0;2000'
  ].join('\n');
  const lot = analyserLot(texte, { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(lot.length, 5);
  assert.equal(lot[0].resultat.reduction, 543.55);
  assert.equal(lot[0].comparaison.ecart, 89.83);
  assert.equal(lot[1].comparaison.sens, 'aucun');
  assert.equal(lot[2].resultat.etat, 'incomplet');
  assert.equal(lot[3].resultat.etat, 'hors_perimetre');
  assert.equal(lot[4].resultat.etat, 'incomplet');
});

test('lot sans taux de FNAL : calcul incomplet, jamais de valeur par défaut', () => {
  const lot = analyserLot('A01;35;0;2200;538,56', { confirmeOrdinaire: true });
  assert.equal(lot[0].resultat.etat, 'incomplet');
});

test('export CSV : en-tête, virgule décimale, formules neutralisées', () => {
  const lot = analyserLot('=CMD;35;0;2200;600\nB;35;0;;1', { fnal: 'fnal010', confirmeOrdinaire: true });
  const csv = versCsv(lot);
  const lignes = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(lignes.length, 3);
  assert.match(lignes[0], /^Identifiant;État;/);
  assert.match(lignes[1], /^'=CMD;Calculé;2200,00;1823,033333;0,2448;538,56;600,00;61,44;Paie supérieure au recalcul;/);
  assert.match(lignes[2], /Calcul incomplet/);
});

test('lecture des nombres : formats français, refus du texte', () => {
  assert.equal(lireNombre('1 823,03'), 1823.03);
  assert.equal(lireNombre('1 823,03 €'), 1823.03);
  assert.equal(lireNombre('2200'), 2200);
  assert.ok(Number.isNaN(lireNombre('')));
  assert.ok(Number.isNaN(lireNombre('deux mille')));
  assert.ok(Number.isNaN(lireNombre('1.823,03')));
  for (const faux of ['1823%', '12€34', '1\n2', '2 00', '1,823.03', '.5', '5,', '(100)', '\u2212100', '28h', '1 2345']) {
    assert.ok(Number.isNaN(lireNombre(faux)), faux);
  }
  assert.equal(lireNombre(' 2 035,71 € '), 2035.71);
  assert.equal(lireNombre('-538,56'), -538.56);
  assert.equal(lireNombre('17,5'), 17.5);
});

/* ---------- Points relevés par la contre-vérification ---------- */

test('seuil : une égalité mathématique ne devient jamais une éligibilité à cause du binaire', () => {
  /* 3 x 673,12 vaut 2019,3600000000001 en binaire. */
  const c = coefficient(2019.36, 673.12, 0.3781);
  assert.equal(c.eligible, false);
  assert.equal(c.coefficient, 0);
  /* Demi-mois : 12,02 x 1 820 / 12 x 1/2 x 3 = 2 734,55 exactement. */
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2734.55, remuDue: 1000, remuTheorique: 2000 });
  assert.equal(r.eligible, false);
  assert.equal(r.reduction, 0);
  /* Un centime sous le plafond reste éligible, au coefficient plancher. */
  const sous = calculerMois({ fnal: 'fnal010', remuneration: 2734.54, remuDue: 1000, remuTheorique: 2000 });
  assert.equal(sous.eligible, true);
  assert.equal(sous.coefficient, 0.02);
});

test('une valeur présente mais illisible rend le calcul incomplet, elle n\'est jamais remplacée', () => {
  const base = { fnal: 'fnal010', remuneration: 2000 };
  assert.equal(calculerMois({ ...base, remuDue: NaN, remuTheorique: NaN }).etat, 'incomplet');
  assert.equal(calculerMois({ ...base, remuDue: 1500, remuTheorique: NaN }).etat, 'incomplet');
  assert.equal(calculerMois({ ...base, forfaitJours: NaN }).etat, 'incomplet');
  assert.equal(calculerMois({ ...base, heuresHebdo: NaN }).etat, 'incomplet');
  assert.equal(calculerMois({ ...base, heuresSup: NaN }).etat, 'incomplet');
  assert.equal(calculerMois({ ...base, methode: 'annuelle' }).etat, 'incomplet');
  assert.equal(calculerMois({ ...base, annee: NaN }).etat, 'hors_perimetre');
  /* Les valeurs absentes restent admises. */
  assert.equal(calculerMois({ ...base, remuDue: '', remuTheorique: null, forfaitJours: undefined }).etat, 'calcule');
});

test('lot : sans confirmation du périmètre, aucune ligne n\'est calculée', () => {
  const lot = analyserLot('A01;35;0;2200;538,56', { fnal: 'fnal010' });
  assert.equal(lot[0].resultat.etat, 'incomplet');
  assert.match(lot[0].resultat.manques[0], /présents tout le mois/);
});

test('lot : une ligne illisible est gardée avec son diagnostic, jamais prise pour un en-tête', () => {
  const lot = analyserLot('Alice;28h;8;1.691,73;543,55\nBob;35;0;2000;629,40', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(lot.length, 2);
  assert.equal(lot[0].identifiant, 'Alice');
  assert.equal(lot[0].resultat.etat, 'incomplet');
  assert.equal(lot[1].comparaison.sens, 'aucun');
  /* En-tête reconnu à son libellé, même après une ligne vide. Six colonnes : refus. */
  const avecEnTete = analyserLot('\nIdentifiant;Heures;HS;Rémunération;Réduction\nA;35;0;2000;629,40\nB;35;0;2000;629,40;x', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(avecEnTete.length, 2);
  assert.equal(avecEnTete[0].ligneSource, 3);
  assert.equal(avecEnTete[1].resultat.etat, 'incomplet');
});

test('export CSV : retour chariot isolé, caractères de contrôle et réduction illisible', () => {
  const lot = analyserLot('ABC\r=1+1;35;0;2000;629,40\nC;35;0;2000;abc', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(lot.length, 3);
  const csv = versCsv(lot).replace('\ufeff', '');
  const lignes = csv.trim().split('\r\n');
  assert.equal(lignes.length, 4);
  assert.ok(!/\r(?!\n)/.test(csv), 'aucun retour chariot isolé');
  assert.match(lignes[2], /^'=1\+1;/);
  assert.match(lignes[3], /Calculé;.*;Réduction en paie illisible;/);
  assert.equal(versCsv([{ identifiant: 'a\u0007b\rc', resultat: { etat: 'incomplet', manques: ['x'] }, comparaison: {} }]).includes('a b c;'), true);
});

test('points à vérifier : l\'abattement de 15 % n\'est cité que s\'il peut expliquer l\'écart', () => {
  const entree = { fnal: 'fnal010', remuneration: 2200 };
  const r = calculerMois(entree);
  const a15 = (paie) => pointsAVerifier(r, comparer(r, paie), entree).some((p) => /15 %/.test(p));
  assert.equal(a15(457.78), true);    /* exactement 85 % */
  assert.equal(a15(500), true);
  assert.equal(a15(400), false);      /* sous 85 % : l'abattement ne suffit pas */
  assert.equal(a15(600), false);      /* paie supérieure */
  /* Reprise progressive négative : jamais d'abattement. */
  const prog = { fnal: 'fnal010', remuneration: 9000, methode: 'progressive', cumulRemuAnterieur: 2200, cumulSmicAnterieur: 1823.03, cumulReductionAnterieure: 538.56 };
  const rp = calculerMois(prog);
  assert.equal(pointsAVerifier(rp, comparer(rp, -600), prog).some((p) => /15 %/.test(p)), false);
});

test('points à vérifier : plafond des cotisations dues toujours rappelé quand une réduction est calculée', () => {
  const entree = { fnal: 'fnal010', remuneration: 2200 };
  const r = calculerMois(entree);
  assert.ok(pointsAVerifier(r, comparer(r, r.reduction), entree).some((p) => /effectivement dues/.test(p)));
  const hors = calculerMois({ fnal: 'fnal010', remuneration: 6000 });
  assert.ok(pointsAVerifier(hors, null, {}).some((p) => /cumul des rémunérations depuis janvier/.test(p)));
});

test('taux de FNAL : 7,29 € d\'écart au SMIC entre les deux valeurs de Tdelta', () => {
  const a = calculerMois({ fnal: 'fnal010', remuneration: 1823.03 }).reduction;
  const b = calculerMois({ fnal: 'fnal050', remuneration: 1823.03 }).reduction;
  assert.equal(a, 725.75);
  assert.equal(b, 733.04);
});

/* ---------- Second passage de la contre-vérification ---------- */

test('seuil exact : une rémunération réellement sous le plafond reste éligible', () => {
  /* Plafond exact 655,99000005 € : la rémunération de 655,99 € est en dessous. */
  const r = calculerMois({ fnal: 'fnal010', remuneration: 655.99, remuDue: 239.89, remuTheorique: 2000 });
  assert.equal(RGDU.exact, true);
  assert.equal(r.eligible, true);
  assert.equal(r.coefficient, 0.02);
  assert.equal(r.reduction, 13.12);
  /* Temps partiel 12 h et 4 heures complémentaires : SMIC 12,02 x 52 + 48,08 = 673,12 €, plafond exact 2 019,36 €. */
  const tp = calculerMois({ fnal: 'fnal010', heuresHebdo: 12, heuresSup: 4, remuneration: 2019.35 });
  assert.equal(tp.eligible, true);
  assert.equal(calculerMois({ fnal: 'fnal010', heuresHebdo: 12, heuresSup: 4, remuneration: 2019.36 }).eligible, false);
});

test('montants : produit rémunération x coefficient arrondi sans binaire', () => {
  /* 1 075 x 0,3981 = 427,9575 : au centime, 427,96. */
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: 1075 }).reduction, 427.96);
  /* 2 250 x 0,0222... : contrôle croisé avec un calcul en centimes entiers. */
  for (const remu of [1823.03, 1999.99, 2200, 2345.67, 3001.5, 4100.25]) {
    const r = calculerMois({ fnal: 'fnal050', remuneration: remu });
    const attendu = Math.floor((Math.round(remu * 100) * Math.round(r.coefficient * 10000) + 5000) / 10000) / 100;
    assert.equal(r.reduction, attendu, String(remu));
  }
});

test('régularisation progressive : le SMIC de référence se reporte avec ses décimales', () => {
  const janvier = calculerMois({ fnal: 'fnal010', heuresHebdo: 28, remuneration: 1800 });
  assert.equal(janvier.reduction, 414.72);
  /* 12,02 x 1 820 / 12 x 28/35 = 1 458,42666... : affiché 1 458,43 €, reporté à six décimales. */
  assert.equal(janvier.smicReference, 1458.43);
  assert.equal(arrondir(janvier.smicReferenceExact, 6), 1458.426667);
  const fevrier = calculerMois({
    fnal: 'fnal010', heuresHebdo: 28, remuneration: 1701.22, methode: 'progressive',
    cumulRemuAnterieur: 1800, cumulSmicAnterieur: 1458.426667, cumulSmicDecimales: 6, cumulReductionAnterieure: 414.72
  });
  assert.equal(fevrier.coefficient, 0.2484);
  assert.equal(fevrier.reduction, 454.98);
  assert.equal(arrondir(fevrier.cumulSmicReferenceExact, 4), 2916.8533);
});

test('lot : un salarié dont l\'identifiant vaut « ID » n\'est pas pris pour un en-tête', () => {
  const lot = analyserLot('ID;35;0;2200;538,56\nBob;35;0;2200;538,56', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(lot.length, 2);
  assert.equal(lot[0].identifiant, 'ID');
  assert.equal(lot[0].comparaison.sens, 'aucun');
});

test('comparaison : un montant de paie démesuré n\'est pas comparé', () => {
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2200 });
  assert.equal(comparer(r, 1e308).etat, 'incomplet');
  assert.equal(comparer(r, Infinity).etat, 'incomplet');
});

test('abattement de 15 % : jamais cité en régularisation progressive', () => {
  const e = { fnal: 'fnal010', remuneration: 2200, methode: 'progressive', cumulRemuAnterieur: 2200, cumulSmicAnterieur: 1823.03, cumulReductionAnterieure: 538.56 };
  const r = calculerMois(e);
  assert.equal(r.reduction, 538.56);
  assert.equal(pointsAVerifier(r, comparer(r, 500), e).some((p) => /15 %/.test(p)), false);
});

test('absence : les indemnités journalières sont rappelées dans les points à vérifier', () => {
  const e = { fnal: 'fnal010', remuneration: 2035.71, remuDue: 1885.71, remuTheorique: 2200 };
  const pts = pointsAVerifier(calculerMois(e), null, e);
  assert.ok(pts.some((p) => /subrogation/.test(p)));
  assert.ok(pts.some((p) => /avant plafonnement/.test(p)));
});

/* ---------- Troisième passage de la contre-vérification ---------- */

test('progressif : le cumul de rémunération reste exact jusqu\'au seuil et au montant', () => {
  /* 70 787,25 + 3 000 = 73 787,25 = 3 x (22 772,72 + 1 823,03) : égalité, donc aucun droit...
     mais à moins d'un centime du plafond, le comparateur refuse de trancher. */
  const egal = calculerMois({ fnal: 'fnal010', remuneration: 3000, methode: 'progressive',
    cumulRemuAnterieur: 70787.25, cumulSmicAnterieur: 22772.72, cumulReductionAnterieure: 0 });
  assert.equal(egal.etat, 'hors_perimetre');
  assert.match(egal.raisons[0], /dernières décimales du SMIC de référence cumulé/);
  /* Avec un SMIC cumulé de 22 773 €, le droit existe : 73 787,25 x 0,0200 = 1 475,745, soit 1 475,75 €. */
  const sous = calculerMois({ fnal: 'fnal010', remuneration: 3000, methode: 'progressive',
    cumulRemuAnterieur: 70787.25, cumulSmicAnterieur: 22773, cumulSmicDecimales: 2, cumulReductionAnterieure: 0 });
  assert.equal(sous.eligible, true);
  assert.equal(sous.coefficient, 0.02);
  assert.equal(sous.reductionCumulee, 1475.75);
});

test('progressif : un SMIC cumulé reporté avec six décimales ne fabrique pas un droit au plafond', () => {
  /* Janvier, demi-mois : SMIC 911,51666... reporté 911,516667. En février, le cumul de rémunération
     (1 823,03 + 6 380,62 = 8 203,65) égale exactement trois SMIC cumulés : aucun droit ne doit sortir. */
  const janvier = calculerMois({ fnal: 'fnal010', remuneration: 1823.03, remuDue: 1000, remuTheorique: 2000 });
  assert.equal(janvier.etat, 'calcule');
  assert.equal(janvier.reduction, 97.35);
  const fevrier = calculerMois({ fnal: 'fnal010', remuneration: 6380.62, methode: 'progressive',
    cumulRemuAnterieur: 1823.03, cumulSmicAnterieur: 911.516667, cumulSmicDecimales: 6, cumulReductionAnterieure: janvier.reduction });
  assert.equal(fevrier.etat, 'hors_perimetre');
});

test('valeurs extrêmes des montants d\'absence : jamais d\'exception', () => {
  const base = { fnal: 'fnal010', remuneration: 2000 };
  assert.equal(calculerMois({ ...base, remuDue: 1e-13, remuTheorique: 1e-13 }).etat, 'hors_perimetre');
  assert.equal(calculerMois({ ...base, remuDue: 1e21, remuTheorique: 1e21 }).etat, 'hors_perimetre');
  assert.equal(calculerMois({ ...base, remuDue: 0, remuTheorique: 0.01 }).etat, 'calcule');
  assert.equal(calculerMois({ ...base, heuresSup: 1e-7 }).etat, 'calcule');
  assert.equal(calculerMois({ ...base, remuneration: 1e-7 }).etat, 'calcule');
});

test('lot : une ligne « ID » malformée est gardée avec son diagnostic', () => {
  const lot = analyserLot('ID;illisible;0;illisible;100', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(lot.length, 1);
  assert.equal(lot[0].resultat.etat, 'incomplet');
  const enTete = analyserLot('Matricule;Heures hebdo;Heures sup;Rémunération brute;Réduction en paie\nA;35;0;2200;538,56', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(enTete.length, 1);
  assert.equal(enTete[0].identifiant, 'A');
});

test('points à vérifier : le plafond rappelle la règle propre au chômage minoré', () => {
  const e = { fnal: 'fnal010', remuneration: 2200 };
  const r = calculerMois(e);
  const pts = pointsAVerifier(r, comparer(r, 600), e);
  assert.ok(pts.some((p) => /minoration du taux d'assurance chômage résultant du bonus-malus/.test(p)));
  assert.ok(pts.some((p) => /liée au bonus-malus ne modifie pas Tdelta/.test(p)));
});

/* ---------- Quatrième passage de la contre-vérification ---------- */

test('progressif : un report dont les décimales font basculer le coefficient est refusé', () => {
  /* Cumul de SMIC saisi au centime (1 823,03) : à 2 000,25 € de rémunération, le coefficient
     vaut 0,3146 ou 0,3145 selon les décimales perdues. Aucun montant n'est rendu. */
  const m2 = (decimales) => calculerMois({ fnal: 'fnal010', remuneration: 2000.25, methode: 'progressive',
    cumulRemuAnterieur: 2000, cumulSmicAnterieur: 1823.03, cumulSmicDecimales: decimales, cumulReductionAnterieure: 0 });
  assert.equal(m2(2).etat, 'hors_perimetre');
  assert.match(m2(2).raisons[0], /plus de décimales/);
  /* Saisi « 1 823,030000 », le cumul est connu : le résultat sort. */
  assert.equal(m2(6).coefficient, 0.3146);
  assert.equal(m2(6).reduction, 1258.48);
  /* 6 000 € contre un plafond cumulé de 6 000,0175 € : sous le plafond sans ambiguïté à quatre décimales. */
  const pres = calculerMois({ fnal: 'fnal010', remuneration: 3000, methode: 'progressive',
    cumulRemuAnterieur: 3000, cumulSmicAnterieur: 176.9725, cumulReductionAnterieure: 0 });
  assert.equal(pres.etat, 'calcule');
  assert.equal(pres.eligible, true);
  assert.equal(pres.reduction, 120);
  /* Le même cumul saisi au centime laisse l'éligibilité incertaine. */
  const flou = calculerMois({ fnal: 'fnal010', remuneration: 3000, methode: 'progressive',
    cumulRemuAnterieur: 3000, cumulSmicAnterieur: 176.97, cumulReductionAnterieure: 0 });
  assert.equal(flou.etat, 'hors_perimetre');
});

test('forfait en jours inférieur à 1 : refusé', () => {
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: 2, forfaitJours: 0.5 }).etat, 'hors_perimetre');
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: 3000, forfaitJours: 1 }).etat, 'calcule');
});

test('lot : une ligne de salarié avec des unités n\'est jamais prise pour un en-tête', () => {
  const lot = analyserLot('ID;35 heures;0 heures;2200 EUR;538 EUR', { fnal: 'fnal010', confirmeOrdinaire: true });
  assert.equal(lot.length, 1);
  assert.equal(lot[0].resultat.etat, 'incomplet');
});

/* ---------- Cinquième passage de la contre-vérification ---------- */

test('progressif : un SMIC cumulé saisi sans décimale porte une incertitude de 0,50 €', () => {
  /* « 1823 » peut valoir 1 822,51 € : le droit de 218,76 € n'est pas certain. */
  const e = { fnal: 'fnal010', remuneration: 5000, methode: 'progressive',
    cumulRemuAnterieur: 5938, cumulSmicAnterieur: 1823, cumulReductionAnterieure: 0 };
  assert.equal(calculerMois(e).etat, 'hors_perimetre');
  assert.equal(calculerMois({ ...e, cumulSmicDecimales: 0 }).etat, 'hors_perimetre');
  /* Saisi « 1 823,00 », le cumul est connu au centime : le résultat sort. */
  const r = calculerMois({ ...e, cumulSmicDecimales: 2 });
  assert.equal(r.etat, 'calcule');
  assert.equal(r.reduction, 218.76);
  /* Premier mois : des cumuls nuls sont exacts. */
  assert.equal(calculerMois({ fnal: 'fnal010', remuneration: 2200, methode: 'progressive',
    cumulRemuAnterieur: 0, cumulSmicAnterieur: 0, cumulReductionAnterieure: 0 }).reduction, 538.56);
});

/* ---------- Décisions de Sabrina du 11/11/2026 ---------- */

test('base mensuelle : douzième non arrondi de 1 820 x 12,02 €, seuil mensuel 5 469,10 €', () => {
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2200 });
  assert.equal(r.smicReference, 1823.03);
  assert.equal(arrondir(r.smicReferenceExact, 6), 1823.033333);
  assert.equal(r.plafondIndividuel, 5469.1);
  assert.equal(RGDU.PARAMETRES_2026.smicMensuelExact.join(' '), '12.02 1820 12');
});

test('CDD renouvelé ou transformé en CDI : cumuls poursuivis (BOSS § 1080), plus de situation hors périmètre', () => {
  assert.equal(RGDU.SITUATIONS_HORS_PERIMETRE.cdd_cdi, undefined);
  const e = { fnal: 'fnal010', remuneration: 2200, methode: 'progressive', cumulRemuAnterieur: 2200, cumulSmicAnterieur: 1823.033333, cumulSmicDecimales: 6, cumulReductionAnterieure: 538.56 };
  const x = calculerMois(e);
  assert.equal(x.etat, 'calcule');
  const pts = pointsAVerifier(x, comparer(x, 600), e);
  assert.ok(pts.some((p) => /CDD renouvelé ou transformé en CDI poursuit ses cumuls dans la limite de l'année civile, un nouveau CDD distinct repart de zéro/.test(p)));
});

test('mois isolé au plafond : réduction nulle sur le mois, renvoi au cumul et à l\'année', () => {
  const e = { fnal: 'fnal010', remuneration: 5469.10 };
  const x = calculerMois(e);
  assert.equal(x.eligible, false);
  assert.equal(x.reduction, 0);
  const pts = pointsAVerifier(x, comparer(x, 0), e);
  assert.ok(pts.some((p) => /calculée sur ce seul mois, la réduction est nulle/.test(p) && /Le droit définitif se juge sur l'année/.test(p)));
});

test('phrases des situations hors périmètre : alignées sur les textes lus', () => {
  const S = RGDU.SITUATIONS_HORS_PERIMETRE;
  assert.match(S.interim, /multiplié par 1,1 lorsque l'indemnité compensatrice de congés payés est due/);
  assert.match(S.caisse_conges, /multiplié par 100\/90/);
  assert.match(S.forfait_heures, /1 607 heures/);
  assert.match(S.mayotte, /la formule, le seuil et le SMIC sont différents/);
  assert.match(S.apres_rupture, /Aucune réduction n'est calculée sur une somme rattachée à une période postérieure à la rupture/);
});

test('plafond des cotisations dues : apprécié sur l\'année', () => {
  const e = { fnal: 'fnal010', remuneration: 2200 };
  const r = calculerMois(e);
  assert.ok(pointsAVerifier(r, null, e).some((p) => /effectivement dues sur l'année/.test(p)));
});

test('progressif : une paie calculée sur une autre base mensuelle est reconnue aussi', () => {
  const zero = { methode: 'progressive', cumulRemuAnterieur: 0, cumulSmicAnterieur: 0, cumulReductionAnterieure: 0 };
  /* 5 469,09 € : 0 € sur la base 1 823,03 €, 109,38 € sur le douzième non arrondi. */
  const r = calculerMois({ fnal: 'fnal010', remuneration: 5469.09, ...zero });
  assert.equal(r.reduction, 109.38);
  const c = comparer(r, 0);
  assert.equal(c.sens, 'base');
  assert.equal(c.concordeAvec.code, '1823_03');
  /* Temps partiel avec heures complémentaires : 543,72 € sur 151,67 heures. */
  const tp = calculerMois({ fnal: 'fnal010', heuresHebdo: 28, heuresSup: 8, remuneration: 1691.73, ...zero });
  assert.equal(tp.reduction, 543.55);
  assert.equal(comparer(tp, 543.72).sens, 'base');
  assert.equal(comparer(tp, 543.72).concordeAvec.code, '151_67');
  /* La tolérance d'un centime vaut aussi pour une variante, après la priorité à « aucun écart ». */
  assert.equal(comparer(tp, 543.73).sens, 'base');
  assert.equal(comparer(tp, 543.56).sens, 'aucun');
  assert.equal(comparer(tp, 600).sens, 'paie_superieure');
});

test('progressif : une variante instable sous l\'incertitude du cumul reporté n\'affirme aucune compatibilité', () => {
  const e = { fnal: 'fnal010', methode: 'progressive', remuneration: 2200, cumulRemuAnterieur: 2200, cumulSmicAnterieur: 1823.263327, cumulSmicDecimales: 6, cumulReductionAnterieure: 538.56 };
  const x = calculerMois(e);
  assert.equal(x.etat, 'calcule');
  assert.equal(x.reduction, 539);
  assert.equal(x.variantesInstables, true);
  const c = comparer(x, 538.56);
  assert.notEqual(c.sens, 'base');
  assert.ok(pointsAVerifier(x, c, e).some((p) => /dépend des dernières décimales du SMIC cumulé/.test(p)));
});

test('progressif : la compatibilité avec une autre base rappelle que seul le mois courant change de base', () => {
  const zero = { fnal: 'fnal010', methode: 'progressive', remuneration: 5469.09, cumulRemuAnterieur: 0, cumulSmicAnterieur: 0, cumulReductionAnterieure: 0 };
  const x = calculerMois(zero);
  const c = comparer(x, 0);
  assert.equal(c.sens, 'base');
  assert.ok(pointsAVerifier(x, c, zero).some((p) => /change seulement la base du mois courant/.test(p)));
});

/* ---------- Contre-lecture indépendante du 11/11/2026 : cas limites ---------- */

test('mois isolé positif : rappel que l\'éligibilité s\'apprécie aussi sur le cumul depuis janvier', () => {
  /* Cinq mois à 7 000 € puis un mois à 4 000 € : le mois isolé rend une réduction, la progressive rend 0. */
  const isole = { fnal: 'fnal010', remuneration: 4000 };
  const x = calculerMois(isole);
  assert.ok(x.reduction > 0);
  const pts = pointsAVerifier(x, null, isole);
  assert.ok(pts.some((p) => /Des rémunérations élevées les mois précédents peuvent annuler la réduction de ce mois/.test(p)));
  const prog = { fnal: 'fnal010', methode: 'progressive', remuneration: 4000, cumulRemuAnterieur: 35000, cumulSmicAnterieur: 9115.166667, cumulSmicDecimales: 6, cumulReductionAnterieure: 0 };
  const y = calculerMois(prog);
  assert.equal(y.etat, 'calcule');
  assert.equal(y.eligible, false);
  assert.equal(y.reduction, 0);
});

test('décembre ou dernier mois du contrat : hors périmètre en mois isolé, calculé en progressive', () => {
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2200, situations: ['regularisation_annuelle'] });
  assert.equal(r.etat, 'hors_perimetre');
  assert.match(r.raisons[0], /porte la régularisation de l'année ou du contrat/);
  const p = calculerMois({ fnal: 'fnal010', methode: 'progressive', remuneration: 2200, cumulRemuAnterieur: 24200, cumulSmicAnterieur: 20053.366667, cumulSmicDecimales: 6, cumulReductionAnterieure: 5900, situations: ['regularisation_annuelle'] });
  assert.equal(p.etat, 'calcule');
  /* Sans la case, tout mois isolé positif porte l'avertissement. */
  const e = { fnal: 'fnal010', remuneration: 2200 };
  assert.ok(pointsAVerifier(calculerMois(e), null, e).some((x) => /décembre ou le dernier mois du contrat/.test(x)));
});

test('entrée ou sortie : rappel des indemnités de rupture à retirer et renvoi vers la progressive', () => {
  const e = { fnal: 'fnal010', remuneration: 1100, remuDue: 1100, remuTheorique: 2200 };
  const x = calculerMois(e);
  assert.equal(x.etat, 'calcule');
  const pts = pointsAVerifier(x, null, e);
  assert.ok(pts.some((p) => /indemnité compensatrice de congés payés et l'indemnité de fin de contrat/.test(p)));
  assert.ok(pts.some((p) => /entrent dans la rémunération due/.test(p)));
});

test('changement de durée contractuelle en cours de mois : hors périmètre', () => {
  const r = calculerMois({ fnal: 'fnal010', remuneration: 2200, situations: ['changement_duree'] });
  assert.equal(r.etat, 'hors_perimetre');
  assert.match(r.raisons[0], /ne retient qu'une durée par mois/);
});

test('taux réduits : salarié expatrié cité, règle de D. 241-7, III reprise, plus de mention du taux AT-MP', () => {
  const t = RGDU.SITUATIONS_HORS_PERIMETRE.taux_reduits;
  assert.match(t, /salarié expatrié/);
  assert.match(t, /somme des taux des cotisations et contributions effectivement à la charge de l'employeur est inférieure à Tmin \+ Tdelta/);
  assert.doesNotMatch(t, /AT-MP/);
});
