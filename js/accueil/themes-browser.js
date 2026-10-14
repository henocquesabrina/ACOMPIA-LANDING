(() => {
  const families = document.getElementById('themeFamilies');
  const list = document.getElementById('ixList');
  const card = document.getElementById('ixCard');
  list.parentElement.hidden = true;
  families.className = 'family-selector';
  families.setAttribute('aria-label', 'Choisir une famille de contrôles');
  const buttons = T.map(([name], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-controls', 'ixCard');
    button.setAttribute('aria-pressed', 'false');
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('strong');
    label.textContent = name;
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(number, label, arrow);
    button.addEventListener('click', () => select(index));
    families.append(button);
    return button;
  });
  function select(index) {
    const [name, children] = T[index];
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    renderFamily(card, name, children);
  }
  function renderFamily(target, name, children) {
    target.replaceChildren();
    const count = document.createElement('div');
    count.className = 'crumb';
    count.textContent = `${children.length} sous-thèmes vérifiés`;
    const heading = document.createElement('h4');
    heading.textContent = name;
    const rows = document.createElement('ul');
    rows.className = 'family-detail-rows';
    children.forEach(([title, description]) => {
      const row = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = title;
      const text = document.createElement('p');
      text.textContent = description;
      row.append(label, text);
      rows.append(row);
    });
    target.append(count, heading, rows);
  }
  const mobile = document.createElement('div');
  mobile.className = 'family-carousel';
  mobile.setAttribute('role', 'region');
  mobile.setAttribute('aria-label', 'Les six familles de contrôles, à faire défiler');
  mobile.tabIndex = 0;
  T.forEach(([name, children], index) => {
    const slide = document.createElement('article');
    slide.className = 'family-slide';
    renderFamily(slide, name, children);
    slide.querySelector('.crumb').textContent = `${String(index + 1).padStart(2, '0')} / 06 · ${children.length} sous-thèmes`;
    mobile.append(slide);
  });
  families.closest('.themes-browser').append(mobile);
  select(0);
})();
