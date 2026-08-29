/* ============================================
   ACOMPIA — Moteur de scoring & rapport
   Refonte 15/04/2026 — matrice de concordance Sabrina
   ============================================

   DEUX EXPORTS :
     - computeScoring(answers)  -> { seuil, themes, meta }
     - generateReportHTML(scoring, contact) -> HTML long format du rapport

   Le résultat global suit le niveau le plus élevé détecté.
   Aucun score sur 100 n'est affiché ni calculé dans la version courte.
*/
const LEVEL_LABEL = {
  CRITIQUE: 'VIGILANCE FORTE',
  ELEVE:    'VIGILANCE ÉLEVÉE',
  MOYEN:    'VIGILANCE MODÉRÉE',
  REDUIT:   'VIGILANCE RÉDUITE'
};
const LEVEL_COLOR = {
  CRITIQUE: '#EF4444',
  ELEVE:    '#F59E0B',
  MOYEN:    '#F59E0B',
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
      text: "Les éléments déclarés paraissent permettre de justifier les frais remboursés. Selon la nature du remboursement, il faut pouvoir établir la dépense réelle ou les circonstances de fait ouvrant droit à l'allocation forfaitaire." };
    case 'certains': return { level: 'ELEVE',
      text: "La justification des frais apparaît partielle. Pour les remboursements ou indemnités qui ne peuvent pas être rattachés à une dépense identifiable ou à une situation ouvrant droit clairement établie, l'exclusion d'assiette est fragilisée. ACOMPIA propose une cartographie des flux de frais par nature et par salarié." };
    case 'non': return { level: 'CRITIQUE',
      text: "L'absence déclarée d'éléments permettant d'établir la dépense ou les circonstances ouvrant droit constitue un signal de vigilance forte. La nature des remboursements et les pièces disponibles doivent être examinées avant de conclure sur leur traitement social." };
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
      text: "L'absence déclarée de preuve de remise de la DUE constitue un signal de vigilance forte. Il faut vérifier l'acte, les modalités d'information des salariés et la situation de chaque salarié concerné avant de conclure sur le régime social des contributions patronales." };
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
      text: "Des heures effectuées au-delà de la durée habituelle ne sont pas systématiquement déclarées en paie ni en DSN. Cette situation peut appeler une régularisation de cotisations. Une éventuelle qualification de travail dissimulé suppose en outre de caractériser l'élément intentionnel." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'incertitude sur la déclaration et le décompte des heures constitue un signal d'exposition direct." };
    default: return null;
  }
}

