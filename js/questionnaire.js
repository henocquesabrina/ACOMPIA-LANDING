/* ============================================
   ACOMPIA — Questionnaire Prédiagnostic URSSAF
   Version courte acquisition 28/08/2026 · 10 questions principales
   Refonte complète : matrice Sabrina + arbitrages clients
   ============================================ */

/*
  Chaque question déclare :
    - id              : identifiant (ex. "Q0.1")
    - section         : titre du bloc affiché en tête
    - sectionIcon     : emoji d'illustration (cohérent avec les blocs existants)
    - text            : intitulé EXACT (matrice Sabrina)
    - hint            : précision optionnelle affichée sous l'intitulé
    - type            : "single" ou "multi" (single = une seule réponse)
    - condition       : fonction(answers) -> bool, détermine l'affichage conditionnel
    - options         : [{ value, label }, ...]

  La logique de branchement est stricte : tout ce que la matrice dit de masquer
  est masqué via la fonction condition().
*/

const QUESTIONS = [

  /* ==========================================================
     BLOC 0 — Profil entreprise
     ========================================================== */
  {
    id: 'Q0.1', section: 'Votre profil entreprise', sectionIcon: 'building-2',
    text: 'Combien de salariés compte votre entreprise ?',
    type: 'single',
    options: [
      { value: '1-10',   label: '1 à 10' },
      { value: '11-49',  label: '11 à 49' },
      { value: '50-249', label: '50 à 249' },
      { value: '250+',   label: '250 et plus' }
    ]
  },
  {
    id: 'Q0.3', section: 'Votre profil entreprise', sectionIcon: 'building-2',
    text: 'Quel est votre secteur d\'activité principal ?',
    type: 'single',
    options: [
      { value: 'btp',       label: 'BTP' },
      { value: 'transport', label: 'Transport / logistique' },
      { value: 'hcr',       label: 'Hôtellerie / restauration' },
      { value: 'commerce',  label: 'Commerce / distribution' },
      { value: 'services',  label: 'Services / conseil' },
      { value: 'industrie', label: 'Industrie' },
      { value: 'sante',     label: 'Santé / médico-social' },
      { value: 'tech',      label: 'Tech / numérique' },
      { value: 'autre',     label: 'Autre' }
    ]
  },
  {
    id: 'Q0.3bis', section: 'Votre profil entreprise', sectionIcon: 'building-2',
    text: 'Votre entreprise fonctionne-t-elle sur un seul site / établissement ou sur plusieurs lieux d\'affectation ?',
    type: 'single',
    options: [
      { value: 'mono', label: 'Un seul site / établissement' },
      { value: 'multi', label: 'Plusieurs sites / établissements' },
      { value: 'nsp', label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q0.4', section: 'Votre profil entreprise', sectionIcon: 'building-2',
    text: 'Avez-vous déjà fait l\'objet d\'un contrôle URSSAF ?',
    type: 'single',
    options: [
      { value: 'oui-ok',       label: 'Oui, clôturé sans suite (ni redressement, ni observation)' },
      { value: 'oui-obs',      label: 'Oui, avec observation(s) pour l\'avenir uniquement (sans redressement)' },
      { value: 'oui-redress',  label: 'Oui, avec redressement' },
      { value: 'non',          label: 'Non, jamais' },
      { value: 'nsp',          label: 'Je ne sais pas' }
    ]
  },

  /* ==========================================================
     BLOC 1 — Frais professionnels
     ========================================================== */
  {
    id: 'Q1.1', section: 'Frais professionnels', sectionIcon: 'wallet',
    text: 'Votre entreprise rembourse-t-elle des frais professionnels à ses salariés ?',
    type: 'single',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' }
    ]
  },
  {
    id: 'Q1.2', section: 'Frais professionnels', sectionIcon: 'wallet',
    text: 'Si un contrôle URSSAF portait sur vos indemnités kilométriques, pourriez-vous produire les éléments permettant d\'en justifier le montant et le caractère professionnel (véhicule concerné, kilométrage, détail des trajets, dates, motifs de déplacement) ?',
    type: 'single',
    condition: (a) => a['Q1.1'] === 'oui',
    options: [
      { value: 'oui-tous', label: 'Oui, pour tous les cas' },
      { value: 'certains', label: 'Pour certains seulement' },
      { value: 'non',      label: 'Non' },
      { value: 'pas-ik',   label: 'Pas d\'indemnités kilométriques' },
      { value: 'nsp',      label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q1.4', section: 'Frais professionnels', sectionIcon: 'wallet',
    text: 'Pour chaque frais remboursé, pouvez-vous établir la dépense engagée ou la situation ouvrant droit à l’indemnité ?',
    type: 'single',
    condition: (a) => a['Q1.1'] === 'oui',
    options: [
      { value: 'oui-tous', label: 'Oui, pour tous les cas' },
      { value: 'certains', label: 'Pour certains seulement' },
      { value: 'non',      label: 'Non' },
      { value: 'nsp',      label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q1.5', section: 'Frais professionnels', sectionIcon: 'wallet',
    text: 'La déduction forfaitaire spécifique (DFS) s\'applique à certaines catégories de salariés selon leur profession (BTP, VRP, journalistes, personnel navigant, HCR, etc.), indépendamment du secteur de l\'entreprise. En appliquez-vous une ?',
    type: 'single',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne sais pas ce que c\'est' }
    ]
  },

  /* ==========================================================
     BLOC 1bis — Titres-restaurant
     ========================================================== */
  {
    id: 'Q1bis.1', section: 'Titres-restaurant', sectionIcon: 'utensils',
    text: 'Accordez-vous des titres-restaurant à tout ou partie de vos salariés ?',
    type: 'single',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q1bis.2', section: 'Titres-restaurant', sectionIcon: 'utensils',
    // Formulation exacte validée Sabrina (arbitrage #8)
    text: 'Pour vos titres-restaurant, les 3 conditions d\'exonération suivantes sont-elles bien respectées : participation employeur entre 50 % et 60 %, un seul titre par repas compris dans l\'horaire de travail journalier, et part patronale ne dépassant pas 7,32 € par titre (plafond 2026) ?',
    type: 'single',
    condition: (a) => a['Q1bis.1'] === 'oui' || a['Q1bis.1'] === 'nsp',
    options: [
      { value: 'oui-2-cond',   label: 'Oui, ces deux conditions sont respectées' },
      { value: 'taux-seulement', label: 'Taux respecté mais attribution non toujours vérifiée' },
      { value: 'taux-incertain', label: 'Je ne suis pas certain(e) du taux de participation' },
      { value: 'non',          label: 'Non' },
      { value: 'nsp',          label: 'Je ne suis pas sûr(e)' }
    ]
  },

  /* ==========================================================
     BLOC 2 — Complémentaire santé (acte fondateur + dispenses)
     ========================================================== */
  {
    id: 'Q2.1a', section: 'Complémentaire santé — acte fondateur et dispenses', sectionIcon: 'heart-pulse',
    text: 'Comment votre complémentaire santé a-t-elle été mise en place ?',
    type: 'single',
    options: [
      { value: 'accord',     label: 'Par accord collectif' },
      { value: 'referendum', label: 'Par référendum' },
      { value: 'due',        label: 'Par décision unilatérale de l\'employeur (DUE)' },
      { value: 'aucune',     label: 'Pas de complémentaire santé' },
      { value: 'non-form',   label: 'Aucune formalisation à ma connaissance' },
      { value: 'nsp',        label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q2.1b', section: 'Complémentaire santé — acte fondateur et dispenses', sectionIcon: 'heart-pulse',
    text: 'Si le régime santé a été mis en place par décision unilatérale, pouvez-vous produire l\'acte écrit et la preuve de sa remise individuelle à chaque salarié concerné (émargement, accusé de réception) ?',
    type: 'single',
    condition: (a) => a['Q2.1a'] === 'due',
    options: [
      { value: 'oui-tous', label: 'Oui, pour tous' },
      { value: 'certains', label: 'Pour certains seulement' },
      { value: 'non',      label: 'Non' },
      { value: 'nsp',      label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q2.3', section: 'Complémentaire santé — acte fondateur et dispenses', sectionIcon: 'heart-pulse',
    text: 'Les dispenses d’adhésion sont-elles toutes écrites, signées et prévues par votre régime santé ?',
    type: 'single',
    condition: (a) => Boolean(a['Q2.1a']) && a['Q2.1a'] !== 'aucune',
    options: [
      { value: 'oui-tous',  label: 'Oui, pour tous les dispensés' },
      { value: 'certains',  label: 'Pour certains seulement' },
      { value: 'non',       label: 'Non' },
      { value: 'pas-disp',  label: 'Pas de salariés dispensés' },
      { value: 'nsp',       label: 'Je ne suis pas sûr(e)' }
    ]
  },

  /* ==========================================================
     BLOC 3 — Temps de travail et rémunérations
     ========================================================== */
  {
    id: 'Q3.1', section: 'Temps de travail et rémunérations', sectionIcon: 'clock',
    text: 'Des salariés effectuent-ils, même occasionnellement, des heures au-delà de leur durée habituelle ?',
    type: 'single',
    options: [
      { value: 'oui-reg',   label: 'Oui, régulièrement' },
      { value: 'oui-occ',   label: 'Oui, occasionnellement' },
      { value: 'non',       label: 'Non' },
      { value: 'nsp',       label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q3.2', section: 'Temps de travail et rémunérations', sectionIcon: 'clock',
    text: 'Ces heures sont-elles systématiquement déclarées sur les bulletins de paie, et pourriez-vous produire un décompte individuel fiable pour chaque salarié concerné ?',
    type: 'single',
    condition: (a) => a['Q3.1'] && a['Q3.1'] !== 'non',
    options: [
      { value: 'oui-decl-decompte', label: 'Oui, déclarées et décompte disponible pour tous' },
      { value: 'decl-decompte-partiel', label: 'Déclarées mais décompte partiel ou absent' },
      { value: 'pas-toujours-decl', label: 'Pas toujours déclarées' },
      { value: 'nsp', label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q3.3', section: 'Temps de travail et rémunérations', sectionIcon: 'clock',
    text: 'Pour chaque forfait jours, disposez-vous d’une convention écrite, d’un suivi des jours et d’un entretien annuel ?',
    type: 'single',
    options: [
      { value: 'oui-tous', label: 'Oui, pour tous' },
      { value: 'partiel',  label: 'Partiellement' },
      { value: 'non',      label: 'Non' },
      { value: 'pas-fj',   label: 'Pas de salariés au forfait jours' },
      { value: 'nsp',      label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q3.4', section: 'Temps de travail et rémunérations', sectionIcon: 'clock',
    text: 'Certains prestataires indépendants réguliers interviennent-ils dans des conditions proches d\'une intégration salariée : horaires ou jours imposés, directives opérationnelles détaillées, utilisation de vos outils, insertion durable dans vos équipes, dépendance économique marquée ?',
    type: 'single',
    options: [
      { value: 'oui',        label: 'Oui' },
      { value: 'non',        label: 'Non' },
      { value: 'pas-indep',  label: 'Pas d\'indépendants réguliers' },
      { value: 'nsp',        label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q3.5', section: 'Temps de travail et rémunérations', sectionIcon: 'clock',
    text: 'Toutes les sommes versées aux salariés figurent-elles dans la paie et les DSN ?',
    type: 'single',
    options: [
      { value: 'oui-sans-exc',   label: 'Oui, sans exception' },
      { value: 'principalement', label: 'Principalement, mais pas dans tous les cas' },
      { value: 'non-hors',       label: 'Non, certaines sommes sont versées hors circuit déclaratif' },
      { value: 'nsp',            label: 'Je ne suis pas sûr(e)' }
    ]
  },

  /* ==========================================================
     BLOC 4 — RGDU (Réduction générale dégressive unique)
     ========================================================== */
  {
    id: 'Q4.1', section: 'Réduction générale dégressive unique (RGDU)', sectionIcon: 'trending-down',
    text: 'À titre indicatif, quelle part de vos salariés perçoit une rémunération susceptible de rester, sur l\'année, sous le seuil d\'extinction de la RGDU (3 SMIC annualisés, ajustés selon le temps de présence et la durée de travail) ?',
    type: 'single',
    options: [
      { value: 'majorite',     label: 'La majorité (plus de 50 %)' },
      { value: 'significative', label: 'Une part significative (20 à 50 %)' },
      { value: 'minorite',     label: 'Une minorité (moins de 20 %)' },
      { value: 'aucun',        label: 'Aucun ou quasi aucun' },
      { value: 'nsp',          label: 'Je ne sais pas' }
    ]
  },
  {
    id: 'Q4.2', section: 'Réduction générale dégressive unique (RGDU)', sectionIcon: 'trending-down',
    text: 'Le calcul de la réduction générale est-il contrôlé régulièrement, notamment pour les cas complexes ?',
    type: 'single',
    options: [
      { value: 'oui-regulier', label: 'Oui, contrôle régulier' },
      { value: 'ponctuel',     label: 'Ponctuellement seulement' },
      { value: 'non-auto',     label: 'Non, paramétrage automatique non revu' },
      { value: 'nsp',          label: 'Je ne sais pas' }
    ]
  },

  /* ==========================================================
     BLOC 5 — AEN véhicule (ex-thème K)
     ========================================================== */
  {
    id: 'Q5.1', section: 'AEN véhicule', sectionIcon: 'car',
    text: 'Des salariés ou dirigeants peuvent-ils utiliser un véhicule de l’entreprise à titre personnel ?',
    type: 'single',
    options: [
      { value: 'strict-pro',     label: 'Usage strictement professionnel' },
      { value: 'perso-possible', label: 'Usage personnel possible ou non exclu' },
      { value: 'pas-vehicule',   label: 'Pas de véhicule mis à disposition' },
      { value: 'nsp',            label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q5.1b', section: 'AEN véhicule', sectionIcon: 'car',
    text: 'Si vous considérez l\'usage comme strictement professionnel, disposez-vous des éléments permettant de l\'établir (interdiction contractuelle formalisée, restitution documentée hors temps de travail, carnet de bord ou équivalent) ?',
    type: 'single',
    condition: (a) => a['Q5.1'] === 'strict-pro',
    options: [
      { value: 'oui-tous', label: 'Oui, éléments disponibles pour tous les véhicules' },
      { value: 'certains', label: 'Pour certains seulement' },
      { value: 'non',      label: 'Non' },
      { value: 'nsp',      label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q5.2', section: 'AEN véhicule', sectionIcon: 'car',
    text: 'La méthode d’évaluation de cet avantage a-t-elle été revue depuis février 2025 ?',
    type: 'single',
    condition: (a) => a['Q5.1'] === 'perso-possible' || a['Q5.1'] === 'nsp',
    options: [
      { value: 'oui-revue',     label: 'Oui, méthode revue et conforme' },
      { value: 'non-revue',     label: 'Méthode en place mais non revue depuis 2025' },
      { value: 'aucune-eval',   label: 'Aucune évaluation n\'a été faite' },
      { value: 'nsp',           label: 'Je ne suis pas sûr(e)' }
    ]
  },
  // Q5.fleet : quantifie la flotte pour positionner la tranche tarifaire ANV
  {
    id: 'Q5.fleet', section: 'AEN véhicule', sectionIcon: 'car',
    text: 'Combien de véhicules sont mis à disposition par l\'entreprise ?',
    type: 'single',
    // On pose la question uniquement si le bloc 5 est pertinent (sinon inutile)
    condition: (a) => a['Q5.1'] && a['Q5.1'] !== 'pas-vehicule',
    options: [
      { value: '1-4',   label: '1 à 4 véhicules' },
      { value: '5-15',  label: '5 à 15 véhicules' },
      { value: '16-40', label: '16 à 40 véhicules' },
      { value: '41-100', label: '41 à 100 véhicules' },
      { value: '100+',  label: 'Plus de 100 véhicules' }
    ]
  },

  /* ==========================================================
     BLOC 6 — Ruptures du contrat de travail et transactions
     ========================================================== */
  {
    id: 'Q6.1', section: 'Ruptures et transactions', sectionIcon: 'handshake',
    text: 'Au cours des 3 dernières années, avez-vous versé des indemnités de rupture conventionnelle, des indemnités transactionnelles ou procédé à des mises à la retraite ?',
    type: 'single',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q6.2', section: 'Ruptures et transactions', sectionIcon: 'handshake',
    text: 'Le traitement social de ces sommes a-t-il été revu selon les règles applicables à chaque versement ?',
    type: 'single',
    condition: (a) => a['Q6.1'] === 'oui' || a['Q6.1'] === 'nsp',
    options: [
      { value: 'revue-complete', label: 'Oui, revue complète et à jour' },
      { value: 'revue-ant',      label: 'Revue effectuée mais antérieure à janvier 2026' },
      { value: 'non-revue',      label: 'Traitement social non revu' },
      { value: 'nsp',            label: 'Je ne suis pas sûr(e)' }
    ]
  },

  /* ==========================================================
     BLOC 7 — Versement mobilité (VM) — si Q0.1 >= 11 salariés
     ========================================================== */
  {
    id: 'Q7.0', section: 'Versement mobilité', sectionIcon: 'bus',
    text: 'Savez-vous si votre effectif moyen annuel a atteint ou dépassé 11 salariés pendant 5 années civiles consécutives ?',
    type: 'single',
    condition: (a) => a['Q0.1'] && a['Q0.1'] !== '1-10',
    options: [
      { value: 'oui-seuil-long', label: 'Oui, ce seuil est atteint depuis plusieurs années' },
      { value: 'oui-recent',     label: 'Oui, récemment (moins de 5 ans consécutifs)' },
      { value: 'non',            label: 'Non' },
      { value: 'nsp',            label: 'Je ne sais pas' }
    ]
  },
  {
    id: 'Q7.0bis', section: 'Versement mobilité', sectionIcon: 'bus',
    text: 'Savez-vous si des salariés sont rattachés à une zone où un versement mobilité est institué ?',
    type: 'single',
    condition: (a) => a['Q0.1'] && a['Q0.1'] !== '1-10',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q7.1', section: 'Versement mobilité', sectionIcon: 'bus',
    text: 'Le taux et la déclaration sont-ils contrôlés selon le lieu d’affectation des salariés ?',
    type: 'single',
    condition: (a) => a['Q7.0bis'] === 'oui' || a['Q7.0bis'] === 'nsp',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne sais pas' }
    ]
  }
];

// Le prédiagnostic commercial reste un filtre rapide. Les questions détaillées
// sont réservées à l'audit. Les identifiants sont conservés pour ne pas casser
// le moteur de scoring existant.
const SHORT_QUESTION_IDS = new Set([
  'Q0.1', 'Q0.4',
  'Q1.1', 'Q1.4',
  'Q2.1a', 'Q2.1b', 'Q2.3',
  'Q3.3', 'Q3.5',
  'Q4.2',
  'Q5.1', 'Q5.1b', 'Q5.2', 'Q5.fleet',
  'Q6.1', 'Q6.2',
  'Q7.0bis', 'Q7.1'
]);


/* ============================================================
   Classe Questionnaire — pilote le parcours, affiche les cards
   API DOM respectée : mêmes classes que la version précédente
   (q-card, q-option, q-option-selected, q-nav, etc.)
   ============================================================ */

class Questionnaire {
  constructor(containerId, progressBarId, progressTextId) {
    this.container    = document.getElementById(containerId);
    /* A11Y : chaque nouvelle question est annoncée aux lecteurs d'écran */
    if (this.container) this.container.setAttribute('aria-live', 'polite');
    this.progressBar  = document.getElementById(progressBarId);
    this.progressText = document.getElementById(progressTextId);
    this.answers      = {};
    this.currentIndex = 0;
    this.activeQuestions = [];
    this.seenQuestions = new Set();
    this.answeredQuestions = new Set();
    this.computeActiveQuestions();
  }

  // Recalcule la liste des questions effectivement affichées selon les réponses
  computeActiveQuestions() {
    this.activeQuestions = QUESTIONS.filter(q =>
      SHORT_QUESTION_IDS.has(q.id) && (!q.condition || q.condition(this.answers))
    );
  }

  getTotalActive()     { return this.activeQuestions.length; }
  getCurrentQuestion() { return this.activeQuestions[this.currentIndex]; }

  updateProgress() {
    const total = this.getTotalActive();
    const answered = Object.keys(this.answers).length;
    const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
    if (this.progressBar)  this.progressBar.style.setProperty('--progress', pct + '%');
    if (this.progressText) this.progressText.textContent = `${Math.min(answered, total)} / ${total}`;
  }

  start() {
    this.currentIndex = 0;
    this.answers = {};
    this.computeActiveQuestions();
    this.render();
  }

  render() {
    const q = this.getCurrentQuestion();
    if (!q) { this.renderContactForm(); return; }

    const prevSection = this.currentIndex > 0 ? this.activeQuestions[this.currentIndex - 1].section : null;
    const showSectionHeader = q.section !== prevSection;

    if (!this.seenQuestions.has(q.id)) {
      this.seenQuestions.add(q.id);
      if (window.posthog) posthog.capture('prediag_question_vue', {
        question_id: q.id,
        position: this.currentIndex + 1,
        total_affiche: this.getTotalActive()
      });
    }

    let html = '';
    if (showSectionHeader) {
      html += `<div class="q-section-header">
        <span class="q-section-icon"><i data-lucide="${q.sectionIcon}"></i></span>
        <span class="q-section-name">${q.section}</span>
      </div>`;
    }

    html += `<div class="q-card">
      <div class="q-number">Question ${this.currentIndex + 1} / ${this.getTotalActive()}</div>
      <h3 class="q-text">${q.text}</h3>`;

    if (q.hint) html += `<p class="q-hint">${q.hint}</p>`;

    html += `<div class="q-options">`;
    q.options.forEach((opt) => {
      const selected = this.answers[q.id] === opt.value;
      html += `<button class="q-option ${selected ? 'q-option-selected' : ''}" data-value="${opt.value}">
        <span class="q-option-check">${selected ? '✓' : ''}</span>
        <span class="q-option-label">${opt.label}</span>
      </button>`;
    });
    html += `</div>`;

    html += `<div class="q-nav">`;
    html += (this.currentIndex > 0)
      ? `<button class="q-nav-back" id="q-back">← Précédent</button>`
      : `<div></div>`;
    html += `<div></div>`;
    html += `</div>`;

    html += `</div>`;

    this.container.innerHTML = html;
    this.updateProgress();
    this.bindEvents(q);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    /* A11Y : le focus suit la question affichée */
    const qt = this.container.querySelector('.q-text');
    if (qt) { qt.setAttribute('tabindex', '-1'); qt.focus(); }
  }

  bindEvents(q) {
    this.container.querySelectorAll('.q-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.answers[q.id] = btn.dataset.value;
        if (!this.answeredQuestions.has(q.id)) {
          this.answeredQuestions.add(q.id);
          if (window.posthog) posthog.capture('prediag_question_reponse', {
            question_id: q.id,
            position: this.currentIndex + 1,
            total_affiche: this.getTotalActive()
          });
        }
        this.computeActiveQuestions();
        const newIds = this.activeQuestions.map(x => x.id);
        const idx = newIds.indexOf(q.id);
        this.currentIndex = idx + 1;
        this.render();
      });
    });
    const back = document.getElementById('q-back');
    if (back) back.addEventListener('click', () => {
      this.currentIndex = Math.max(0, this.currentIndex - 1);
      this.render();
    });
  }

  renderContactForm() {
    if (window.posthog) posthog.capture('prediag_contact_vu', {
      questions_affichees: this.getTotalActive()
    });
    // Formulaire coordonnées + 2 cases RGPD optionnelles (arbitrage #2)
    const html = `
      <div class="q-card q-card-final">
        <div class="q-section-header">
          <span class="q-section-icon">📧</span>
          <span class="q-section-name">Recevoir votre rapport</span>
        </div>
        <h3 class="q-text">Votre résultat est prêt.</h3>
        <p class="q-hint">Votre rapport personnalisé s'affichera à l'écran dès validation. Vous pourrez aussi l'imprimer ou le sauvegarder en PDF depuis votre navigateur.</p>

        <form class="q-contact-form" id="q-contact-form">
          <div class="q-form-group">
            <label for="q-field-email">Adresse email professionnelle *</label>
            <input type="email" id="q-field-email" name="email" required placeholder="votre@entreprise.com">
          </div>
          <div class="q-form-group">
            <label for="q-field-name">Nom et prénom <span aria-hidden="true">(facultatif)</span></label>
            <input type="text" id="q-field-name" name="name" placeholder="Jean Dupont">
          </div>
          <div class="q-form-group">
            <label for="q-field-function">Fonction <span aria-hidden="true">(facultatif)</span></label>
            <select id="q-field-function" name="function">
              <option value="">Sélectionnez...</option>
              <option value="dirigeant">Dirigeant(e)</option>
              <option value="drh">DRH / RRH</option>
              <option value="daf">DAF / RAF</option>
              <option value="paie">Responsable paie</option>
              <option value="ec">Expert-comptable</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="q-form-group">
            <label for="q-field-sector">Secteur <span aria-hidden="true">(facultatif)</span></label>
            <select id="q-field-sector" name="sector">
              <option value="">Sélectionnez...</option>
              <option value="btp">BTP</option>
              <option value="transport">Transport / logistique</option>
              <option value="hcr">Hôtellerie / restauration</option>
              <option value="commerce">Commerce / distribution</option>
              <option value="services">Services / conseil</option>
              <option value="industrie">Industrie</option>
              <option value="sante">Santé / médico-social</option>
              <option value="tech">Tech / numérique</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div class="q-form-group q-form-checkbox">
            <label>
              <input type="checkbox" name="optin_contact">
              <span>J'accepte d'être recontacté par ACOMPIA pour un échange sans engagement.</span>
            </label>
          </div>
          <div class="hp-field" aria-hidden="true">
            <label for="q-website">Site web (à ne pas remplir)</label>
            <input type="text" id="q-website" name="website" tabindex="-1" autocomplete="off">
          </div>
          <button type="submit" class="btn-primary q-submit">Voir mon résultat →</button>
          <p class="q-data-note">Vos données sont utilisées pour générer votre résultat et enregistrer votre demande. <a href="/politique-confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a>.</p>
        </form>

        <div class="q-nav">
          <button class="q-nav-back" id="q-back-final">← Revenir aux questions</button>
          <div></div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.updateProgress();

    document.getElementById('q-back-final').addEventListener('click', () => {
      this.currentIndex = this.activeQuestions.length - 1;
      this.render();
    });

    document.getElementById('q-contact-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      // Anti-bot honeypot
      if (fd.get('website')) {
        this.container.innerHTML = '<div style="text-align:center;padding:40px"><p>Merci.</p></div>';
        return;
      }

      const contact = {
        email: fd.get('email'),
        name: fd.get('name'),
        function: fd.get('function') || '',
        sector: fd.get('sector') || '',
        optin_contact: fd.get('optin_contact') === 'on'
      };

      // Moteur de scoring (scoring.js)
      const scoring    = computeScoring(this.answers);
      const reportHTML = generateReportHTML(scoring, contact);

      // Construction de la synthèse destinée à la colonne Notes Notion.
      const byLevel = { CRITIQUE: [], ELEVE: [], MOYEN: [], REDUIT: [] };
      scoring.themes.forEach(t => {
        if (byLevel[t.level]) byLevel[t.level].push(t.name);
      });
      const submissionId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `prediag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const parts = [
        `Soumission: ${submissionId}`,
        `Effectif: ${this.answers['Q0.1'] || 'non-renseigne'}`,
        `Secteur: ${contact.sector || 'non-renseigne'}`,
        `Fonction: ${contact.function || 'non-renseignee'}`,
        `Controle passe: ${this.answers['Q0.4'] || 'non-renseigne'}`,
        `Flotte: ${this.answers['Q5.fleet'] || 'non-concernee'}`,
        `Vigilance: ${scoring.seuilLabel}`
      ];
      if (byLevel.CRITIQUE.length) parts.push(`CRITIQUE: ${byLevel.CRITIQUE.join(', ')}`);
      if (byLevel.ELEVE.length)    parts.push(`ÉLEVÉ: ${byLevel.ELEVE.join(', ')}`);
      if (byLevel.MOYEN.length)    parts.push(`MOYEN: ${byLevel.MOYEN.join(', ')}`);
      if (byLevel.REDUIT.length)   parts.push(`RÉDUIT: ${byLevel.REDUIT.join(', ')}`);
      const scoringString = parts.join(' | ');

      // Analytics PostHog — aucune donnée personnelle (ni nom, ni email)
      if (window.posthog) posthog.capture('prediag_termine', {
        vigilance: scoring.seuil,
        nb_critique: byLevel.CRITIQUE.length,
        nb_eleve: byLevel.ELEVE.length,
        nb_moyen: byLevel.MOYEN.length,
        nb_reduit: byLevel.REDUIT.length,
        nb_questions: this.getTotalActive()
      });

      // Envoi au Cloudflare Worker (Notion)
      // Le worker reçoit { type:'prediag', data:{ name, email, function, optin, scoring } }
      const WORKER_URL = 'https://acompia-worker.she-aa1.workers.dev';
      const pendingLead = {
        type: 'prediag',
        data: {
          name: contact.name,
          email: contact.email,
          function: contact.function,
          optin: contact.optin_contact,
          scoring: scoringString
        }
      };
      localStorage.setItem('acompia_prediag_pending', JSON.stringify({
        payload: pendingLead,
        stored_at: Date.now()
      }));

      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingLead)
      })
      .then(r => {
        if (!r.ok) throw new Error('Worker indisponible');
        return r.json();
      })
      .then(result => {
        if (!result || result.success !== true) throw new Error('Enregistrement refusé');
        localStorage.removeItem('acompia_prediag_pending');
        if (window.posthog) posthog.capture('prediag_enregistre');
      })
      .catch(() => {
        if (window.posthog) posthog.capture('prediag_envoi_echec');
      });

      // Injection du rapport dans le DOM
      // On sort du container prediag (bg/padding hérités qui cassent la lisibilité)
      // en basculant la section entière en "mode rapport".
      const section = document.getElementById('prediag');
      if (section) section.classList.add('section-report-mode');
      document.body.classList.add('report-mode');
      // Masque la barre de progression
      const progress = document.querySelector('.prediag-progress');
      if (progress) progress.style.display = 'none';

      this.container.innerHTML = reportHTML;
      // Scroll doux vers le haut du rapport
      setTimeout(() => {
        const el = document.getElementById('acompia-report');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });
  }
}

/* ============================================================
   Initialisation au chargement de la page
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('prediag-form');
  if (!form) return;

  // Retente automatiquement un envoi qui n'a pas été confirmé lors de la
  // visite précédente. La copie n'est supprimée qu'après confirmation.
  const pendingRaw = localStorage.getItem('acompia_prediag_pending');
  if (pendingRaw) {
    try {
      const stored = JSON.parse(pendingRaw);
      const pendingLead = stored.payload || stored;
      const storedAt = stored.stored_at || 0;
      const MAX_PENDING_AGE = 7 * 24 * 60 * 60 * 1000;
      if (storedAt && Date.now() - storedAt > MAX_PENDING_AGE) {
        localStorage.removeItem('acompia_prediag_pending');
        throw new Error('Sauvegarde expirée');
      }
      fetch('https://acompia-worker.she-aa1.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingLead)
      })
      .then(r => {
        if (!r.ok) throw new Error('Worker indisponible');
        return r.json();
      })
      .then(result => {
        if (!result || result.success !== true) throw new Error('Enregistrement refusé');
        localStorage.removeItem('acompia_prediag_pending');
        if (window.posthog) posthog.capture('prediag_enregistre', { reprise: true });
      })
      .catch(() => {
        if (window.posthog) posthog.capture('prediag_envoi_echec', { reprise: true });
      });
    } catch (_) {
      localStorage.removeItem('acompia_prediag_pending');
    }
  }

  const q = new Questionnaire('prediag-form', 'progress-bar', 'progress-text');

  form.addEventListener('click', (e) => {
    if (e.target.closest('#start-prediag')) {
      if (window.posthog) posthog.capture('prediag_lance');
      q.start();
    }
  });
});
