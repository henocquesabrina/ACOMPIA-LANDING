(() => {
  const scene = document.querySelector('.monthly-workspace');
  const steps = [...scene.querySelectorAll('.monthly-events > span')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, visible = false, paused = reduced.matches;
  const control = document.createElement('button');
  control.type = 'button';
  scene.querySelector('.monthly-toolbar > span:last-child').append(control);
  function paint() {
    scene.dataset.step = current;
    steps.forEach((step, index) => step.classList.toggle('active', index === current));
    control.textContent = paused ? 'Reprendre' : 'Pause';
    control.setAttribute('aria-label', paused ? 'Reprendre la démonstration du suivi mensuel' : 'Mettre en pause la démonstration du suivi mensuel');
  }
  function schedule() {
    clearTimeout(timer);
    if (visible && !paused && !document.hidden) timer = setTimeout(() => { current = (current + 1) % 3; paint(); schedule(); }, current === 2 ? 2400 : 1500);
  }
  control.addEventListener('click', () => { paused = !paused; paint(); schedule(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold:.2}).observe(scene);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { paused = reduced.matches; paint(); schedule(); });
  paint();
})();
