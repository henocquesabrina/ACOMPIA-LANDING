(() => {
  const demo = document.querySelector('.live-demo');
  const buttons = [...demo.querySelectorAll('[data-demo]')];
  const pause = demo.querySelector('.demo-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let phase = 0;
  let paused = reduced.matches;
  let visible = true;
  let timer;
  function schedule() {
    clearTimeout(timer);
    if (!paused && visible && !document.hidden) timer = setTimeout(() => select((phase + 1) % 3), phase === 2 ? 3200 : 1800);
  }
  function select(index) {
    phase = index;
    demo.dataset.phase = String(index);
    demo.querySelectorAll('.demo-scene').forEach((scene, i) => scene.setAttribute('aria-hidden', String(i !== index)));

    buttons.forEach((button, i) => {
      button.classList.toggle('active', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    const captions = [
      ['Tout part de votre paie.', 'Bulletins, DSN et pièces : une seule lecture.'],
      ['Chaque écart retrouve son explication.', 'Vos données croisées avec les règles applicables.'],
      ['L’agent prépare votre plan d’actions.', 'Un PDF de corrections à relire et valider.']
    ];
    demo.querySelector('.iso-index').textContent = `0${index + 1} —`;
    demo.querySelector('.iso-title').textContent = captions[index][0];
    demo.querySelector('.iso-description').textContent = captions[index][1];
    schedule();
  }
  function syncPause() {
    demo.classList.toggle('is-paused', paused);
    pause.innerHTML = paused ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; 
    pause.setAttribute('aria-label', paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause');
    schedule();
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => {
    paused = true;
    select(i);
    syncPause();
  }));
  pause.addEventListener('click', () => { paused = !paused; syncPause(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; syncPause(); });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold: 0.1}).observe(demo);
  select(0);
  syncPause();
  document.querySelectorAll('[data-solution]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.solution);
    show(index);
    document.querySelectorAll('[data-solution]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));

})();
