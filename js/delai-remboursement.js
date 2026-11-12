/* ============================================
   ACOMPIA — Délai de remboursement des cotisations trop payées
   Calcul pur, sans DOM, testable isolément
   (voir tests/delai-remboursement.test.js).

   Chaque règle porte un numéro (R1, R2...) qui renvoie au registre
   docs/outils/delai-remboursement_regles.md, où figurent le passage
   exact du texte, sa source et la date de lecture.

   Périmètre volontairement étroit : l'outil ne calcule que des délais.
   Tout cas que le texte ne tranche pas nettement sort en « hors périmètre »
   plutôt que de recevoir une réponse.
   ============================================ */

/* R1 — CSS, art. L. 243-6, I, al. 1 : trois ans à compter de la date
   à laquelle les cotisations ont été acquittées. */
const DELAI_PRESCRIPTION_ANNEES = 3;

/* R3 — CSS, art. L. 243-6, I, al. 2 : période postérieure au 1er janvier
   de la troisième année précédant celle de la décision. */
const ANNEES_AVANT_DECISION = 3;

/* R5 — CSS, art. L. 243-6, III : remboursement dans un délai de quatre mois
   à compter de la demande. Rappelé dans la page, jamais calculé. */
const DELAI_REMBOURSEMENT_MOIS = 4;

/* Bornes du domaine traité.
   Le texte appliqué est la version en vigueur depuis le 1er janvier 2015.
   Un paiement antérieur n'est pas calculé : l'outil n'applique pas les
   versions antérieures du texte ni leurs règles transitoires (R10). */
const PREMIER_PAIEMENT_TRAITE = { a: 2015, m: 1, j: 1 };
const ANNEE_MIN = 1900;
const ANNEE_MAX = 2100;

/* Origine du trop versé, choisie par l'utilisateur. Les autres dimensions
   (nature de la cotisation, contrôle, demande déjà faite) sont des questions
   séparées : aucune n'est déduite de celle-ci. */
const SITUATIONS = {
  ERREUR: 'erreur',                   // erreur de calcul ou de paramétrage, versement spontané
  NON_CONFORMITE: 'non_conformite',   // décision de justice révélant une non-conformité
  TAUX_ATMP: 'taux_atmp',             // décision rectificative de la caisse sur le taux AT/MP
  DECISION_AUTRE: 'decision_autre'    // autre décision de justice dont naît le remboursement
};

const ETATS = {
  RECLAMABLE: 'reclamable',       // délai ordinaire de trois ans non expiré
  DERNIER_JOUR: 'dernier_jour',   // le délai ordinaire expire aujourd'hui à minuit
  HORS_DELAI: 'hors_delai',       // délai ordinaire expiré, selon les seules données saisies
  INFORMATION: 'information',     // l'outil rappelle le texte, sans dire si la demande est recevable
  MANQUANT: 'manquant',
  HORS_PERIMETRE: 'hors_perimetre'
};

/* ---------- Dates : toujours en calendrier civil, sans heure ni fuseau ---------- */

/* Lit une date SAISIE au format « AAAA-MM-JJ ». Rend { a, m, j }, ou null si la
   date n'existe pas ou sort du domaine de saisie (années 1900 à 2100).
   Les dates produites par le calcul peuvent dépasser ce domaine. */
function lireDate(texte) {
  if (typeof texte !== 'string') return null;
  const lu = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte.trim());
  if (!lu) return null;
  const a = Number(lu[1]), m = Number(lu[2]), j = Number(lu[3]);
  if (a < ANNEE_MIN || a > ANNEE_MAX) return null;
  if (m < 1 || m > 12 || j < 1 || j > joursDansMois(a, m)) return null;
  return { a, m, j };
}

function estBissextile(a) {
  return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
}

