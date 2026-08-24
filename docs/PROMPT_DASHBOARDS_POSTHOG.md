# Prompt — construction des dashboards PostHog ACOMPIA

> À coller dans une session disposant d'un accès navigateur à PostHog, ou dans
> l'assistant PostHog. Le contenu entre les balises est le prompt lui-même.

---

Tu construis les dashboards PostHog du site vitrine ACOMPIA (www.acompia.com),
projet EU Cloud, token `phc_tzcr2EPAnKEJNFC3w9rsfwkjJB7zQFJ8NuDziAGZJ8qq`.

## Contraintes de mesure — à lire avant toute chose

Ce site est instrumenté **sans aucun cookie ni stockage terminal** (`persistence: 'memory'`,
`person_profiles: 'identified_only'`, `disable_session_recording: true`). C'est un choix
juridique assumé, pas un oubli. Trois conséquences qui déterminent ce que tu peux construire :

1. **Chaque chargement de page crée une personne distincte.** Il n'existe donc ni visiteur
   unique, ni visiteur récurrent, ni rétention, ni cohorte.
   → **Ne crée aucun insight intitulé « visiteurs », « utilisateurs » ou « uniques ».**
   Le seul terme correct est **« chargements de page »** ou **« sessions »**.
   → **Ne crée aucun insight de type Retention ni Stickiness.** Ils afficheraient
   des courbes structurellement fausses.
2. **Aucun tunnel entre deux pages n'est calculable.** Un funnel dont les étapes se
   produisent sur des URL différentes sera vide ou faux.
   → **Tous les funnels que tu construis doivent avoir leurs étapes dans un même
   chargement de page.** Les trois parcours ci-dessous respectent cette règle.
3. **Aucun session replay n'existe.** N'ouvre pas l'onglet Replay, il est vide.

Si l'utilisateur demande malgré tout une de ces trois choses, **dis-le au lieu de
produire un graphique trompeur.**

## Événements disponibles

Toutes les propriétés ci-dessous s'ajoutent à celles jointes automatiquement à
**chaque** événement : `page` (chemin), `referrer`, et `utm_source` / `utm_medium` /
`utm_campaign` / `utm_content` / `utm_term` quand ils sont présents dans l'URL.

**Navigation et engagement (toutes pages)**
| Événement | Propriétés |
|---|---|
| `$pageview`, `$pageleave` | natifs PostHog |
| `scroll_atteint` | `palier` (25, 50, 75, 100) |
| `section_vue` | `section` (id du bloc), `rang`, `total` — *pages structurées uniquement* |
| `cta_clique` | `libelle`, `emplacement` (id de section, ou `nav` / `footer`), `destination` |
| `rdv_click` | `source` (chemin) — historique, redondant avec `cta_clique` destination=rendez-vous |

`destination` ∈ `rendez-vous`, `prediagnostic`, `simulateur`, `tarifs`, `devis`,
`fondateurs`, `notification-lancement`, `email`, `telephone`, `autre`.

Sections de la page d'accueil, dans l'ordre : `hero`, `stats`, `cas-types`,
`solution-home`, `prediag`, `team`, `faq`, `cta-final`.
Sections de `/solution/` : `how`, `fondateurs`, `audits`, `platform`, `faq`.

**Prédiagnostic URSSAF** — `/outils/prediagnostic-urssaf/`, tout en un chargement
| Événement | Propriétés |
|---|---|
| `prediag_intro_vue` | — |
| `prediag_lance` | — |
| `prediag_question_vue` | `question` (ex. `Q3.2`), `rang`, `total`, `bloc` |
| `prediag_contact_vu` | `questions_repondues` |
| `prediag_termine` | `indice` (0-100), `seuil`, `effectif`, `secteur`, `themes_critiques`, `themes_eleves`, `nb_critique`, `nb_eleve`, `nb_moyen`, `nb_reduit` |

`seuil` ∈ `maitrisee` (0-29), `moderee` (30-59), `forte` (60-100).
`effectif` ∈ `1-10`, `11-49`, `50-249`, `250+`.
`secteur` ∈ `btp`, `transport`, `hcr`, `commerce`, `services`, `industrie`, `sante`, `tech`, `autre`.
`themes_critiques` / `themes_eleves` : noms de blocs séparés par `, ` (ex. « Bloc 5 — AEN véhicule »).

