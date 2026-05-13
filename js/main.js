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
    burger.addEventListener('click', () => {
      navLinks.classList.toggle('nav-open');
      burger.classList.toggle('active');
      const isOpen = navLinks.classList.contains('nav-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav-open');
        burger.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

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
        message: formData.get('message')
      };

      // Store in localStorage
      const allDevis = JSON.parse(localStorage.getItem('acompia_devis') || '[]');
      allDevis.push({ date: new Date().toISOString(), ...data });
      localStorage.setItem('acompia_devis', JSON.stringify(allDevis));
      console.log('Devis sauvegardé. Total:', allDevis.length);

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
            message: `Entreprise: ${data.company} | Salariés: ${data.employees} | Véhicules: ${data.vehicles || 'N/A'} | ${data.message || ''}`
          }
        })
      })
      .then(r => r.json())
      .then(res => console.log('Notion devis sync:', res.success ? '✓' : 'erreur', res))
      .catch(err => console.warn('Notion sync échoué:', err.message));

      devisForm.parentElement.innerHTML = `
        <div class="devis-success">
          <div class="devis-success-icon">✓</div>
          <h3>Demande envoyée !</h3>
          <p>Merci ${data.name.split(' ')[0]}. Notre équipe vous recontactera à <strong>${data.email}</strong> sous 48h avec un devis adapté à votre entreprise.</p>
        </div>
      `;
    });
  }

  // === Platform notify form ===
  const notifyForm = document.getElementById('notify-form');
  if (notifyForm) {
    notifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = notifyForm.querySelector('input').value;

      // Store in localStorage
      const allNotifs = JSON.parse(localStorage.getItem('acompia_notify') || '[]');
      allNotifs.push({ date: new Date().toISOString(), email });
      localStorage.setItem('acompia_notify', JSON.stringify(allNotifs));

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
      .then(res => console.log('Notion newsletter sync:', res.success ? '✓' : 'erreur', res))
      .catch(err => console.warn('Notion sync échoué:', err.message));

      // Replace form with confirmation
      notifyForm.innerHTML = `
        <div style="text-align:center;padding:16px 0">
          <p style="color:var(--accent-cyan);font-weight:700;font-size:16px">✓ Merci !</p>
          <p style="color:var(--text-dark-sec);font-size:14px;margin-top:6px">Vous serez informé(e) du lancement à <strong style="color:var(--text-dark)">${email}</strong></p>
        </div>
      `;
    });
  }

});
