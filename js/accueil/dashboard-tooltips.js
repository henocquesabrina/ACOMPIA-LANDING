(() => {
  const dashboard = document.getElementById('heroApp');
  const tips = [
    ['.alert', 'À traiter ce mois-ci', 'Les erreurs récurrentes sont regroupées pour préparer les corrections avant la prochaine paie.'],
    ['.kpis > div:first-child', 'Votre risque estimé', 'Le risque établi est identifié à partir des données disponibles. Le risque potentiel reste à confirmer ou à justifier.'],
    ['.optim', 'Les optimisations possibles', 'Les montants que vous pourriez économiser sont distingués selon leur niveau de confirmation.'],
    ['.chart', 'L’évolution mois par mois', 'Comparez le risque en rose et les optimisations en vert. Les mois grisés n’ont pas encore été analysés.'],
    ['.donut', 'Vos 26 thèmes de contrôle', 'La répartition montre les thèmes à corriger, à justifier, à optimiser ou sans risque identifié.'],
    ['.priority-list', 'Les prochaines actions', 'Retrouvez les corrections prioritaires et leur impact mensuel. Vous relisez et validez avant transmission.']
  ];
  const tooltip = document.createElement('div');
  tooltip.className = 'dashboard-tooltip';
  tooltip.id = 'dashboard-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  let active;
  let hideTimer;
  function close() {
    clearTimeout(hideTimer);
    if (active) active.removeAttribute('aria-describedby');
    active = null;
    tooltip.hidden = true;
  }
  function position() {
    if (!active) return;
    const anchor = active.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - box.width / 2, innerWidth - box.width - 12));
    const below = anchor.bottom + 10;
    const top = below + box.height < innerHeight - 12 ? below : Math.max(12, anchor.top - box.height - 10);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  tips.forEach(([selector, title, explanation]) => {
    const region = dashboard.querySelector(selector);
    if (!region) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dashboard-help';
    button.textContent = '?';
    button.setAttribute('aria-label', `Comprendre : ${title}`);
    region.classList.add('dashboard-explained');
    region.append(button);
    function open() {
      close();
      active = button;
      tooltip.replaceChildren();
      const heading = document.createElement('strong');
      heading.textContent = title;
      const body = document.createElement('p');
      body.textContent = explanation;
      tooltip.append(heading, body);
      tooltip.hidden = false;
      button.setAttribute('aria-describedby', tooltip.id);
      position();
    }
    region.addEventListener('mouseenter', open);
    region.addEventListener('mouseleave', event => {
      if (tooltip.contains(event.relatedTarget) || document.activeElement === button) return;
      hideTimer = setTimeout(close, 180);
    });
    button.addEventListener('focus', open);
    button.addEventListener('blur', close);
    button.addEventListener('click', open);
  });
  tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  tooltip.addEventListener('mouseleave', close);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.dashboard-help') && !tooltip.contains(event.target)) close();
  });
  addEventListener('scroll', close, { passive: true });
  addEventListener('resize', close);
})();
