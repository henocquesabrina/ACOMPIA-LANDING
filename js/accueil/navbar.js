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


activerMenuMobile();
activerDropdownsNav();
