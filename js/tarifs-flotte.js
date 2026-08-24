/* ============================================
   ACOMPIA — Grille tarifaire pilotage de flotte
   Extrait de la page tarifs pour être testable isolément
   (voir tests/tarifs-flotte.test.js).
   ============================================ */

/* Abonnement mensuel : tarif dégressif par tranche de flotte.
   Chaque palier facture les véhicules situés entre le palier précédent
   et `jusqua` au prix indiqué. */
const ABONNEMENT_PALIERS = [
  { jusqua: 25,  prixParVehiculeEUR: 8 },
  { jusqua: 75,  prixParVehiculeEUR: 6 },
  { jusqua: 150, prixParVehiculeEUR: 4.5 },
  { jusqua: 200, prixParVehiculeEUR: 3.5 }
];
const ABONNEMENT_MINIMUM_EUR = 150;

/* Audit ponctuel : forfait par tranche de taille de flotte. */
const AUDIT_PALIERS = [
  { jusqua: 50,       prixEUR: 1500 },
  { jusqua: 100,      prixEUR: 2500 },
  { jusqua: Infinity, prixEUR: 3500 }
];

const NB_VEHICULES_MIN = 1;
const NB_VEHICULES_MAX = 200;
const MOIS_PAR_AN = 12;

function abonnementMensuel(nbVehicules) {
  let total = 0;
  let dejaFactures = 0;
  ABONNEMENT_PALIERS.forEach(({ jusqua, prixParVehiculeEUR }) => {
    const dansCePalier = Math.min(nbVehicules, jusqua) - dejaFactures;
    if (dansCePalier > 0) total += dansCePalier * prixParVehiculeEUR;
    dejaFactures = jusqua;
  });
  return Math.max(ABONNEMENT_MINIMUM_EUR, total);
}

function auditPrix(nbVehicules) {
  return AUDIT_PALIERS.find(p => nbVehicules <= p.jusqua).prixEUR;
}

/* Au-delà du dernier palier, la grille n'est plus affichée au véhicule près. */
function libelleNbVehicules(nbVehicules) {
  return nbVehicules === NB_VEHICULES_MAX ? NB_VEHICULES_MAX + '+' : String(nbVehicules);
}

if (typeof module !== 'undefined') {
  module.exports = { abonnementMensuel, auditPrix, libelleNbVehicules };
}
