const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/delai-remboursement.js');

const { SITUATIONS: S, ETATS: E } = D;
const JOUR = '2026-11-11';

/* Contexte dans le périmètre : cotisations visées, pas de contrôle, pas de demande. */
const DANS = { natureConfirmee: true, redressement: false, demandeDejaFaite: false };
const erreur = (datePaiement, plus) => Object.assign({ situation: S.ERREUR, datePaiement }, DANS, plus);

/* ---------- Dates ---------- */

test('dates : une date qui n\'existe pas est refusée', () => {
  assert.equal(D.lireDate('2025-02-29'), null);
  assert.equal(D.lireDate('2025-04-31'), null);
  assert.equal(D.lireDate('2025-13-01'), null);
  assert.equal(D.lireDate('15/03/2025'), null);
  assert.equal(D.lireDate(''), null);
  assert.equal(D.lireDate(20250315), null);
  assert.deepEqual(D.lireDate('2024-02-29'), { a: 2024, m: 2, j: 29 });
});

test('dates : les années hors du domaine 1900 à 2100 sont refusées', () => {
  assert.equal(D.lireDate('0096-01-01'), null);
  assert.equal(D.lireDate('0000-01-01'), null);
  assert.equal(D.lireDate('1899-12-31'), null);
  assert.equal(D.lireDate('2101-01-01'), null);
  assert.equal(D.lireDate('9999-12-31'), null);
  assert.notEqual(D.lireDate('1900-01-01'), null);
  assert.notEqual(D.lireDate('2100-12-31'), null);
});

test('dates : une échéance au-delà de 2100 ne fausse pas le verdict (les bornes visent les saisies)', () => {
  const r = D.evaluerLigne(erreur('2100-12-31'), '2100-12-31');
  assert.equal(r.dateLimite, '2103-12-31');
  assert.equal(r.etat, E.RECLAMABLE); // le verdict vient d'une comparaison de dates, pas d'une relecture
  assert.equal(D.lireDate(r.dateLimite), null); // une échéance hors du domaine de saisie n'est pas une saisie valide
});

test('dates : années bissextiles, règle des siècles comprise', () => {
  assert.equal(D.estBissextile(2024), true);
  assert.equal(D.estBissextile(2028), true);
  assert.equal(D.estBissextile(2025), false);
  assert.equal(D.estBissextile(2100), false);
  assert.equal(D.estBissextile(2000), true);
});

test('dates : le nombre de jours ne dépend d\'aucun fuseau ni changement d\'heure', () => {
  assert.equal(D.joursEntre(D.lireDate('2026-03-28'), D.lireDate('2026-03-30')), 2); // heure d'été
  assert.equal(D.joursEntre(D.lireDate('2026-10-24'), D.lireDate('2026-10-26')), 2); // heure d'hiver
  assert.equal(D.joursEntre(D.lireDate('2024-02-28'), D.lireDate('2024-03-01')), 2); // bissextile
  assert.equal(D.joursEntre(D.lireDate('2025-02-28'), D.lireDate('2025-03-01')), 1);
});

/* ---------- R1, R2 : trois ans à compter du paiement ---------- */

test('R1 : le terme est la date anniversaire du paiement, trois ans plus tard', () => {
  assert.equal(D.ecrireDate(D.termeDelai(D.lireDate('2023-03-15'))), '2026-03-15');
  assert.equal(D.ecrireDate(D.termeDelai(D.lireDate('2023-12-31'))), '2026-12-31');
  assert.equal(D.ecrireDate(D.termeDelai(D.lireDate('2024-01-05'))), '2027-01-05');
});

test('R2 : la veille du terme, le délai n\'est pas expiré', () => {
  const r = D.evaluerLigne(erreur('2023-11-12'), JOUR);
  assert.equal(r.etat, E.RECLAMABLE);
  assert.equal(r.dateLimite, '2026-11-12');
  assert.equal(r.joursRestants, 1);
  assert.deepEqual(r.regles, ['R1', 'R2']);
});

test('R2 : le jour anniversaire est le dernier jour du délai', () => {
  const r = D.evaluerLigne(erreur('2023-11-11'), JOUR);
  assert.equal(r.etat, E.DERNIER_JOUR);
  assert.equal(r.dateLimite, '2026-11-11');
  assert.equal(r.joursRestants, 0);
});