function joursDansMois(a, m) {
  if (m === 2) return estBissextile(a) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

function ecrireDate(d) {
  const deux = (n) => String(n).padStart(2, '0');
  return String(d.a).padStart(4, '0') + '-' + deux(d.m) + '-' + deux(d.j);
}

/* < 0 si x est avant y, 0 si même jour, > 0 si après. */
function comparerDates(x, y) {
  return (x.a - y.a) || (x.m - y.m) || (x.j - y.j);
}

/* Même quantième, N années plus tard. Un 29 février dont l'année d'arrivée
   n'est pas bissextile devient le 28 février (R2 bis) : le délai court du
   lendemain du paiement, le 1er mars à 0 heure, et trois années entières
   s'achèvent le 28 février à minuit (code civil, art. 2228 et 2229). C'est
   aussi la solution de l'article 641, alinéa 2, du code de procédure civile
   pour les délais de procédure (dernier jour du mois à défaut de quantième
   identique). */
function ajouterAnnees(d, n) {
  const a = d.a + n;
  return { a, m: d.m, j: Math.min(d.j, joursDansMois(a, d.m)) };
}

/* La veille d'une date. */
function veille(d) {
  if (d.j > 1) return { a: d.a, m: d.m, j: d.j - 1 };
  if (d.m > 1) return { a: d.a, m: d.m - 1, j: joursDansMois(d.a, d.m - 1) };
  return { a: d.a - 1, m: 12, j: 31 };
}

/* Nombre de jours entiers de x à y (y - x). */
function joursEntre(x, y) {
  const ms = Date.UTC(y.a, y.m - 1, y.j) - Date.UTC(x.a, x.m - 1, x.j);
  return Math.round(ms / 86400000);
}

/* Date du jour à l'heure de Paris, au format « AAAA-MM-JJ ». Le calcul ne doit
   pas dépendre du fuseau de l'appareil. À défaut de prise en charge du fuseau,
   la date locale de l'appareil est utilisée et `repli` vaut true. */
function jourParis(instant) {
  const n = instant instanceof Date ? instant : new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(n);
    const lu = {};
    parts.forEach((x) => { lu[x.type] = x.value; });
    const iso = lu.year + '-' + lu.month + '-' + lu.day;
    if (lireDate(iso)) return { date: iso, repli: false };
  } catch (e) { /* repli ci-dessous */ }
  return { date: ecrireDate({ a: n.getFullYear(), m: n.getMonth() + 1, j: n.getDate() }), repli: true };
}

/* ---------- Règles ---------- */

/* R1 + R2 — Terme du délai ordinaire : la date anniversaire du paiement,
   trois ans plus tard. Le jour du paiement ne compte pas, le délai expire
   le jour anniversaire en fin de journée (code civil, art. 2228 et 2229.
   Cass. soc., 21 mai 2025, n° 24-10.009, rendu sur une autre prescription :
   délai « commencé à courir le 11 août 2019 à 0 heure pour s'achever le
   10 août 2020 à minuit »). L'arrêt Cass. 2e civ., 6 avril 2023, n° 21-19.111,
   rendu sur L. 243-6, est compatible avec ce décompte mais ne le tranche pas.
   Aucun report au jour ouvrable suivant (Cass. 2e civ., 7 avril 2016,
   n° 15-12.960). */
function termeDelai(datePaiement) {
  return ajouterAnnees(datePaiement, DELAI_PRESCRIPTION_ANNEES);
}

/* R3 — Seuil rappelé quand le remboursement naît d'une décision de justice
   révélant une non-conformité : le 1er janvier de la troisième année
   précédant celle de la décision. L'outil affiche ce seuil. Il ne classe
   aucune période par rapport à lui. */
function seuilPeriode(dateDecision) {
  return { a: dateDecision.a - ANNEES_AVANT_DECISION, m: 1, j: 1 };
}

function resultat(etat, champs) {
  return Object.assign({ etat, regles: [], dateLimite: null, joursRestants: null, motif: null }, champs);
}

/* Une réponse oui / non doit être donnée expressément : toute autre valeur
   (absente, null, texte) est une information manquante. */
function ouiNon(v) {
  return v === true || v === false;
}

/* Évalue une ligne saisie.
   ligne = {
     situation,          // une valeur de SITUATIONS
     natureConfirmee,    // true : cotisations de sécurité sociale et d'allocations familiales versées à l'URSSAF ou à la CGSS
     redressement,       // true : ces sommes sont liées à un contrôle, un redressement ou une mise en demeure
     demandeDejaFaite,   // true : une demande, une réclamation ou un échange écrit a déjà eu lieu sur ce trop versé
     datePaiement,       // « AAAA-MM-JJ », date à laquelle la cotisation a été payée (situation erreur)
     dateDecision        // « AAAA-MM-JJ », date de la décision de justice (situation non_conformite)
   }
   aujourdhui = « AAAA-MM-JJ » (date du jour, fournie par l'appelant). */
