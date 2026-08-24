/* ============================================
   ACOMPIA — Curseur de la grille tarifaire flotte
   Dépend de js/tarifs-flotte.js.
   ============================================ */

const euros = new Intl.NumberFormat('fr-FR');
const curseur = document.getElementById('slider');

function majAffichageTarifs() {
  const nbVehicules = Number(curseur.value);
  const libelle = libelleNbVehicules(nbVehicules);

  document.getElementById('v-nb').textContent = libelle;
  curseur.style.setProperty('--pct',
    ((nbVehicules - NB_VEHICULES_MIN) / (NB_VEHICULES_MAX - NB_VEHICULES_MIN) * 100).toFixed(1) + '%');
  // A11Y : annonce vocale de la valeur courante pour les lecteurs d'écran
  curseur.setAttribute('aria-valuetext', nbVehicules + ' véhicules');

  const audit = auditPrix(nbVehicules);
  const mensuel = Math.round(abonnementMensuel(nbVehicules));

  document.getElementById('p-audit').textContent = euros.format(audit) + ' €';
  document.getElementById('p-audit-note').textContent =
    'pour une flotte de ' + libelle + ' véhicule' + (nbVehicules > 1 ? 's' : '');
  document.getElementById('p-abo').textContent = euros.format(mensuel) + ' €';
  document.getElementById('p-abo-note').textContent =
    'soit ' + euros.format(mensuel * MOIS_PAR_AN) + ' € HT / an · contrat annuel · essai sur demande';
  document.getElementById('pont-txt').textContent =
    'Il passe à moitié prix, ' + euros.format(Math.round(audit / 2))
    + ' € HT au lieu de ' + euros.format(audit) + ' €,';
}

/* Le curseur est un signal d'intention d'achat direct : la taille de flotte simulée
   dit à qui la grille s'adresse vraiment. On n'émet qu'après la fin du geste, pour
   ne pas envoyer un événement à chaque pixel. */
const DELAI_FIN_DE_GESTE_MS = 700;

function trancheDeFlotte(nbVehicules) {
  if (nbVehicules <= 4) return '1-4';
  if (nbVehicules <= 15) return '5-15';
  if (nbVehicules <= 40) return '16-40';
  if (nbVehicules <= 100) return '41-100';
  return '100+';
}

if (curseur) {
  let minuteur = null;
  curseur.addEventListener('input', () => {
    majAffichageTarifs();
    clearTimeout(minuteur);
    minuteur = setTimeout(() => {
      const nbVehicules = Number(curseur.value);
      capturerEvenement('tarifs_flotte_simule', {
        nb_vehicules: nbVehicules,
        tranche: trancheDeFlotte(nbVehicules),
        abonnement_mensuel_eur: Math.round(abonnementMensuel(nbVehicules)),
        audit_eur: auditPrix(nbVehicules)
      });
    }, DELAI_FIN_DE_GESTE_MS);
  });
  majAffichageTarifs();
}
