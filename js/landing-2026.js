/* ============================================
   ACOMPIA — Interactions de la landing (handoff 08/2026)

   Trois comportements : onglets de la section solution, configurateur
   d'axes d'audit, et ouverture des cas-types.

   Les cas-types s'ouvrent au survol sur pointeur fin (règle CSS) ; ce
   fichier ajoute le clic et le clavier, que le prototype n'avait pas et
   sans lesquels le contenu était inatteignable au tactile.
   Dépend de js/socle.js pour la mesure.
   ============================================ */

/* ---------- Onglets de la section solution ---------- */

function activerOnglets() {
  const onglets = [...document.querySelectorAll('.l26-onglet')];
  if (!onglets.length) return;

  const panneaux = onglets.map((o) => document.getElementById(o.getAttribute('aria-controls')));

  const afficher = (index) => {
    onglets.forEach((onglet, i) => {
      const actif = i === index;
      onglet.setAttribute('aria-selected', actif ? 'true' : 'false');
      onglet.tabIndex = actif ? 0 : -1;
      if (panneaux[i]) panneaux[i].hidden = !actif;
    });
    capturerEvenement('solution_onglet', { onglet: onglets[index].textContent.trim().slice(0, 40) });
  };

  onglets.forEach((onglet, i) => {
    onglet.addEventListener('click', () => afficher(i));
    // Flèches gauche/droite : navigation attendue d'une barre d'onglets
    onglet.addEventListener('keydown', (e) => {
      const pas = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!pas) return;
      e.preventDefault();
      const suivant = (i + pas + onglets.length) % onglets.length;
      afficher(suivant);
      onglets[suivant].focus();
    });
  });
}

/* ---------- Configurateur d'axes d'audit ---------- */

const AXES_AUDIT = [
  ['Frais professionnels', 'IK, forfaits repas, déplacements, DFS'],
  ['Avantages en nature', 'Véhicules, NTIC, logement, nourriture'],
  ['Protection sociale', 'Mutuelle, prévoyance, DUE, dispenses'],
  ['Rémunérations', 'Heures sup, forfait jours, primes, DSN'],
  ['Réduction générale', 'Calcul RGDU, seuils, situations complexes'],
  ['Ruptures de contrat', 'Transactions, ruptures conv., indemnités']
];
const AXES_PAR_DEFAUT = [0, 1];

function libelleAxes(nombre) {
  if (nombre === 0) return 'axe sélectionné — choisissez vos thématiques';
  if (nombre === 1) return 'axe sélectionné · devis sous 48 h';
  return 'axes sélectionnés · devis sous 48 h';
}

function activerConfigurateur() {
  const liste = document.getElementById('l26-axes');
  if (!liste) return;

  const compteur = document.getElementById('l26-compteur-n');
  const libelle = document.getElementById('l26-compteur-libelle');
  const barre = document.getElementById('l26-jauge-barre');
  const selection = new Set(AXES_PAR_DEFAUT);

  const majSynthese = () => {
    const nombre = selection.size;
    if (compteur) compteur.textContent = nombre;
    if (libelle) libelle.textContent = libelleAxes(nombre);
    if (barre) barre.style.width = Math.round((nombre / AXES_AUDIT.length) * 100) + '%';
  };

  liste.innerHTML = AXES_AUDIT.map(([titre, sous], i) => `
    <li>
      <button type="button" class="l26-axe" aria-pressed="${selection.has(i) ? 'true' : 'false'}" data-axe="${i}">
        <span class="l26-axe-case" aria-hidden="true">${selection.has(i) ? '✓' : ''}</span>
        <span>
          <span class="l26-axe-titre">${titre}</span>
          <span class="l26-axe-sous">${sous}</span>
        </span>
        <span class="l26-axe-num" aria-hidden="true">0${i + 1}</span>
      </button>
    </li>`).join('');

  liste.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('.l26-axe');
    if (!bouton) return;
    const index = Number(bouton.dataset.axe);
    const actif = !selection.has(index);

    if (actif) selection.add(index); else selection.delete(index);
    bouton.setAttribute('aria-pressed', actif ? 'true' : 'false');
    bouton.querySelector('.l26-axe-case').textContent = actif ? '✓' : '';
    majSynthese();

    capturerEvenement('audit_axe_bascule', {
      axe: AXES_AUDIT[index][0],
      actif,
      nb_axes: selection.size
    });
  });

  majSynthese();
}

/* ---------- Cas-types ---------- */

function activerCasTypes() {
  document.querySelectorAll('.l26-cas').forEach((carte) => {
    const bouton = carte.querySelector('.l26-cas-bouton');
    if (!bouton) return;

    bouton.addEventListener('click', () => {
      const ouvert = carte.dataset.ouvert !== 'true';
      carte.dataset.ouvert = ouvert ? 'true' : 'false';
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      if (ouvert) {
        capturerEvenement('cas_type_ouvert', {
          cas: (carte.querySelector('.l26-cas-meta') || {}).textContent || ''
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  activerOnglets();
  activerConfigurateur();
  activerCasTypes();
});
