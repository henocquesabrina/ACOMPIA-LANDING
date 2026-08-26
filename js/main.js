/* ============================================
   ACOMPIA — Main JS
   Dépend de js/config.js et js/socle.js.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  activerScrollReveal();
  activerSmoothScroll();
  activerOmbreNav();
  activerMenuMobile();
  activerDropdownsNav();
  animerCompteursStat();
  activerFormulaireDevis();
  activerFormulaireNotify();
});

/* === Scroll Reveal === */
function activerScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
    // un coup de molette rapide saute ~1000px : la marge doit couvrir ce saut
    // pour ne jamais montrer d'écran blanc
  }, { threshold: 0, rootMargin: '0px 0px 900px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* === Smooth scroll for anchor links === */
function activerSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      // `querySelector('#')` lèverait une SyntaxError : on ignore les ancres vides
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* === Nav scroll effect ===
   Bascule une classe au franchissement du seuil, au lieu de réécrire un style
   inline à chaque événement de scroll (~60 Hz sur les 20 pages). */
const SEUIL_OMBRE_NAV_PX = 50;

function activerOmbreNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let ombreVisible = null;
  const majOmbre = () => {
    const doitEtreVisible = window.scrollY > SEUIL_OMBRE_NAV_PX;
    if (doitEtreVisible === ombreVisible) return; // rien à écrire hors franchissement
    ombreVisible = doitEtreVisible;
    nav.classList.toggle('nav--scrolled', doitEtreVisible);
  };

  window.addEventListener('scroll', majOmbre, { passive: true });
  majOmbre();
}

/* === Mobile menu toggle ===
   A11Y : état unique ouverture/fermeture du tiroir ; quand il est ouvert,
   le contenu principal et le footer deviennent inertes (inaccessibles au focus) */
function activerMenuMobile() {
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  if (!burger || !navLinks) return;

  const setTiroir = (isOpen) => {
    navLinks.classList.toggle('nav-open', isOpen);
    burger.classList.toggle('active', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.querySelectorAll('main, footer').forEach((el) => { el.inert = isOpen; });
  };

  burger.addEventListener('click', () => {
    setTiroir(!navLinks.classList.contains('nav-open'));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setTiroir(false));
  });

  // A11Y : Échap ferme le tiroir et rend le focus au burger
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('nav-open')) {
      setTiroir(false);
      burger.focus();
    }
  });
}

/* === A11Y : dropdowns nav — aria-expanded synchronisé + fermeture Échap === */
function activerDropdownsNav() {
  document.querySelectorAll('.nav-dropdown').forEach((dd) => {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', 'false');

    const estOuvert = () =>
      (dd.matches(':hover') || dd.contains(document.activeElement)) &&
      !dd.classList.contains('nav-dropdown--esc');
    const majEtat = () => {
      toggle.setAttribute('aria-expanded', estOuvert() ? 'true' : 'false');
    };

    dd.addEventListener('mouseenter', () => {
      dd.classList.remove('nav-dropdown--esc');
      majEtat();
    });
    dd.addEventListener('mouseleave', () => {
      dd.classList.remove('nav-dropdown--esc');
      majEtat();
    });
    dd.addEventListener('focusin', majEtat);
    dd.addEventListener('focusout', () => {
      // Le focus n'est posé sur la cible suivante qu'après le focusout
      setTimeout(() => {
        if (!dd.contains(document.activeElement)) dd.classList.remove('nav-dropdown--esc');
        majEtat();
      }, 0);
    });
    dd.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      // Force la fermeture malgré :focus-within, puis rend le focus au toggle
      dd.classList.add('nav-dropdown--esc');
      toggle.focus();
      majEtat();
    });
  });
}

/* === Stat counter animation === */
const DUREE_ANIMATION_STAT_MS = 1500;

/* Groupe les milliers comme le fait le reste du site (48 000, pas 48000).
   Intl pose une espace insécable étroite : c'est la convention typographique
   française et cela évite qu'un nombre se coupe en fin de ligne. */
