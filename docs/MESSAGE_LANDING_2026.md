# Proposition de message pour la landing

Rédigé le 29 août 2026, en réponse aux trois arguments proposés par Greg :
la réglementation qui bouge, le coût comparé à un cabinet, et le fait qu'on
appelle un avocat une fois le problème arrivé.

Ce document propose une formulation, dit d'où viennent les chiffres, et signale
ce qui reste à valider. Les blocs de la partie 4 sont prêts à coller.

---

## 1. Ce qui ne va pas dans le message actuel

La page raconte aujourd'hui une histoire de **peur** : l'URSSAF contrôle,
l'URSSAF cible par algorithme, voici trois additions. C'est vrai, c'est sourcé,
et ça marche pour capter l'attention. Mais elle s'arrête là.

Trois questions restent sans réponse, et ce sont exactement celles que se pose
un dirigeant qui a lu jusqu'en bas :

1. **« Pourquoi ce serait faux chez moi ? »** La page affirme que des
   entreprises se trompent, sans jamais dire pourquoi une entreprise sérieuse,
   avec un expert-comptable sérieux, se trompe quand même.
2. **« Pourquoi un abonnement, alors que j'ai déjà un avocat ? »** La page ne
   nomme jamais le cabinet d'avocats, qui est pourtant l'alternative réelle
   dans la tête du lecteur.
3. **« Combien ça coûte, comparé à quoi ? »** Aucun prix n'apparaît sur la
   page d'accueil, donc aucune comparaison possible.

Les trois arguments proposés par Greg répondent précisément à ces trois trous.
Il ne s'agit pas d'ajouter des arguments, il s'agit de **fermer le
raisonnement** que la page ouvre déjà.

---

## 2. Le fil conducteur

Une seule phrase, qui doit tenir sous les trois blocs :

> **La règle change plus vite que la paie ne se met à jour, et l'avocat
> n'arrive qu'après. ACOMPIA occupe les onze mois du milieu.**

C'est l'argument central, et il a l'avantage de ne dévaloriser personne :
ni l'expert-comptable, ni l'avocat. Ce qui manque n'est pas de la compétence,
c'est de la **continuité**.

Cette nuance n'est pas cosmétique. La fondatrice d'ACOMPIA est avocate au
Barreau de Paris, et la page le dit deux fois. Un message qui oppose le
logiciel au cabinet se contredit lui-même à la section Équipe. Le message qui
tient est celui de la **temporalité**, pas celui de la compétence.

---

## 3. Les trois arguments, réécrits

### 3.1 La règle bouge, la paie ne suit pas

**Le fond est juste.** Le problème est le chiffre.

« Plus de 30 évolutions par an, plus de 100 sur 3 ans, plus de 150 sur 5 ans »
est exactement le type de chiffre que Sabrina a refusé le 28 août pour le
« x2 » et le « 180 j » : impossible à rattacher à une source, donc impossible
à défendre le jour où un prospect demande d'où il sort. Et il sera demandé, sur
une page qui met un lien de source sous chacun de ses autres chiffres.

Deux issues, par ordre de préférence :

**Option A, recommandée : compter ce que nous documentons déjà.**
Notre propre page « Réformes URSSAF 2025-2026 » recense, sur vingt mois, cinq
évolutions structurantes, toutes nommées et datées :

| Texte | Date | Ce qu'il change |
|---|---|---|
| Arrêté | 25 février 2025 | Refonte de l'AEN véhicule, deux régimes coexistants selon la date d'attribution |
| Arrêté | 4 septembre 2025 | Nouveau texte de référence des frais professionnels, abroge celui de 2002 |
| LFSS 2026 (loi n° 2025-1403) | 30 décembre 2025 | Contribution rupture conventionnelle de 30 % à 40 %, déduction heures sup étendue aux 250 salariés et plus |
| Cass. 2e civ. | 2025 | Exigences probatoires en matière de frais professionnels |
| Mises à jour BOSS | 1er semestre 2026 | Doctrine opposable, à consulter période par période |

Cinq textes en vingt mois est un chiffre **petit mais vérifiable**, et il est
plus fort que « 30 » parce qu'on peut les citer. Surtout, chacun de ces cinq
textes est déjà lié depuis nos ressources : le lecteur peut cliquer.

