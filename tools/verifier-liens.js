#!/usr/bin/env node
/* Vérifie la cohérence des liens du site.

   Par défaut (hors ligne, instantané) :
     · chaque href/src interne pointe sur un fichier existant ;
     · chaque ancre #xxx existe dans sa page cible ;
     · le sitemap et les pages indexables se correspondent.

   Avec --externes (requêtes réseau) :
     · chaque URL http(s) répond sans erreur.

   Usage : npm run verifier   ·   npm run verifier -- --externes */

const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const SITE = 'https://www.acompia.com';
const EXTERNE = /^(https?:|mailto:|tel:|data:|\/\/)/;

const anomalies = [];
const signaler = (message) => anomalies.push(message);

/* ---------- Inventaire des pages ---------- */

function listerPages(dossier = RACINE, acc = []) {
  fs.readdirSync(dossier, { withFileTypes: true }).forEach((entree) => {
    if (entree.name.startsWith('.') || entree.name === 'node_modules') return;
    /* `tools/` contient de l'outillage, pas des pages publiées : rien n'y est
       servi, rien n'a à figurer au sitemap. */
    if (dossier === RACINE && entree.name === 'tools') return;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) listerPages(complet, acc);
    else if (entree.name.endsWith('.html')) acc.push(path.relative(RACINE, complet));
  });
  return acc;
}

const pages = listerPages();
const lire = (page) => fs.readFileSync(path.join(RACINE, page), 'utf8');
const contenus = new Map(pages.map((p) => [p, lire(p)]));
const idsParPage = new Map(pages.map((p) => [
  p, new Set([...contenus.get(p).matchAll(/id="([^"]+)"/g)].map((m) => m[1]))
]));

/* ---------- 1. Liens internes et ancres ---------- */

function resoudre(page, chemin) {
  const base = chemin.startsWith('/') ? '.' : path.dirname(page) || '.';
  const resolu = path.normalize(path.join(base, chemin.replace(/^\//, '')));
  const absolu = path.join(RACINE, resolu);
  if (fs.existsSync(absolu) && !fs.statSync(absolu).isDirectory()) return resolu;
  return path.normalize(path.join(resolu, 'index.html'));
}

function verifierLiensInternes() {
  pages.forEach((page) => {
    [...contenus.get(page).matchAll(/(?:href|src|srcset)="([^"]+)"/g)].forEach(([, reference]) => {
      if (EXTERNE.test(reference)) return;
      /* La chaîne de requête est retirée avant résolution : les feuilles de
         style portent une estampille de version (`?v=AAAA-MM-JJ`, posée par
         `tools/versionner-css.js`) qui contourne le cache du visiteur sans
         changer le fichier servi. */
      const [avantAncre, ancre] = reference.split('#');
      const chemin = avantAncre.split('?')[0];

      if (!chemin) {
        if (ancre && !idsParPage.get(page).has(ancre)) {
          signaler(`${page} → #${ancre} : ancre absente de la page`);
        }
        return;
      }

      const cible = resoudre(page, chemin);
      if (!fs.existsSync(path.join(RACINE, cible))) {
        signaler(`${page} → ${reference} : cible introuvable`);
        return;
      }
      if (ancre && idsParPage.has(cible) && !idsParPage.get(cible).has(ancre)) {
        signaler(`${page} → ${reference} : ancre absente de ${cible}`);
      }
    });
  });
}

/* ---------- 2. Sitemap ---------- */

const estIndexable = (page) =>
  !/<meta[^>]+name="robots"[^>]+noindex/i.test(contenus.get(page)) && page !== '404.html';

const urlDePage = (page) =>
  SITE + '/' + page.replace(/index\.html$/, '').replace(/\\/g, '/');

function verifierSitemap() {
  const chemin = path.join(RACINE, 'sitemap.xml');
  if (!fs.existsSync(chemin)) return signaler('sitemap.xml : absent');

  const declarees = new Set(
    [...fs.readFileSync(chemin, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  );
  const attendues = new Set(pages.filter(estIndexable).map(urlDePage));

  declarees.forEach((url) => {
    if (!attendues.has(url)) signaler(`sitemap.xml → ${url} : aucune page indexable correspondante`);
  });
  attendues.forEach((url) => {
    if (!declarees.has(url)) signaler(`sitemap.xml : ${url} manque (page indexable non déclarée)`);
  });
}

/* ---------- 3. Liens externes (option --externes) ---------- */

/* Certains sites institutionnels (Légifrance) refusent tout client automatisé,
   User-Agent de navigateur compris. Un 403 ou un 429 ne dit rien de la validité
   du lien : on les classe « non vérifiables » au lieu de crier au loup. */
const NAVIGATEUR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CODES_NON_VERIFIABLES = [401, 403, 405, 429, 999]; // 999 : code maison de LinkedIn

async function verifierLiensExternes() {
  const urls = new Map(); // url -> pages qui la citent
  pages.forEach((page) => {
    [...contenus.get(page).matchAll(/href="(https?:\/\/[^"]+)"/g)].forEach(([, url]) => {
      if (!urls.has(url)) urls.set(url, []);
      urls.get(url).push(page);
    });
  });

  console.log(`Vérification de ${urls.size} URL externes distinctes…`);
  const liste = [...urls.keys()];
  const LOT = 8;
  const nonVerifiables = [];

  const interroger = (url, methode) => fetch(url, {
    method: methode,
    redirect: 'follow',
    headers: { 'User-Agent': NAVIGATEUR },
    signal: AbortSignal.timeout(15000)
  });

  for (let i = 0; i < liste.length; i += LOT) {
    await Promise.all(liste.slice(i, i + LOT).map(async (url) => {
      const citations = `cité par ${urls.get(url).length} page(s)`;
      try {
        // Certains serveurs refusent HEAD : on retombe sur GET.
        let reponse = await interroger(url, 'HEAD');
        if (CODES_NON_VERIFIABLES.includes(reponse.status)) reponse = await interroger(url, 'GET');

        if (reponse.ok) return;
        if (CODES_NON_VERIFIABLES.includes(reponse.status)) {
          nonVerifiables.push(`${url} → HTTP ${reponse.status} (anti-bot, ${citations})`);
          return;
        }
        signaler(`${url} → HTTP ${reponse.status} (${citations})`);
      } catch (erreur) {
        nonVerifiables.push(`${url} → ${erreur.message} (${citations})`);
      }
    }));
  }

  if (nonVerifiables.length) {
    console.log(`\n  ${nonVerifiables.length} lien(s) non vérifiables automatiquement `
      + `(protection anti-bot) — à contrôler à la main si besoin :`);
    nonVerifiables.forEach((n) => console.log('  · ' + n));
    console.log('');
  }
}

/* ---------- Exécution ---------- */

(async () => {
  verifierLiensInternes();
  verifierSitemap();
  if (process.argv.includes('--externes')) await verifierLiensExternes();

  anomalies.forEach((a) => console.error('  ✗ ' + a));
  const portee = process.argv.includes('--externes') ? ' (liens externes inclus)' : '';
  console.log(`${pages.length} pages vérifiées${portee} · ${anomalies.length} anomalie(s)`);
  process.exit(anomalies.length ? 1 : 0);
})();
