/* ACOMPIA · comportements de l'en-tête commun, novembre 2026.
   La mesure (cta_clique, scroll_atteint, rdv_click) reste dans js/socle.js. */
(function () {
  var d = document;
  var hd = d.getElementById('s26-hd');
  if (hd) {
    var surDefilement = function () { hd.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', surDefilement, { passive: true });
    surDefilement();
  }

  /* Le menu mobile se referme au clic extérieur et à Échap. */
  var menu = d.querySelector('.s26-m');
  if (menu) {
    d.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.open = false; });
  }

  /* Bouton collant mobile : affiché après le premier écran, masqué quand un appel à la démo est visible. */
  var collant = d.getElementById('s26-sticky');
  if (collant) {
    var bandeauVisible = false;
    var maj = function () { collant.classList.toggle('show', window.scrollY > 500 && !bandeauVisible); };
    var bandeau = d.querySelector('.s26-demo');
    if (bandeau && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { bandeauVisible = en[0].isIntersecting; maj(); }).observe(bandeau);
    }
    window.addEventListener('scroll', maj, { passive: true });
    maj();
  }

  /* Matrice RGDU : le téléchargement amène l'appel à la démo à l'écran. */
  var bloc = d.getElementById('s26-demo-matrice');
  if (bloc) {
    d.querySelectorAll('a[href$="matrice-controle-rgdu-2026.xlsx"]').forEach(function (a) {
      a.addEventListener('click', function () {
        bloc.classList.add('is-apres');
        setTimeout(function () {
          var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
          bloc.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'center' });
        }, 700);
      });
    });
  }
})();