**Option B : garder l'ordre de grandeur, mais le sourcer.**
Si Greg tient au « 30 par an », il faut le rattacher à un décompte
reproductible. Le seul disponible est le nombre de mises à jour publiées au
BOSS, qui sont datées et listées rubrique par rubrique sur boss.gouv.fr.
Compter celles de 2025, publier le décompte, et écrire la phrase ainsi :
« le BOSS a publié N mises à jour opposables en 2025 ». Tant que N n'est pas
compté, la phrase ne va pas en ligne.

**Ce qui ne change pas, et qui est bon :** la liste
« taux, assiettes, exonérations, plafonds, déclarations ». Elle est concrète,
elle nomme des objets que le lecteur reconnaît dans sa propre paie, et elle
n'a besoin d'aucune source. À garder telle quelle.

### 3.2 On appelle l'avocat une fois le problème arrivé

C'est **le meilleur des trois arguments**, et le seul qui ne demande aucune
source : c'est une observation sur le fonctionnement du métier, pas une
statistique.

La formulation doit rester factuelle et sans mépris. Ce qui est vrai :

- L'avocat est saisi sur événement : la lettre d'observations, l'avis de
  contrôle, le contentieux. Par construction, il intervient **après**.
- Il est facturé au temps passé. Le coût est donc proportionnel à la gravité
  de ce qui est déjà arrivé.
- Entre deux dossiers, personne ne relit la paie. Ce n'est pas un reproche,
  c'est le modèle.

Ce qui suit logiquement : ACOMPIA ne remplace pas le cabinet, il occupe la
période où le cabinet n'est pas là. Et le jour où le cabinet est saisi, il
arrive sur un dossier déjà constitué, ce qui réduit le temps qu'il facture.

**Cet argument doit être retourné en bénéfice pour l'avocat, pas contre lui.**
C'est aussi ce qui le rend crédible sur une page signée par une avocate.

### 3.3 Le coût

Nous avons de vrais chiffres, il suffit de les sortir. Grille de
`js/tarifs-flotte.js`, tranches dégressives, minimum mensuel de 150 €.

Pour la flotte de 40 véhicules qui sert déjà de cas 01 sur la page :

| | Montant |
|---|---|
| Abonnement pilotage de flotte, 40 véhicules | **290 € par mois**, soit 3 480 € par an |
| Audit ponctuel, flotte de 40 véhicules | 1 500 €, forfait |
| Exposition du seul cas 01 (barème resté en 2024) | ≈ 35 600 € de cotisations, hors majorations |
| Ce que la même erreur ajoute chaque mois | 4 400 € d'assiette, soit environ 1 980 € de cotisations |

La comparaison la plus solide n'est donc **pas** ACOMPIA contre un cabinet.
C'est ACOMPIA contre l'erreur elle-même, et elle se lit sur une seule ligne,
avec des chiffres qui sont déjà tous les deux sur la page :

> Sur cette flotte de 40 véhicules, l'erreur de barème coûte environ 1 980 €
> de cotisations par mois. Le pilotage de la même flotte coûte 290 €.

C'est vérifiable, c'est arithmétique, et ça n'exige aucune donnée sur les
honoraires de qui que ce soit.

**Sur la comparaison avec le cabinet, il manque un chiffre.** Pour écrire
« un audit ACOMPIA coûte l'équivalent de N heures de cabinet », il faut un
taux horaire défendable. Sabrina est la mieux placée pour le fournir, et c'est
le seul chiffre du document qui ne peut pas venir de nous. Tant qu'il n'est
pas arbitré, la comparaison directe reste hors de la page, et on s'en tient à
la comparaison ci-dessus, qui se suffit.

---

## 4. Blocs prêts à coller

Sans tiret cadratin, espaces insécables sur les montants, conforme à la règle
de la maison.

### Bloc A, bandeau « la règle bouge »

À placer juste avant la section « Notre solution », c'est-à-dire entre le
constat (les trois cas-types) et la réponse (nos offres). C'est le chaînon
manquant : il explique pourquoi une entreprise sérieuse se trompe quand même.

> **Eyebrow :** Pourquoi les erreurs passent
>
> **Titre :** Personne ne se trompe par négligence. *La règle change plus vite que la paie.*
>
> **Chapeau :** Taux, assiettes, exonérations, plafonds, déclarations. En vingt
> mois, cinq textes ont modifié le calcul des cotisations : deux arrêtés, une
> loi de financement, une décision de la Cour de cassation et les mises à jour
> du BOSS. Une paramétrage juste en janvier peut être faux en mars, sans que
> personne n'ait rien fait de mal.
>
> **Lien :** Les cinq évolutions, texte par texte → `ressources/reformes-urssaf-2025-2026/`

