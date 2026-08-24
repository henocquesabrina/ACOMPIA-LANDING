/* ============================================
   ACOMPIA — Moteur de scoring & rapport
   Refonte 15/04/2026 — matrice de concordance Sabrina
   ============================================

   DEUX EXPORTS :
     - computeScoring(answers)  -> { indice, seuil, themes, meta }
     - generateReportHTML(scoring, contact) -> HTML long format du rapport

   Seuils "Indice d'exposition URSSAF" /100 — INVERSÉ (haut = risque élevé)
     0-29   : Exposition maîtrisée    🟢
     30-59  : Exposition modérée      🟠
     60-100 : Exposition forte        🔴

   Coefficients par niveau :
     CRITIQUE = 4 · ÉLEVÉ = 2 · MOYEN = 1 · RÉDUIT = 0
     SIGNAL / FILTRE / CALIBRAGE = 0 (ne contribuent pas au score)
*/

const LEVEL_COEF = { CRITIQUE: 4, ELEVE: 2, MOYEN: 1, REDUIT: 0 };
const LEVEL_MAX = 4; // max atteignable par thème
const LEVEL_LABEL = {
  CRITIQUE: 'CRITIQUE',
  ELEVE:    'ÉLEVÉ',
  MOYEN:    'MOYEN',
  REDUIT:   'RÉDUIT'
};

/* Du plus grave au moins grave. Sert au tri des thèmes et au calcul du
   niveau d'un thème à partir de ses verdicts. */
const NIVEAUX_PAR_GRAVITE = ['CRITIQUE', 'ELEVE', 'MOYEN', 'REDUIT'];

const LEVEL_COLOR = {
  CRITIQUE: '#EF4444',
  ELEVE:    '#F59E0B',
  MOYEN:    '#FBBF24', // ambre clair : MOYEN doit se distinguer d'ÉLEVÉ à l'œil
  REDUIT:   '#10B981'
};

/* ============================================================
   HELPERS — retournent { level, text, estimation } pour chaque Q
   `level` peut être null (question masquée ou non activable en verdict)
   ============================================================ */

// Tous les textes ci-dessous sont les phrases EXACTES de la matrice
// (Livrable 3 / tables 5 à 28 consolidées).

