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

/* Provenance du visiteur. PostHog tourne sans cookie (persistence 'memory') : chaque
   chargement de page est une personne neuve, donc l'attribution ne peut pas être
   reconstruite après coup. On l'attache à chaque événement, sinon elle est perdue. */
function proprietesAttribution() {
  const params = new URLSearchParams(location.search);
  const utm = {};
  ['source', 'medium', 'campaign', 'content', 'term'].forEach((cle) => {
    const valeur = params.get('utm_' + cle);
    if (valeur) utm['utm_' + cle] = valeur;
  });
  return {
    page: location.pathname,
    referrer: document.referrer || undefined,
    ...utm
  };
}

/* Mesure d'audience — sans effet si PostHog n'est pas chargé (bloqueur, mode local). */
function capturerEvenement(nom, proprietes) {
  if (window.posthog) window.posthog.capture(nom, { ...proprietesAttribution(), ...proprietes });
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

/* ============================================
   Mesure de parcours en page

   Sans cookie, aucun tunnel entre deux pages n'est calculable : chaque chargement
   crée une personne distincte. Tout ce qui suit mesure donc ce qui se passe à
   l'intérieur d'un même chargement, où l'identifiant reste stable.
   ============================================ */

const SEUIL_SECTION_VUE = 0.4; // 40 % visible = section réellement vue

/* Émet `section_vue` une fois par section, à son entrée dans le viewport.
   Donne la profondeur de scroll : quelle section est le mur de la page. */
function observerSections() {
  const sections = [...document.querySelectorAll('section[id], main > [id]')];
  if (!sections.length || typeof IntersectionObserver === 'undefined') return;

  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      observateur.unobserve(entree.target);
      capturerEvenement('section_vue', {
        section: entree.target.id,
        rang: sections.indexOf(entree.target),
        total: sections.length
      });
    });
  }, { threshold: SEUIL_SECTION_VUE });

  sections.forEach((section) => observateur.observe(section));
}

/* Nature de la destination d'un CTA, pour comparer des boutons entre eux
   sans dépendre de leur libellé. */
function typeDeDestination(href) {
  if (!href) return 'autre';
  if (href.includes('calendly.com')) return 'rendez-vous';
  if (href.includes('prediagnostic')) return 'prediagnostic';
  if (href.includes('simulateur')) return 'simulateur';
  if (href.includes('tarifs')) return 'tarifs';
  if (href.includes('#devis')) return 'devis';
  if (href.includes('#fondateurs')) return 'fondateurs';
  if (href.includes('#platform')) return 'notification-lancement';
  if (href.startsWith('mailto:')) return 'email';
  if (href.startsWith('tel:')) return 'telephone';
  return 'autre';
}

/* Émet `cta_clique` sur tout élément stylé en bouton, où qu'il soit.
   Aucun attribut à poser dans le HTML : l'emplacement est déduit de la section
   qui contient le bouton. */
function observerCTA() {
  document.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    if (!cible || !cible.closest) return;
    const bouton = cible.closest('a[class*="btn"], button[class*="btn"]');
    if (!bouton) return;

    const href = bouton.getAttribute('href');
    const section = bouton.closest('section[id]');
    const emplacement = section ? section.id
      : bouton.closest('nav') ? 'nav'
      : bouton.closest('footer') ? 'footer'
      : 'hors-section';

    capturerEvenement('cta_clique', {
      libelle: (bouton.textContent || '').trim().slice(0, 60),
      emplacement,
      destination: typeDeDestination(href)
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  observerSections();
  observerCTA();
});

/* Mesure des clics rendez-vous (Calendly) · aucune donnée personnelle.
   Conservé pour la continuité de l'historique : les boutons Calendly émettent
   donc aussi `cta_clique`, avec destination « rendez-vous ». */
document.addEventListener('click', (evenement) => {
  const cible = evenement.target;
  if (cible && cible.closest && cible.closest('a[href*="calendly.com"]')) {
    capturerEvenement('rdv_click', { source: location.pathname });
  }
});

/* Les déclarations `function` de premier niveau d'un script classique sont
   déjà exposées globalement : aucune réaffectation sur `window` n'est utile. */