Si l'option B est retenue et le décompte BOSS établi, remplacer la deuxième
phrase du chapeau par : « En 2025, le BOSS a publié N mises à jour opposables. »

### Bloc B, bandeau « l'avocat arrive après »

À placer immédiatement sous le bloc A, en contrepoint. Les deux se lisent
ensemble : la règle bouge toute l'année, et le recours n'existe qu'à la fin.

> **Eyebrow :** Ce qui manque n'est pas la compétence
>
> **Titre :** Un avocat se saisit d'un problème. *Encore faut-il qu'il soit arrivé.*
>
> **Chapeau :** Le cabinet intervient quand la lettre d'observations est là,
> et il facture le temps qu'il faut pour rattraper ce qui n'a pas été vu. Entre
> deux dossiers, la paie tourne seule. ACOMPIA occupe cet intervalle : la règle
> est suivie toute l'année, les écarts sont chiffrés au mois, et le jour où
> votre avocat est saisi, il ouvre un dossier déjà constitué.
>
> **Signature :** ACOMPIA a été conçu par une avocate. Il ne remplace pas le
> conseil, il lui donne de quoi travailler.

Cette dernière phrase est importante : c'est elle qui rend l'argument audible
plutôt qu'agressif, et elle réutilise l'autorité de Sabrina au lieu de la
contredire.

### Bloc C, la ligne de coût

À insérer dans le pied des cas-types, juste au-dessus de la mention
« Estimations établies aux barèmes en vigueur ». C'est le seul endroit où les
deux chiffres se touchent, puisque le cas 01 est juste au-dessus.

> Sur cette flotte de 40 véhicules, l'erreur de barème coûte environ 1 980 €
> de cotisations par mois. Le pilotage de la même flotte coûte 290 €.
> *Voir la grille tarifaire* → `outils/pilotage-flotte-tarifs/`

### Bloc D, entrée de FAQ

À ajouter juste après « Mon expert-comptable ne gère-t-il pas déjà ma
conformité URSSAF ? », dont c'est le pendant naturel.

> **J'ai déjà un avocat. Qu'est-ce qu'ACOMPIA apporte de plus ?**
>
> Une temporalité différente. Un avocat est saisi d'un dossier : un contrôle
> annoncé, une lettre d'observations, un contentieux. Il intervient sur
> événement et facture au temps passé, ce qui est le bon modèle pour défendre,
> mais pas pour surveiller trois cent soixante-cinq jours par an.
>
> ACOMPIA couvre l'autre moitié : la règle est suivie en continu, les écarts
> sont chiffrés au mois, chaque analyse est datée et sourcée. Le jour où votre
> avocat est saisi, il ne reconstitue pas l'historique, il l'a déjà.
>
> Nos règles d'analyse ont d'ailleurs été écrites par une avocate au Barreau
> de Paris. Le logiciel ne remplace pas le conseil, il le rend plus court.

---

## 5. Ce qu'on coupe en échange

Le seul reproche de Sabrina sur la maquette était la longueur, et son zip
retire environ 1 000 px. Ajouter deux bandeaux va dans le sens inverse. Pour
que le solde reste nul ou négatif :

- Les blocs A et B doivent tenir en **un seul écran à eux deux**, en deux
  colonnes sur desktop, empilés en mobile. Pas de visuel, pas d'illustration :
  du texte, un lien.
- Le bloc C est une ligne, il ne coûte rien.
- Le bloc D est dans la FAQ, fermée par défaut : coût nul au déroulé.
- En contrepartie, la section « Outils gratuits » peut passer de deux cartes
  détaillées à deux lignes, puisque les deux outils sont déjà dans la barre de
  navigation et dans le pied de page.

---

## 6. À valider avant publication

| Point | Qui tranche | Bloquant |
|---|---|---|
| Chiffre des évolutions réglementaires : option A (cinq textes en vingt mois) ou option B (décompte BOSS à établir) | Greg, puis Sabrina pour la source | **Oui**, aucune des deux versions ne part sans son décompte |
| Formulation sur les cabinets d'avocats, blocs B et D | Sabrina, c'est sa profession et sa signature | **Oui** |
| Sortir un prix sur la page d'accueil (bloc C) | Sabrina, décision commerciale | **Oui** |
| Taux horaire de référence si on veut la comparaison directe cabinet vs ACOMPIA | Sabrina | Non, la comparaison peut rester hors ligne |
| Emplacement des blocs A et B, et la contrepartie coupée | Greg | Non |
