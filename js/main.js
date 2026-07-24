/* ============================================
   ACOMPIA — Main JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // === Scroll Reveal ===
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => observer.observe(el));

  // === Smooth scroll for anchor links ===
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // === Nav scroll effect ===
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.boxShadow = '0 2px 12px rgba(17,24,54,0.08)';
    } else {
      nav.style.boxShadow = '0 1px 4px rgba(17,24,54,0.03)';
    }
  });

  // === Mobile menu toggle ===
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  if (burger) {
    // A11Y : état unique ouverture/fermeture du tiroir ; quand il est ouvert,
    // le contenu principal et le footer deviennent inertes (inaccessibles au focus)
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

    // Close menu on link click
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

  // === A11Y : dropdowns nav — aria-expanded synchronisé + fermeture Échap ===
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
      if (e.key === 'Escape') {
        // Force la fermeture malgré :focus-within, puis rend le focus au toggle
        dd.classList.add('nav-dropdown--esc');
        toggle.focus();
        majEtat();
      }
    });
  });

  // === Stat counter animation ===
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.target);
        const isDecimal = target % 1 !== 0;
        const duration = 1500;
        const startTime = performance.now();

        function animate(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const current = target * eased;

          if (isDecimal) {
            el.textContent = current.toFixed(1).replace('.', ',');
          } else {
            el.textContent = Math.round(current);
          }

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }

        requestAnimationFrame(animate);
        statObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => statObserver.observe(el));

  // === Devis form ===
  const devisForm = document.getElementById('devis-form');
  if (devisForm) {
    devisForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        employees: formData.get('employees'),
        audit_type: formData.get('audit_type'),
        vehicles: formData.get('vehicles'),
        message: formData.get('message'),
        website: formData.get('website')
      };

      // Anti-bot honeypot : si "website" est rempli, c'est un bot
      if (data.website) {
        devisForm.parentElement.innerHTML = '<div class="devis-success"><h3>Demande envoyee !</h3></div>';
        return;
      }

      // Analytics PostHog — aucune donnée personnelle (type d'audit et tranche d'effectif seulement)
      if (window.posthog) posthog.capture('devis_envoye', {
        audit_type: data.audit_type || '',
        effectif: data.employees || ''
      });

      // Send to Notion via Cloudflare Worker
      const WORKER_URL = 'https://acompia-worker.she-aa1.workers.dev';
      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'devis',
          data: {
            name: data.name,
            email: data.email,
            audit_type: data.audit_type || '',
            message: `Entreprise: ${data.company || ''} | Salaries: ${data.employees || ''} | Vehicules: ${data.vehicles || 'N/A'} | ${data.message || ''}`
          }
        })
      })
      .then(r => r.json())
      .catch(() => {});

      devisForm.parentElement.innerHTML = `
        <div class="devis-success">
          <div class="devis-success-icon">✓</div>
          <h3>Demande envoyée !</h3>
          <p>Merci <span class="js-name"></span>. Notre équipe vous recontactera à <strong class="js-email"></strong> sous 48h avec un devis adapté à votre entreprise.</p>
        </div>
      `;
      devisForm.parentElement.querySelector('.js-name').textContent = (data.name || '').split(' ')[0];
      devisForm.parentElement.querySelector('.js-email').textContent = data.email || '';
    });
  }

  // === Platform notify form ===
  const notifyForm = document.getElementById('notify-form');
  if (notifyForm) {
    notifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(notifyForm);
      const email = fd.get('email') || notifyForm.querySelector('input[type="email"]').value;
      const honeypot = fd.get('website');

      // Anti-bot honeypot
      if (honeypot) {
        notifyForm.innerHTML = '<div style="text-align:center;padding:16px 0"><p>Merci.</p></div>';
        return;
      }

      // Analytics PostHog — aucune donnée personnelle
      if (window.posthog) posthog.capture('notify_inscrit');

      // Send to Notion via Cloudflare Worker
      const WORKER_URL = 'https://acompia-worker.she-aa1.workers.dev';
      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'newsletter',
          data: { email }
        })
      })
      .then(r => r.json())
      .catch(() => {});

      // Replace form with confirmation (email injected safely via textContent)
      notifyForm.innerHTML = `
        <div style="text-align:center;padding:16px 0">
          <p style="color:var(--accent-cyan);font-weight:700;font-size:16px">✓ Merci !</p>
          <p style="color:var(--text-dark-sec);font-size:14px;margin-top:6px">Vous serez informé(e) du lancement à <strong class="js-email" style="color:var(--text-dark)"></strong></p>
        </div>
      `;
      notifyForm.querySelector('.js-email').textContent = email;
    });
  }

});


/* Mesure des clics rendez-vous (Calendly) · aucune donnée personnelle */
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href*="calendly.com"]') : null;
  if (a && window.posthog) { posthog.capture('rdv_click', { source: location.pathname }); }
});
