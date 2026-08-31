/* ============================================
   ACOMPIA — Estampille de version sur les feuilles de style

   Le site n'a pas d'étape de construction : les feuilles sont servies telles
   quelles, sous un nom stable, et GitHub Pages les met en cache chez le
   visiteur. Un visiteur déjà venu garde donc l'ancienne feuille jusqu'à ce que
   son cache expire, et voit une page à moitié refondue : nouvelle barre de
   navigation servie par un fichier neuf, ancien fond crème servi par un fichier
   en cache. C'est exactement ce qui s'est produit à la refonte du 31/08.

   Ce script suffixe chaque lien de feuille d'un `?v=<date>`. L'URL change, donc
   le cache est contourné ; le fichier, lui, ne bouge pas.

   Usage :
     node tools/versionner-css.js          → estampille à la date du jour
     node tools/versionner-css.js 2026-09-15 → estampille à une date donnée

   À relancer à chaque modification de feuille avant mise en ligne.
   ============================================ */

const fs = require('fs');
const { execSync } = require('child_process');

const version = process.argv[2] || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) {
  console.error(`Version attendue au format AAAA-MM-JJ, reçue : ${version}`);
  process.exit(1);
}

const pages = execSync("find . -name '*.html' -not -path './.git/*'", { encoding: 'utf8' })
  .split('\n').filter(Boolean).sort();

/* Capture l'URL d'une feuille, avec ou sans estampille précédente, pour que le
   script soit rejouable sans empiler les paramètres. */
const LIEN = /(<link[^>]*href=")([^"?]+\.css)(\?v=[^"]*)?(")/g;

let pagesTouchees = 0;
let liens = 0;

for (const page of pages) {
  const avant = fs.readFileSync(page, 'utf8');
  let n = 0;
  const apres = avant.replace(LIEN, (_, ouverture, url, __, fermeture) => {
    n++;
    return `${ouverture}${url}?v=${version}${fermeture}`;
  });
  if (apres === avant) continue;
  fs.writeFileSync(page, apres);
  pagesTouchees++;
  liens += n;
}

console.log(`Version ${version} posée sur ${liens} lien(s) de feuille, dans ${pagesTouchees} page(s).`);
