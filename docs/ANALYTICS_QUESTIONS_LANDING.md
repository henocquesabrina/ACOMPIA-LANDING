# Les questions business — site vitrine ACOMPIA

Pendant du document produit. Le site ne vend rien directement : il **qualifie**.
Sa seule mission est de transformer un dirigeant inquiet en rendez-vous avec une avocate.
Tout ce qui se mesure ici doit servir cette phrase.

Le diagnostic de l'existant tient en deux lignes : **8 événements, tous côté « le visiteur
a fini quelque chose »**. On sait qu'un prédiagnostic a été terminé. On ne sait ni d'où
venait la personne, ni ce qu'elle a lu avant, ni pourquoi les autres ont abandonné.

Légende : ✅ mesurable aujourd'hui · 🔧 événement manquant · ⚖️ arbitrage à rendre

---

## 0. Le préalable qui conditionne tout le reste

**Peut-on suivre un visiteur d'une page à l'autre ?** ⚖️ — **non, et c'est délibéré.**

`js/analytics.js` configure PostHog en `persistence: 'memory'`. Aucun cookie, aucun
stockage sur le terminal — ce que la politique de confidentialité revendique
explicitement, et qui évite le bandeau de consentement. Pour une marque dont le produit
*est* la conformité, c'est un choix cohérent et défendable.

Il a un prix, et il faut le connaître avant de commander quoi que ce soit :

- **Chaque chargement de page crée une personne différente.** Un dirigeant qui lit un
  article, va sur l'accueil, puis fait le prédiagnostic compte pour **trois visiteurs**.
- **Aucun tunnel inter-pages n'est calculable.** « Combien de lecteurs d'article font le
  prédiagnostic ? » — la question centrale du modèle — est aujourd'hui **sans réponse**.
- **Aucune mesure de retour.** Un prospect qui revient trois fois avant de prendre
  rendez-vous est invisible, alors que c'est le cycle d'achat normal sur un audit à
  plusieurs milliers d'euros.
- **L'attribution est perdue.** `utm_source` n'est connu que sur la page d'entrée, jamais
  rattaché à la conversion qui suit.

Ce qui **fonctionne** malgré tout : les parcours qui tiennent en un seul chargement.
Le prédiagnostic (29 questions) et le simulateur AEN se déroulent entièrement en page,
sans navigation. **Leurs tunnels internes sont donc mesurables et fiables** — c'est là
qu'il faut investir en priorité.

**La décision à rendre**, et elle revient à Sabrina : le régime d'exemption de
consentement pour la mesure d'audience existe en droit français. Savoir si une
configuration PostHog first-party peut s'y loger est une question juridique — et vous
avez, littéralement, la meilleure personne du pays pour la trancher. Trois issues :

1. **Statu quo assumé.** On renonce aux questions inter-pages, on documente ce renoncement,
   et on concentre la mesure sur les parcours en page. Défendable.
2. **Identifiant de session first-party** sous le régime d'exemption, si l'analyse
   juridique le permet. Débloque tout le §1 et le §6.
3. **Bandeau de consentement.** Ce que vous avez voulu éviter, et qui abîmerait le discours.

Tant que ce point n'est pas tranché, **la moitié des questions ci-dessous restent
structurellement sans réponse.** C'est le premier arbitrage, pas le dernier.

---

## 1. Acquisition — « quel canal amène des prospects, pas du trafic »

**Quel canal produit des prédiagnostics terminés ?** 🔧 ⚖️
Pas des visites : des prédiagnostics. Un article qui fait 5 000 vues et zéro
prédiagnostic vaut moins qu'un post LinkedIn qui en fait 12. Aujourd'hui `utm_source`
n'est attaché à aucun événement de conversion. **Correctif immédiat, indépendant de
l'arbitrage §0 :** joindre `utm_source / medium / campaign` et `referrer` à *tous* les
événements custom, comme le fait la landing muscu. Ça ne résout pas le multi-pages,
mais ça rattache au moins la conversion à sa page d'entrée.

**Les 13 articles SEO nourrissent-ils le tunnel ?** 🔧 ⚖️
C'est **la** question du modèle : le contenu est le moteur d'acquisition, et son
rendement n'est pas mesuré. Quel article amène des prédiagnostics ? Lequel n'amène que
des lecteurs ? Sans le §0, on ne peut qu'approximer via `document.referrer` interne.

**Quelle part du trafic est mobile, et convertit-elle ?** ✅
Disponible en breakdown natif. À regarder tout de suite : ~60-65 % du trafic est mobile
et la page n'a pas de CTA collant.

