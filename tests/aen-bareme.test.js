const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerScripts } = require('./charger.js');

const { calculer, parseMontant, moisEntames } = chargerScripts('js/aen-bareme.js');

/* Montants en centimes. Cas de référence : voiture particulière achetée
   30 000 € TTC, mise à disposition à compter du 1er février 2025. */
const CAS_DE_BASE = {
  typevhc: 'vp', attribution: 'oui', beneficiaire: 'salarie',
  mode: 'achat', periode: 'post', energie: 'thermique',
  age: 'jeune', carburant: 'non', participation: 0, prorata: 12,
  prixAchat: 3000000
};

const avec = (modifications) => calculer({ ...CAS_DE_BASE, ...modifications });
const montantDe = (resultat) => resultat.simple.montant;

test('qualification : un utilitaire ne crée pas d\'avantage en nature', () => {
  const r = calculer({ typevhc: 'vu' });
  assert.equal(r.genre, 'aucun');
  assert.ok(r.analyse);
});

test('qualification : un véhicule de pool ne crée pas d\'avantage forfaitaire', () => {
  assert.equal(calculer({ typevhc: 'vp', attribution: 'non' }).genre, 'aucun');
});

test('qualification : un travailleur non salarié sort du forfait de l\'arrêté', () => {
  const r = calculer({ typevhc: 'vp', attribution: 'oui', beneficiaire: 'tns' });
  assert.equal(r.genre, 'specifique');
});

test('qualification : une réponse manquante interrompt le calcul', () => {
  assert.ok(calculer({}).incomplet);
  assert.ok(calculer({ typevhc: 'vp' }).incomplet);
});

test('barème achat : 15 % pour un véhicule de 5 ans ou moins sans carburant', () => {
  assert.equal(montantDe(avec({})), 450000);
});

test('barème achat : 10 % au-delà de 5 ans', () => {
  assert.equal(montantDe(avec({ age: 'ancien' })), 300000);
});

test('barème achat : 20 % quand l\'employeur prend en charge le carburant', () => {
  assert.equal(montantDe(avec({ carburant: 'oui' })), 600000);
});

test('barème location : 50 % du coût annuel sans carburant', () => {
  assert.equal(montantDe(avec({ mode: 'location', prixAchat: null, coutLocation: 900000 })), 450000);
});

test('location : le plafonnement par la règle achat s\'applique s\'il est plus favorable', () => {
  const r = avec({ mode: 'location', prixAchat: null, coutLocation: 900000, prixLoueur: 2000000 });
  // 50 % de 9 000 € = 4 500 € ; plafond achat = 15 % de 20 000 € = 3 000 €
  assert.equal(montantDe(r), 300000);
  assert.ok(r.simple.lignes.some(l => l.lib.startsWith('Plafonnement')));
});

test('électrique éco-score : abattement de 70 %', () => {
  assert.equal(montantDe(avec({ energie: 'electrique', ecoscore: 'oui' })), 135000);
});

test('électrique éco-score : abattement plafonné à 4 641,60 € en 2026', () => {
  const r = avec({ energie: 'electrique', ecoscore: 'oui', prixAchat: 20000000 });
  assert.equal(montantDe(r), 3000000 - 464160);
  assert.ok(r.simple.lignes.some(l => l.lib.includes('plafonné')));
});

test('électrique sans éco-score : aucun abattement', () => {
  assert.equal(montantDe(avec({ energie: 'electrique', ecoscore: 'non' })), 450000);
});

test('électrique éco-score inconnu : les deux hypothèses sont présentées', () => {
  const r = avec({ energie: 'electrique', ecoscore: 'nsp' });
  assert.equal(r.double.avec.montant, 135000);
  assert.equal(r.double.sans.montant, 450000);
});

test('électrique antérieur à février 2025 : hors périmètre du simulateur', () => {
  assert.equal(avec({ energie: 'electrique', periode: 'pre' }).genre, 'specifique');
});

test('la participation du salarié vient en déduction, sans passer sous zéro', () => {
  assert.equal(montantDe(avec({ participation: 100000 })), 350000);
  assert.equal(montantDe(avec({ participation: 99999999 })), 0);
});

test('prorata : l\'avantage est réduit aux mois de mise à disposition', () => {
  assert.equal(montantDe(avec({ prorata: 6 })), 225000);
});

test('une date de fin antérieure à la date de début est signalée', () => {
  assert.ok(avec({ prorata: null }).erreur);
});

test('parseMontant accepte les formats saisis par un humain', () => {
  assert.equal(parseMontant('1 234,56'), 123456);
  assert.equal(parseMontant('30000'), 3000000);
  assert.equal(parseMontant('12,5'), 1250);
  assert.ok(Number.isNaN(parseMontant('abc')));
  assert.equal(parseMontant(''), null);
  assert.equal(parseMontant(null), null);
});

test('moisEntames compte les mois entamés, bornés à 12', () => {
  assert.equal(moisEntames('2026-01-15', '2026-06-20'), 6);
  assert.equal(moisEntames('2026-01-01', '2026-12-31'), 12);
  assert.equal(moisEntames('2025-01-01', '2026-12-31'), 12);
  assert.equal(moisEntames('2026-06-20', '2026-01-15'), null);
  assert.equal(moisEntames(null, null), 12);
});