**Simulateur AEN véhicule** — `/outils/simulateur-avantage-en-nature-vehicule/`, un chargement
| Événement | Propriétés |
|---|---|
| `aen_ouvert` | — |
| `aen_etape_vue` | `etape`, `rang`, `total` |
| `aen_hors_perimetre` | `genre` (`aucun`, `specifique`, `complexe`), `etapes_faites` |
| `aen_resultat` | `mode`, `energie`, `periode`, `etapes_faites` |
| `aen_comparateur_ouvert` | — |
| `aen_lead` | `source` (`rapport` ou `note`) |

**Conversion**
| Événement | Propriétés |
|---|---|
| `devis_envoye` | `audit_type`, `effectif` |
| `notify_inscrit` | — |
| `tarifs_flotte_simule` | `nb_vehicules`, `tranche`, `abonnement_mensuel_eur`, `audit_eur` |
| `lead_envoi_echoue` | `page` |

## Dashboards à créer

Crée **quatre** dashboards, nommés exactement comme indiqué. Sur chaque insight, renseigne
la description : elle doit dire **quelle décision** le graphique sert, pas ce qu'il affiche.
Période par défaut : 30 derniers jours. Aucun insight ne doit employer le mot « visiteur ».

### Dashboard 1 — « Acquisition et lecture »

1. **Chargements de page par jour** — Trends, `$pageview`, courbe.
2. **Pages les plus chargées** — Trends, `$pageview`, breakdown `$current_url`, table, 20 lignes.
   *Décision : quels articles méritent d'être maintenus, lesquels sont morts.*
3. **Provenance** — Trends, `$pageview`, breakdown `referrer`, table.
4. **Campagnes** — Trends, `$pageview`, breakdown `utm_source`, table, filtré `utm_source` non vide.
5. **Profondeur de lecture** — Funnel : `scroll_atteint` palier=25 → 50 → 75 → 100.
   *Décision : les pages longues sont-elles lues jusqu'au bout.*
6. **Profondeur de lecture par page** — Trends, `scroll_atteint` filtré `palier` = 75,
   breakdown `page`, table. *Décision : quel article retient vraiment.*
7. **Répartition mobile / desktop** — Trends, `$pageview`, breakdown `$device_type`, camembert.

### Dashboard 2 — « La page d'accueil convertit-elle »

1. **Progression dans la page** — Funnel ordonné, événement `section_vue` filtré `page` = `/`,
   une étape par section avec `section` égal à : `hero`, `stats`, `cas-types`, `solution-home`,
   `prediag`, `team`, `faq`, `cta-final`.
   *Décision : quelle section est le mur. C'est l'insight le plus important du dashboard.*
2. **Les cas-types sont-ils vus** — Trends, `section_vue` filtré `section` = `cas-types`,
   comparé à `section` = `hero`. *Décision : le meilleur contenu de la page est-il atteint.*
3. **Quel CTA est cliqué** — Trends, `cta_clique`, breakdown `destination`, barres.
4. **Quel emplacement fait cliquer** — Trends, `cta_clique`, breakdown `emplacement`, barres.
   *Décision : le CTA du hero suffit-il, ou est-ce celui du bas de page qui travaille.*
5. **Prédiagnostic contre rendez-vous** — Trends, `cta_clique` filtré `destination`
   ∈ {`prediagnostic`, `rendez-vous`}, breakdown `destination`, courbes.
   *Décision : les deux CTA se cannibalisent-ils.*
6. **Taux de clic sur CTA** — Formule : `cta_clique` ÷ `$pageview` filtré `page` = `/`.

### Dashboard 3 — « Le prédiagnostic »

1. **Tunnel d'entrée** — Funnel : `prediag_intro_vue` → `prediag_lance` →
   `prediag_contact_vu` → `prediag_termine`.
   *Décision : où l'on perd les gens entre l'intention et le rapport.*