function verdictQ3_3(v) {
  switch (v) {
    case 'oui-tous': return { level: 'REDUIT',
      text: "Les trois éléments interrogés paraissent présents. Cette réponse ne suffit pas à vérifier l'accord collectif, l'éligibilité de chaque salarié ni l'effectivité du suivi de la charge de travail." };
    case 'partiel': return { level: 'ELEVE',
      text: "Le dispositif forfait jours n'est pas intégralement sécurisé. Pour les salariés dont la convention individuelle est absente, dont le suivi est insuffisant ou dont l'entretien annuel n'est pas formalisé, la convention est fragilisée et peut être déclarée inopposable." };
    case 'non': return { level: 'CRITIQUE',
      text: "L'absence déclarée de convention écrite, de suivi des jours ou d'entretien sur la charge de travail constitue un signal de vigilance forte. La validité de chaque forfait doit être appréciée au regard de l'accord collectif et des articles L. 3121-55, L. 3121-60, L. 3121-64 et L. 3121-65 du Code du travail. Si le forfait est privé d'effet, un rappel d'heures supplémentaires peut en résulter." };
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
      text: "Certaines sommes déclarées comme versées hors paie ou DSN doivent être qualifiées selon leur nature et leur objet. Elles peuvent appeler une régularisation de cotisations. Une éventuelle qualification de travail dissimulé suppose en outre d'établir l'élément intentionnel." };
    case 'non-hors': return { level: 'CRITIQUE',
      text: "Le versement déclaré de sommes hors paie et DSN constitue un signal de vigilance forte. Leur nature, leur assujettissement et leur déclaration doivent être vérifiés. Une éventuelle qualification de travail dissimulé ne peut être retenue sans caractériser l'élément intentionnel." };
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
      text: "L'absence déclarée de contrôle du paramétrage de la RGDU constitue un signal de vigilance forte. Le calcul, la rémunération retenue, le Smic de référence, les ajustements et la régularisation doivent être vérifiés sur les données 2026." };
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
        text: "L'absence déclarée d'éléments établissant l'usage exclusivement professionnel constitue un signal de vigilance forte. L'usage réel de chaque véhicule doit être vérifié avant de déterminer si un avantage en nature doit être évalué." };
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
        text: "L'absence déclarée d'évaluation pour des véhicules dont l'usage personnel n'est pas exclu constitue un signal de vigilance forte. Il faut vérifier les usages, les dates de mise à disposition et la méthode applicable avant de déterminer l'assiette et une éventuelle régularisation." };
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
      text: "Le traitement social des sommes paraît avoir été revu selon leur nature et leur date de versement. Pour les ruptures conventionnelles et mises à la retraite concernées, la contribution patronale de 40 % porte sur la part exclue de l'assiette des cotisations selon l'article L. 137-12 du Code de la sécurité sociale." };
    case 'revue-ant': return { level: 'MOYEN',
      text: "Une revue du traitement social a été effectuée, mais elle est antérieure à l'entrée en vigueur des règles applicables depuis le 31 décembre 2025 sur certaines indemnités relevant de l'art. L. 137-12 CSS. ACOMPIA recommande une revue ciblée des dossiers postérieurs au 31 décembre 2025." };
    case 'non-revue': return { level: 'CRITIQUE',
      text: "L'absence déclarée de revue du traitement social des ruptures et transactions constitue un signal de vigilance forte. Chaque dossier doit être examiné selon la nature des sommes, leur régime fiscal et social et la date de versement. L'article L. 137-12 du Code de la sécurité sociale doit être vérifié pour les ruptures conventionnelles et mises à la retraite concernées." };
    case 'nsp': return { level: 'ELEVE',
      text: "L'entreprise n'a pas de visibilité claire sur la qualité et l'actualité de la revue du traitement social appliqué aux ruptures et transactions. Sur ce thème techniquement complexe, cette incertitude fragilise directement la position en contrôle." };
    default: return null;
  }
}

// Bloc 7 — VM : logique ternaire (Q7.0 × Q7.0bis × Q7.1)
function verdictBloc7(a) {
  if (!a['Q0.1'] || a['Q0.1'] === '1-10') return null;
  if (!a['Q7.0bis'] || a['Q7.0bis'] === 'non') return null;

  switch (a['Q7.1']) {
    case 'oui':
      return { level: 'REDUIT',
        text: "Le taux et la déclaration du versement mobilité font l'objet d'un contrôle selon le lieu d'affectation déclaré. Ce point paraît maîtrisé, sous réserve de vérifier la zone, le taux et la date d'effet sur les données réelles." };
    case 'non':
      return { level: 'ELEVE',
        text: "L'absence de contrôle du taux et de la déclaration selon le lieu d'affectation constitue un signal de vigilance élevé. Une revue des zones, des taux et de la DSN est nécessaire pour confirmer l'exposition." };
    case 'nsp':
      return { level: 'ELEVE',
        text: "L'entreprise n'a pas de visibilité claire sur le contrôle du versement mobilité. Une revue des lieux d'affectation, des taux et de la DSN est nécessaire pour déterminer la situation réelle." };
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
        key: 'frais-pro', name: 'Bloc 1 — Frais professionnels', icon: '',
        verdicts, chiffrageType: 'qualitatif',
        // thème potentiellement à fort enjeu si CRITIQUE → chiffrage fourchette
        majorEnjeu: false
      });
    }
  }

  // --- BLOC 1bis — Titres-restaurant
  if (a['Q1bis.1'] === 'oui' || a['Q1bis.1'] === 'nsp') {
    const v = verdictQ1bis_2(a['Q1bis.2']);
    if (v) themes.push({
      key: 'titres-resto', name: 'Bloc 1bis — Titres-restaurant', icon: '',
      verdicts: [v], chiffrageType: 'qualitatif', majorEnjeu: false
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
      key: 'compl-sante', name: 'Bloc 2 — Complémentaire santé — acte fondateur et dispenses', icon: '',
      verdicts, chiffrageType: 'qualitatif', majorEnjeu: false,
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
      key: 'temps-travail', name: 'Bloc 3 — Temps de travail et rémunérations', icon: '',
      verdicts, chiffrageType: 'fourchette', majorEnjeu: true
    });
  }

  // --- BLOC 4 — RGDU
  if (a['Q4.2']) {
    const v = verdictQ4_2(a['Q4.2']);
    if (v) themes.push({
      key: 'rgdu', name: 'Bloc 4 — Réduction générale dégressive unique (RGDU)', icon: '',
      verdicts: [v], chiffrageType: 'qualitatif', majorEnjeu: false
    });
  }

  // --- BLOC 5 — AEN véhicule
  {
    const v = verdictBloc5(a);
    if (v) themes.push({
      key: 'aen-vehicule', name: 'Bloc 5 — AEN véhicule', icon: '',
      verdicts: [v], chiffrageType: 'fourchette', majorEnjeu: true,
      fleet: a['Q5.fleet'] || null
    });
  }

  // --- BLOC 6 — Ruptures
  if (a['Q6.1'] === 'oui' || a['Q6.1'] === 'nsp') {
    const v = verdictQ6_2(a['Q6.2']);
    if (v) themes.push({
      key: 'ruptures', name: 'Bloc 6 — Ruptures et transactions', icon: '',
      verdicts: [v], chiffrageType: 'fourchette', majorEnjeu: true
    });
  }

  // --- BLOC 7 — Versement mobilité
  {
    const v = verdictBloc7(a);
    if (v) themes.push({
      key: 'vm', name: 'Bloc 7 — Versement mobilité', icon: '',
      verdicts: [v], chiffrageType: 'qualitatif', majorEnjeu: false
    });
  }

  // Détermination du niveau max de chaque thème (priorité CRITIQUE > ELEVE > MOYEN > REDUIT)
  const prio = ['CRITIQUE', 'ELEVE', 'MOYEN', 'REDUIT'];
  themes.forEach(t => {
    t.level = 'REDUIT';
    t.verdicts.forEach(v => {
      if (prio.indexOf(v.level) < prio.indexOf(t.level)) t.level = v.level;
    });
  });

  return themes;
}