test('R2 : le lendemain du jour anniversaire, le délai est expiré', () => {
  const r = D.evaluerLigne(erreur('2023-11-10'), JOUR);
  assert.equal(r.etat, E.HORS_DELAI);
  assert.equal(r.dateLimite, '2026-11-10');
  assert.equal(r.joursRestants, -1);
});

test('R2 : aucun report quand le terme tombe un samedi, un dimanche ou un jour férié', () => {
  // 7 novembre 2026 : samedi. Le dimanche 8, le délai est expiré.
  assert.equal(D.evaluerLigne(erreur('2023-11-07'), '2026-11-07').etat, E.DERNIER_JOUR);
  assert.equal(D.evaluerLigne(erreur('2023-11-07'), '2026-11-08').etat, E.HORS_DELAI);
  assert.equal(D.evaluerLigne(erreur('2023-11-07'), '2026-11-09').etat, E.HORS_DELAI); // lundi
  // 11 novembre 2026 : jour férié. Le 12, le délai est expiré.
  assert.equal(D.evaluerLigne(erreur('2023-11-11'), '2026-11-12').etat, E.HORS_DELAI);
});

test('R1 : un paiement fait aujourd\'hui laisse trois ans', () => {
  const r = D.evaluerLigne(erreur('2026-11-11'), JOUR);
  assert.equal(r.etat, E.RECLAMABLE);
  assert.equal(r.dateLimite, '2029-11-11');
  assert.equal(r.joursRestants, 1096); // 2028 est bissextile
});

test('R1 : chaque paiement a son propre terme', () => {
  const r = D.evaluerLignes([erreur('2023-10-05'), erreur('2023-12-05'), erreur('2024-01-15')], JOUR);
  assert.deepEqual(r.map((x) => x.etat), [E.HORS_DELAI, E.RECLAMABLE, E.RECLAMABLE]);
  assert.deepEqual(r.map((x) => x.dateLimite), ['2026-10-05', '2026-12-05', '2027-01-15']);
});

test('R1 : fin de mois, bornes au jour près', () => {
  assert.equal(D.evaluerLigne(erreur('2023-01-31'), '2026-01-30').etat, E.RECLAMABLE);
  assert.equal(D.evaluerLigne(erreur('2023-01-31'), '2026-01-31').etat, E.DERNIER_JOUR);
  assert.equal(D.evaluerLigne(erreur('2023-01-31'), '2026-02-01').etat, E.HORS_DELAI);
});

/* ---------- R2 bis : paiement du 29 février ---------- */

test('R2 bis : un paiement du 29 février donne un terme au 28 février, signalé dans le résultat', () => {
  const conv = D.evaluerLigne(erreur('2024-02-29'), '2026-11-11');
  assert.equal(conv.fevrier29, true);
  assert.deepEqual(conv.regles, ['R1', 'R2', 'R2 bis']);
  assert.equal(D.evaluerLigne(erreur('2024-02-28'), '2026-11-11').fevrier29, undefined);
  assert.equal(D.ecrireDate(D.termeDelai(D.lireDate('2024-02-29'))), '2027-02-28');
  assert.equal(D.evaluerLigne(erreur('2024-02-29'), '2027-02-27').etat, E.RECLAMABLE);
  assert.equal(D.evaluerLigne(erreur('2024-02-29'), '2027-02-28').etat, E.DERNIER_JOUR);
  assert.equal(D.evaluerLigne(erreur('2024-02-29'), '2027-03-01').etat, E.HORS_DELAI);
});

test('R2 bis : un paiement du 28 février garde le 28 février, même vers une année bissextile', () => {
  assert.equal(D.ecrireDate(D.termeDelai(D.lireDate('2025-02-28'))), '2028-02-28');
});

/* ---------- R10 : domaine historique ---------- */

test('R10 : un paiement antérieur au 1er janvier 2015 n\'est pas calculé', () => {
  const r = D.evaluerLigne(erreur('2014-12-31'), JOUR);
  assert.equal(r.etat, E.HORS_PERIMETRE);
  assert.equal(r.motif, 'paiement_ancien');
  assert.equal(r.dateLimite, null);
  assert.equal(D.evaluerLigne(erreur('2000-01-15'), JOUR).etat, E.HORS_PERIMETRE);
  const borne = D.evaluerLigne(erreur('2015-01-01'), JOUR);
  assert.equal(borne.etat, E.HORS_DELAI);
  assert.equal(borne.dateLimite, '2018-01-01');
});