2. **Abandon question par question** — Funnel sur `prediag_question_vue`, une étape par
   valeur de `rang` de 1 à 10, puis Trends `prediag_question_vue` breakdown `question`
   en table décroissante pour voir le décrochage au-delà.
   *Décision : quelle question fait abandonner. 29 questions, c'est long — celle-ci
   vaut n'importe quel test A/B.*
3. **Abandon par bloc** — Trends, `prediag_question_vue`, breakdown `bloc`, table.
4. **Questionnaire ou coordonnées** — Formule : `prediag_termine` ÷ `prediag_contact_vu`.
   *Décision : distingue l'abandon dans le questionnaire du refus de donner son email.*
5. **Effectif des répondants** — Trends, `prediag_termine`, breakdown `effectif`, camembert.
   *Décision : la promesse vise 50 à 1 000 salariés. Si la majorité est en 1-10,
   c'est le message du site qu'il faut changer, pas le tunnel.*
6. **Secteur des répondants** — Trends, `prediag_termine`, breakdown `secteur`, barres.
7. **Niveau d'exposition** — Trends, `prediag_termine`, breakdown `seuil`, camembert.
8. **Thèmes les plus critiques** — Trends, `prediag_termine`, breakdown `themes_critiques`,
   table. *Décision : quel audit proposer, et quel article écrire ensuite.*
9. **Indice moyen** — Trends, `prediag_termine`, agrégation moyenne sur `indice`.
   Dans la description, écrire : *population auto-sélectionnée de dirigeants inquiets —
   ne jamais utiliser ce chiffre comme argument commercial public.*

### Dashboard 4 — « Outils et intention d'achat »

1. **Tunnel du simulateur** — Funnel : `aen_ouvert` → `aen_etape_vue` → `aen_resultat` → `aen_lead`.
2. **Abandon par étape** — Trends, `aen_etape_vue`, breakdown `etape`, table décroissante.
3. **Part de cas hors périmètre** — Formule : `aen_hors_perimetre` ÷ `aen_ouvert`,
   plus un Trends breakdown `genre`.
   *Décision : si un quart des visiteurs se heurte à un mur, faut-il élargir le simulateur.*
4. **Comparateur forfait / réel** — Formule : `aen_comparateur_ouvert` ÷ `aen_resultat`.
   *Décision : la partie la plus travaillée de l'outil sert-elle.*
5. **Tailles de flotte simulées** — Trends, `tarifs_flotte_simule`, breakdown `tranche`, barres.
   *Décision : à qui la grille tarifaire s'adresse réellement.*
6. **Montants simulés** — Trends, `tarifs_flotte_simule`, moyenne de `abonnement_mensuel_eur`.
7. **Demandes de devis** — Trends, `devis_envoye`, breakdown `audit_type`, puis `effectif`.
8. **Inscriptions au lancement** — Trends, `notify_inscrit`, courbe cumulée.
9. **Échecs d'envoi** — Trends, `lead_envoi_echoue`, breakdown `page`.
   *Décision : alerte. Tout point non nul signifie des leads perdus.*

## Après création

1. Vérifie que **chaque funnel n'enjambe pas deux URL** — sinon il sera vide.
2. Signale tout insight resté à zéro : soit l'événement n'est pas encore déployé,
   soit il ne se déclenche pas.
3. Rappelle que les sources de vérité commerciales sont **Calendly** pour les
   rendez-vous confirmés et **Notion** pour le pipeline — PostHog ne mesure que
   les clics et les envois, jamais les conversions confirmées.

---

## Note pour ACOMPIA — à lire avant de lancer ce prompt

Les événements `section_vue`, `scroll_atteint`, `cta_clique`, `prediag_question_vue`,
`prediag_contact_vu`, `aen_*`, `tarifs_flotte_simule`, ainsi que les propriétés
`effectif` / `secteur` / `themes_*` sur `prediag_termine`, **n'existent que sur la
branche `dette-technique-socle-tests`**.

Tant qu'elle n'est pas fusionnée et déployée, les dashboards 2, 3 et 4 seront
majoritairement vides. Seul le dashboard 1 fonctionnera sur l'historique existant,
et encore : `scroll_atteint` et les breakdowns `utm_*` en sont absents.

Ordre conseillé : fusionner → déployer → laisser passer quelques jours de trafic →
lancer ce prompt.