const FORMAT_ENTIER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function animerCompteurVersCible(el, cible) {
  const estDecimal = cible % 1 !== 0;
  const debut = performance.now();

  function animer(maintenant) {
    const progression = Math.min((maintenant - debut) / DUREE_ANIMATION_STAT_MS, 1);
    const adouci = 1 - Math.pow(1 - progression, 3); // ease-out cubic
    const courant = cible * adouci;

    el.textContent = estDecimal
      ? courant.toFixed(1).replace('.', ',')
      : FORMAT_ENTIER.format(Math.round(courant));

    if (progression < 1) requestAnimationFrame(animer);
  }

  requestAnimationFrame(animer);
}

function animerCompteursStat() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animerCompteurVersCible(entry.target, parseFloat(entry.target.dataset.target));
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px 100px 0px' });

  document.querySelectorAll('.stat-number[data-target]').forEach(el => observer.observe(el));
}

/* === Devis form === */
function activerFormulaireDevis() {
  const devisForm = document.getElementById('devis-form');
  if (!devisForm) return;

  devisForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const champ = (nom) => formData.get(nom) || '';
    const conteneur = devisForm.parentElement;

    // Anti-bot honeypot : si "website" est rempli, c'est un bot
    if (champ('website')) {
      conteneur.innerHTML = '<div class="devis-success"><h3>Demande envoyée !</h3></div>';
      return;
    }

    // Analytics PostHog — aucune donnée personnelle (type d'audit et tranche d'effectif seulement)
    capturerEvenement('devis_envoye', {
      audit_type: champ('audit_type'),
      effectif: champ('employees')
    });

    const recapitulatif = `Entreprise: ${champ('company')} | Salaries: ${champ('employees')}`
      + ` | Vehicules: ${formData.get('vehicles') || 'N/A'} | ${champ('message')}`;

    envoyerAuWorker('devis', {
      name: champ('name'),
      email: champ('email'),
      audit_type: champ('audit_type'),
      message: recapitulatif
    }).catch(() => signalerEchecEnvoi(conteneur));

    conteneur.innerHTML = `
      <div class="devis-success">
        <div class="devis-success-icon">✓</div>
        <h3>Demande envoyée !</h3>
        <p>Merci <span class="js-name"></span>. Notre équipe vous recontactera à <strong class="js-email"></strong> sous 48h avec un devis adapté à votre entreprise.</p>
      </div>
    `;
    // Données visiteur injectées via textContent : aucune interprétation HTML possible
    conteneur.querySelector('.js-name').textContent = champ('name').split(' ')[0];
    conteneur.querySelector('.js-email').textContent = champ('email');
  });
}

/* === Platform notify form === */
function activerFormulaireNotify() {
  const notifyForm = document.getElementById('notify-form');
  if (!notifyForm) return;

  notifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(notifyForm);
    const email = fd.get('email') || notifyForm.querySelector('input[type="email"]').value;

    // Anti-bot honeypot
    if (fd.get('website')) {
      notifyForm.innerHTML = '<div style="text-align:center;padding:16px 0"><p>Merci.</p></div>';
      return;
    }

    // Analytics PostHog — aucune donnée personnelle
    capturerEvenement('notify_inscrit');

    envoyerAuWorker('newsletter', { email })
      .catch(() => signalerEchecEnvoi(notifyForm));

    notifyForm.innerHTML = `
      <div style="text-align:center;padding:16px 0">
        <p style="color:var(--accent-cyan);font-weight:700;font-size:16px">✓ Merci !</p>
        <p style="color:var(--text-dark-sec);font-size:14px;margin-top:6px">Vous serez informé(e) du lancement à <strong class="js-email" style="color:var(--text-dark)"></strong></p>
      </div>
    `;
    // Email injecté via textContent : aucune interprétation HTML possible
    notifyForm.querySelector('.js-email').textContent = email;
  });
}
