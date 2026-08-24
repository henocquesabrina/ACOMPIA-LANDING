# ACOMPIA — site vitrine

Site statique de [www.acompia.com](https://www.acompia.com). Aucune étape de build :
le HTML servi est le HTML du dépôt.

ACOMPIA (édité par ComplyDB SAS) accompagne les entreprises sur leur conformité URSSAF.
Le site est un entonnoir **articles → outil gratuit → lead** : les articles de
`/ressources/` amènent le trafic, deux outils interactifs qualifient le visiteur,
et les coordonnées partent vers Notion via un Worker Cloudflare.

## Démarrer

```bash
npm run servir      # http://localhost:8000
npm run controle    # tests + vérification des liens — à lancer avant chaque commit
```

Node 18+ suffit. **Il n'y a aucune dépendance à installer** : les tests utilisent le
lanceur intégré de Node, `package.json` ne sert qu'à nommer les commandes.

| Commande | Rôle |
|---|---|
| `npm run controle` | `test` + `verifier`. Le réflexe avant de commiter. |
| `npm test` | 42 tests sur les moteurs de calcul (scoring, barème AEN, tarifs). |
| `npm run verifier` | Liens internes, ancres, sitemap. Hors ligne, instantané. |
| `npm run verifier:tout` | Idem + les ~74 liens externes (réseau, ~1 min). |
| `npm run servir` | Serveur local à la racine. |

`verifier` sort en code 1 s'il trouve quelque chose : il se branche tel quel sur un
hook Git ou une GitHub Action.

## Arborescence

```
index.html              accueil
solution/               offre
outils/                 hub + prédiagnostic URSSAF, simulateur AEN, tarifs flotte
ressources/             hub + 13 articles de fond (le moteur SEO)
equipe/                 fiche de l'avocate
404.html                page d'erreur — voir « chemins » ci-dessous
css/                    feuilles de style (voir « dette connue »)
js/                     scripts (voir ci-dessous)
tests/                  tests Node, sans dépendance
tools/verifier-liens.js vérificateur de liens
assets/                 images et polices auto-hébergées (Geist)
```

Chaque URL est un dossier contenant `index.html` : **l'arborescence est le routage**.

## Les scripts

Chargés en `defer`, dans cet ordre — `defer` garantit l'ordre d'exécution.

| Fichier | Rôle |
|---|---|
| `analytics.js` | Snippet PostHog. Chargé en `<head>`, sans `defer`. |
| `config.js` | URLs et e-mail de contact. **Point unique de vérité.** |
| `socle.js` | `echapperHTML`, `envoyerAuWorker`, `capturerEvenement`, suivi des clics rendez-vous. |
| `main.js` | Navigation, reveal, compteurs, formulaires devis et newsletter. |
| `scoring.js` | Prédiagnostic : matrice juridique, indice /100, rendu du rapport. |
| `questionnaire.js` | Prédiagnostic : parcours des 29 questions à branchements. |
| `aen-bareme.js` | Barème de l'avantage en nature véhicule. Fonction pure, testée. |
| `aen-simulateur.js` | Simulateur AEN : parcours et rendu. |
| `tarifs-flotte.js` | Grille tarifaire. Fonction pure, testée. |
| `tarifs-flotte-ui.js` | Curseur de la page tarifs. |

Ce sont des scripts classiques, pas des modules : ils partagent la portée globale.
Une `function` de premier niveau est visible depuis les scripts suivants ; un `const`
ne l'est que par son nom (d'où le `window.ACOMPIA_CONFIG` explicite de `config.js`).

## Le Worker Cloudflare

`https://acompia-worker.she-aa1.workers.dev` — **hors de ce dépôt**. Il reçoit les
leads et alimente Notion. C'est la seule frontière de confiance du produit : le client
poste `{ type, data }` avec `type` valant `devis`, `newsletter` ou `prediag`. La
validation, la limitation de débit et les secrets Notion vivent côté Worker.

En cas d'échec d'envoi, `signalerEchecEnvoi()` affiche l'e-mail de contact au visiteur
et trace l'événement `lead_envoi_echoue` dans PostHog. **Ne jamais remettre de
`.catch(() => {})`** : un lead perdu en silence est invisible des deux côtés.

## Conventions à respecter

**Chemins relatifs partout.** `../../css/style.css`, jamais `/css/style.css`. Le site
doit rester ouvrable en double-cliquant sur un fichier (`file://`), ce que les chemins
absolus cassent. **Seule exception : `404.html`**, servie par GitHub Pages sous une URL
arbitraire, donc en chemins absolus obligatoires — un commentaire le rappelle en tête
du fichier.

**Données visiteur.** `element.textContent = valeur` par défaut ; `echapperHTML()` si
la valeur doit être concaténée dans une chaîne HTML. Jamais de concaténation nue.

**Polices.** Seules `Geist` et `Geist Mono` sont chargées (auto-hébergées, aucune
requête vers Google — argument CNIL). Toute autre famille tombe silencieusement sur la
police système : passer par `var(--font-display)` / `var(--font-body)`.

## Dette connue

Trois chantiers identifiés, volontairement non traités car ils demandent un arbitrage
ou une vérification visuelle page par page.

**1. Deux feuilles de style concurrentes.** `style.css` et `style-v2.css` sont chargées
ensemble sur 20 pages, avec 43 racines de sélecteurs en commun. La v2 gagne par force :
918 `!important`. La méthode : retirer `style.css` de `/solution/` seule, comparer le
rendu, rapatrier ce qui manque dans `style-v2.css` **sans** `!important`, puis propager
page par page. Mesure de progression : `grep -c '!important' css/style-v2.css`.

**2. Nav et footer recopiés sur 24 pages** (les 25 fichiers HTML moins
`prediagnostic/index.html`, simple redirection)**.** Aucun mécanisme d'inclusion, d'où les passes
manuelles « sur les N pages » de l'historique, qui oublient régulièrement des pages.
Les injecter en JS retirerait les liens internes du HTML servi et coûterait cher en SEO :
la vraie solution est un générateur statique ou des includes au build.

**3. L'indice d'exposition n'est pas comparable entre répondants.** Son dénominateur est
`nombre de thèmes activés × 4`. Un thème CRITIQUE isolé donne 100/100 ; le même entouré
de quatre thèmes sains donne 20/100. Décision produit, à arbitrer. Le comportement actuel
est figé dans un test de caractérisation (`tests/scoring.test.js`) pour qu'aucun
changement ne passe inaperçu.

## Fichiers particuliers

| Fichier | Rôle — ne pas supprimer |
|---|---|
| `CNAME` | Domaine GitHub Pages (`www.acompia.com`). |
| `ee6dbc…32.txt` | Clé IndexNow (indexation instantanée Bing/Yandex), ajoutée au commit `96de770`. Le nom du fichier **est** la clé. |
| `llms.txt` | Description du site pour les moteurs de réponse IA. |
| `robots.txt` | Autorise explicitement les crawlers IA. |
| `sitemap.xml` | Doit rester synchrone avec les pages indexables — `npm run verifier` le contrôle. |

La balise `msvalidate.01` de `index.html` est la vérification Bing Webmaster Tools.

## Déploiement

Push sur `main` → GitHub Pages publie, Cloudflare sert. Pas de pipeline.
Pour une modification transverse, passer par une branche et une PR : l'aperçu de
déploiement montre le rendu réel avant fusion.