/* ---------- Conditions de périmètre : jamais de réponse favorable par défaut ---------- */

test('périmètre : une réponse inconnue empêche tout calcul', () => {
  const base = { situation: S.ERREUR, datePaiement: '2025-01-15' };
  assert.equal(D.evaluerLigne(base, JOUR).motif, 'nature');
  assert.equal(D.evaluerLigne(Object.assign({}, base, { natureConfirmee: true }), JOUR).motif, 'redressement');
  assert.equal(D.evaluerLigne(Object.assign({}, base, { natureConfirmee: true, redressement: false }), JOUR).motif, 'demande');
  for (const r of [D.evaluerLigne(base, JOUR)]) {
    assert.equal(r.etat, E.MANQUANT);
    assert.equal(r.dateLimite, null);
  }
});

test('périmètre : une valeur qui n\'est pas un vrai oui ou non est une information manquante', () => {
  for (const v of ['true', 'false', 1, 0, null, undefined, 'non']) {
    const r = D.evaluerLigne(erreur('2025-01-15', { demandeDejaFaite: v }), JOUR);
    assert.equal(r.etat, E.MANQUANT, String(v));
    assert.equal(r.motif, 'demande');
  }
  assert.equal(D.evaluerLigne(erreur('2025-01-15', { natureConfirmee: 'oui' }), JOUR).motif, 'nature');
  assert.equal(D.evaluerLigne(erreur('2025-01-15', { redressement: 'non' }), JOUR).motif, 'redressement');
});

test('périmètre : autre contribution, contrôle, demande déjà faite', () => {
  const a = D.evaluerLigne(erreur('2025-01-15', { natureConfirmee: false }), JOUR);
  assert.equal(a.etat, E.HORS_PERIMETRE);
  assert.equal(a.motif, 'autre_contribution');
  assert.deepEqual(a.regles, ['R9']);
  const c = D.evaluerLigne(erreur('2025-01-15', { redressement: true }), JOUR);
  assert.equal(c.motif, 'controle');
  assert.deepEqual(c.regles, ['R8']);
  const d = D.evaluerLigne(erreur('2020-01-15', { demandeDejaFaite: true }), JOUR);
  assert.equal(d.motif, 'demande_deja_faite');
  assert.deepEqual(d.regles, ['R7']);
  for (const r of [a, c, d]) assert.equal(r.dateLimite, null);
});

test('périmètre : les conditions passent avant la situation, même pour une décision de justice', () => {
  const r = D.evaluerLigne(Object.assign({ situation: S.NON_CONFORMITE, dateDecision: '2026-06-18' }, DANS, { redressement: true }), JOUR);
  assert.equal(r.etat, E.HORS_PERIMETRE);
  assert.equal(r.motif, 'controle');
});

/* ---------- Information manquante ---------- */

test('manquant : sans situation, sans date, ou avec une date impossible', () => {
  assert.equal(D.evaluerLigne({}, JOUR).motif, 'situation');
  assert.equal(D.evaluerLigne(Object.assign({ situation: 'inconnue' }, DANS), JOUR).etat, E.MANQUANT);
  assert.equal(D.evaluerLigne(erreur(''), JOUR).motif, 'date_paiement');
  assert.equal(D.evaluerLigne(erreur(undefined), JOUR).etat, E.MANQUANT);
  assert.equal(D.evaluerLigne(erreur('2025-02-30'), JOUR).motif, 'date_paiement_invalide');
  assert.equal(D.evaluerLigne(erreur('0096-01-01'), '2026-11-11').motif, 'date_paiement_invalide');
});

test('manquant : une date de paiement future n\'est pas calculée', () => {
  const r = D.evaluerLigne(erreur('2026-11-12'), JOUR);
  assert.equal(r.etat, E.MANQUANT);
  assert.equal(r.motif, 'date_paiement_future');
  assert.equal(r.dateLimite, null);
});

test('une date du jour invalide est une erreur de programme, pas un résultat', () => {
  assert.throws(() => D.evaluerLigne(erreur('2024-01-01'), 'demain'));
  assert.throws(() => D.evaluerLigne(erreur('2024-01-01'), '0100-01-01'));
});

/* ---------- R3 : décision de justice révélant une non-conformité ---------- */

const nonConf = (dateDecision) => Object.assign({ situation: S.NON_CONFORMITE, dateDecision }, DANS);