---

## 2. La page fait-elle son travail ? — « jusqu'où vont-ils »

**Jusqu'où les visiteurs scrollent-ils ?** 🔧 `section_viewed`
Aucune mesure de progression. La page d'accueil a 8 sections (`hero`, `stats`,
`cas-types`, `solution-home`, `prediag`, `team`, `faq`, `cta-final`) et on ignore
laquelle est un mur. Les cas-types chiffrés — le meilleur contenu de la page — sont-ils
seulement vus ? **C'est l'événement le plus rentable à ajouter**, il tient en 15 lignes
et fonctionne malgré le §0 puisque tout se passe en une page.

**Quel CTA gagne, et à quel endroit ?** 🔧 `cta_clicked { cta, emplacement }`
Onze boutons vers 6 destinations, et un seul est instrumenté (`rdv_click`). Les clics
sur « Faire mon prédiagnostic » ne sont visibles que dans l'autocapture, trop bruitée
pour un tunnel. On ne peut donc pas répondre à : *le CTA du hero suffit-il, ou est-ce
celui du bas de page qui travaille ?*

**Le prédiagnostic et le rendez-vous se cannibalisent-ils ?** 🔧
Ils sont côte à côte, au même poids visuel, dans le hero **et** dans le CTA final, pour
deux niveaux d'engagement très différents. Mesurer la répartition dira s'il faut
hiérarchiser.

---

## 3. Le prédiagnostic — l'aimant principal

C'est le parcours le mieux instrumenté, et il tient en un chargement : **tout y est
mesurable dès maintenant.**

**Où abandonne-t-on ?** ✅ partiellement — `prediag_intro_vue` → `prediag_lance` →
`prediag_termine`. Les deux premières marches sont connues, mais entre `lance` et
`termine` il y a **29 questions et un trou noir**.

**Quelle question tue le tunnel ?** 🔧 `prediag_question_vue { id, rang }`
La question la plus rentable de tout ce document. 29 questions, c'est long ; savoir que
40 % partent à la Q12 vaut n'importe quel test A/B. Et c'est trivial à émettre : le
`render()` du questionnaire connaît déjà `q.id` et son rang.

**Le formulaire de coordonnées fait-il fuir ?** 🔧 `prediag_contact_vu`
Il arrive **après** les 29 questions. Quelle proportion répond à tout puis renonce au
moment de donner son email ? Si elle est forte, le prédiagnostic est un lead magnet qui
ne capte pas.

**Combien de temps prend-il vraiment ?** 🔧
La page promet « 5 minutes ». Personne ne vérifie. Si la médiane est à 11 minutes, la
promesse est fausse et l'abandon s'explique tout seul.

---

## 4. La qualification — savoir à qui on parle

**Quel est le profil des prospects qui terminent ?** 🔧 — **le correctif le plus rentable
et le moins cher du document.**

`prediag_termine` envoie l'indice et le nombre de thèmes par niveau. Mais le
questionnaire connaît déjà **l'effectif (Q0.1) et le secteur (Q0.3)**, et
`scoring.meta` les porte déjà — ils ne sont simplement pas transmis. Ce sont des
tranches, pas des données personnelles.

Les ajouter débloque d'un coup :
- *Les grandes entreprises ont-elles un indice plus élevé que les petites ?*
- *Quel secteur ressort le plus exposé ?* (BTP, transport, HCR sont attendus — le vérifier
  oriente le contenu et le discours commercial)
- *Attire-t-on la cible ?* La promesse vise 50-1 000 salariés. Si 70 % des répondants sont
  en 1-10, **le site attire le mauvais public** et c'est le message qu'il faut changer,
  pas le tunnel.

**Quels thèmes ressortent le plus souvent en CRITIQUE ?** 🔧
On compte les thèmes par niveau, sans savoir **lesquels**. Or c'est une matière première
double : elle dit quel audit vendre, et quel article écrire ensuite.

**Un indice élevé prédit-il un rendez-vous ?** 🔧 ⚖️
L'hypothèse de tout le produit : montrer le risque déclenche l'achat. Si elle est fausse,
le rapport est un document qu'on lit et qu'on oublie. Nécessite le §0 (le rendez-vous se
prend sur Calendly, hors du site).

---

## 5. Le simulateur AEN — le second aimant

