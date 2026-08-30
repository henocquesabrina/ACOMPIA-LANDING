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

// Bloc 7 : Q7.0bis combine le seuil dans une zone et sa durée de franchissement.
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

function echapperHTML(valeur) {
  return String(valeur ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const REPORT_THEME_META = {
  'frais-pro': {
    title: 'Frais professionnels',
    rule: "Les remboursements au réel supposent des justificatifs. Les allocations forfaitaires restent liées à des circonstances professionnelles établies et aux limites applicables.",
    documents: 'Notes de frais, justificatifs, cartes grises, relevés kilométriques, politique de remboursement.',
    action: 'Tester un échantillon de remboursements et rapprocher les pièces de la paie.',
    reducedAction: 'Conserver un échantillon probant et actualiser la politique de frais.',
    sourceLabel: 'Urssaf, frais professionnels',
    sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/frais-professionnels.html',
    questions: ['Q1.1', 'Q1.2', 'Q1.4', 'Q1.5']
  },
  'titres-resto': {
    title: 'Titres-restaurant',
    rule: "L'exonération suppose notamment une participation patronale comprise entre 50 % et 60 %, plafonnée à 7,32 € par titre en 2026, et un repas compris dans l'horaire journalier.",
    documents: "Paramétrage paie, factures de l'émetteur, données de présence, règles d'attribution.",
    action: "Rapprocher un mois d'attributions des jours réellement travaillés et du paramétrage paie.",
    reducedAction: "Conserver le contrôle mensuel des absences et du plafond d'exonération.",
    sourceLabel: 'Urssaf, titres-restaurant 2026',
    sourceUrl: 'https://www.urssaf.fr/accueil/employeur/cotisations/avantages-en-nature.html',
    questions: ['Q1bis.1', 'Q1bis.2']
  },
  'compl-sante': {
    title: 'Complémentaire santé',
    rule: "Une décision unilatérale doit être constatée par écrit et remise à chaque intéressé. Chaque dispense doit entrer dans un cas autorisé et l'employeur doit pouvoir produire la demande du salarié.",
    documents: 'Acte fondateur, contrat assureur, notices, preuves de remise, demandes de dispense et justificatifs.',
    action: 'Reconstituer le dossier du régime et vérifier un dossier complet par type de dispense.',
    reducedAction: "Archiver l'acte, les preuves de remise et les demandes de dispense à jour.",
    sourceLabel: 'Code de la sécurité sociale, art. L. 911-1',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006745463',
    sourceLabel2: 'Code de la sécurité sociale, art. R. 242-1-6',
    sourceUrl2: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029217401',
    questions: ['Q2.1a', 'Q2.1b', 'Q2.3']
  },
  'temps-travail': {
    title: 'Temps de travail et rémunérations',
    rule: "Le forfait jours exige un fondement collectif, une convention individuelle et un suivi effectif de la charge. Les éléments de rémunération doivent être traités dans le circuit déclaratif approprié.",
    documents: 'Accord collectif, conventions individuelles, suivis de charge, entretiens, relevés horaires, bulletins et DSN.',
    action: 'Sélectionner un échantillon de salariés et vérifier la chaîne accord, contrat, suivi, paie et DSN.',
    reducedAction: 'Maintenir un contrôle annuel du suivi de charge et du rapprochement paie comptabilité.',
    sourceLabel: 'Code du travail, art. L. 3121-64',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036262805',
    sourceLabel2: 'Code de la sécurité sociale, art. L. 242-1',
    sourceUrl2: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038836902',
    questions: ['Q3.1', 'Q3.2', 'Q3.3', 'Q3.4', 'Q3.5']
  },
  'rgdu': {
    title: 'Réduction générale dégressive unique',
    rule: "Le calcul est annuel et dépend notamment de la rémunération éligible, du Smic de référence, du temps de travail, des absences et des règles de cumul.",
    documents: 'Fichier de calcul, paramétrage paie, bulletins, temps de travail, absences et DSN.',
    action: 'Recalculer trois dossiers contrastés et documenter chaque écart avec la DSN.',
    reducedAction: 'Conserver un recalcul annuel indépendant sur un échantillon documenté.',
    sourceLabel: 'Urssaf, RGDU 2026',
    sourceUrl: 'https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale-cotisation.html',
    questions: ['Q4.2']
  },
  'aen-vehicule': {
    title: 'Avantage en nature véhicule',
    rule: "L'usage privé d'un véhicule mis à disposition constitue un avantage en nature. Son évaluation dépend notamment de la date d'attribution, du mode réel ou forfaitaire et de la prise en charge du carburant.",
    documents: "Liste de flotte, dates d'attribution, contrats, factures, cartes carburant, règles d'usage et preuves d'interdiction d'usage privé.",
    action: "Qualifier l'usage de chaque véhicule et recalculer un véhicule représentatif par régime applicable.",
    reducedAction: "Conserver des éléments probants sur l'usage professionnel et les revoir à chaque attribution.",
    sourceLabel: 'Urssaf, avantage en nature véhicule',
    sourceUrl: 'https://www.urssaf.fr/accueil/employeur/cotisations/avantages-en-nature.html',
    questions: ['Q5.1', 'Q5.1b', 'Q5.2', 'Q5.fleet']
  },
  'ruptures': {
    title: 'Ruptures et transactions',
    rule: "Le traitement social dépend de la nature de l'indemnité et de ses plafonds. En 2026, la part exonérée de cotisations d'une indemnité de rupture conventionnelle supporte une contribution patronale de 40 %.",
    documents: 'Convention de rupture, protocole transactionnel, calculs, bulletins, DSN et justificatifs du préjudice invoqué.',
    action: 'Rejouer le calcul social et fiscal de chaque dossier récent à partir des pièces signées.',
    reducedAction: 'Conserver une fiche de calcul validée pour chaque rupture ou transaction.',
    sourceLabel: 'Code de la sécurité sociale, art. L. 137-12',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053282399',
    questions: ['Q6.1', 'Q6.2']
  },
  'vm': {
    title: 'Versement mobilité',
    rule: "L'assujettissement dépend notamment de l'effectif dans la zone, du lieu de travail et du franchissement du seuil pendant cinq années civiles consécutives. Le taux varie selon la zone.",
    documents: "Effectifs par zone, lieux d'affectation, registre du personnel, historique du seuil, taux appliqués et DSN.",
    action: "Comparer les lieux d'affectation et les taux déclarés avec le moteur officiel Urssaf.",
    reducedAction: "Recontrôler les taux à chaque évolution de zone, d'effectif ou d'affectation.",
    sourceLabel: 'Urssaf, versement mobilité',
    sourceUrl: 'https://www.urssaf.fr/accueil/employeur/cotisations/liste-cotisations/versement-mobilite.html',
    questions: ['Q7.0bis', 'Q7.1']
  }
};

const REPORT_THEME_ORDER = [
  'frais-pro', 'titres-resto', 'compl-sante', 'temps-travail',
  'rgdu', 'aen-vehicule', 'ruptures', 'vm'
];

function reportLevelPill(level) {
  const labels = {
    CRITIQUE: 'Priorité forte',
    ELEVE: 'À vérifier',
    MOYEN: 'À surveiller',
    REDUIT: 'Signal réduit'
  };
  return `<span class="rpt-pill rpt-pill-${level.toLowerCase()}">${labels[level] || 'Non classé'}</span>`;
}

function reportCleanVerdict(text) {
  return String(text || '')
    .replace(/\s*ACOMPIA (?:propose|recommande|peut réaliser)[^.]*\./g, '')
    .trim();
}

function reportConfidence(theme, answers) {
  const meta = REPORT_THEME_META[theme.key];
  const hasUnknown = meta && meta.questions.some(id => answers && answers[id] === 'nsp');
  return hasUnknown
    ? { label: 'Faible', detail: "Une ou plusieurs réponses sont incertaines. Les pièces doivent être retrouvées avant de conclure." }
    : { label: 'Déclarative', detail: "Le signal repose sur vos réponses. Aucun document n'a encore été contrôlé." };
}

function generateReportHTML(scoring, contact) {
  const { seuilLabel, themes, meta, answers } = scoring;
  const rdvURL = window.ACOMPIA_CONFIG && window.ACOMPIA_CONFIG.rdvURL
    ? window.ACOMPIA_CONFIG.rdvURL
    : 'https://calendly.com/she-acompia/30min';
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const prio = ['CRITIQUE', 'ELEVE', 'MOYEN', 'REDUIT'];
  const themesSorted = [...themes].sort((x, y) => prio.indexOf(x.level) - prio.indexOf(y.level));
  const priorityThemes = themesSorted.filter(t => t.level !== 'REDUIT').slice(0, 3);
  const criticalCount = themes.filter(t => t.level === 'CRITIQUE').length;
  const checkCount = themes.filter(t => t.level === 'ELEVE' || t.level === 'MOYEN').length;
  const noHighAlertCount = Math.max(0, REPORT_THEME_ORDER.length - criticalCount - checkCount);

  let decisionText = "Aucun signal élevé ne ressort de vos réponses. Ce résultat reste à confirmer par un contrôle documentaire ciblé.";
  if (scoring.seuil === 'forte') {
    decisionText = "Au moins un signal de vigilance forte ressort. Commencez par vérifier les faits et les pièces de la première priorité.";
  } else if (scoring.seuil === 'moderee') {
    decisionText = "Des points nécessitent une vérification ciblée. Leur existence et leur portée doivent être confirmées avant toute décision.";
  }

  const header = `
    <section class="rpt-block rpt-report-head">
      <div class="rpt-cover-top">
        <div class="rpt-cover-brand">ACOMPIA</div>
        <div class="rpt-cover-date">${dateStr}</div>
      </div>
      <p class="rpt-eyebrow">Prédiagnostic URSSAF</p>
      <h2 class="rpt-cover-title">Votre ordre de vérification</h2>
      <p class="rpt-cover-sub">${contact && contact.name ? 'Préparé pour ' + echapperHTML(contact.name) + '. ' : ''}Restitution confidentielle et indicative.</p>

      <div class="rpt-decision">
        <div>
          <span class="rpt-decision-label">Décision en un coup d'œil</span>
          <strong>${echapperHTML(seuilLabel)}</strong>
        </div>
        <p>${decisionText}</p>
      </div>

      <div class="rpt-summary-grid" aria-label="Synthèse des signaux">
        <div class="rpt-summary-card rpt-summary-critical"><strong>${criticalCount}</strong><span>priorité forte</span></div>
        <div class="rpt-summary-card rpt-summary-check"><strong>${checkCount}</strong><span>à vérifier</span></div>
        <div class="rpt-summary-card rpt-summary-calm"><strong>${noHighAlertCount}</strong><span>sans alerte haute</span></div>
      </div>
      <p class="rpt-method-note">Lecture correcte : il s'agit d'un filtre déclaratif. « Sans alerte haute » ne signifie pas « conforme ».</p>
    </section>
  `;

  const contextItems = [];
  if (meta && meta.reiteration) {
    contextItems.push("Un contrôle antérieur est déclaré. Les observations et régularisations de ce contrôle doivent être examinées en premier.");
  }
  if (meta && meta.multiSite) {
    contextItems.push("Plusieurs sites sont déclarés. Le lieu réel d'affectation doit être rapproché du versement mobilité appliqué en DSN.");
  }
  const contextBlock = contextItems.length ? `
    <div class="rpt-context">
      <strong>Contexte à intégrer</strong>
      <ul>${contextItems.map(item => `<li>${item}</li>`).join('')}</ul>
    </div>
  ` : '';

  let prioritiesHTML = '';
  if (priorityThemes.length) {
    prioritiesHTML = priorityThemes.map((theme, index) => {
      const themeMeta = REPORT_THEME_META[theme.key];
      const verdict = theme.verdicts.find(v => v.level === theme.level) || theme.verdicts[0];
      const confidence = reportConfidence(theme, answers);
      return `
        <article class="rpt-priority">
          <header class="rpt-priority-head">
            <span class="rpt-priority-number">${String(index + 1).padStart(2, '0')}</span>
            <div><span class="rpt-priority-label">Priorité ${index + 1}</span><h4>${themeMeta.title}</h4></div>
            ${reportLevelPill(theme.level)}
          </header>
          <div class="rpt-priority-signal">
            <span>Ce que votre réponse indique</span>
            <p>${echapperHTML(reportCleanVerdict(verdict && verdict.text))}</p>
          </div>
          <div class="rpt-priority-grid">
            <div class="rpt-detail-card">
              <span>Règle de contrôle</span>
              <p>${themeMeta.rule}</p>
              <div class="rpt-source-list">
                <a href="${themeMeta.sourceUrl}" target="_blank" rel="noopener noreferrer">${themeMeta.sourceLabel} ↗</a>
                ${themeMeta.sourceUrl2 ? `<a href="${themeMeta.sourceUrl2}" target="_blank" rel="noopener noreferrer">${themeMeta.sourceLabel2} ↗</a>` : ''}
              </div>
            </div>
            <div class="rpt-detail-card">
              <span>Pièces à réunir</span>
              <p>${themeMeta.documents}</p>
            </div>
            <div class="rpt-detail-card rpt-detail-action">
              <span>Prochaine action</span>
              <p>${themeMeta.action}</p>
            </div>
            <div class="rpt-detail-card">
              <span>Fiabilité du signal : ${confidence.label}</span>
              <p>${confidence.detail}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');
  } else {
    prioritiesHTML = `
      <div class="rpt-no-priority">
        <strong>Aucune priorité forte détectée.</strong>
        <p>Le questionnaire n'a pas déclenché de signal élevé. La vue par thème ci-dessous indique les contrôles de maintien à conserver.</p>
      </div>
    `;
  }

  const priorities = `
    <section class="rpt-block rpt-priorities">
      <div class="rpt-section-head">
        <span>01</span>
        <div><h3>Vos priorités</h3><p>Chaque signal est relié à une règle, aux preuves attendues et à une action.</p></div>
      </div>
      ${contextBlock}
      ${prioritiesHTML}
    </section>
  `;

  const themeRows = REPORT_THEME_ORDER.map(key => {
    const themeMeta = REPORT_THEME_META[key];
    const theme = themes.find(item => item.key === key);
    if (!theme) {
      return `
        <tr>
          <th scope="row">${themeMeta.title}</th>
          <td><span class="rpt-pill rpt-pill-neutral">Non déclenché</span></td>
          <td>Non concerné selon vos réponses ou question conditionnelle non ouverte.</td>
          <td>Aucune action prioritaire. Conserver les éléments justificatifs usuels.</td>
        </tr>
      `;
    }
    const confidence = reportConfidence(theme, answers);
    const action = theme.level === 'REDUIT' ? themeMeta.reducedAction : themeMeta.action;
    return `
      <tr>
        <th scope="row">${themeMeta.title}</th>
        <td>${reportLevelPill(theme.level)}</td>
        <td>${confidence.label}</td>
        <td>${action}</td>
      </tr>
    `;
  }).join('');

  const matrix = `
    <section class="rpt-block rpt-matrix-block">
      <div class="rpt-section-head">
        <span>02</span>
        <div><h3>Vue complète des thèmes</h3><p>Une ligne absente des priorités reste visible ici.</p></div>
      </div>
      <div class="rpt-table-wrap">
        <table class="rpt-matrix">
          <thead><tr><th>Thème</th><th>Résultat</th><th>Fiabilité</th><th>Action</th></tr></thead>
          <tbody>${themeRows}</tbody>
        </table>
      </div>
    </section>
  `;

  let planSteps;
  if (priorityThemes.length) {
    const first = REPORT_THEME_META[priorityThemes[0].key];
    const second = REPORT_THEME_META[(priorityThemes[1] || priorityThemes[0]).key];
    const third = REPORT_THEME_META[(priorityThemes[2] || priorityThemes[priorityThemes.length - 1]).key];
    planSteps = [
      { period: 'Jours 1 à 7', title: `Documenter ${first.title.toLowerCase()}`, text: first.documents },
      { period: 'Jours 8 à 15', title: `Tester ${second.title.toLowerCase()}`, text: second.action },
      { period: 'Jours 16 à 30', title: 'Décider et tracer', text: `${third.action} Formaliser ensuite la décision, le responsable et la date de contrôle.` }
    ];
  } else {
    planSteps = [
      { period: 'Jours 1 à 7', title: 'Conserver les preuves', text: 'Centraliser les actes, paramétrages et contrôles qui soutiennent les réponses rassurantes.' },
      { period: 'Jours 8 à 15', title: 'Tester un échantillon', text: 'Choisir un thème sensible pour votre activité et vérifier quelques dossiers réels.' },
      { period: 'Jours 16 à 30', title: 'Planifier la prochaine revue', text: 'Nommer un responsable et fixer une date de contrôle des paramètres susceptibles d\'évoluer.' }
    ];
  }
  const plan = `
    <section class="rpt-block rpt-plan-block">
      <div class="rpt-section-head">
        <span>03</span>
        <div><h3>Plan d'action sur 30 jours</h3><p>Un ordre simple pour passer du signal à la preuve.</p></div>
      </div>
      <ol class="rpt-plan">${planSteps.map(step => `
        <li><span>${step.period}</span><div><strong>${step.title}</strong><p>${step.text}</p></div></li>
      `).join('')}</ol>
    </section>
  `;

  const scope = `
    <section class="rpt-block rpt-scope-block">
      <div class="rpt-section-head">
        <span>04</span>
        <div><h3>Ce que ce prédiagnostic ne vérifie pas</h3><p>La limite est aussi importante que le résultat.</p></div>
      </div>
      <ul class="rpt-scope-list">
        <li>Le contenu de vos accords, contrats, actes unilatéraux et procédures.</li>
        <li>Les montants réellement versés, les bulletins, les DSN et les paramétrages de paie.</li>
        <li>La période contrôlable, les effectifs concernés et le chiffrage d'une éventuelle régularisation.</li>
        <li>Les faits particuliers qui peuvent modifier l'analyse juridique.</li>
      </ul>
      <p class="rpt-scope-warning">Un thème « non déclenché » ou un signal réduit ne constitue donc ni une validation de conformité ni une garantie d'absence de redressement.</p>
    </section>
  `;

  const firstPriorityName = priorityThemes.length
    ? REPORT_THEME_META[priorityThemes[0].key].title.toLowerCase()
    : 'votre résultat';
  const closing = `
    <section class="rpt-block rpt-closing">
      <div class="rpt-cta-main">
        <span class="rpt-cta-kicker">Étape suivante</span>
        <h3>Confirmer ${firstPriorityName} avec vos données</h3>
        <p>Un échange de 30 minutes permet de vérifier les faits déterminants, de choisir les pièces utiles et de décider si un audit ciblé est pertinent.</p>
        <a href="${rdvURL}" target="_blank" rel="noopener noreferrer" class="btn-primary" onclick="if(window.posthog) posthog.capture('prediag_rdv_clique', { source: 'rapport' })">Vérifier mes résultats →</a>
      </div>
      ${disclaimerFinal()}
      <div class="rpt-print"><button type="button" onclick="window.print()" class="rpt-print-btn">Imprimer ou sauvegarder en PDF</button></div>
    </section>
  `;

  const sticky = `
    <div class="rpt-sticky-cta">
      <a href="${rdvURL}" target="_blank" rel="noopener noreferrer" onclick="if(window.posthog) posthog.capture('prediag_rdv_clique', { source: 'rapport_sticky' })">Vérifier mes priorités</a>
    </div>
  `;

  return `
    <div class="acompia-report rpt-v2" id="acompia-report">
      ${header}
      ${priorities}
      ${matrix}
      ${plan}
      ${scope}
      ${closing}
    </div>
    ${sticky}
  `;
}

// Exposition globale — le script s'exécute en global scope.
window.computeScoring = computeScoring;
window.generateReportHTML = generateReportHTML;
