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

if (curseur) {
  curseur.addEventListener('input', majAffichageTarifs);
  majAffichageTarifs();
}