**Combien lancent, combien finissent ?** 🔧
Un seul événement existe (`aen_lead`, au tout dernier moment). Ni ouverture, ni étapes,
ni résultat. Le parcours a pourtant **10 étapes** et se déroule en une page : entièrement
mesurable, entièrement invisible.

**Combien tombent sur un « cas hors périmètre » ?** 🔧
Le moteur écarte les utilitaires, deux-roues, TNS, électriques d'avant février 2025.
Si un quart des visiteurs se heurte à un mur, ce n'est plus un aimant, c'est une
déception — et la question devient : faut-il étendre le simulateur ?

**Le comparateur forfait / réel est-il utilisé ?** 🔧
C'est la partie la plus travaillée de l'outil. Si personne ne l'ouvre, elle coûte de la
maintenance pour rien.

---

## 6. La conversion réelle — « combien d'euros »

**Combien de rendez-vous, et d'où viennent-ils ?** ⚖️ partiellement
`rdv_click` capture le clic, avec la page source. Mais le rendez-vous se **confirme** sur
Calendly : un clic n'est pas un rendez-vous pris. La source de vérité est Calendly, pas
PostHog — comme le revenu est Stripe et non PostHog chez muscu.

**Combien de demandes de devis, et pour quel montant ?** ✅ partiellement
`devis_envoye` porte déjà `audit_type` et `effectif`. C'est le seul événement
correctement qualifié du site. **La source de vérité du pipeline reste Notion.**

**Quel est le délai entre le prédiagnostic et le devis ?** ⚖️
Impossible sans le §0. C'est pourtant le cycle de vente qu'il faudrait connaître pour
savoir quand relancer.

---

## 7. Ce qui ne sert à rien — la question qui fait gagner du temps

**Quelles pages ne sont jamais lues ?** ✅ (autocapture + `$pageview`, déjà actifs)
13 articles, chacun long à écrire et à maintenir juridiquement. Combien sont lus ?
**C'est la seule question de ce document qui vous fait gagner du temps au lieu de vous en
demander. Regardez-la en premier**, elle ne coûte aucun développement.

**La page tarifs pilotage de flotte sert-elle ?** 🔧 — **zéro événement.**
Elle affiche des prix et porte un curseur de dimensionnement de flotte : c'est un signal
d'intention d'achat direct, et il est intégralement perdu. Quelle taille de flotte les
visiteurs simulent-ils ? La réponse oriente la grille tarifaire elle-même.

**Le formulaire « être informé du lancement » recrute-t-il ?** ✅ `notify_inscrit`
Existe. À croiser avec le lancement de septembre 2026 : cette liste est votre première
cohorte commerciale.

---

## 8. Les questions qui trompent

**« Combien de visiteurs ? »** — Sans le §0, ce chiffre compte des chargements de page,
pas des personnes. Il est **structurellement gonflé** et ne doit jamais être communiqué
comme un nombre de visiteurs.

**« Combien de prédiagnostics lancés ? »** — Un prédiagnostic lancé et abandonné à la Q12
ne vaut rien. Comptez les terminés, et surtout les terminés **par la bonne cible**.

**« Le temps passé sur le site »** — Un dirigeant qui trouve sa réponse en trois minutes
et prend rendez-vous est un excellent visiteur. Le temps passé ne mesure pas la valeur,
il mesure parfois la confusion.

**« Le taux de conversion de la page d'accueil »** — L'accueil n'est pas une page
d'atterrissage de campagne : son trafic est hétérogène, ses visiteurs ont des intentions
différentes. Le taux global n'a de sens que segmenté par canal — donc pas avant le §0.

**« L'indice moyen d'exposition »** — Une moyenne sur une population auto-sélectionnée
de dirigeants inquiets. Elle ne dit rien de l'état des entreprises françaises, et ne doit
jamais servir d'argument commercial public.

---

## Par où commencer

Sans rien décider d'autre, quatre ajouts couvrent l'essentiel du mesurable, tous
indépendants de l'arbitrage §0 :

1. **`effectif` et `secteur` sur `prediag_termine`** — deux lignes, déjà dans `scoring.meta`.
   Répond enfin à *« attire-t-on la bonne cible ? »*.
2. **`prediag_question_vue`** — dit quelle question tue le tunnel des 29 questions.
3. **`section_viewed`** — dit jusqu'où on scrolle, sur toutes les pages.
4. **`utm_*` et `referrer` sur tous les événements** — rattache la conversion à sa source.

Puis une décision, qui ne demande aucun code : **l'arbitrage du §0**.
Sans elle, tout le reste flotte.