/* ============================================================
   Résultat principal — niveau de vigilance global
   ============================================================ */

function computeScoring(answers) {
  const themes = buildThemes(answers);

  const levels = themes.map(t => t.level);
  let seuil, seuilLabel, seuilColor, seuilEmoji;
  if (levels.includes('CRITIQUE')) {
    seuil = 'forte'; seuilLabel = 'Vigilance forte'; seuilColor = '#DC2626'; seuilEmoji = '';
  } else if (levels.includes('ELEVE') || levels.includes('MOYEN')) {
    seuil = 'moderee'; seuilLabel = 'Vigilance modérée'; seuilColor = '#D97706'; seuilEmoji = '';
  } else {
    seuil = 'reduite'; seuilLabel = 'Vigilance réduite'; seuilColor = '#059669'; seuilEmoji = '';
  }

  // Méta : aggravants transversaux
  const meta = {
    reiteration: (answers['Q0.4'] === 'oui-obs' || answers['Q0.4'] === 'oui-redress'),
    multiSite:   (answers['Q0.3bis'] === 'multi'),
    effectif:    answers['Q0.1'] || null,
    secteur:     answers['Q0.3'] || null
  };

  return { seuil, seuilLabel, seuilColor, seuilEmoji, themes, answers, meta };
}


/* ============================================================
   Fourchette d'exposition pour un thème à fort enjeu
   Règle Sabrina : effectif × SMIC annuel brut 2026 (~22 000 €) ×
   42 % cotisations × 5 ans. Fourchette large pour rester honnête.
   ============================================================ */

function effectifMedian(eff) {
  switch (eff) {
    case '1-10':   return 5;
    case '11-49':  return 25;
    case '50-249': return 120;
    case '250+':   return 400;
    default:       return 10;
  }
}

function formatEUR(n) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

// Renvoie une chaîne "entre X € et Y €" adaptée au niveau et à l'effectif
function computeFourchette(theme, meta) {
  const n = effectifMedian(meta.effectif);
  const SMIC = 22000;
  const COT  = 0.42;
  // Intensités typiques (part de la masse touchée par le risque)
  const intensite = { CRITIQUE: [0.05, 0.25], ELEVE: [0.02, 0.12], MOYEN: [0.005, 0.04], REDUIT: [0, 0.01] };
  const range = intensite[theme.level] || [0, 0.01];
  // 5 ans = prescription TD ; 3 ans pour les autres — on prend 3 ans pour la borne basse, 5 ans pour la haute
  const lo = n * SMIC * COT * range[0] * 3;
  const hi = n * SMIC * COT * range[1] * 5;
  // Arrondis "commerciaux"
  const roundTo = (x, step) => Math.round(x / step) * step;
  const step = hi > 50000 ? 5000 : 1000;
  return 'entre ' + formatEUR(Math.max(roundTo(lo, step), 1000)) +
         ' et ' + formatEUR(roundTo(hi, step)) + ' selon l\'ampleur réelle';
}

