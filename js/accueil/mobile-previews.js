(() => {
  document.querySelectorAll('.dashboard-preview .showcase, .story .stage').forEach(preview => {
    preview.classList.add('mobile-preview');
    preview.tabIndex = 0;
    preview.setAttribute('role', 'region');
    preview.setAttribute('aria-label', 'Maquette complète — défilement horizontal sur petit écran');
  });
})();
