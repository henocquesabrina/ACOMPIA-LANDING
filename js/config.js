/* ============================================
   ACOMPIA — Configuration partagée
   Point unique de vérité pour les ressources externes.
   Chargé avant tous les autres scripts (`defer` conserve l'ordre).
   ============================================ */

const ACOMPIA_CONFIG = {
  workerURL:    'https://acompia-worker.she-aa1.workers.dev',
  rdvURL:       'https://calendly.com/she-acompia/30min',
  contactEmail: 'she@acompia.com'
};

/* Contrairement aux déclarations `function`, un `const` de premier niveau n'est
   pas exposé sur `window` : l'affectation est nécessaire ici. */
window.ACOMPIA_CONFIG = ACOMPIA_CONFIG;
