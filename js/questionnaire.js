/* ============================================
   ACOMPIA — Questionnaire Prédiagnostic URSSAF
   Version consolidée 15/04/2026 — 32 questions / 9 blocs
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
    text: 'Pourriez-vous justifier, pour chaque frais remboursé ou indemnisé, la dépense engagée ou la situation ouvrant droit à l\'indemnité ?',
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
    text: 'Pour les salariés dispensés d\'adhésion, disposez-vous d\'une demande de dispense écrite et signée, et ces cas de dispense sont-ils bien prévus par l\'acte mettant en place le régime ?',
    type: 'single',
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
    text: 'Pour les salariés au forfait jours, disposez-vous d\'une convention individuelle écrite, d\'un document de suivi des journées ou demi-journées travaillées et d\'un entretien annuel portant notamment sur la charge de travail ?',
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
    text: 'Toutes les sommes versées à vos salariés (primes, gratifications, avantages, remboursements) transitent-elles par la paie et figurent-elles sur les bulletins et dans les DSN ?',
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
    text: 'Le calcul de la RGDU fait-il l\'objet d\'un contrôle humain régulier, notamment pour les situations complexes (absences, entrées/sorties, temps partiel, éléments variables) ?',
    type: 'single',
    condition: (a) => a['Q4.1'] && a['Q4.1'] !== 'aucun',
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
    text: 'Pour les véhicules mis à disposition par l\'entreprise à des salariés ou dirigeants, l\'usage est-il considéré comme strictement professionnel ou un usage personnel est-il possible ?',
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
    text: 'Lorsqu\'un usage personnel existe ou ne peut pas être exclu, la méthode d\'évaluation retenue a-t-elle été revue au regard des règles applicables depuis le 1er février 2025, en tenant compte de la date de première mise à disposition de chaque véhicule ?',
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
    text: 'Pour ces ruptures et transactions, le traitement social des sommes versées a-t-il fait l\'objet d\'une revue intégrant les règles applicables à la date de chaque versement, y compris la contribution patronale applicable depuis le 31 décembre 2025 sur les ruptures conventionnelles et mises à la retraite à l\'initiative de l\'employeur ?',
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
    text: 'Avez-vous des salariés affectés dans une zone où un versement mobilité est institué ?',
    type: 'single',
    condition: (a) => a['Q0.1'] && a['Q0.1'] !== '1-10' && a['Q7.0'] && a['Q7.0'] !== 'non',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne suis pas sûr(e)' }
    ]
  },
  {
    id: 'Q7.1', section: 'Versement mobilité', sectionIcon: 'bus',
    text: 'Votre entreprise verse-t-elle aujourd\'hui une cotisation au titre du versement mobilité ?',
    type: 'single',
    hint: 'Depuis 2026, un versement mobilité régional et rural (VMRR) peut s\'ajouter au VM dans certaines régions. Son moteur de calcul est distinct.',
    condition: (a) => a['Q0.1'] && a['Q0.1'] !== '1-10' &&
                      a['Q7.0'] && a['Q7.0'] !== 'non' &&
                      a['Q7.0bis'] && a['Q7.0bis'] !== 'non',
    options: [
      { value: 'oui', label: 'Oui' },
      { value: 'non', label: 'Non' },
      { value: 'nsp', label: 'Je ne sais pas' }
    ]
  }
];


/* ============================================================
   Classe Questionnaire — pilote le parcours, affiche les cards
   API DOM respectée : mêmes classes que la version précédente
   (q-card, q-option, q-option-selected, q-nav, etc.)
   ============================================================ */

class Questionnaire {
  constructor(containerId, progressBarId, progressTextId) {
    this.container    = document.getElementById(containerId);
    this.progressBar  = document.getElementById(progressBarId);
    this.progressText = document.getElementById(progressTextId);
    this.answers      = {};
    this.currentIndex = 0;
    this.activeQuestions = [];
    this.computeActiveQuestions();
  }

  // Recalcule la liste des questions effectivement affichées selon les réponses
  computeActiveQuestions() {
    this.activeQuestions = QUESTIONS.filter(q => !q.condition || q.condition(this.answers));
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
  }

