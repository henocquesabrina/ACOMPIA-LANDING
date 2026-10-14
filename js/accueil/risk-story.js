(() => {
  const buttons = document.querySelectorAll('[data-months]');
  buttons.forEach(button => button.addEventListener('click', () => {
    const months = Number(button.dataset.months);
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('risk-period').textContent = `${months} mois`;
    document.getElementById('risk-amount').innerHTML = `${new Intl.NumberFormat('fr-FR').format(months * 496)} <small>€</small>`;
  }));
})();