test('R3 : le seuil est le 1er janvier de la troisième année avant celle de la décision', () => {
  assert.equal(D.ecrireDate(D.seuilPeriode(D.lireDate('2026-06-18'))), '2023-01-01');
  assert.equal(D.ecrireDate(D.seuilPeriode(D.lireDate('2026-01-01'))), '2023-01-01');
  assert.equal(D.ecrireDate(D.seuilPeriode(D.lireDate('2025-12-31'))), '2022-01-01');
});

test('R3 : l\'outil rappelle le seuil et ne classe aucune période', () => {
  const r = D.evaluerLigne(nonConf('2026-06-18'), JOUR);
  assert.equal(r.etat, E.INFORMATION);
  assert.equal(r.dateSeuil, '2023-01-01');
  assert.equal(r.dateLimite, null);
  assert.deepEqual(r.regles, ['R3']);
  // Une décision ancienne ne produit jamais de réponse favorable : seulement le rappel.
  assert.equal(D.evaluerLigne(nonConf('2016-06-18'), JOUR).etat, E.INFORMATION);
});

test('R3 : date de décision manquante, impossible ou future', () => {
  assert.equal(D.evaluerLigne(nonConf(''), JOUR).motif, 'date_decision');
  assert.equal(D.evaluerLigne(nonConf('2026-02-30'), JOUR).motif, 'date_decision_invalide');
  assert.equal(D.evaluerLigne(nonConf('2027-01-01'), JOUR).motif, 'date_decision_future');
});

/* ---------- R4 et R6 ---------- */

test('R4 : taux AT/MP, rappel du texte sans réponse sur la période ni sur le délai', () => {
  const r = D.evaluerLigne(Object.assign({ situation: S.TAUX_ATMP }, DANS), JOUR);
  assert.equal(r.etat, E.INFORMATION);
  assert.deepEqual(r.regles, ['R4']);
  assert.equal(r.dateLimite, null);
});

test('R6 : une autre décision de justice est hors périmètre', () => {
  const r = D.evaluerLigne(Object.assign({ situation: S.DECISION_AUTRE }, DANS), JOUR);
  assert.equal(r.etat, E.HORS_PERIMETRE);
  assert.deepEqual(r.regles, ['R6']);
  assert.equal(r.dateLimite, null);
});

/* ---------- Garde-fou général ---------- */

test('seule la situation « erreur », dans le périmètre, peut donner « réclamable »', () => {
  const dates = ['2015-01-01', '2020-06-30', '2023-11-11', '2024-02-29', '2026-11-11'];
  const ouiNonInconnu = [true, false, undefined];
  for (const situation of Object.values(S)) {
    for (const n of ouiNonInconnu) for (const c of ouiNonInconnu) for (const d of ouiNonInconnu) {
      for (const date of dates) {
        const r = D.evaluerLigne({ situation, natureConfirmee: n, redressement: c, demandeDejaFaite: d, datePaiement: date, dateDecision: date }, JOUR);
        if (r.etat === E.RECLAMABLE || r.etat === E.DERNIER_JOUR) {
          assert.equal(situation, S.ERREUR);
          assert.deepEqual([n, c, d], [true, false, false]);
          assert.ok(D.comparerDates(D.lireDate(JOUR), D.lireDate(r.dateLimite)) <= 0);
        }
      }
    }
  }
});

test('constantes : trois ans, troisième année, quatre mois, premier paiement traité', () => {
  assert.equal(D.DELAI_PRESCRIPTION_ANNEES, 3);
  assert.equal(D.ANNEES_AVANT_DECISION, 3);
  assert.equal(D.DELAI_REMBOURSEMENT_MOIS, 4);
  assert.deepEqual(D.PREMIER_PAIEMENT_TRAITE, { a: 2015, m: 1, j: 1 });
});

/* ---------- R2 : l'arrêt du 6 avril 2023 rejoué ---------- */

test('R2 : demande du 27 mars 2018, un paiement du 27 mars 2015 est encore dans le délai, un paiement du 26 mars ne l\'est plus', () => {
  /* Cass. 2e civ., 6 avril 2023, n° 21-19.111 : demande du 27 mars 2018,
     prescription opposée aux seuls versements effectués avant le 27 mars 2015. */
  assert.equal(D.evaluerLigne(erreur('2015-03-27'), '2018-03-27').etat, E.DERNIER_JOUR);
  assert.equal(D.evaluerLigne(erreur('2015-03-26'), '2018-03-27').etat, E.HORS_DELAI);
  assert.equal(D.evaluerLigne(erreur('2015-03-28'), '2018-03-27').etat, E.RECLAMABLE);
});

