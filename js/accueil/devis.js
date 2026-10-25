/* Formulaire de devis de /offres/ : champs selon l'offre, présélection depuis l'URL,
   puis envoi au Worker (Notion). Mêmes noms de champs que l'ancien formulaire de /solution/.
   Dépend de js/config.js et js/socle.js (envoyerAuWorker, capturerEvenement, signalerEchecEnvoi). */
(function () {
  var f = document.getElementById('devis-form');
  if (!f) return;
  var offre = f.querySelector('[name=audit_type]');
  // Anciens liens des articles : les audits par thème deviennent l'audit de la paie.
  var ALIAS = { psc: 'multi', 'frais-pro': 'multi', remunerations: 'multi' };
  var SUJETS = {
    'reprise-paie': 'Changement de prestataire ou de logiciel de paie',
    'trop-verse': 'Cotisations versées en trop, analyse dans les deux sens',
    'cloture': 'Clôture de paie 2026, écarts et corrections encore ouvertes',
    'repas': 'Indemnités de repas et primes de panier, plafonds et preuves',
    'taux-atmp-2027': 'Taux AT/MP 2027, taux unique, notification et contestation',
    'flagrance-sociale': 'Flagrance sociale, loi du 25 juin 2026, mesures conservatoires et contrainte'
  };
  function majChamps() {
    var v = offre.value;
    f.querySelectorAll('[data-pour]').forEach(function (l) {
      var visible = !!v && l.dataset.pour.split(' ').indexOf(v) > -1;
      l.hidden = !visible;
      if (!visible) { var c = l.querySelector('input,select'); if (c) c.value = ''; }
    });
  }
  try {
    var p = new URLSearchParams(location.search);
    var a = String(p.get('audit') || '').trim().toLowerCase();
    a = ALIAS[a] || a;
    if (a && Array.prototype.some.call(offre.options, function (o) { return o.value === a; })) offre.value = a;
    var s = SUJETS[String(p.get('sujet') || '').trim().toLowerCase()];
    var m = f.querySelector('[name=message]');
    if (s && !m.value) m.value = s;
  } catch (e) {}
  offre.addEventListener('change', majChamps);
  majChamps();

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!f.reportValidity()) return;
    var d = new FormData(f);
    var champ = function (nom) { return String(d.get(nom) || ''); };
    var conteneur = f;
    var merci = function () {
      conteneur.innerHTML = '<div class="p2-merci"><strong>Demande envoyée.</strong><p>Merci <span class="js-name"></span>. Nous vous répondons à <b class="js-email"></b> sous 48 h.</p></div>';
      conteneur.querySelector('.js-name').textContent = champ('name').split(' ')[0];
      conteneur.querySelector('.js-email').textContent = champ('email');
    };
    // Anti-bot : le champ caché « website » n'est rempli que par les robots.
    if (champ('website')) { merci(); return; }
    capturerEvenement('devis_envoye', { audit_type: champ('audit_type'), effectif: champ('employees') });
    var recapitulatif = 'Entreprise: ' + champ('company') + ' | Salaries: ' + champ('employees')
      + ' | Societes: ' + (champ('entities') || 'N/A') + ' | Annees: ' + (champ('years') || 'N/A')
      + ' | Vehicules: ' + (champ('vehicles') || 'N/A') + ' | ' + champ('message');
    envoyerAuWorker('devis', {
      name: champ('name'), email: champ('email'), audit_type: champ('audit_type'), message: recapitulatif
    }).catch(function () { signalerEchecEnvoi(conteneur); });
    merci();
  });
})();
