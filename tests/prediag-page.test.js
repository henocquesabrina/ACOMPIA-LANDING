const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* Le prédiagnostic a été retiré du site en novembre 2026 (15 lancements pour
   2 fins de parcours sur 90 jours). Ses deux adresses restent servies, en
   redirection vers la boîte à outils, pour ne casser aucun lien entrant. */

const racine = path.join(__dirname, '..');
const lire = (rel) => fs.readFileSync(path.join(racine, rel), 'utf8');
const ADRESSES = ['outils/prediagnostic-urssaf/index.html', 'prediagnostic/index.html'];

function listerPagesHtml(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap(entree => {
    if (entree.name.startsWith('.') || entree.name === 'node_modules' || entree.name === 'tools') return [];
    const cible = path.join(dossier, entree.name);
    if (entree.isDirectory()) return listerPagesHtml(cible);
    return entree.isFile() && entree.name.endsWith('.html') ? [cible] : [];
  });
}

test('les anciennes adresses du prédiagnostic redirigent vers la boîte à outils', () => {
  ADRESSES.forEach((rel) => {
    const page = lire(rel);
    assert.ok(page.includes('http-equiv="refresh" content="0; url=/outils/"'), `${rel} : redirection attendue`);
    assert.ok(page.includes('<link rel="canonical" href="https://www.acompia.com/outils/">'), `${rel} : canonique attendu`);
    assert.ok(/name="robots" content="noindex/.test(page), `${rel} : noindex attendu`);
    assert.ok(page.includes('href="/outils/"'), `${rel} : lien visible attendu`);
  });
});

test('aucune page ne renvoie plus vers le prédiagnostic', () => {
  const fautives = listerPagesHtml(racine).flatMap((fichier) => {
    const rel = path.relative(racine, fichier);
    if (ADRESSES.includes(rel)) return [];
    return /href="[^"]*prediagnostic[^"]*"/.test(fs.readFileSync(fichier, 'utf8')) ? [rel] : [];
  });
  assert.deepEqual(fautives, []);
});

test('le plan du site et llms.txt ne déclarent plus le prédiagnostic', () => {
  assert.ok(!lire('sitemap.xml').includes('prediagnostic'));
  assert.ok(!lire('llms.txt').includes('prediagnostic'));
});

test('aucune page publique ne conserve une promesse de quatre ou cinq minutes', () => {
  const motifsObsoletes = [
    /prédiagnostic[^.\n<]{0,180}(^|[^0-9])[45]\s*(?:minutes?|min)\b/i,
    /(^|[^0-9])[45]\s*(?:minutes?|min)\b[^.\n<]{0,180}prédiagnostic/i,
    /Gratuit\s*·\s*[45]\s*minutes?/i
  ];
  const anciennesPromesses = listerPagesHtml(racine).flatMap(fichier => {
    const contenu = fs.readFileSync(fichier, 'utf8');
    return motifsObsoletes.some(motif => motif.test(contenu)) ? [path.relative(racine, fichier)] : [];
  });
  assert.deepEqual(anciennesPromesses, []);
});
