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
    alignerCourbeParcours();
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

/* ---------- Courbe du parcours ---------- */

/* La courbe était tracée sur des abscisses fixes (100, 300, 500…) tandis que
   les pastilles se posent au fil du texte, à gauche de chaque colonne : les
   deux ne se rencontraient nulle part. Plutôt que de rattraper l'écart à la
   main — il rebouge à chaque largeur de fenêtre, chaque retour à la ligne —
   on inverse la dépendance : on relève la position réelle des pastilles et
   on trace la courbe à travers elles. */

/* Catmull-Rom converti en cubiques de Bézier : la seule interpolation lisse
   qui passe *exactement* par chaque point, ce qui est tout l'objet ici.

   Paramétrage centripète (α = 0,5) et non uniforme : le segment d'amorce ne
   fait qu'une vingtaine d'unités contre deux cents pour les suivants, et la
   version uniforme y calculait une tangente plus longue que le segment —
   son point de contrôle partait en abscisse négative et la courbe faisait
   un crochet vers l'arrière avant la première pastille. Le centripète borne
   les tangentes à la longueur des cordes, ce qui interdit ces boucles. */
function courbeParPoints(points) {
  const corde = (u, v) => Math.sqrt(Math.hypot(v.x - u.x, v.y - u.y));
  const tiers = (de, vers, axe) => de[axe] + (vers[axe] - de[axe]) / 3;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const p0 = points[i - 1];
    const p3 = points[i + 2];
    const d2 = corde(p1, p2);

    // Aux deux bouts il n'y a pas de voisin pour donner la tangente : on
    // retombe sur le tiers de segment, qui laisse la courbe partir droit.
    const controle = (axe) => {
      const c1 = p0
        ? (() => {
            const d1 = corde(p0, p1);
            return (d1 * d1 * p2[axe] - d2 * d2 * p0[axe]
              + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[axe]) / (3 * d1 * (d1 + d2));
          })()
        : tiers(p1, p2, axe);
      const c2 = p3
        ? (() => {
            const d3 = corde(p2, p3);
            return (d3 * d3 * p1[axe] - d2 * d2 * p3[axe]
              + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[axe]) / (3 * d3 * (d3 + d2));
          })()
        : tiers(p2, p1, axe);
      return [c1, c2];
    };

    const [c1x, c2x] = controle('x');
    const [c1y, c2y] = controle('y');
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)}`
      + ` ${c2x.toFixed(1)},${c2y.toFixed(1)}`
      + ` ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function alignerCourbeParcours() {
  const parcours = document.querySelector('.journey');
  if (!parcours) return;

  const calque = parcours.querySelector('.journey-curve');
  const trace = parcours.querySelector('#journeyPath');
  const svg = calque && calque.querySelector('svg');
  if (!calque || !trace || !svg) return;
  // Sous le point de rupture, la courbe et les pastilles sont masquées.
  if (getComputedStyle(calque).display === 'none') return;

  const cadre = svg.getBoundingClientRect();
  if (!cadre.width || !cadre.height) return; // panneau d'onglet masqué

  // `preserveAspectRatio="none"` : le viewBox est étiré indépendamment sur
  // chaque axe, donc la conversion est une simple règle de trois par axe.
  const [, , largeurVue, hauteurVue] = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);

  const points = [];
  for (const pastille of parcours.querySelectorAll('.step-marker')) {
    const r = pastille.getBoundingClientRect();
    if (!r.width) return; // pastilles masquées : on laisse le tracé d'origine
    points.push({
      x: ((r.left + r.width / 2) - cadre.left) / cadre.width * largeurVue,
      y: ((r.top + r.height / 2) - cadre.top) / cadre.height * hauteurVue
    });
  }
  if (points.length < 2) return;

  // La courbe court d'un bord à l'autre du cadre, comme dans la maquette ;
  // ces deux points d'appui la prolongent à plat au-delà des pastilles.
  points.unshift({ x: 0, y: points[0].y });
  points.push({ x: largeurVue, y: points[points.length - 1].y });

  trace.setAttribute('d', courbeParPoints(points));
}

function surveillerCourbeParcours() {
  alignerCourbeParcours();
  // Les polices changent la hauteur des textes, donc celle des pastilles.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(alignerCourbeParcours);
  }
  let attente;
  addEventListener('resize', () => {
    clearTimeout(attente);
    attente = setTimeout(alignerCourbeParcours, 120);
  });
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
  surveillerCourbeParcours();
});