  bindEvents(q) {
    this.container.querySelectorAll('.q-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.answers[q.id] = btn.dataset.value;
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
    // Formulaire coordonnées + 2 cases RGPD optionnelles (arbitrage #2)
    const html = `
      <div class="q-card q-card-final">
        <div class="q-section-header">
          <span class="q-section-icon">📧</span>
          <span class="q-section-name">Recevoir votre rapport</span>
        </div>
        <h3 class="q-text">Parfait — encore quelques informations.</h3>
        <p class="q-hint">Votre rapport personnalisé s'affichera à l'écran dès validation. Vous pourrez aussi l'imprimer ou le sauvegarder en PDF depuis votre navigateur.</p>

        <form class="q-contact-form" id="q-contact-form">
          <div class="q-form-group">
            <label>Adresse email professionnelle *</label>
            <input type="email" name="email" required placeholder="votre@entreprise.com">
          </div>
          <div class="q-form-group">
            <label>Nom et prénom *</label>
            <input type="text" name="name" required placeholder="Jean Dupont">
          </div>
          <div class="q-form-group">
            <label>Votre fonction</label>
            <select name="function">
              <option value="">Sélectionnez...</option>
              <option value="dirigeant">Dirigeant(e)</option>
              <option value="drh">DRH / RRH</option>
              <option value="daf">DAF / RAF</option>
              <option value="paie">Responsable paie</option>
              <option value="ec">Expert-comptable</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div class="q-form-group q-form-checkbox">
            <label>
              <input type="checkbox" name="optin_contact">
              <span>J'accepte d'être recontacté par ACOMPIA pour un échange sans engagement.</span>
            </label>
          </div>
          <button type="submit" class="btn-primary q-submit">Afficher mon rapport →</button>
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
      const contact = {
        email: fd.get('email'),
        name: fd.get('name'),
        function: fd.get('function') || '',
        optin_contact: fd.get('optin_contact') === 'on'
      };

      // Moteur de scoring (scoring.js)
      const scoring    = computeScoring(this.answers);
      const reportHTML = generateReportHTML(scoring, contact);

      // Construction de la chaîne `scoring` pour la colonne Notes Notion
      // Format : "Indice: 67 | CRITIQUE: ... | ÉLEVÉ: ... | MOYEN: ... | RÉDUIT: ..."
      const byLevel = { CRITIQUE: [], ELEVE: [], MOYEN: [], REDUIT: [] };
      scoring.themes.forEach(t => {
        if (byLevel[t.level]) byLevel[t.level].push(t.name);
      });
      const parts = [`Indice: ${scoring.indice}`];
      if (byLevel.CRITIQUE.length) parts.push(`CRITIQUE: ${byLevel.CRITIQUE.join(', ')}`);
      if (byLevel.ELEVE.length)    parts.push(`ÉLEVÉ: ${byLevel.ELEVE.join(', ')}`);
      if (byLevel.MOYEN.length)    parts.push(`MOYEN: ${byLevel.MOYEN.join(', ')}`);
      if (byLevel.REDUIT.length)   parts.push(`RÉDUIT: ${byLevel.REDUIT.join(', ')}`);
      const scoringString = parts.join(' | ');

      // Envoi au Cloudflare Worker (Notion)
      // Le worker reçoit { type:'prediag', data:{ name, email, function, optin, scoring } }
      const WORKER_URL = 'https://acompia-worker.she-aa1.workers.dev';
      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'prediag',
          data: {
            name: contact.name,
            email: contact.email,
            function: contact.function,
            // champ 'optin' = recontact commercial
            optin: contact.optin_contact,
            scoring: scoringString
          }
        })
      })
      .then(r => r.json())
      .then(res => console.log('Notion sync prédiag:', res.success ? '✓' : 'erreur', res))
      .catch(err => console.warn('Notion sync échoué:', err.message));

      // Sauvegarde localStorage (sécurité — perte réseau)
      const all = JSON.parse(localStorage.getItem('acompia_prediags') || '[]');
      all.push({
        date: new Date().toISOString(),
        contact,
        answers: this.answers,
        scoring: { indice: scoring.indice, themes: scoring.themes.map(t => ({ name: t.name, level: t.level })) }
      });
      localStorage.setItem('acompia_prediags', JSON.stringify(all));

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

  const q = new Questionnaire('prediag-form', 'progress-bar', 'progress-text');

  // Écran d'intro (cadre & portée + RGPD dépliable)
  form.innerHTML = `
    <div class="prediag-placeholder">
      <div class="prediag-intro">
        <h3>Prédiagnostic URSSAF — cadre et portée</h3>
        <p>Ce questionnaire vous permet d'obtenir un prédiagnostic rapide de votre exposition aux principaux risques de redressement URSSAF.</p>
        <p>Il repose intégralement sur vos réponses déclaratives. Il ne constitue ni un audit, ni une validation de conformité. Son objectif est d'identifier des zones d'attention et des situations d'exposition probables. Les résultats sont indicatifs et ne valent pas conclusions juridiques définitives.</p>
        <p>Seul un audit approfondi portant sur les documents, les données de paie, les DSN et les pratiques effectives permet de confirmer ou d'infirmer les risques identifiés.</p>
        <p class="q-hint">Durée estimée : 4 à 6 minutes.</p>

        <details class="rgpd-toggle">
          <summary>Protection des données personnelles</summary>
          <div class="rgpd-content">
            <p>Le responsable de traitement est ComplyDB SAS, éditrice d'ACOMPIA. Les données renseignées (identité, coordonnées professionnelles, fonction, réponses au questionnaire) sont traitées afin de générer votre rapport de prédiagnostic. La base légale du traitement diagnostique est l'exécution de mesures précontractuelles demandées par la personne concernée (art. 6 §1 b RGPD).</p>
            <p>La case « recontact » proposée en fin de parcours relève de votre consentement distinct (art. 6 §1 a RGPD) et ne conditionne pas la remise du rapport. Vos coordonnées sont conservées pendant une durée proportionnée à la finalité, puis archivées ou supprimées selon notre politique applicable.</p>
            <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et, lorsque les conditions sont réunies, de portabilité. Vous pouvez également introduire une réclamation auprès de la CNIL. Contact : <a href="mailto:she@acompia.com" style="color:#4338CA">she@acompia.com</a>.</p>
          </div>
        </details>
      </div>
      <button class="btn-primary" id="start-prediag">Commencer le prédiagnostic →</button>
    </div>
  `;

  document.getElementById('start-prediag').addEventListener('click', () => q.start());
});