// Fourchette agrégée (somme des bornes basses/hautes des thèmes à fourchette ELEVE ou CRITIQUE)
function computeFourchetteAgregee(scoring) {
  const thèmes = scoring.themes.filter(t =>
    t.chiffrageType === 'fourchette' &&
    (t.level === 'ELEVE' || t.level === 'CRITIQUE')
  );
  if (!thèmes.length) return null;
  const n = effectifMedian(scoring.meta.effectif);
  const SMIC = 22000, COT = 0.42;
  let lo = 0, hi = 0;
  thèmes.forEach(t => {
    const r = (t.level === 'CRITIQUE') ? [0.05, 0.25] : [0.02, 0.12];
    lo += n * SMIC * COT * r[0] * 3;
    hi += n * SMIC * COT * r[1] * 5;
  });
  const step = hi > 100000 ? 10000 : 5000;
  const rnd = (x) => Math.round(x / step) * step;
  return 'entre ' + formatEUR(Math.max(rnd(lo), 5000)) + ' et ' + formatEUR(rnd(hi));
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
      <a href="/solution/#fondateurs" class="btn-primary rpt-anv-cta">Découvrir l'offre fondatrice →</a>
    </div>
  `;
}

function disclaimerFinal() {
  return `
    <div class="rpt-disclaimer">
      <p><strong>Prédiagnostic indicatif et non contractuel.</strong> Ce rapport repose exclusivement sur vos réponses déclaratives. Aucun document, bulletin de paie, DSN ou paramétrage n'a été vérifié. Il identifie des signaux de vigilance, sans constater l'existence ni déterminer le montant d'un éventuel redressement. Il n'est opposable ni à l'Urssaf ni à une juridiction.</p>
      <p>Responsable de traitement : ComplyDB SAS (ACOMPIA). Les données du prédiagnostic sont conservées 24 mois. Les données de prospection, lorsque vous acceptez d'être recontacté, sont conservées 36 mois après le dernier contact. Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et, le cas échéant, de portabilité. Contact : <a href="mailto:she@acompia.com">she@acompia.com</a>.</p>
    </div>
  `;
}

function generateReportHTML(scoring, contact) {
  const { seuilLabel, seuilColor, themes, meta } = scoring;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ========== Bloc A — Couverture ==========
  const blocA = `
    <section class="rpt-block rpt-blockA">
      <div class="rpt-cover">
        <div class="rpt-cover-top">
          <div class="rpt-cover-brand">ACOMPIA</div>
          <div class="rpt-cover-date">${dateStr}</div>
        </div>
        <h2 class="rpt-cover-title">Prédiagnostic URSSAF</h2>
        <p class="rpt-cover-sub">${contact && contact.name ? 'Préparé pour ' + contact.name : ''}${contact && contact.name ? ' · ' : ''}Confidentiel — non contractuel</p>

        <div class="rpt-vigilance" style="border-color:${seuilColor}">
          <div class="rpt-vigilance-label">Votre résultat</div>
          <div class="rpt-vigilance-value" style="color:${seuilColor}">${seuilLabel}</div>
          <p>${themes.length} thème${themes.length > 1 ? 's' : ''} évalué${themes.length > 1 ? 's' : ''} à partir de vos réponses.</p>
        </div>

        <div class="rpt-cover-intro">
          <p>Ce résultat identifie des signaux de vigilance à partir de vos réponses. Une revue des documents et des DSN est nécessaire pour confirmer l'exposition réelle.</p>
        </div>
      </div>
    </section>
  `;

  // ========== Bloc B — Synthèse dirigeant ==========
  // Trie les thèmes par priorité de niveau
  const prio = ['CRITIQUE', 'ELEVE', 'MOYEN', 'REDUIT'];
  const themesSorted = [...themes].sort((x, y) => prio.indexOf(x.level) - prio.indexOf(y.level));
  const top3 = themesSorted.filter(t => t.level === 'CRITIQUE' || t.level === 'ELEVE').slice(0, 3);

  let accroche = "";
  if (scoring.seuil === 'forte') accroche = "Un signal de vigilance forte ressort de vos réponses. Une vérification ciblée est recommandée.";
  else if (scoring.seuil === 'moderee') accroche = "Plusieurs points nécessitent une vérification ciblée avant de conclure.";
  else accroche = "Aucun signal élevé ne ressort des thèmes examinés. Une vérification documentaire reste nécessaire pour confirmer ce résultat.";

  let top3HTML = '';
  if (top3.length) {
    top3HTML = '<ol class="rpt-top3">' + top3.map(t => {
      // On prend le premier verdict dont le niveau correspond au niveau max du thème
      // (sinon on tombait sur un verdict RÉDUIT contradictoire avec le pill CRITIQUE)
      const v = t.verdicts.find(v => v.level === t.level) || t.verdicts[0];
      return `
      <li>
        <div class="rpt-top3-title">${t.name} ${levelPill(t.level)}</div>
        <p>${v.text}</p>
      </li>
    `;
    }).join('') + '</ol>';
  } else {
    top3HTML = '<p class="rpt-muted">Aucun thème ne ressort à un niveau ÉLEVÉ ou CRITIQUE à ce stade.</p>';
  }

  const blocB = `
    <section class="rpt-block rpt-blockB">
      <h3 class="rpt-block-title">Synthèse dirigeant</h3>
      <p class="rpt-accroche">${accroche}</p>

      ${meta.reiteration ? `<div class="rpt-aggrav"><strong>Aggravant transversal — Réitération.</strong> Un contrôle URSSAF antérieur a donné lieu à observation ou redressement. En cas de persistance d'une pratique déjà observée, une majoration de 10 % peut s'appliquer (art. L. 243-7-6 CSS).</div>` : ''}
      ${meta.multiSite ? `<div class="rpt-aggrav"><strong>Multi-sites.</strong> Plusieurs lieux d'affectation peuvent fausser un taux unique de versement mobilité. Vérification dédiée recommandée.</div>` : ''}

      <h4 class="rpt-sub">Vos principaux signaux</h4>
      ${top3HTML}
      ${top3.length ? `<p class="rpt-muted rpt-see-detail">Ces signaux reposent sur vos réponses déclaratives. Ils doivent être confirmés à partir de vos documents et de vos DSN.</p>` : ''}
    </section>
  `;

  // ========== Bloc C — Analyse détaillée ==========
  // RÈGLE : pour chaque thème, on n'affiche que les verdicts du niveau max du thème.
  // Un thème CRITIQUE n'affiche pas ses sous-réponses RÉDUIT ou MOYEN (incohérence visuelle
  // + bruit pour le dirigeant). Exception : si le thème est RÉDUIT, on affiche le verdict
  // rassurant pour montrer que c'est maîtrisé.
  let blocCInner = '';
  themesSorted.forEach(t => {
    const verdictsFiltres = t.verdicts.filter(v => v.level === t.level);
    const verdictsHTML = verdictsFiltres.map(v => `
      <p class="rpt-verdict rpt-verdict-${v.level.toLowerCase()}">${v.text}</p>
    `).join('');

    let chiffrageHTML = '';
    if (t.level !== 'REDUIT') {
      chiffrageHTML = `<p class="rpt-chiffrage rpt-chiffrage-qual"><em>Exposition non chiffrable à ce stade — un audit ciblé permet de quantifier précisément l'enjeu à partir de vos données réelles (montants, volumes, effectifs concernés).</em></p>`;
    }

    // Encart dispenses si thème complémentaire santé ressort avec alerte sur les dispenses
    const extra = (t.key === 'compl-sante' && t.showDispensesBox) ? encartDispenses() : '';

    blocCInner += `
      <article class="rpt-theme">
        <header class="rpt-theme-header">
          <h4>${t.name}</h4>
          ${levelPill(t.level)}
        </header>
        <div class="rpt-theme-body">
          ${verdictsHTML}
          ${chiffrageHTML}
          ${extra}
        </div>
      </article>
    `;
  });

  const blocC = `
    <section class="rpt-block rpt-blockC">
      <h3 class="rpt-block-title">Analyse détaillée par thème</h3>
      ${themesSorted.length ? blocCInner : '<p class="rpt-muted">Aucun thème activé.</p>'}
    </section>
  `;

  // ========== Bloc D — Passage à l'action ==========
  const aenTheme = themes.find(t => t.key === 'aen-vehicule');
  const showANV = aenTheme && (aenTheme.level === 'ELEVE' || aenTheme.level === 'CRITIQUE');

  // Recos pratiques personnalisées selon les thèmes CRITIQUE/ÉLEVÉ du prospect
  const recosParTheme = {
    'frais-pro':     "<strong>Frais professionnels.</strong> Reconstituer les justificatifs (cartes grises, relevés kilométriques, notes de frais) sur 3 ans, vérifier l'usage des barèmes URSSAF et tracer la DFS si applicable.",
    'titres-resto':  "<strong>Titres-restaurant.</strong> Auditer le paramétrage paie : participation employeur 50–60 %, un titre par repas dans l'horaire journalier, part patronale ≤ 7,32 € (2026). Rectifier si dépassement.",
    'compl-sante':   "<strong>Complémentaire santé — dispenses.</strong> Vérifier l'existence d'un acte fondateur valide (DUE, accord, référendum) couvrant chaque cas, collecter les demandes signées à jour et leurs justificatifs, confirmer l'éligibilité aux dispenses d'ordre public.",
    'temps-travail': "<strong>Temps de travail et rémunérations.</strong> Sécuriser les forfaits jours (conventions individuelles, suivi charge, entretiens annuels), documenter les heures supplémentaires et basculer toute rémunération hors paie dans le circuit DSN.",
    'rgdu':          "<strong>RGDU / Réduction générale.</strong> Faire recalculer la réduction sur 3 ans (paramétrage, SMIC, primes, absences) et documenter les écarts par rapport à la DSN.",
    'aen-vehicule':  "<strong>Avantage en nature véhicule.</strong> Recenser la flotte, qualifier l'usage (professionnel strict vs mixte), choisir le mode d'évaluation (réel ou forfait) et produire des attestations d'usage signées.",
    'ruptures':      "<strong>Ruptures et transactions.</strong> Reconstituer les protocoles transactionnels, vérifier la ventilation indemnités imposables / non imposables et justifier le caractère indemnitaire des sommes versées.",
    'vm':            "<strong>Versement mobilité.</strong> Contrôler le taux applicable par commune d'affectation réelle des salariés et, en multi-sites, ventiler les déclarations DSN en conséquence."
  };

  const themesActifs = themesSorted.filter(t => t.level === 'CRITIQUE' || t.level === 'ELEVE');
  const recosHTML = themesActifs
    .slice(0, 4)
    .map(t => recosParTheme[t.key])
    .filter(Boolean)
    .map(txt => `<li>${txt}</li>`)
    .join('');

  const stepsIntro = themesActifs.length
    ? `<li><strong>Actions prioritaires sur vos thèmes à risque.</strong> Voici, <em>à titre non exhaustif</em>, quelques chantiers concrets à engager en priorité. Un audit permettra notamment d'affiner ces recommandations en fonction de votre situation précise et de votre documentation réelle :<ul class="rpt-substeps">${recosHTML}</ul><p class="rpt-substeps-note">Cette liste est indicative. D'autres axes peuvent émerger selon le contexte opérationnel, conventionnel et documentaire propre à votre entreprise — c'est l'objet de l'audit ciblé.</p></li>`
    : `<li><strong>Maintenir la vigilance.</strong> Aucun thème ne ressort en ÉLEVÉ ou CRITIQUE — un test de robustesse annuel reste recommandé pour confirmer la maîtrise documentaire.</li>`;

  const blocD = `
    <section class="rpt-block rpt-blockD">
      <div class="rpt-cta-main">
        <h3>Comprendre vos signaux de vigilance</h3>
        <p>Un échange de 30 minutes permet de vérifier les faits déterminants et de décider si un audit est utile.</p>
        <a href="https://calendly.com/she-acompia/30min" target="_blank" rel="noopener" class="btn-primary">Échanger sur mes résultats →</a>
      </div>

      ${disclaimerFinal()}

      <div class="rpt-print">
        <button type="button" onclick="window.print()" class="rpt-print-btn">Imprimer ou sauvegarder en PDF</button>
      </div>
    </section>
  `;

  // ========== CTA Calendly sticky mobile-friendly ==========
  const sticky = `
    <div class="rpt-sticky-cta">
      <a href="https://calendly.com/she-acompia/30min" target="_blank" rel="noopener">
        Prendre rendez-vous — échange de 30 minutes
      </a>
    </div>
  `;

  return `
    <div class="acompia-report" id="acompia-report">
      ${blocA}
      ${blocB}
      ${blocD}
    </div>
    ${sticky}
  `;
}

// Exposition globale — le script s'exécute en global scope.
window.computeScoring = computeScoring;
window.generateReportHTML = generateReportHTML;