function verdictQ1_2(v) {
  switch (v) {
    case 'oui-tous': return { level: 'REDUIT',
      text: "Les indemnités kilométriques paraissent documentées pour l'ensemble des situations concernées. Ce point est rassurant, sous réserve que vous puissiez établir, en cas de contrôle, le véhicule personnel utilisé, le kilométrage indemnisé, le caractère professionnel des déplacements et leur cohérence avec l'activité réelle. ACOMPIA peut réaliser un test de robustesse documentaire sur échantillon." };
    case 'certains': return { level: 'ELEVE',
      text: "La documentation des indemnités kilométriques est partielle. Pour les situations insuffisamment justifiées, l'exclusion d'assiette est fragilisée et les sommes concernées peuvent être réintégrées. ACOMPIA propose une revue ciblée des justificatifs et un plan de remédiation par salarié." };
    case 'non': return { level: 'CRITIQUE',
      text: "Aucune justification exploitable des indemnités kilométriques n'est disponible. En l'absence d'éléments permettant d'établir le véhicule, les kilomètres indemnisés et le caractère professionnel des déplacements, l'exclusion d'assiette est fortement compromise. ACOMPIA recommande un audit immédiat de ce poste." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur la disponibilité des justificatifs kilométriques constitue en elle-même un signal d'exposition. ACOMPIA recommande une vérification rapide des pièces disponibles avant toute conclusion plus favorable." };
    default: return null;
  }
}

function verdictQ1_4(v) {
  switch (v) {
    case 'oui-tous': return { level: 'REDUIT',
      text: "La justification des frais remboursés et indemnités versées paraît assurée pour l'ensemble des situations. Sous réserve que les pièces permettent d'établir la dépense engagée ou la situation ouvrant droit. ACOMPIA peut effectuer une revue de cohérence sur échantillon." };
    case 'certains': return { level: 'ELEVE',
      text: "La justification des frais apparaît partielle. Pour les remboursements ou indemnités qui ne peuvent pas être rattachés à une dépense identifiable ou à une situation ouvrant droit clairement établie, l'exclusion d'assiette est fragilisée. ACOMPIA propose une cartographie des flux de frais par nature et par salarié." };
    case 'non': return { level: 'CRITIQUE',
      text: "Aucune justification exploitable des frais remboursés ou indemnisés n'est disponible. L'exclusion d'assiette des sommes versées est fortement compromise. ACOMPIA recommande un audit immédiat du poste avec reconstitution des justificatifs." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur la disponibilité des justificatifs est en elle-même un facteur d'exposition. ACOMPIA recommande une cartographie immédiate des justificatifs disponibles par nature de frais." };
    default: return null;
  }
}

function verdictQ1_5(v) {
  switch (v) {
    case 'oui': return { level: 'ELEVE', // SIGNAL traité comme exposition potentielle (matrice : « Exposition potentiellement significative »)
      text: "Votre entreprise applique une DFS. Ce mécanisme suppose de vérifier, salarié par salarié, l'éligibilité réelle au regard de la profession exercée, le taux applicable, le respect des conditions d'option et, le cas échéant, les modalités de sortie progressive. Une application trop large ou mal paramétrée peut entraîner un redressement. ACOMPIA propose une revue ciblée." };
    case 'non': return null; // CALIBRAGE — pas de verdict autonome
    case 'nsp': return { level: 'MOYEN',
      text: "La DFS n'est pas identifiée à ce stade. Ce point justifie une vérification rapide si votre entreprise emploie des salariés relevant de professions potentiellement éligibles. ACOMPIA propose un diagnostic ciblé." };
    default: return null;
  }
}

function verdictQ1bis_2(v) {
  switch (v) {
    case 'oui-2-cond': return { level: 'REDUIT',
      text: "Le dispositif titres-restaurant paraît sécurisé sur ses conditions principales : participation patronale entre 50 % et 60 %, attribution limitée à un titre par repas compris dans l'horaire de travail journalier. Sous réserve que la part patronale exonérée ne dépasse pas 7,32 € par titre en 2026." };
    case 'taux-seulement': return { level: 'ELEVE',
      text: "La participation patronale paraît dans la fourchette réglementaire, mais les règles d'attribution ne sont pas sécurisées. Un titre ne peut être attribué qu'à raison d'un repas compris dans l'horaire de travail journalier. ACOMPIA propose un rapprochement entre attributions, horaires et données de présence." };
    case 'taux-incertain': return { level: 'ELEVE',
      text: "L'incertitude sur le taux de participation constitue un signal d'exposition directe. L'exonération suppose une part employeur entre 50 % et 60 %, plafonnée à 7,32 € en 2026. ACOMPIA recommande une vérification immédiate du taux effectivement appliqué." };
    case 'non': return { level: 'CRITIQUE',
      text: "Les principales conditions d'exonération ne paraissent pas réunies. Le risque peut porter sur la fourchette de financement, les règles d'attribution, ou les deux. ACOMPIA recommande un audit immédiat du dispositif." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude couvre potentiellement les deux conditions cumulatives. ACOMPIA recommande une revue rapide du paramétrage et des conditions d'attribution." };
    default: return null;
  }
}

function verdictQ2_1a(v) {
  switch (v) {
    case 'accord':     return { level: 'REDUIT',
      text: "Votre régime de complémentaire santé repose sur un accord collectif, mode en principe robuste. Il convient de vérifier que l'accord est toujours en vigueur, que le contrat souscrit lui est cohérent et que le financement patronal respecte les règles applicables." };
    case 'referendum': return { level: 'REDUIT',
      text: "Votre régime de complémentaire santé a été mis en place par ratification à la majorité des intéressés. Mode valable sous réserve de pouvoir produire le projet soumis, la preuve de ratification et le procès-verbal." };
    case 'due':        return null; // SIGNAL — ouvre Q2.1b
    case 'aucune':     return { level: 'ELEVE',
      text: "Aucune complémentaire santé collective n'est déclarée. Dans le secteur privé, l'employeur doit proposer une couverture collective minimale à adhésion obligatoire, financée à au moins 50 %. ACOMPIA propose un audit flash." };
    case 'non-form':   return { level: 'ELEVE',
      text: "Aucun acte fondateur identifiable n'est déclaré. Sans acte valable, le caractère collectif et obligatoire est compromis et l'exclusion d'assiette de la contribution patronale est fragilisée. ACOMPIA recommande une reconstitution immédiate du dossier." };
    case 'nsp':        return { level: 'ELEVE',
      text: "L'acte de mise en place n'est pas identifié. Cette incertitude empêche de vérifier les conditions de sécurisation sociale du régime." };
    default: return null;
  }
}

function verdictQ2_1b(v) {
  switch (v) {
    case 'oui-tous': return { level: 'REDUIT',
      text: "La preuve de remise individuelle de la DUE paraît disponible pour l'ensemble des salariés concernés. Vérifier que cette traçabilité couvre aussi les embauches postérieures à la mise en place." };
    case 'certains': return { level: 'ELEVE',
      text: "La preuve de remise individuelle de la DUE apparaît partielle. Pour les salariés dont la remise ne peut pas être établie, la sécurisation du caractère obligatoire du régime est fragilisée. ACOMPIA recommande une reconstitution documentaire salarié par salarié." };
    case 'non': return { level: 'CRITIQUE',
      text: "Aucune preuve exploitable de remise individuelle de la DUE n'est disponible. La sécurisation du régime est fortement compromise, même si un texte de DUE existe matériellement. ACOMPIA recommande une revue immédiate du dossier." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur la disponibilité des preuves de remise constitue un signal d'exposition direct." };
    default: return null;
  }
}

function verdictQ2_3(v) {
  switch (v) {
    case 'oui-tous': return { level: 'REDUIT',
      text: "Les dispenses d'affiliation paraissent documentées pour l'ensemble des salariés concernés. Sous réserve que chaque dispense repose sur un cas autorisé." };
    case 'certains': return { level: 'ELEVE',
      text: "La documentation des dispenses apparaît partielle. Pour les salariés dispensés sans dossier suffisamment probant, le caractère obligatoire du régime est fragilisé." };
    case 'non': return { level: 'CRITIQUE',
      text: "Les dispenses d'affiliation ne reposent pas sur une documentation exploitable. La sécurisation du caractère obligatoire du régime est fortement compromise. ACOMPIA recommande un audit immédiat." };
    case 'pas-disp': return null; // sous-bloc masqué
    case 'nsp': return { level: 'ELEVE',
      text: "L'entreprise n'a pas de visibilité claire sur les salariés dispensés ni sur les pièces correspondantes. L'incertitude documentaire fragilise directement la position en contrôle." };
    default: return null;
  }
}

function verdictQ3_2(v) {
  switch (v) {
    case 'oui-decl-decompte': return { level: 'REDUIT',
      text: "Les heures paraissent déclarées et tracées pour l'ensemble des salariés concernés. Sous réserve que le décompte individuel soit suffisamment précis pour permettre une reconstitution fiable en contrôle." };
    case 'decl-decompte-partiel': return { level: 'ELEVE',
      text: "Les heures apparaissent déclarées en paie, mais le décompte individuel est insuffisant pour les étayer de manière probante en contrôle. Sans décompte fiable, la défense repose uniquement sur les bulletins de paie — potentiellement insuffisant. ACOMPIA recommande une reconstitution du décompte sur les exercices contrôlables." };
    case 'pas-toujours-decl': return { level: 'CRITIQUE',
      text: "Des heures effectuées au-delà de la durée habituelle ne sont pas systématiquement déclarées en paie ni en DSN. Cette situation expose l'entreprise à un redressement sur les cotisations non déclarées, et potentiellement à une qualification en travail dissimulé par dissimulation d'heures (prescription portée à 5 ans, majoration 25 %)." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur la déclaration et le décompte des heures constitue un signal d'exposition direct." };
    default: return null;
  }
}

function verdictQ3_3(v) {
  switch (v) {
    case 'oui-tous': return { level: 'REDUIT',
      text: "Le dispositif forfait jours paraît sécurisé sur ses trois conditions cumulatives pour l'ensemble des salariés concernés. Sous réserve que les documents de suivi soient effectivement tenus à jour et que les entretiens annuels soient formalisés." };
    case 'partiel': return { level: 'ELEVE',
      text: "Le dispositif forfait jours n'est pas intégralement sécurisé. Pour les salariés dont la convention individuelle est absente, dont le suivi est insuffisant ou dont l'entretien annuel n'est pas formalisé, la convention est fragilisée et peut être déclarée inopposable." };
    case 'non': return { level: 'CRITIQUE',
      text: "Le dispositif forfait jours ne repose pas sur les trois conditions cumulatives exigées par l'art. L. 3121-65 C. trav. Les conventions sont inopposables aux salariés et à l'URSSAF ; les heures effectuées au-delà de 35 h/semaine peuvent être requalifiées en heures supplémentaires (risque URSSAF + prud'homal cumulé)." };
    case 'pas-fj': return null; // sous-bloc masqué
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur la complétude du dispositif forfait jours couvre potentiellement les trois conditions cumulatives." };
    default: return null;
  }
}

function verdictQ3_4(v) {
  switch (v) {
    case 'oui': return { level: 'ELEVE',
      text: "Certains prestataires indépendants semblent intervenir dans des conditions présentant plusieurs indices caractéristiques d'un lien de subordination. La qualification s'apprécie au regard des conditions réelles d'exécution — degré d'autonomie, encadrement opérationnel, intégration dans l'organisation, dépendance économique. ACOMPIA propose une revue ciblée." };
    case 'non': return null;
    case 'pas-indep': return null;
    case 'nsp': return { level: 'MOYEN',
      text: "L'incertitude sur les conditions d'intervention des prestataires indépendants justifie une vérification ciblée. La réalité des conditions de travail prime sur les qualifications contractuelles." };
    default: return null;
  }
}

function verdictQ3_5(v) {
  switch (v) {
    case 'oui-sans-exc': return { level: 'REDUIT',
      text: "L'ensemble des sommes versées aux salariés transite par la paie et figure en DSN. ACOMPIA peut réaliser un rapprochement comptabilité/paie sur un exercice pour confirmer l'exhaustivité du circuit déclaratif." };
    case 'principalement': return { level: 'ELEVE',
      text: "Certaines sommes versées aux salariés ne transitent pas systématiquement par la paie ni la DSN. Ces sommes sont présumées constituer des éléments de rémunération soumis à cotisations sociales. Selon leur nature et leur volume, elles peuvent exposer à une qualification en travail dissimulé par dissimulation de rémunérations." };
    case 'non-hors': return { level: 'CRITIQUE',
      text: "Des sommes sont versées aux salariés en dehors du circuit paie et DSN. Cette situation expose directement à un redressement sur cotisations non déclarées, et potentiellement à une qualification en travail dissimulé (prescription 5 ans, majoration 25 %). ACOMPIA recommande une intervention immédiate et confidentielle." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur le caractère exhaustif du circuit déclaratif est en elle-même un signal d'exposition. Un rapprochement entre comptabilité générale, paie et DSN est indispensable." };
    default: return null;
  }
}

function verdictQ4_2(v) {
  switch (v) {
    case 'oui-regulier': return { level: 'REDUIT',
      text: "Le calcul de la RGDU fait l'objet d'un contrôle humain régulier. Sous réserve que ce contrôle couvre effectivement les situations sensibles — temps partiel, entrées/sorties, absences, éléments variables, heures supplémentaires — ainsi que la méthode de régularisation." };
    case 'ponctuel': return { level: 'ELEVE',
      text: "Le calcul de la RGDU n'est revu qu'occasionnellement. Un contrôle ponctuel est souvent insuffisant : les erreurs de paramétrage ou d'assiette peuvent se cumuler silencieusement, surtout depuis l'entrée en vigueur de la RGDU en 2026. ACOMPIA propose un audit rétrospectif ciblé." };
    case 'non-auto': return { level: 'CRITIQUE',
      text: "Le calcul de la RGDU repose exclusivement sur un paramétrage automatique non revu. L'entreprise est exposée à des erreurs systémiques depuis la mise en place du nouveau régime applicable en 2026. ACOMPIA recommande un audit immédiat du paramétrage, des cas atypiques et de la méthode de régularisation." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'entreprise n'a pas de visibilité claire sur le niveau réel de contrôle du calcul de la RGDU. Cette absence de maîtrise ne permet pas d'exclure des erreurs silencieuses." };
    default: return null;
  }
}

// Bloc 5 — AEN véhicule : combine Q5.1b (si strict-pro) et Q5.2 (si perso-possible)
function verdictBloc5(a) {
  if (a['Q5.1'] === 'pas-vehicule' || !a['Q5.1']) return null;

  if (a['Q5.1'] === 'strict-pro') {
    switch (a['Q5.1b']) {
      case 'oui-tous': return { level: 'REDUIT',
        text: "Les éléments permettant d'établir l'usage exclusivement professionnel paraissent disponibles pour l'ensemble des véhicules. Sous réserve d'être probants en contrôle et mobilisables rapidement. ACOMPIA peut réaliser un test de robustesse documentaire sur échantillon." };
      case 'certains': return { level: 'ELEVE',
        text: "Les éléments probants ne sont disponibles que pour une partie des véhicules. Pour les véhicules non suffisamment documentés, la qualification d'usage exclusivement professionnel est fragilisée et l'existence d'un avantage en nature peut être retenue. ACOMPIA propose une revue véhicule par véhicule." };
      case 'non': return { level: 'CRITIQUE',
        text: "Aucun élément probant permettant d'établir l'usage exclusivement professionnel n'est disponible. La position de l'entreprise est très difficile à soutenir en contrôle et un avantage en nature véhicule est susceptible d'être retenu. ACOMPIA recommande un audit immédiat de la flotte." };
      case 'nsp': return { level: 'ELEVE',
        text: "L'entreprise n'a pas de visibilité claire sur les éléments permettant d'établir l'usage exclusivement professionnel. L'incertitude documentaire fragilise directement la défense en contrôle." };
      default: return null;
    }
  }

  // Perso-possible ou nsp → Q5.2
  if (a['Q5.1'] === 'perso-possible' || a['Q5.1'] === 'nsp') {
    switch (a['Q5.2']) {
      case 'oui-revue': return { level: 'REDUIT',
        text: "L'évaluation de l'AEN véhicule paraît avoir été revue au regard des règles applicables depuis le 1er février 2025, en tenant compte de la date de première mise à disposition de chaque véhicule. Sous réserve que la méthode soit documentée de manière exploitable." };
      case 'non-revue': return { level: 'ELEVE',
        text: "L'évaluation de l'AEN véhicule n'a pas été revue depuis la réforme du 1er février 2025. Le risque d'erreur de méthode est réel, particulièrement si la flotte comprend des véhicules antérieurs et postérieurs à cette date. ACOMPIA propose une revue véhicule par véhicule." };
      case 'aucune-eval': return { level: 'CRITIQUE',
        text: "Aucune évaluation d'AEN n'a été réalisée pour les véhicules dont l'usage personnel n'est pas exclu. L'assiette de cotisations est très probablement sous-évaluée. ACOMPIA recommande un audit immédiat de la flotte et une régularisation prioritaire." };
      case 'nsp': return { level: 'ELEVE',
        text: "L'entreprise n'a pas de visibilité claire sur la conformité de l'évaluation des AEN véhicule. Cette incertitude couvre potentiellement la méthode retenue, la prise en compte de la date de mise à disposition et le traitement des cas particuliers." };
      default: return null;
    }
  }
  return null;
}

function verdictQ6_2(v) {
  switch (v) {
    case 'revue-complete': return { level: 'REDUIT',
      text: "Le traitement social des ruptures et transactions paraît avoir fait l'objet d'une revue complète intégrant les règles applicables à chaque date de versement, y compris le taux de 40 % applicable depuis le 31 décembre 2025 sur ruptures conventionnelles et mises à la retraite à l'initiative de l'employeur." };
    case 'revue-ant': return { level: 'MOYEN',
      text: "Une revue du traitement social a été effectuée, mais elle est antérieure à l'entrée en vigueur des règles applicables depuis le 31 décembre 2025 sur certaines indemnités relevant de l'art. L. 137-12 CSS. ACOMPIA recommande une revue ciblée des dossiers postérieurs au 31 décembre 2025." };
    case 'non-revue': return { level: 'CRITIQUE',
      text: "Le traitement social des sommes versées à l'occasion des ruptures et transactions n'a pas fait l'objet d'une revue spécifique. Le risque est élevé dossier par dossier, renforcé pour les dossiers postérieurs au 31 décembre 2025 relevant de l'art. L. 137-12 CSS. ACOMPIA recommande un audit dossier par dossier sur les 3 dernières années." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'entreprise n'a pas de visibilité claire sur la qualité et l'actualité de la revue du traitement social appliqué aux ruptures et transactions. Sur ce thème techniquement complexe, cette incertitude fragilise directement la position en contrôle." };
    default: return null;
  }
}

// Bloc 7 — VM : logique ternaire (Q7.0 × Q7.0bis × Q7.1)
function verdictBloc7(a) {
  if (!a['Q0.1'] || a['Q0.1'] === '1-10') return null;
  if (!a['Q7.0'] || a['Q7.0'] === 'non')  return null;
  if (a['Q7.0bis'] === 'non')             return null;

  // Assujettissement confirmé si Q7.0 = oui-seuil-long ET Q7.0bis = oui
  const assujetti = (a['Q7.0'] === 'oui-seuil-long' && a['Q7.0bis'] === 'oui');

  switch (a['Q7.1']) {
    case 'oui':
      if (assujetti) return { level: 'REDUIT',
        text: "Votre entreprise verse le versement mobilité. Rassurant sur la prise en compte du sujet, sans suffire à établir la conformité du paramétrage. Vigilance sur le rattachement des salariés à la bonne zone, le bon taux selon le lieu d'affectation réel, et la mise à jour des taux." };
      return { level: 'MOYEN',
        text: "Votre entreprise verse le versement mobilité, alors même que l'assujettissement n'est pas encore clairement établi. ACOMPIA recommande de vérifier la date exacte d'assujettissement et la zone de rattachement des salariés." };
    case 'non':
      if (assujetti) return { level: 'ELEVE',
        text: "Votre entreprise ne verse pas le versement mobilité alors que les deux conditions d'assujettissement paraissent réunies. Les sommes non versées depuis la date d'exigibilité sont susceptibles d'être réclamées dans la limite de la prescription. ACOMPIA recommande une reconstitution immédiate de la date d'assujettissement, du périmètre et des taux." };
      return { level: 'MOYEN',
        text: "Votre entreprise ne verse pas le versement mobilité, mais l'assujettissement n'est pas encore établi avec certitude. ACOMPIA recommande de reconstituer l'effectif annuel, la date éventuelle de franchissement du seuil et l'existence de salariés affectés dans une zone couverte." };
    case 'nsp':
      return { level: 'ELEVE',
        text: "L'entreprise n'a pas de visibilité claire sur le versement effectif du VM. Cette absence de maîtrise peut révéler soit un assujettissement non identifié, soit un paramétrage non vérifié." };
    default: return null;
  }
}


/* ============================================================
   Construction des thèmes du rapport à partir des réponses
   Chaque thème agrège 0..n verdicts -> on retient le plus haut.
   ============================================================ */

function buildThemes(a) {
  const themes = [];

  // --- BLOC 1 — Frais professionnels
  if (a['Q1.1'] === 'oui' || a['Q1.5'] === 'oui' || a['Q1.5'] === 'nsp') {
    const verdicts = [];
    if (a['Q1.1'] === 'oui') {
      [verdictQ1_2(a['Q1.2']), verdictQ1_4(a['Q1.4'])].forEach(v => v && verdicts.push(v));
    }
    const v15 = verdictQ1_5(a['Q1.5']);
    if (v15) verdicts.push(v15);
    if (verdicts.length) {
      themes.push({
        key: 'frais-pro', name: 'Bloc 1 — Frais professionnels',
        verdicts
      });
    }
  }

  // --- BLOC 1bis — Titres-restaurant
  if (a['Q1bis.1'] === 'oui' || a['Q1bis.1'] === 'nsp') {
    const v = verdictQ1bis_2(a['Q1bis.2']);
    if (v) themes.push({
      key: 'titres-resto', name: 'Bloc 1bis — Titres-restaurant',
      verdicts: [v]
    });
  }

  // --- BLOC 2 — Complémentaire santé
  {
    const verdicts = [];
    const v2a = verdictQ2_1a(a['Q2.1a']);
    if (v2a) verdicts.push(v2a);
    if (a['Q2.1a'] === 'due') {
      const v2b = verdictQ2_1b(a['Q2.1b']);
      if (v2b) verdicts.push(v2b);
    }
    const v23 = verdictQ2_3(a['Q2.3']);
    if (v23) verdicts.push(v23);
    if (verdicts.length) themes.push({
      key: 'compl-sante', name: 'Bloc 2 — Complémentaire santé — acte fondateur et dispenses',
      verdicts,
      // indicateur pour afficher l'encart dispenses si Q2.3 a un verdict ELEVE ou CRITIQUE
      showDispensesBox: v23 && (v23.level === 'ELEVE' || v23.level === 'CRITIQUE')
    });
  }

  // --- BLOC 3 — Temps de travail & rémunérations
  {
    const verdicts = [];
    if (a['Q3.1'] && a['Q3.1'] !== 'non') {
      const v32 = verdictQ3_2(a['Q3.2']); if (v32) verdicts.push(v32);
    }
    const v33 = verdictQ3_3(a['Q3.3']); if (v33) verdicts.push(v33);
    const v34 = verdictQ3_4(a['Q3.4']); if (v34) verdicts.push(v34);
    const v35 = verdictQ3_5(a['Q3.5']); if (v35) verdicts.push(v35);
    if (verdicts.length) themes.push({
      key: 'temps-travail', name: 'Bloc 3 — Temps de travail et rémunérations',
      verdicts
    });
  }

  // --- BLOC 4 — RGDU
  if (a['Q4.1'] && a['Q4.1'] !== 'aucun') {
    const v = verdictQ4_2(a['Q4.2']);
    if (v) themes.push({
      key: 'rgdu', name: 'Bloc 4 — Réduction générale dégressive unique (RGDU)',
      verdicts: [v]
    });
  }

  // --- BLOC 5 — AEN véhicule
  {
    const v = verdictBloc5(a);
    if (v) themes.push({
      key: 'aen-vehicule', name: 'Bloc 5 — AEN véhicule',
      verdicts: [v],
      fleet: a['Q5.fleet'] || null
    });
  }

  // --- BLOC 6 — Ruptures
  if (a['Q6.1'] === 'oui' || a['Q6.1'] === 'nsp') {
    const v = verdictQ6_2(a['Q6.2']);
    if (v) themes.push({
      key: 'ruptures', name: 'Bloc 6 — Ruptures et transactions',
      verdicts: [v]
    });
  }

  // --- BLOC 7 — Versement mobilité
  {
    const v = verdictBloc7(a);
    if (v) themes.push({
      key: 'vm', name: 'Bloc 7 — Versement mobilité',
      verdicts: [v]
    });
  }

  // Détermination du niveau max de chaque thème (priorité CRITIQUE > ELEVE > MOYEN > REDUIT)
  themes.forEach(t => {
    t.level = 'REDUIT';
    t.verdicts.forEach(v => {
      if (NIVEAUX_PAR_GRAVITE.indexOf(v.level) < NIVEAUX_PAR_GRAVITE.indexOf(t.level)) t.level = v.level;
    });
  });

  return themes;
}


/* ============================================================
   Scoring principal — indice d'exposition /100 (HAUT = risque)
   ============================================================ */

function computeScoring(answers) {
  const themes = buildThemes(answers);

  // Somme des coefficients selon le niveau de chaque thème activé
  let brut = 0;
  themes.forEach(t => { brut += (LEVEL_COEF[t.level] ?? 0); });

  const maxPossible = themes.length * LEVEL_MAX;
  const indice = maxPossible === 0 ? 0 : Math.round((brut / maxPossible) * 100);

  let seuil, seuilLabel, seuilColor;
  if (indice <= 29)      { seuil = 'maitrisee'; seuilLabel = 'Exposition maîtrisée'; seuilColor = '#059669'; }
  else if (indice <= 59) { seuil = 'moderee';   seuilLabel = 'Exposition modérée';   seuilColor = '#D97706'; }
  else                   { seuil = 'forte';     seuilLabel = 'Exposition forte';     seuilColor = '#DC2626'; }

  // Méta : aggravants transversaux
  const meta = {
    reiteration: (answers['Q0.4'] === 'oui-obs' || answers['Q0.4'] === 'oui-redress'),
    multiSite:   (answers['Q0.3bis'] === 'multi'),
    effectif:    answers['Q0.1'] || null,
    secteur:     answers['Q0.3'] || null
  };

  return { indice, seuil, seuilLabel, seuilColor, themes, answers, meta };
}


/* ============================================================
   GÉNÉRATION DU RAPPORT HTML — 4 blocs A / B / C / D
   ============================================================ */

function levelPill(level) {
  const color = LEVEL_COLOR[level] || '#9BA3B8';
  const label = LEVEL_LABEL[level] || '—';
  return `<span class="rpt-pill" style="background:${color}1A;color:${color};border:1px solid ${color}55">${label}</span>`;
}

// Encart juridique §4.5 complémentaire santé / dispenses (arbitrage #11)
function encartDispenses() {
  return `
    <div class="rpt-encart-law">
      <div class="rpt-encart-law-title">Conditions d'exonération des dispenses de complémentaire santé</div>
      <p>Pour que les dispenses d'adhésion au régime de complémentaire santé soient valablement opposables à l'URSSAF, trois conditions cumulatives doivent être respectées :</p>
      <ol>
        <li><strong>Un fondement juridique valable</strong> : soit un acte fondateur (DUE, accord collectif, référendum) prévoyant expressément le cas de dispense, soit une dispense d'ordre public prévue directement par la réglementation (ex. salarié déjà couvert à titre obligatoire comme ayant droit, CDD très courts, etc.)</li>
        <li><strong>Chaque dispense doit entrer dans l'un des cas limitativement énumérés</strong> par l'article R. 242-1-6 du Code de la sécurité sociale</li>
        <li><strong>La demande de dispense doit être écrite, datée, signée</strong> par le salarié et conservée par l'employeur avec ses justificatifs à jour</li>
      </ol>
      <p>À défaut, le caractère collectif et obligatoire du régime est remis en cause et l'ensemble des cotisations patronales peut être réintégré dans l'assiette.</p>
    </div>
  `;
}

// Encart module ANV — ne s'affiche que si Bloc 5 = ELEVE ou CRITIQUE (arbitrage #10)
function grilleANV(fleetAnswer) {
  return `
    <div class="rpt-anv">
      <h4>Le module Avantage en nature véhicule</h4>
      <p class="rpt-anv-mention">Surveillance continue de la conformité de votre flotte, à partir de 89 € HT/mois (tarif au véhicule, dégressif). Ouverture en septembre 2026. Les entreprises fondatrices bénéficient de la mise en route offerte et de leur diagnostic livré avant la rentrée.</p>
      <a href="#fondateurs" class="btn-primary rpt-anv-cta">Découvrir l'offre fondatrice →</a>
    </div>
  `;
}

function disclaimerFinal() {
  return `
    <div class="rpt-disclaimer">
      <p><strong>Prédiagnostic non contractuel.</strong> Ce rapport est établi sur la base exclusive de vos réponses déclaratives. Il ne constitue ni un audit au sens de l'art. R. 243-59 CSS, ni une consultation juridique au sens de la loi n° 71-1130 du 31 décembre 1971. Il n'est pas opposable à l'URSSAF ni devant une juridiction.</p>
      <p>Responsable de traitement : ComplyDB SAS (ACOMPIA). Les données de diagnostic sont anonymisées et conservées 36 mois ; les coordonnées sont conservées 3 ans après le dernier contact. Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et, le cas échéant, de portabilité. Contact : <a href="mailto:${ACOMPIA_CONFIG.contactEmail}">${ACOMPIA_CONFIG.contactEmail}</a>.</p>
    </div>
  `;
}

/* --- Bloc A — Couverture : jauge d'exposition et cadrage --- */
function renderCouverture(scoring, contact) {
  const { indice, seuilLabel, seuilColor } = scoring;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  // Jauge visuelle : barre horizontale 0 -> 100 avec marqueur
  const gaugePct = Math.max(0, Math.min(100, indice));
  // Nom saisi par le visiteur : échappé avant concaténation dans du HTML
  const destinataire = contact && contact.name
    ? 'Préparé pour ' + echapperHTML(contact.name) + ' · '
    : '';

  return `
    <section class="rpt-block rpt-blockA">
      <div class="rpt-cover">
        <div class="rpt-cover-top">
          <div class="rpt-cover-brand">ACOMPIA</div>
          <div class="rpt-cover-date">${dateStr}</div>
        </div>
        <h2 class="rpt-cover-title">Prédiagnostic URSSAF</h2>
        <p class="rpt-cover-sub">${destinataire}Confidentiel — non contractuel</p>

        <div class="rpt-gauge">
          <div class="rpt-gauge-label">Indice d'exposition URSSAF</div>
          <div class="rpt-gauge-track">
            <div class="rpt-gauge-fill" style="width:${gaugePct}%;background:${seuilColor}"></div>
            <div class="rpt-gauge-marker" style="left:calc(${gaugePct}% - 2px)"></div>
          </div>
          <div class="rpt-gauge-scale">
            <span>0 – 29 · Maîtrisée</span>
            <span>30 – 59 · Modérée</span>
            <span>60 – 100 · Forte</span>
          </div>
          <div class="rpt-gauge-value" style="color:${seuilColor}">
            <span class="rpt-gauge-number">${indice}</span><span class="rpt-gauge-denom">/100</span>
            <span class="rpt-gauge-seuil">${seuilLabel}</span>
          </div>
        </div>

        <div class="rpt-cover-intro">
          <p>Ce rapport synthétise votre exposition aux principaux risques de redressement URSSAF, sur la base de vos réponses déclaratives. Il vise à identifier rapidement vos zones de vigilance. Il ne constitue ni un audit, ni une consultation juridique et n'est pas opposable à l'URSSAF.</p>
        </div>
      </div>
    </section>
  `;
}

const ACCROCHE_PAR_SEUIL = {
  forte:     "Plusieurs signaux à fort enjeu ressortent de votre prédiagnostic. Une revue approfondie est recommandée avant tout contrôle.",
  moderee:   "Votre exposition est modérée mais plusieurs points de vigilance nécessitent une vérification ciblée.",
  maitrisee: "Votre exposition paraît maîtrisée. Nous recommandons tout de même un test de robustesse ponctuel sur les thèmes activés."
};

/* Trie les thèmes du plus risqué au moins risqué. */
function trierParNiveau(themes) {
  return [...themes].sort((x, y) =>
    NIVEAUX_PAR_GRAVITE.indexOf(x.level) - NIVEAUX_PAR_GRAVITE.indexOf(y.level));
}

function estThemeAlerte(theme) {
  return theme.level === 'CRITIQUE' || theme.level === 'ELEVE';
}

/* Abréviations juridiques fréquentes dans les verdicts : un point qui les suit
   ne termine pas une phrase. Sans cette liste, « exigées par l'art. L. 3121-65
   C. trav. Les conventions… » se coupait après « l'art. ». */
const ABREVIATIONS = ['art', 'L', 'R', 'D', 'C', 'trav', 'ex', 'etc', 'al', 'n°', 'CSS', 'CDD'];

/* Première phrase complète du verdict, pour le résumé du Top 3. */
function premierePhrase(texte) {
  const finDePhrase = /[.!?]\s+(?=[A-ZÀ-Ý])/g;
  let occurrence;
  while ((occurrence = finDePhrase.exec(texte)) !== null) {
    const motPrecedent = (texte.slice(0, occurrence.index).match(/([\wÀ-ÿ°]+)$/) || [])[1] || '';
    if (ABREVIATIONS.includes(motPrecedent)) continue;
    return texte.slice(0, occurrence.index + 1);
  }
  return texte;
}

function renderTop3(themesTries) {
  const top3 = themesTries.filter(estThemeAlerte).slice(0, 3);
  if (!top3.length) {
    return '<p class="rpt-muted">Aucun thème ne ressort à un niveau ÉLEVÉ ou CRITIQUE à ce stade.</p>';
  }
  return '<ol class="rpt-top3">' + top3.map(t => {
    // On prend le premier verdict dont le niveau correspond au niveau max du thème
    // (sinon on tombait sur un verdict RÉDUIT contradictoire avec le pill CRITIQUE)
    const v = t.verdicts.find(v => v.level === t.level) || t.verdicts[0];
    return `
      <li>
        <div class="rpt-top3-title">${t.name} ${levelPill(t.level)}</div>
        <p>${premierePhrase(v.text)}</p>
      </li>
    `;
  }).join('') + '</ol>';
}

/* --- Bloc B — Synthèse dirigeant : accroche, aggravants, top 3 --- */
function renderSyntheseDirigeant(scoring, themesTries) {
  const { meta } = scoring;
  const accroche = ACCROCHE_PAR_SEUIL[scoring.seuil];
  const aUneAlerte = themesTries.some(estThemeAlerte);

  return `
    <section class="rpt-block rpt-blockB">
      <h3 class="rpt-block-title">Synthèse dirigeant</h3>
      <p class="rpt-accroche">${accroche}</p>

      ${meta.reiteration ? `<div class="rpt-aggrav"><strong>Aggravant transversal — Réitération.</strong> Un contrôle URSSAF antérieur a donné lieu à observation ou redressement. En cas de persistance d'une pratique déjà observée, une majoration de 10 % peut s'appliquer (art. L. 243-7-6 CSS).</div>` : ''}
      ${meta.multiSite ? `<div class="rpt-aggrav"><strong>Multi-sites.</strong> Plusieurs lieux d'affectation peuvent fausser un taux unique de versement mobilité. Vérification dédiée recommandée.</div>` : ''}

      <h4 class="rpt-sub">Top 3 des thèmes à plus fort risque</h4>
      ${renderTop3(themesTries)}
      ${aUneAlerte ? `<p class="rpt-muted rpt-see-detail">Le détail de chaque thème et les éléments justificatifs figurent dans l'analyse détaillée ci-dessous.</p>` : ''}
    </section>
  `;
}

const MENTION_NON_CHIFFRABLE = `<p class="rpt-chiffrage rpt-chiffrage-qual"><em>Exposition non chiffrable à ce stade — un audit ciblé permet de quantifier précisément l'enjeu à partir de vos données réelles (montants, volumes, effectifs concernés).</em></p>`;

/* RÈGLE : pour chaque thème, on n'affiche que les verdicts du niveau max du thème.
   Un thème CRITIQUE n'affiche pas ses sous-réponses RÉDUIT ou MOYEN (incohérence
   visuelle + bruit pour le dirigeant). Exception : si le thème est RÉDUIT, on affiche
   le verdict rassurant pour montrer que c'est maîtrisé. */
function renderTheme(theme) {
  const verdictsHTML = theme.verdicts
    .filter(v => v.level === theme.level)
    .map(v => `<p class="rpt-verdict rpt-verdict-${v.level.toLowerCase()}">${v.text}</p>`)
    .join('');

  const chiffrageHTML = theme.level !== 'REDUIT' ? MENTION_NON_CHIFFRABLE : '';
  // Encart dispenses si le thème complémentaire santé ressort avec alerte sur les dispenses
  const extra = (theme.key === 'compl-sante' && theme.showDispensesBox) ? encartDispenses() : '';

  return `
    <article class="rpt-theme">
      <header class="rpt-theme-header">
        <h4>${theme.name}</h4>
        ${levelPill(theme.level)}
      </header>
      <div class="rpt-theme-body">
        ${verdictsHTML}
        ${chiffrageHTML}
        ${extra}
      </div>
    </article>
  `;
}

/* --- Bloc C — Analyse détaillée par thème --- */
function renderAnalyseDetaillee(themesTries) {
  const corps = themesTries.length
    ? themesTries.map(renderTheme).join('')
    : '<p class="rpt-muted">Aucun thème activé.</p>';

  return `
    <section class="rpt-block rpt-blockC">
      <h3 class="rpt-block-title">Analyse détaillée par thème</h3>
      ${corps}
    </section>
  `;
}

// Recos pratiques personnalisées selon les thèmes CRITIQUE/ÉLEVÉ du prospect
const RECO_PAR_THEME = {
  'frais-pro':     "<strong>Frais professionnels.</strong> Reconstituer les justificatifs (cartes grises, relevés kilométriques, notes de frais) sur 3 ans, vérifier l'usage des barèmes URSSAF et tracer la DFS si applicable.",
  'titres-resto':  "<strong>Titres-restaurant.</strong> Auditer le paramétrage paie : participation employeur 50–60 %, un titre par repas dans l'horaire journalier, part patronale ≤ 7,32 € (2026). Rectifier si dépassement.",
  'compl-sante':   "<strong>Complémentaire santé — dispenses.</strong> Vérifier l'existence d'un acte fondateur valide (DUE, accord, référendum) couvrant chaque cas, collecter les demandes signées à jour et leurs justificatifs, confirmer l'éligibilité aux dispenses d'ordre public.",
  'temps-travail': "<strong>Temps de travail et rémunérations.</strong> Sécuriser les forfaits jours (conventions individuelles, suivi charge, entretiens annuels), documenter les heures supplémentaires et basculer toute rémunération hors paie dans le circuit DSN.",
  'rgdu':          "<strong>RGDU / Réduction générale.</strong> Faire recalculer la réduction sur 3 ans (paramétrage, SMIC, primes, absences) et documenter les écarts par rapport à la DSN.",
  'aen-vehicule':  "<strong>Avantage en nature véhicule.</strong> Recenser la flotte, qualifier l'usage (professionnel strict vs mixte), choisir le mode d'évaluation (réel ou forfait) et produire des attestations d'usage signées.",
  'ruptures':      "<strong>Ruptures et transactions.</strong> Reconstituer les protocoles transactionnels, vérifier la ventilation indemnités imposables / non imposables et justifier le caractère indemnitaire des sommes versées.",
  'vm':            "<strong>Versement mobilité.</strong> Contrôler le taux applicable par commune d'affectation réelle des salariés et, en multi-sites, ventiler les déclarations DSN en conséquence."
};

const NB_MAX_RECOS = 4;

function renderPremiereEtape(themesAlerte) {
  if (!themesAlerte.length) {
    return `<li><strong>Maintenir la vigilance.</strong> Aucun thème ne ressort en ÉLEVÉ ou CRITIQUE — un test de robustesse annuel reste recommandé pour confirmer la maîtrise documentaire.</li>`;
  }
  const recosHTML = themesAlerte
    .slice(0, NB_MAX_RECOS)
    .map(t => RECO_PAR_THEME[t.key])
    .filter(Boolean)
    .map(txt => `<li>${txt}</li>`)
    .join('');

  return `<li><strong>Actions prioritaires sur vos thèmes à risque.</strong> Voici, <em>à titre non exhaustif</em>, quelques chantiers concrets à engager en priorité. Un audit permettra notamment d'affiner ces recommandations en fonction de votre situation précise et de votre documentation réelle :<ul class="rpt-substeps">${recosHTML}</ul><p class="rpt-substeps-note">Cette liste est indicative. D'autres axes peuvent émerger selon le contexte opérationnel, conventionnel et documentaire propre à votre entreprise — c'est l'objet de l'audit ciblé.</p></li>`;
}

/* --- Bloc D — Passage à l'action : étapes, offre ANV, prise de rendez-vous --- */
function renderPassageAction(themes, themesTries) {
  const aenTheme = themes.find(t => t.key === 'aen-vehicule');
  const showANV = aenTheme && estThemeAlerte(aenTheme);

  return `
    <section class="rpt-block rpt-blockD">
      <h3 class="rpt-block-title">Passage à l'action</h3>

      <h4 class="rpt-sub">Prochaines étapes recommandées</h4>
      <ol class="rpt-steps">
        ${renderPremiereEtape(themesTries.filter(estThemeAlerte))}
        <li><strong>Échanger avec ACOMPIA.</strong> 30 minutes de cadrage sans engagement pour affiner votre exposition réelle, hiérarchiser les chantiers et choisir le bon niveau d'intervention.</li>
        <li><strong>Planifier l'audit adapté.</strong> Revue flash (1 thème), audit ciblé (par exemple AEN véhicule) ou accompagnement global selon les enjeux identifiés ensemble.</li>
      </ol>

      ${showANV ? grilleANV(aenTheme.fleet) : ''}

      <div class="rpt-cta-main">
        <h4>Discuter de votre prédiagnostic avec ACOMPIA</h4>
        <p>Échange de 30 minutes, sans engagement, pour prioriser vos actions.</p>
        <a href="${ACOMPIA_CONFIG.rdvURL}" target="_blank" rel="noopener" class="btn-primary">Prendre rendez-vous →</a>
      </div>

      ${disclaimerFinal()}

      <div class="rpt-print">
        <button type="button" onclick="window.print()" class="rpt-print-btn">Imprimer ou sauvegarder en PDF</button>
      </div>
    </section>
  `;
}

/* CTA Calendly sticky mobile-friendly */
function renderCTASticky() {
  return `
    <div class="rpt-sticky-cta">
      <a href="${ACOMPIA_CONFIG.rdvURL}" target="_blank" rel="noopener">
        Prendre rendez-vous — échange de 30 minutes
      </a>
    </div>
  `;
}

function generateReportHTML(scoring, contact) {
  const themesTries = trierParNiveau(scoring.themes);

  return `
    <div class="acompia-report" id="acompia-report">
      ${renderCouverture(scoring, contact)}
      ${renderSyntheseDirigeant(scoring, themesTries)}
      ${renderAnalyseDetaillee(themesTries)}
      ${renderPassageAction(scoring.themes, themesTries)}
    </div>
    ${renderCTASticky()}
  `;
}

// Exposition globale — le script s'exécute en global scope.
/* Les déclarations `function` de premier niveau d'un script classique sont
   déjà exposées globalement : aucune réaffectation sur `window` n'est utile. */
