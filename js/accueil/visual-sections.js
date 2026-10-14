(() => {
  const slider = document.getElementById('roi-duration');
  slider.addEventListener('input', () => {
    document.getElementById('roi-months').textContent = `${slider.value} mois`;
    document.getElementById('roi-value').textContent = `${new Intl.NumberFormat('fr-FR').format(Number(slider.value) * 2943)} €`;
  });
})();
