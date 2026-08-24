/* ============================================
   ACOMPIA — Socle commun
   Trois utilitaires partagés par toutes les pages :
   échappement HTML, envoi de lead, mesure d'audience.
   Dépend de js/config.js.
   ============================================ */

/* Toute donnée saisie par le visiteur doit passer ici avant d'être
   concaténée dans une chaîne HTML. Pour du texte seul, préférer
   `element.textContent = valeur`, qui n'a besoin d'aucun échappement. */
function echapperHTML(valeur) {
  return String(valeur ?? '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caractere]));
}

/* Mesure d'audience — sans effet si PostHog n'est pas chargé (bloqueur, mode local). */
function capturerEvenement(nom, proprietes) {
  if (window.posthog) window.posthog.capture(nom, proprietes);
}

/* Envoie un lead au Worker Cloudflare (qui alimente Notion).
   Renvoie une promesse REJETÉE si l'envoi échoue : l'appelant doit la
   traiter, sans quoi un lead se perdrait sans que personne ne le sache. */
function envoyerAuWorker(type, data) {
  return fetch(ACOMPIA_CONFIG.workerURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data })
  }).then((reponse) => {
    if (!reponse.ok) throw new Error('Worker a répondu ' + reponse.status);
    return reponse.json();
  });
}

/* Repli affiché quand le Worker est injoignable : on donne au visiteur
   un moyen de nous joindre, et on trace l'échec pour pouvoir le compter. */
function signalerEchecEnvoi(conteneur) {
  capturerEvenement('lead_envoi_echoue', { page: location.pathname });
  if (!conteneur) return;
  const avis = document.createElement('p');
  avis.className = 'envoi-echec';
  avis.textContent = "Votre demande n'a pas pu être transmise. "
    + 'Écrivez-nous directement à ' + ACOMPIA_CONFIG.contactEmail + '.';
  conteneur.appendChild(avis);
}

/* Mesure des clics rendez-vous (Calendly) · aucune donnée personnelle.
   Posé ici plutôt que dans main.js : les pages outils n'ont pas main.js. */
document.addEventListener('click', (evenement) => {
  const cible = evenement.target;
  if (cible && cible.closest && cible.closest('a[href*="calendly.com"]')) {
    capturerEvenement('rdv_click', { source: location.pathname });
  }
});

/* Les déclarations `function` de premier niveau d'un script classique sont
   déjà exposées globalement : aucune réaffectation sur `window` n'est utile. */