function evaluerLigne(ligne, aujourdhui) {
  const jour = lireDate(aujourdhui);
  if (!jour) throw new Error('Date du jour invalide : ' + aujourdhui);
  const l = ligne || {};

  if (!l.situation || !Object.values(SITUATIONS).includes(l.situation)) {
    return resultat(ETATS.MANQUANT, { motif: 'situation' });
  }

  /* Conditions de périmètre, vérifiées une à une avant tout calcul.
     Une réponse inconnue ne vaut jamais « non ». */
  if (!ouiNon(l.natureConfirmee)) return resultat(ETATS.MANQUANT, { motif: 'nature' });
  if (l.natureConfirmee === false) {
    return resultat(ETATS.HORS_PERIMETRE, { motif: 'autre_contribution', regles: ['R9'] });
  }
  if (!ouiNon(l.redressement)) return resultat(ETATS.MANQUANT, { motif: 'redressement' });
  if (l.redressement === true) {
    return resultat(ETATS.HORS_PERIMETRE, { motif: 'controle', regles: ['R8'] });
  }
  if (!ouiNon(l.demandeDejaFaite)) return resultat(ETATS.MANQUANT, { motif: 'demande' });
  if (l.demandeDejaFaite === true) {
    return resultat(ETATS.HORS_PERIMETRE, { motif: 'demande_deja_faite', regles: ['R7'] });
  }

  if (l.situation === SITUATIONS.DECISION_AUTRE) {
    return resultat(ETATS.HORS_PERIMETRE, { motif: 'decision_autre', regles: ['R6'] });
  }

  /* R4 — L'outil rappelle le texte. Il ne dit ni si la période est visée,
     ni jusqu'à quand agir. */
  if (l.situation === SITUATIONS.TAUX_ATMP) {
    return resultat(ETATS.INFORMATION, { motif: 'taux_atmp', regles: ['R4'] });
  }

  /* R3 — L'outil affiche le seuil. Il ne dit ni si la période est couverte,
     ni jusqu'à quand agir. */
  if (l.situation === SITUATIONS.NON_CONFORMITE) {
    if (l.dateDecision === undefined || l.dateDecision === null || l.dateDecision === '') {
      return resultat(ETATS.MANQUANT, { motif: 'date_decision' });
    }
    const decision = lireDate(l.dateDecision);
    if (!decision) return resultat(ETATS.MANQUANT, { motif: 'date_decision_invalide' });
    if (comparerDates(decision, jour) > 0) {
      return resultat(ETATS.MANQUANT, { motif: 'date_decision_future' });
    }
    return resultat(ETATS.INFORMATION, {
      motif: 'non_conformite', regles: ['R3'], dateSeuil: ecrireDate(seuilPeriode(decision))
    });
  }

  /* SITUATIONS.ERREUR — R1, R2 */
  if (l.datePaiement === undefined || l.datePaiement === null || l.datePaiement === '') {
    return resultat(ETATS.MANQUANT, { motif: 'date_paiement' });
  }
  const paiement = lireDate(l.datePaiement);
  if (!paiement) return resultat(ETATS.MANQUANT, { motif: 'date_paiement_invalide' });
  if (comparerDates(paiement, jour) > 0) {
    return resultat(ETATS.MANQUANT, { motif: 'date_paiement_future' });
  }
  if (comparerDates(paiement, PREMIER_PAIEMENT_TRAITE) < 0) {
    return resultat(ETATS.HORS_PERIMETRE, { motif: 'paiement_ancien', regles: ['R10'] });
  }
  const terme = termeDelai(paiement);
  /* Le verdict vient de la comparaison des dates. Le nombre de jours
     n'est qu'une information d'affichage. */
  const position = comparerDates(jour, terme);
  /* R2 ter — Date de prudence : la veille du terme. Aucune décision lue ne dit
     si la demande doit être envoyée ou reçue avant le terme. L'outil conseille
     donc une réception au plus tard la veille. Ce n'est pas une date légale. */
  const champs = {
    regles: ['R1', 'R2'], dateLimite: ecrireDate(terme), joursRestants: joursEntre(jour, terme),
    datePrudence: ecrireDate(veille(terme))
  };
  /* R2 bis — paiement du 29 février : terme au 28 février. */
  if (paiement.m === 2 && paiement.j === 29 && terme.j !== 29) {
    champs.fevrier29 = true;
    champs.regles = ['R1', 'R2', 'R2 bis'];
  }
  /* R2 bis — paiement du 28 février d'une année ordinaire dont le terme tombe
     une année bissextile : un décompte à partir du lendemain à 0 heure irait
     jusqu'au 29 février. L'outil garde le 28 février, date la plus précoce. */
  if (paiement.m === 2 && paiement.j === 28 && !estBissextile(paiement.a) && estBissextile(terme.a)) {
    champs.fevrier28 = true;
    champs.regles = ['R1', 'R2', 'R2 bis'];
  }
  if (position < 0) return resultat(ETATS.RECLAMABLE, champs);
  if (position === 0) return resultat(ETATS.DERNIER_JOUR, champs);
  return resultat(ETATS.HORS_DELAI, champs);
}

function evaluerLignes(lignes, aujourdhui) {
  return (lignes || []).map((l) => evaluerLigne(l, aujourdhui));
}

const DelaiRemboursement = {
  SITUATIONS, ETATS,
  DELAI_PRESCRIPTION_ANNEES, ANNEES_AVANT_DECISION, DELAI_REMBOURSEMENT_MOIS,
  lireDate, ecrireDate, estBissextile, joursDansMois, comparerDates,
  ajouterAnnees, veille, joursEntre, jourParis, termeDelai, seuilPeriode,
  PREMIER_PAIEMENT_TRAITE, ANNEE_MIN, ANNEE_MAX,
  evaluerLigne, evaluerLignes
};

if (typeof window !== 'undefined') {
  window.DelaiRemboursement = DelaiRemboursement;
}
if (typeof module !== 'undefined') {
  module.exports = DelaiRemboursement;
}