/* ---------- R2 ter : date de prudence ---------- */

test('R2 ter : la date de prudence est la veille du terme, y compris en début de mois et d\'année', () => {
  assert.equal(D.evaluerLigne(erreur('2024-03-15'), JOUR).datePrudence, '2027-03-14');
  assert.equal(D.evaluerLigne(erreur('2024-03-01'), JOUR).datePrudence, '2027-02-28');
  assert.equal(D.evaluerLigne(erreur('2025-03-01'), JOUR).datePrudence, '2028-02-29');
  assert.equal(D.evaluerLigne(erreur('2024-01-01'), JOUR).datePrudence, '2026-12-31');
  assert.equal(D.evaluerLigne(erreur('2024-02-29'), JOUR).datePrudence, '2027-02-27');
  assert.deepEqual(D.veille({ a: 2027, m: 1, j: 1 }), { a: 2026, m: 12, j: 31 });
});

test('R2 ter : aucune date de prudence hors du calcul ordinaire', () => {
  assert.equal(D.evaluerLigne(Object.assign({ situation: S.TAUX_ATMP }, DANS), JOUR).datePrudence, undefined);
  assert.equal(D.evaluerLigne(erreur(''), JOUR).datePrudence, undefined);
  assert.equal(D.evaluerLigne(erreur('2014-12-31'), JOUR).datePrudence, undefined);
});

/* ---------- Date du jour à l'heure de Paris ---------- */

test('date du jour : calculée à l\'heure de Paris, pas en temps universel ni à l\'heure de l\'appareil', () => {
  /* Hiver : Paris = UTC+1. 23 h 30 UTC le 11 novembre, c'est déjà le 12 à Paris. */
  assert.deepEqual(D.jourParis(new Date('2026-11-11T23:30:00Z')), { date: '2026-11-12', repli: false });
  assert.equal(D.jourParis(new Date('2026-11-11T22:59:59Z')).date, '2026-11-11');
  assert.equal(D.jourParis(new Date('2026-11-11T23:00:00Z')).date, '2026-11-12');
  /* Été : Paris = UTC+2. */
  assert.equal(D.jourParis(new Date('2026-07-01T21:59:59Z')).date, '2026-07-01');
  assert.equal(D.jourParis(new Date('2026-07-01T22:00:00Z')).date, '2026-07-02');
});

test('date du jour : une page restée ouverte après minuit change de verdict', () => {
  const paiement = erreur('2023-11-11');
  const avant = D.jourParis(new Date('2026-11-11T22:59:00Z')).date;
  const apres = D.jourParis(new Date('2026-11-11T23:01:00Z')).date;
  assert.equal(D.evaluerLigne(paiement, avant).etat, E.DERNIER_JOUR);
  assert.equal(D.evaluerLigne(paiement, apres).etat, E.HORS_DELAI);
});

/* ---------- R2 bis : 28 février vers une année bissextile ---------- */

test('R2 bis : un paiement du 28 février 2025 garde un terme au 28 février 2028, signalé comme date la plus précoce', () => {
  const r = D.evaluerLigne(erreur('2025-02-28'), JOUR);
  assert.equal(r.dateLimite, '2028-02-28');
  assert.equal(r.fevrier28, true);
  assert.equal(r.datePrudence, '2028-02-27');
  assert.deepEqual(r.regles, ['R1', 'R2', 'R2 bis']);
  assert.equal(D.evaluerLigne(erreur('2025-02-28'), '2028-02-28').etat, E.DERNIER_JOUR);
  assert.equal(D.evaluerLigne(erreur('2025-02-28'), '2028-02-29').etat, E.HORS_DELAI);
  /* Pas de signalement hors de ce cas précis. */
  assert.equal(D.evaluerLigne(erreur('2024-02-28'), JOUR).fevrier28, undefined); // année de paiement bissextile
  assert.equal(D.evaluerLigne(erreur('2023-02-28'), '2025-01-01').fevrier28, undefined); // terme 2026, année ordinaire
  assert.equal(D.evaluerLigne(erreur('2025-03-28'), JOUR).fevrier28, undefined);
});
