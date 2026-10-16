/* Tableau de bord de démonstration (même dessin que l'accueil) : barres mois par mois et anneau des 26 thèmes. */
(function () {
  var app = document.getElementById('heroApp');
  var svg = document.getElementById('bars'), dn = document.getElementById('donut');
  if (!app || !svg || !dn) return;
  var B = [[.30,.25],[.28,.22],[.30,.95],[.25,.20],[.65,.30],[.28,.55],[.30,.55],[.30,.55],[.40,.45]];
  var h = '<line x1="0" y1="56" x2="480" y2="56" stroke="#E4E4EA"/>';
  B.forEach(function (b, i) {
    var x = 10 + i * 40;
    h += '<rect class="bar-up" x="' + x + '" y="' + (56 - b[0] * 50) + '" width="16" height="' + (b[0] * 50) + '" rx="2" fill="#3DBE7A" style="transition-delay:' + i * 60 + 'ms"/>'
       + '<rect class="bar-dn" x="' + x + '" y="58" width="16" height="' + (b[1] * 58) + '" rx="2" fill="#F07178" style="transition-delay:' + i * 60 + 'ms"/>';
  });
  for (var i = 9; i < 12; i++) h += '<rect x="' + (10 + i * 40) + '" y="10" width="16" height="100" rx="2" fill="#F5F5F8"/>';
  svg.innerHTML = h;
  var D = [[8,'#F07178'],[3,'#FBD5D8'],[3,'#C9EEDA'],[8,'#3DBE7A'],[4,'#E4E4EA']], C = 2 * Math.PI * 52, off = 0;
  var dh = '<circle cx="66" cy="66" r="52" stroke="#F1F1F5"/>';
  D.forEach(function (d) { var L = d[0] / 26 * C; dh += '<circle class="seg" cx="66" cy="66" r="52" stroke="' + d[1] + '" data-l="' + (L - 2) + '" stroke-dashoffset="' + (-off) + '"/>'; off += L; });
  dn.innerHTML = dh;
  function montrer() {
    app.classList.add('in');
    dn.querySelectorAll('.seg').forEach(function (c, i) { setTimeout(function () { c.style.strokeDasharray = c.dataset.l + ' 400'; }, 200 + i * 120); });
  }
  if (!('IntersectionObserver' in window)) return montrer();
  var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { montrer(); io.disconnect(); } }, { threshold: .25 });
  io.observe(app);
})();
