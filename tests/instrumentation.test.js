const test = require('node:test');
const assert = require('node:assert/strict');
const { chargerScripts } = require('./charger.js');

const { typeDeDestination, proprietesAttribution } =
  chargerScripts('js/config.js', 'js/socle.js');
const { trancheDeFlotte } = chargerScripts('js/tarifs-flotte.js', 'js/tarifs-flotte-ui.js');

/* --- Classement des CTA ---
   Le libellé d'un bouton change au gré des rédactions ; la destination, non.
   C'est elle qui doit permettre de comparer deux CTA dans le temps. */

test('la destination d\'un CTA est déduite de son lien, pas de son libellé', () => {
  assert.equal(typeDeDestination('https://calendly.com/she-acompia/30min'), 'rendez-vous');
  assert.equal(typeDeDestination('/outils/prediagnostic-urssaf/'), 'prediagnostic');
  assert.equal(typeDeDestination('/outils/simulateur-avantage-en-nature-vehicule/'), 'simulateur');
  assert.equal(typeDeDestination('/outils/pilotage-flotte-tarifs/'), 'tarifs');
  assert.equal(typeDeDestination('/solution/#devis'), 'devis');
  assert.equal(typeDeDestination('/solution/#fondateurs'), 'fondateurs');
  assert.equal(typeDeDestination('mailto:she@acompia.com'), 'email');
  assert.equal(typeDeDestination('tel:+33677052175'), 'telephone');
});

test('un lien inconnu ou absent ne casse pas le classement', () => {
  assert.equal(typeDeDestination('/ressources/audit-urssaf/'), 'autre');
  assert.equal(typeDeDestination(null), 'autre');
  assert.equal(typeDeDestination(undefined), 'autre');
  assert.equal(typeDeDestination(''), 'autre');
});

/* --- Attribution ---
   Sans cookie, la provenance ne peut pas être reconstruite après coup :
   si elle n'est pas jointe à l'événement, elle est définitivement perdue. */

test('l\'attribution ne retient que les paramètres utm réellement présents', () => {
  const props = proprietesAttribution();
  assert.equal(props.page, '/');
  assert.ok(!('utm_source' in props), 'aucun utm ne doit être inventé');
  assert.ok(!('utm_medium' in props));
});

test('l\'attribution expose la page, indispensable sans suivi inter-pages', () => {
  assert.ok(Object.prototype.hasOwnProperty.call(proprietesAttribution(), 'page'));
});

/* --- Tranches de flotte ---
   Alignées sur les tranches du questionnaire (Q5.fleet) pour que les deux
   sources se comparent dans PostHog. */

test('les tranches de flotte couvrent toute la plage du curseur', () => {
  assert.equal(trancheDeFlotte(1), '1-4');
  assert.equal(trancheDeFlotte(4), '1-4');
  assert.equal(trancheDeFlotte(5), '5-15');
  assert.equal(trancheDeFlotte(15), '5-15');
  assert.equal(trancheDeFlotte(16), '16-40');
  assert.equal(trancheDeFlotte(40), '16-40');
  assert.equal(trancheDeFlotte(41), '41-100');
  assert.equal(trancheDeFlotte(100), '41-100');
  assert.equal(trancheDeFlotte(200), '100+');
});

test('les tranches de flotte sont celles du questionnaire de prédiagnostic', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'js', 'questionnaire.js'), 'utf8');
  const bloc = source.slice(source.indexOf("id: 'Q5.fleet'"));
  ['1-4', '5-15', '16-40', '41-100', '100+'].forEach((tranche) => {
    assert.ok(bloc.includes(`value: '${tranche}'`), `tranche ${tranche} absente de Q5.fleet`);
  });
});
