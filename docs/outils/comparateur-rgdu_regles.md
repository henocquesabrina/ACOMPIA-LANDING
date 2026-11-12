# Comparateur RGDU mensuel : registre des règles

État au 11 novembre 2026. Outil non publié (page en `noindex`). Les positions retenues pour cette version sont indiquées dans « Positions arrêtées », en fin de document, avec leurs sources et leurs limites.

Fichiers : `outils/comparateur-rgdu-mensuel/index.html` (page), `js/rgdu-comparateur.js` (calcul), `tests/rgdu-comparateur.test.js` (61 tests, tous verts, 149 sur 149 pour la suite complète du site au 11/11/2026 au soir).

## Sources lues

| Code | Source | Adresse | Lecture |
|---|---|---|---|
| BOSS-AG | BOSS, rubrique Exonérations, « Allègements généraux » (réduction générale dégressive unique), version en ligne | https://boss.gouv.fr/portail/accueil/exonerations/allegements-generaux.html | 11/11/2026, texte intégral téléchargé et lu |
| BOSS-0606 | BOSS, communiqué du 05/06/2026 « Revalorisation du SMIC à compter du 1er juin 2026 » | https://boss.gouv.fr/portail/accueil/actualites-boss-et-rescrits/actualites-boss/2026/juin/revalorisation-du-smic-a-compter.html | 11/11/2026, texte intégral lu |
| CLASSEUR | Classeur publié `assets/matrice-controle-rgdu-2026.xlsx`, onglets Paramètres 2026, Calcul salarié, Comparaison, Tests de bord | fichier du site | 11/11/2026, formules lues une à une |
| ARTICLE | Article publié `/ressources/rgdu-cas-particuliers-calcul/`, trois exemples chiffrés | fichier du site | 11/11/2026 |

**Légifrance.** L'accès automatique était refusé au premier passage (erreur 403). Les textes ont ensuite été lus en entier dans un navigateur sans interface : voir « Lecture directe de Légifrance » et « Positions arrêtées ». Les mentions « non lu » qui subsistent plus bas dans l'historique datent d'avant ces lectures.

## Règles

Statuts : **BOSS** = confirmée par le passage cité du BOSS. **Classeur** = reprise du classeur validé, sans passage officiel lu qui la fixe mot pour mot. **À valider** = arbitrage de Sabrina attendu.

| N° | Règle codée | Passage cité | Source | Où dans le code | Statut |
|---|---|---|---|---|---|
| R01 | Coefficient = Tmin + Tdelta × [ (1/2) × (3 × SMIC de référence / rémunération − 1) ] ^ P, avec P = 1,75 | « Tmin + ( Tdelta × [ (1/2) × (3 × ( (salaire minimum calculé pour un an + (salaire minimum horaire × nombre d'heures supplémentaires ou complémentaires) ) / rémunération annuelle brute) – 1) ] P ) » et « La valeur P est égale à 1,75. » | BOSS-AG § 360 et 370 | `coefficient()` | BOSS |
| R02 | Tmin = 0,0200. Tdelta = 0,3781 si le FNAL est à 0,10 %, 0,3821 s'il est à 0,50 %. La page demande le taux de FNAL, pas l'effectif : un employeur de 50 salariés et plus peut rester à 0,10 % (franchissement de seuil neutralisé, certains employeurs agricoles) | « Pour l'année 2026, les valeurs Tmin et Tdelta sont ainsi fixées : Employeur de moins de 50 salariés 2% (0,0200) 37,81% (0,3781). Employeur de 50 salariés et plus 2% (0,0200) 38,21% (0.3821) » | BOSS-AG § 440. Classeur : mêmes valeurs, rattachées aux 1° et 2° de l'article L. 813-5 du CCH (taux du FNAL) | `PARAMETRES_2026.tmin`, `.tdelta.fnal010`, `.tdelta.fnal050` | BOSS (valeurs). Rattachement au taux de FNAL : classeur et contre-vérification. Voir V4 |
| R03 | Le SMIC retenu est celui du 1er janvier 2026 (12,02 € l'heure) pour toute l'année 2026, malgré la revalorisation du 1er juin 2026 (12,31 €) | « elle correspond à la valeur du SMIC applicable au 1er janvier 2026 » (§ 620). « Si le SMIC évolue en cours d'année, la valeur annuelle à prendre en compte n'est pas modifiée. » (§ 660). Communiqué : le décret conserve « la valeur du SMIC en vigueur au 1er janvier 2026 pour la détermination de l'éligibilité [...] ainsi que pour le calcul de son coefficient sur l'ensemble de l'année ». La valeur 12,02 € vient du classeur. Le BOSS donne 1 823,03 € par mois « en vigueur depuis le 1er janvier 2026 ». | BOSS-AG § 620, 660. BOSS-0606. Classeur B5 | `PARAMETRES_2026.smicHoraire` | BOSS (principe), Classeur (12,02 €) |
| R04 | SMIC mensuel d'un temps plein = douzième non arrondi de 1 820 × 12,02 €, soit 1 823,0333… € (21 876,40 € par an). Seuil de trois SMIC : 5 469,10 € par mois, 65 629,20 € par an. Le calcul se fait en fraction exacte. Deux autres bases sont calculées à part, seulement pour lire un écart : 1 823,03 € (valeur arrondie du BOSS et du classeur) et 12,02 × 151,67. Une paie qui retrouve l'une d'elles est classée « compatible avec une autre base mensuelle », jamais présentée comme une erreur | D. 241-7, IV : « 1 820 fois le montant horaire » ou « douze fractions identiques » de la valeur horaire multipliée par les 52/12 de 35 heures, sans arrondi. RF Paye n° 366, § 5-4 : SMIC mensuel = 1/12 × 1 820 × SMIC horaire. BOSS § 630 : même formule, et tolérance des 151,67 heures | Article D. 241-7, IV (lu le 11/11/2026). RF Paye § 5-4. BOSS-AG § 630 | `PARAMETRES_2026.smicMensuel`, `.smicMensuelExact`, `BASES_ALTERNATIVES` | **Tranché par Sabrina le 11/11/2026** (V2) |
| R05 | Réduction nulle si la rémunération n'est pas strictement inférieure à 3 fois le SMIC de référence du salarié | « La réduction s'applique si la rémunération annuelle du salarié est inférieure à 3 fois la valeur du SMIC applicable au 1er janvier 2026. » Exemple : « strictement inférieure à 65 629,08 euros en 2026 ». « à 3 fois la valeur annuelle du SMIC telle qu'elle doit être retenue au numérateur de la formule » | BOSS-AG § 160 et suivant (éligibilité au titre du mois) | `sousLePlafond()` : comparaison stricte en arithmétique exacte (fractions d'entiers longs), sans marge. Une égalité mathématique n'est jamais éligible (3 × 673,12), une rémunération réellement inférieure l'est toujours (655,99 € sous un plafond de 655,99000005 €) | BOSS |
| R06 | Coefficient arrondi à quatre décimales, au plus proche | « Le résultat obtenu par application de cette formule est arrondi à quatre décimales, au dix millième le plus proche. » | BOSS-AG § 380 | `arrondir(…, 4)` : demie éloignée de zéro, bruit binaire effacé à 15 chiffres significatifs | BOSS |
| R07 | Coefficient plafonné à Tmin + Tdelta. Minimum Tmin pour une rémunération éligible | « S'il est supérieur à la somme des valeurs Tmin et Tdelta, il est pris en compte à hauteur de cette somme. » « La valeur minimale du coefficient correspond à la valeur Tmin. » | BOSS-AG § 370, 380 | `coefficient()` | BOSS |
| R08 | Temps partiel : SMIC proratisé selon la durée inscrite au contrat, hors heures complémentaires, rapportée à 35 heures. Prorata plafonné à 1 | « la valeur du salaire minimum à retenir est ajustée à proportion de la durée de travail inscrite au contrat de travail, hors heures complémentaires, rapportée à la durée légale du travail » | BOSS-AG § 670. Classeur B20 | `smicReferenceMois()` | BOSS |
| R09 | Forfait annuel en jours inférieur à 218 : SMIC × jours du forfait / 218 | « le montant du salaire minimum annuel est corrigé du rapport entre : le nombre de jours prévu au forfait du salarié, et 218 jours » | BOSS-AG § 860. Classeur B21 | `smicReferenceMois()` | BOSS |
| R10 | Absence sans maintien ou avec maintien partiel, entrée ou sortie en cours de mois : SMIC du mois × (rémunération due / rémunération qui aurait été due), hors éléments non affectés par l'absence | « est corrigée du rapport entre : la rémunération due par l'employeur au titre de ce mois, et celle qui aurait été due si le salarié n'avait pas été absent » (§ 770). Même rapport pour l'entrée ou la sortie (§ 710). « sont déduits les éléments de rémunération dont le montant n'est pas strictement affecté par l'absence » (§ 780) | BOSS-AG § 710, 720, 770, 780. Classeur B22 | `calculerMois()` : `rapport`, puis `smicReferenceMois()` | BOSS |
| R11 | Heures supplémentaires et complémentaires : nombre d'heures × SMIC horaire, sans majoration, ajoutées après les corrections | « augmentée, après application des corrections ci-dessus le cas échéant, pour tenir compte des heures supplémentaires ou complémentaires [...] sans prise en compte des majorations [...] à hauteur du nombre d'heures réalisées [...] multiplié par la valeur du salaire minimum à retenir » | BOSS-AG § 650. Classeur B24 | `smicReferenceMois()` : `majoration` | BOSS |
| R12 | Rémunération retenue : assiette des cotisations de sécurité sociale (article L. 242-1), majorée de la prime de partage de la valeur. L'outil prend le montant saisi tel quel | « La rémunération prise en compte dans ce cadre est celle soumise à cotisations de sécurité sociale au sens de l'article L. 242-1 [...] majorée le cas échéant des montants de prime de partage de la valeur » | BOSS-AG § 170 | texte d'aide du champ | BOSS |
| R13 | Mois isolé : réduction du mois = rémunération du mois × coefficient du mois, « à titre provisoire sur la base des paramètres mensuels » | « la réduction générale est appliquée, par anticipation, à chaque date d'exigibilité des cotisations. Le montant de réduction à appliquer pour le mois est alors déterminé à titre provisoire sur la base des paramètres mensuels » | BOSS-AG § 1110 | `calculerMois()` méthode `mois` | BOSS |
| R14 | Régularisation progressive : coefficient et montant calculés sur les cumuls depuis janvier (ou l'embauche). Réduction du mois = montant cumulé − réductions déjà appliquées | « en sommant les valeurs du salaire minimum et de la rémunération de l'ensemble des périodes d'emploi écoulées depuis le début de l'année, ou depuis le premier jour de l'embauche si elle est postérieure. Le montant de la réduction pour un mois est égal à la différence entre le montant ainsi déterminé et le montant cumulé de la réduction appliquée sur les périodes d'emploi précédentes de l'année. » | BOSS-AG § 1140. Vérifié sur le tableau du communiqué BOSS-0606 (39,81 % puis 39,41 %, 39,13 %, 38,92 %, 38,76 %, 38,63 %, 38,53 %, 38,44 %) | `calculerMois()` méthode `progressive` | BOSS |
| R15 | Montant de la réduction arrondi au centime le plus proche | Aucun passage lu ne fixe cet arrondi | Classeur B35. D. 241-7, D. 241-8 et RF Paye § 5-4 ne fixent que l'arrondi du coefficient | `montantExact()` : produit rémunération × coefficient arrondi au centime sans binaire. `comparer()` : un écart d'un centime au plus est lu « aucun écart ». La page affiche « Montant arrondi au centime. Aucun texte ne fixe cet arrondi. » | **Tranché par Sabrina le 11/11/2026** (V3) : arrondi au centime gardé |
| R16 | En règle générale, la réduction ne peut pas dépasser les cotisations et contributions entrant dans son champ et effectivement dues. Une règle propre s'applique quand le taux d'assurance chômage est minoré (D. 241-11, II, selon la contre-vérification). Le comparateur ne recalcule pas ce plafond : tout montant est présenté comme un recalcul « avant plafond » (résultat, lot, export), et les cas où le plafond joue le plus souvent sont hors périmètre (prime de partage de la valeur exonérée dans le mois ou dans les cumuls, taux réduits) | Non lu directement. Signalé par la contre-vérification, qui cite l'article D. 241-11 | Article D. 241-11 du code de la sécurité sociale (lecture de seconde main) | `pointsAVerifier()`, `SITUATIONS_HORS_PERIMETRE.ppv_exoneree`, `.taux_reduits`. La phrase affichée précise que le plafond s'apprécie sur l'année (D. 241-11, I : cotisations « dues pour l'emploi du salarié au titre des gains et rémunérations versés au cours de l'année ») | **Tranché par Sabrina le 11/11/2026** (V9) : rappel sans recalcul, apprécié sur l'année |
| R17 | Situations déclarées hors périmètre : aucun calcul n'est rendu | Voir la table des cas limites | BOSS-AG § 90 à 140, 200, 230, 390 à 430, 450 à 500, 690, 840 à 870, 990 à 1060, 1070 à 1100, 1150 | `SITUATIONS_HORS_PERIMETRE` | Choix de périmètre |
| R18 | Abattement forfaitaire d'anticipation de 15 % au plus : cité seulement en mois isolé, si la réduction recalculée est positive et si la paie vaut au moins 85 % du recalcul | « l'employeur peut affecter le montant de la réduction générale calculée mensuellement d'un coefficient d'abattement forfaitaire qu'il détermine dans la limite d'un montant maximum de 15% » | BOSS-AG § 1120 | `pointsAVerifier()` | BOSS |
| R19 | Mois isolé au-dessus du plafond du mois : réduction nulle, avec le rappel que l'éligibilité peut aussi s'apprécier sur le cumul depuis janvier | « l'éligibilité peut également être appréciée au titre d'un mois par comparaison : de la rémunération due au titre du mois [...] à 3 fois la valeur annuelle du SMIC [...] rapportée au nombre de mois écoulés depuis le début de l'année ». Les exemples du BOSS comparent des cumuls (janvier à juin) | BOSS-AG § 210 | `pointsAVerifier()` | BOSS. Présentation à valider, voir V10 |

## Cas limites

Note du 11/11/2026 : ce tableau est à jour des positions arrêtées. Les constats « classeur et article non alignés » qui subsistent dans l'historique datent d'avant l'alignement décrit plus bas.

| Cas | Traitement | Pourquoi |
|---|---|---|
| Temps plein 35 heures, présent tout le mois | Traité | R01 à R07, R13 |
| Temps partiel | Traité | R08 |
| Heures complémentaires ou supplémentaires, sans absence | Traité, en nombre d'heures du mois | R11. La durée contractuelle se saisit hors heures complémentaires (erreur n° 1 du classeur : double comptage) |
| Durée contractuelle supérieure à 35 heures | Hors périmètre | L'utilisateur doit saisir 35 heures et porter le surplus en heures supplémentaires |
| Durée collective inférieure à 35 heures | Hors périmètre | BOSS-AG § 690 : cas non codé (choix de périmètre) |
| Forfait annuel en jours, 1 à 217 jours | Traité | R09 |
| Forfait de 218 jours | Traité, sans correction | Classeur, test de bord |
| Forfait en jours avec durée hebdomadaire réduite | Hors périmètre | Combinaison non décrite par le classeur |
| Forfait en jours avec heures supplémentaires | Hors périmètre | BOSS-AG § 860 : un forfait en jours ne majore pas le SMIC |
| Absence et heures supplémentaires dans le même mois | Hors périmètre | BOSS-AG § 760, 810, 960 : les heures structurelles se corrigent de l'absence, pas les heures ponctuelles |
| Forfait annuel en heures | Hors périmètre | BOSS-AG § 870 : rapport à 1 607 heures, non codé |
| Absence non rémunérée ou maintien partiel | Traité par le rapport des deux montants | R10. L'utilisateur retire lui-même les éléments non affectés. Indemnités journalières subrogées exclues, indemnités complémentaires financées par l'employeur incluses (BOSS-AG § 790) : rappelé à l'écran |
| Absence avec maintien intégral | Traité : ne rien saisir dans les montants d'absence | BOSS-AG § 750 : SMIC non corrigé |
| Entrée ou sortie en cours de mois | Traité par le même rapport | BOSS-AG § 710 |
| Rapport d'absence supérieur à 1 | Hors périmètre | Non pris en charge, les éléments retenus sont à vérifier |
| Rémunération au SMIC ou en dessous | Traité, coefficient plafonné à Tmin + Tdelta | R07 |
| Rémunération juste sous 3 SMIC de référence (5 469,09 € pour un temps plein) | Traité, coefficient 0,0200 | R05, R07 |
| Rémunération égale ou supérieure à 3 SMIC de référence (5 469,10 € pour un temps plein) | Traité, réduction nulle | R05 |
| Paie calculée sur 1 823,03 € ou sur 151,67 heures | Traité : « compatible avec une autre base mensuelle » | R04. Jamais présentée comme une erreur |
| Écart d'un centime entre la paie et le recalcul | Traité : « aucun écart » | R15 |
| Rémunération nulle ou négative | Hors périmètre | Mois à traiter dans la régularisation |
| Valeur présente mais illisible (texte, pourcentage, séparateurs mal placés) | Calcul incomplet | Jamais remplacée par une valeur par défaut |
| Valeurs extrêmes (rémunération au-delà d'un million, plus de 300 heures) | Hors périmètre | Bornes de saisie |
| Rémunération exactement égale au plafond | Traité, réduction nulle | R05, arithmétique exacte |
| Navigateur sans entiers longs | Hors périmètre au voisinage immédiat du plafond | L'éligibilité ne peut pas être tranchée au centime |
| Taux de FNAL : 0,10 % ou 0,50 % | Traité | R02. L'utilisateur indique le taux réellement appliqué |
| Régularisation progressive | Traitée si les trois cumuls antérieurs sont saisis, positifs ou nuls | R14. Cumuls du même contrat, sans changement de régime ni de valeurs Tmin et Tdelta (BOSS-AG § 230, 500, 1070, 1080). Le comparateur affiche le SMIC de référence à six décimales pour le report. Le cumul saisi porte une incertitude d'une demi-unité de sa dernière décimale : si l'éligibilité ou le coefficient changent dans cet intervalle, aucun montant n'est rendu (« Hors périmètre », avec la demande de saisir plus de décimales) |
| CDD renouvelé | Traité : les cumuls se poursuivent | D. 241-7, V : coefficient déterminé pour chaque contrat. RF Paye § 5-9 (renvoi BOSS § 360) : un CDD renouvelé reste le même contrat, calcul sur toute la période. Dit dans l'aide |
| Nouveau CDD distinct chez le même employeur | Traité : les cumuls repartent de zéro | D. 241-7, V. Dit dans l'aide |
| CDD transformé en CDI en cours d'année | Traité : les cumuls se poursuivent, dans la limite de l'année civile | BOSS § 1080. Cette continuité repose sur la doctrine du BOSS, pas sur D. 241-7, V, qui pose seulement le calcul « pour chaque contrat » |
| Changement de régime d'exonération ou de valeurs Tmin et Tdelta en cours d'année | Hors périmètre | Le découpage des périodes est à vérifier |
| Décembre ou dernier mois du contrat, quand la paie porte la régularisation | Hors périmètre en mois isolé, calculé en régularisation progressive | D. 241-9, al. 1 et 2. BOSS § 1140, 1150. Tout mois isolé positif porte en plus un avertissement |
| Abattement d'anticipation de 15 % | Non calculé, signalé | R18 |
| Contrat de mission (intérim) | Hors périmètre | BOSS-AG § 390, 1100 : calcul par mission, coefficient × 1,1 |
| Caisse de congés payés | Hors périmètre | BOSS-AG § 420, 430 : coefficient × 100/90 et SMIC « sans prendre en compte les périodes de congés payés » |
| Conducteurs en régime d'équivalence, personnel roulant avec coupure ou amplitude | Hors périmètre | BOSS-AG § 990 à 1040 : facteur variable |
| Déduction forfaitaire spécifique | Hors périmètre | Double calcul et plafond de 130 % (arrêté du 4 décembre 2019) |
| Taux réduits (journalistes à la pige, VRP à cartes multiples, professions médicales, retraite complémentaire prise en charge à moins de 60 % par l'employeur, taux AT-MP inférieur à 0,49 %) | Hors périmètre | BOSS-AG § 450 à 480 : Tdelta ajusté. Le chômage bonusé ne réduit pas Tdelta (§ 490) |
| Prime de partage de la valeur exonérée versée dans le mois | Hors périmètre | R16 : plafond des cotisations dues |
| Employeur ou salarié susceptible d'être exclu du champ (particulier employeur, employeur public, mandataire sans contrat, stagiaire) | Hors périmètre | BOSS-AG § 90 à 140. Certains employeurs publics sont éligibles : l'éligibilité se vérifie avant tout calcul |
| Somme versée après la rupture du contrat | Hors périmètre | BOSS-AG § 200 : rattachement et régularisation à vérifier |
| Contrat terminé entre le 1er et le 30 juin 2026 | Hors périmètre | Tolérance du communiqué BOSS-0606 |
| Exonération spécifique non cumulable, régimes spéciaux, aide à domicile mixte, Mayotte | Hors périmètre | BOSS-0606 : la mesure ne vaut que pour la RGDU de droit commun |
| Salarié hors mensualisation, à la tâche ou sans horaire | Hors périmètre | BOSS-AG § 740, 840, 850 |
| Année autre que 2026 | Hors périmètre | Paramètres propres à 2026 |
| Apprenti du secteur privé | Traité comme un salarié de droit commun, SMIC entier | BOSS-AG § 940. L'apprenti du secteur public relève d'une exonération spécifique : hors périmètre. Voir V6 |
| Lot collé | Traité en mois isolé, après confirmation que les salariés étaient présents tout le mois, sans forfait ni situation particulière | Le lot ne porte ni absence, ni forfait, ni cumul. Une ligne illisible est gardée avec son diagnostic |

Le moteur garde deux paramètres internes, `facteurA` et `facteurB`, non accessibles depuis la page. Ils servent seulement à rejouer l'exemple 3 du classeur et ses tests de bord.

## Vérifications chiffrées

Depuis la décision du 11/11/2026, le calcul se fait sur le douzième non arrondi (1 823,0333… €). Les coefficients et les réductions des exemples du classeur et de l'article ne changent pas. Seuls bougent d'un centime les SMIC de référence et les plafonds affichés, et le test de plafond du classeur.

| Vecteur | Classeur et article (base 1 823,03 €) | Comparateur (douzième non arrondi) | Lecture |
|---|---|---|---|
| Temps partiel 28 h, 8 heures complémentaires, 1 691,73 € | SMIC 1 554,58 €, plafond 4 663,75 €, coefficient 0,3213, réduction 543,55 € | SMIC 1 554,59 €, plafond 4 663,76 €, coefficient 0,3213, réduction 543,55 € | Réduction identique |
| Même cas, réduction en paie de 633,38 € | Écart + 89,83 € | Écart + 89,83 € | Identique |
| Absence, rapport 0,857143, 2 035,71 € | SMIC 1 562,60 €, plafond 4 687,79 €, coefficient 0,1986, réduction 404,29 € | SMIC 1 562,60 €, plafond 4 687,80 €, coefficient 0,1986, réduction 404,29 € | Réduction identique |
| Même cas à partir des deux montants (1 885,71 € et 2 200 €) | SMIC 1 562,59 € | SMIC 1 562,60 €, coefficient 0,1986, réduction 404,29 € | Réduction identique |
| Conducteur 45/35, 10 heures supplémentaires, 2 500 € (calcul interne) | SMIC 2 464,10 €, plafond 7 392,29 €, coefficient 0,3840, réduction 960,00 € | SMIC 2 464,10 €, plafond 7 392,30 €, coefficient 0,3840, réduction 960,00 € | Réduction identique |
| Test de bord : 5 469 € | 0,0200 et 109,38 € | 0,0200 et 109,38 € | Identique |
| Test de bord : 5 469,09 € (plafond du classeur) | Hors champ, 0 € | Éligible, 0,0200 et 109,38 €. Le plafond est à 5 469,10 € | **Change.** Une paie à 0 € est reconnue « compatible avec une autre base mensuelle (1 823,03 €) », avec la phrase « Ce n'est pas une erreur de paie ». Test dédié |
| Test de bord : 5 469,10 € | Hors champ | Hors champ, 0 € | Nouveau plafond |
| Test de bord : temps partiel 50 %, 4 000 € | Plafond 2 734,55 €, 0 € | Plafond 2 734,55 €, 0 € | Identique |
| Tests de bord : forfait 217 jours et 218 jours à 3 000 € | 0,0985 et 295,50 € · 0,0999 et 299,70 € | Mêmes valeurs (plafonds 5 444,01 € et 5 469,10 € au lieu de 5 444,00 € et 5 469,09 €) | Réductions identiques |
| Tests de bord : caisse de congés payés et conducteur à 2 500 € (calcul interne) | 477,50 € · 845,75 € | 477,50 € · 845,75 € | Identiques |
| Test de bord : au SMIC (1 823,03 €) | 0,3981 et 725,75 € | 0,3981 et 725,75 € | Identique |
| Salarié au SMIC toute l'année 2026, FNAL à 0,10 % | 39,81 % de janvier à mai, puis 39,41 · 39,13 · 38,92 · 38,76 · 38,63 · 38,53 · 38,44 % (communiqué BOSS-0606) | Les douze coefficients sont retrouvés | Identique |

**À aligner par Sabrina, non modifiés ici.** Le classeur publié `assets/matrice-controle-rgdu-2026.xlsx` (paramètre « SMIC mensuel brut » à 1 823,03 €, plafond de 5 469,09 € dans le mode d'emploi et dans le test de bord « rémunération égale au plafond ») et l'article `/ressources/rgdu-cas-particuliers-calcul/` (SMIC de référence de base à 1 823,03 €) restent sur la valeur arrondie. Leurs réductions d'exemple restent justes. Seuls le plafond et les SMIC de référence affichés diffèrent d'un centime.

## Écart relevé dans le BOSS

Les deux exemples du BOSS sur la déduction forfaitaire spécifique (juste avant le § 360) annoncent 24,43 % pour 2 200 €, 34,87 % pour 1 920 € et 38,82 % pour 1 840 €. Ces trois taux se retrouvent avec Tdelta = 0,3773, pas avec 0,3781 ni 0,3821. Le tableau du § 440 et le communiqué du 05/06/2026 (39,81 % au maximum, soit 0,0200 + 0,3781) confirment 0,3781 et 0,3821. Ces exemples paraissent donc ne pas avoir été mis à jour. Ils ne sont pas utilisés. La déduction forfaitaire spécifique est hors périmètre.

## Contre-vérification par Codex (11/11/2026)

Premier passage : 18 remarques. Formule, ordre des opérations, paramètres, SMIC de référence, régularisation progressive et les douze coefficients du communiqué BOSS ont été recalculés et trouvés exacts.

| Remarque | Gravité | Suite donnée |
|---|---|---|
| Plafond des cotisations effectivement dues absent (D. 241-11) | Bloquant | R16 : rappel dans chaque résultat positif, PPV exonérée et taux réduits placés hors périmètre. Plafond non recalculé : V9 |
| Tdelta choisi d'après l'effectif au lieu du taux de FNAL | Important | Corrigé : la page demande le taux de FNAL |
| Taux réduits : liste trop courte | Important | Corrigé : retraite complémentaire à moins de 60 %, AT-MP inférieur à 0,49 % ajoutés |
| Égalité au plafond rendue éligible par le binaire | Bloquant | Corrigé (`sousLePlafond`), deux contre-exemples en test |
| `arrondir()` pouvait monter une valeur sous la demie | Important | Corrigé (15 chiffres significatifs), trois contre-exemples en test |
| Forfait en jours et heures supplémentaires acceptés ensemble | Important | Corrigé : hors périmètre |
| Heures structurelles et absence | Important | Corrigé : absence et heures supplémentaires dans le même mois, hors périmètre |
| Bornes juridiques des cumuls | Important | Texte d'aide et point à vérifier, changement en cours d'année hors périmètre |
| Situations manquantes (hors champ, roulants, aide à domicile, à la tâche, après rupture, fin juin 2026) | Important | Ajoutées |
| Lot : situations non représentables calculées | Important | Corrigé : confirmation obligatoire du périmètre |
| Valeurs illisibles remplacées en silence | Important | Corrigé : calcul incomplet |
| En-tête de lot : un salarié pouvait disparaître | Important | Corrigé : en-tête reconnu à son libellé seulement |
| Lecture des nombres trop permissive | Mineur | Corrigé : format strict |
| CSV : retour chariot isolé | Important | Corrigé : caractères de contrôle retirés |
| Base 151,67 heures déclarée « admise » | Important | Corrigé : écart « lié à la base », condition de la tolérance rappelée |
| Abattement de 15 % cité à tort | Important | Corrigé : seulement entre 85 % et 100 % d'un recalcul positif |
| Motif inexact pour la durée collective, imputation AT-MP | Mineur | Motif corrigé, imputation AT-MP retirée |
| Valeurs extrêmes | Mineur | Bornes de saisie |

Second passage : 6 remarques, toutes traitées.

| Remarque | Gravité | Suite donnée |
|---|---|---|
| La marge de 1e-7 refusait une rémunération réellement sous le plafond (655,99 € contre 655,99000005 €) | Bloquant | Corrigé : comparaison en arithmétique exacte, sans marge. Contre-exemples en test, dans les deux sens |
| Plafond des cotisations dues : une PPV exonérée d'un mois antérieur passait dans les cumuls | Bloquant | Corrigé : PPV hors périmètre « dans le mois ou dans les cumuls », montants présentés partout « avant plafond », formulation alignée sur D. 241-11 |
| Le SMIC de référence affiché au centime faussait un cumul reporté (0,35 € d'écart) | Important | Corrigé : valeur exacte affichée et exportée, consigne de report |
| Un salarié nommé « ID » disparaissait du lot | Important | Corrigé : un en-tête n'a aucune colonne chiffrée |
| Textes trop larges (employeur public, versement après rupture, changement de contrat ou de taux, formule sans « en mois isolé », « réduction nulle » en progressive, « l'écart tient à la base », profession médicale, indemnités journalières) | Important | Corrigés un à un |
| Arrondi des montants encore exposé au binaire, montant de paie démesuré | Mineur | Montants arrondis en arithmétique exacte, borne sur le montant de paie. L'arrondi du coefficient (issu d'une puissance non entière) reste en flottants à 15 chiffres significatifs |

Troisième passage : 5 remarques, toutes traitées.

| Remarque | Gravité | Suite donnée |
|---|---|---|
| En progressif, la rémunération cumulée repassait en flottant avant le test du plafond et le produit | Bloquant | Corrigé : la fraction exacte du cumul va jusqu'au test et au montant |
| Le SMIC « exact » affiché à six décimales ne l'est pas pour une fraction périodique | Important | Corrigé : libellé « valeur à six décimales », et aucun résultat rendu quand le cumul est à moins d'un centime du plafond |
| `frac()` pouvait lever une exception sur des montants d'absence extrêmes | Important | Corrigé : notation scientifique développée exactement, bornes sur les montants d'absence |
| Une ligne « ID » malformée disparaissait encore du lot | Important | Corrigé : un en-tête n'a aucune colonne chiffrée et au moins deux libellés reconnus |
| Le rappel du plafond omettait le cas du chômage minoré | Important | Corrigé dans les points à vérifier et dans la page |

Quatrième passage : 4 remarques, toutes traitées. Aucune erreur de droit nouvelle.

| Remarque | Gravité | Suite donnée |
|---|---|---|
| Un SMIC cumulé reporté à six décimales pouvait encore faire basculer le coefficient (0,40 € d'écart) | Important | Corrigé : l'incertitude du report est propagée, tout résultat ambigu est refusé |
| Une ligne « ID » avec des unités (« 35 heures ») était prise pour un en-tête | Important | Corrigé : un en-tête n'a aucun chiffre et quatre libellés reconnus |
| Forfait en jours inférieur à 1 accepté | Mineur | Corrigé |
| Garde de proximité du plafond en progressif | Mineur | Remplacée par la propagation de l'incertitude du report |

Cinquième passage : 1 remarque, traitée. « V1 à V13 restent soumis à l'arbitrage de l'avocate. »

| Remarque | Gravité | Suite donnée |
|---|---|---|
| Un SMIC cumulé saisi sans décimale (« 1823 ») était tenu pour connu au centime | Important | Corrigé : l'incertitude suit les décimales réellement saisies (0,50 € sans décimale). Un cumul nul est exact |

Sixième passage, limité aux trois décisions du 11/11/2026 : 1 erreur et 2 remarques, toutes traitées. Les douze coefficients du communiqué BOSS sont confirmés inchangés, la fraction exacte du SMIC mensuel vaut 54 691/30.

| Remarque | Gravité | Suite donnée |
|---|---|---|
| En régularisation progressive, aucune base alternative n'était calculée : une paie sur 1 823,03 € ou sur 151,67 heures sortait en écart | Erreur | Corrigé : les deux variantes sont calculées sur les cumuls |
| La tolérance d'un centime ne valait pas pour la reconnaissance d'une variante | Mineur | Corrigé |
| V14 gardait l'ancienne phrase sur le CDD transformé en CDI | Mineur | Corrigé |

## Points ouverts à l'origine (historique, tous tranchés plus bas)


- **V1.** (historique) Lecture de L. 241-13 et D. 241-7 à D. 241-9 : faite le 11/11/2026, voir « Positions arrêtées ».
- **V2. Tranché par Sabrina le 11/11/2026.** Base mensuelle : le douzième non arrondi de 1 820 × 12,02 €, soit 1 823,0333… € (D. 241-7, IV, RF Paye § 5-4). Seuil mensuel 5 469,10 €, seuil annuel 65 629,20 €. Une paie calculée sur 1 823,03 € ou sur 151,67 heures reste classée « compatible avec une autre base mensuelle », jamais présentée comme une erreur.
- **V3. Tranché par Sabrina le 11/11/2026.** Le montant reste arrondi au centime. Le résultat affiche « Montant arrondi au centime. Aucun texte ne fixe cet arrondi. » Un écart d'un centime est lu « aucun écart ».
- **V4.** Tdelta : la page demande le taux de FNAL (0,10 % ou 0,50 %), comme le classeur, et non l'effectif comme le tableau du BOSS. Confirmer, ainsi que la phrase d'aide sur les cas à 0,10 % au-delà de 50 salariés.
- **V5.** Verdicts affichés : « aucun écart », « écart lié à la base mensuelle », « la paie applique plus que le recalcul », « la paie applique moins que le recalcul ». Le classeur dit « sur-application, risque de redressement » et « sous-application, indu récupérable ». J'ai retenu des mots neutres.
- **V6.** Apprentis du secteur privé : traités comme des salariés de droit commun, SMIC entier (BOSS § 940). Confirmer.
- **V7.** Écart relevé dans les exemples du BOSS sur la déduction forfaitaire spécifique (voir plus haut). Sans effet sur l'outil.
- **V8.** Liste des situations hors périmètre et leurs phrases d'explication.
- **V9. Tranché par Sabrina le 11/11/2026.** Plafond des cotisations effectivement dues : non recalculé, montants présentés « avant plafond ». La phrase précise que le plafond s'apprécie sur l'année (D. 241-11, I).
- **V10.** Mois isolé au-dessus du plafond du mois : le comparateur affiche une réduction nulle et renvoie vers la régularisation progressive, parce que le BOSS (§ 210) illustre l'éligibilité sur les cumuls. Confirmer cette présentation.
- **V11.** Le résultat est présenté comme une « simulation provisoire du mois », qui « ne valide ni le droit annuel ni la paie régularisée ». Confirmer.
- **V12.** Absence : le comparateur rappelle que les indemnités journalières subrogées sortent du rapport et que les indemnités complémentaires financées par l'employeur y entrent (BOSS § 790). Confirmer la phrase.
- **V13.** Arrondi du coefficient : calculé en flottants puis arrondi à quatre décimales. Une valeur située à moins de 0,000000000000001 d'une demie pourrait basculer. Aucun cas de paie réel identifié.

## Lecture directe de Légifrance (11/11/2026, seconde relecture)

Textes lus en entier sur legifrance.gouv.fr, version en vigueur au 11 novembre 2026.

| Texte | Version | Ce qu'il confirme |
|---|---|---|
| Article D. 241-7 du code de la sécurité sociale | En vigueur depuis le 11 novembre 2026, modifié par le décret n° 2026-1037 du 6 novembre 2026 | R01 (formule, P fixé à 1,75), R06 (arrondi « à quatre décimales, au dix millième le plus proche »), R07 (« la valeur maximale du coefficient est égale à la somme des valeurs Tmin et Tdelta »), R02 (Tmin 0,0200, Tdelta 0,3781 au taux du 1° de l'article L. 813-5 du CCH, 0,3821 au taux du 2°), R03 (« montant annuel brut applicable au 1er janvier 2026 »), R04 (« 1 820 fois le montant horaire [...] ou [...] douze fractions identiques »), R08, R09, R10 (IV), R11 (heures « rémunérées au cours de l'année »), intérim et CDD (V) |
| Article D. 241-8 | En vigueur depuis le 15 juin 2026 (décret n° 2026-509) | R13 : la réduction du mois est « égal[e] au produit de la rémunération mensuelle par le coefficient [...], à l'exception du montant du salaire minimum à retenir et de la rémunération qui sont pris en compte pour un mois » |
| Article D. 241-9 | En vigueur depuis le 24 septembre 2012 | R14 : régularisation progressive « en faisant masse, à chaque échéance, des éléments nécessaires au calcul de la réduction sur la période écoulée depuis le premier jour de l'année ou à dater de l'embauche » |
| Article D. 241-10 | En vigueur depuis le 15 juin 2026 | Facteurs a et b (45/35, 40/35, 1,1, 100/90) : situations hors périmètre |
| Article D. 241-11 | En vigueur depuis le 24 août 2023 | R16 : plafond apprécié sur l'année (« dues pour l'emploi du salarié au titre des gains et rémunérations versés au cours de l'année »), dérogation du II pour l'assurance chômage minorée |
| Décret n° 2026-1037 du 6 novembre 2026 | JO, version initiale | Crée le II bis de D. 241-7 (branches dont le minimum est sous le SMIC). Article 3, II : s'applique « aux cotisations et contributions dues au titre des périodes d'emploi courant à compter du 1er janvier 2027 ». Sans effet sur un outil limité à 2026 |

Non lus à ce jour : l'article L. 241-13 lui-même et le décret fixant le SMIC horaire au 1er janvier 2026 (12,02 € repris du classeur).

Points nouveaux relevés à cette lecture :
- **V2 précisé, puis tranché le 11/11/2026 (douzième non arrondi).** Le texte ne prévoit aucun arrondi de la fraction mensuelle : 12,02 × 35 × 52 / 12 = 1 823,0333 €, soit 21 876,40 € par an et un seuil de 65 629,20 €. La valeur 1 823,03 € (seuil 65 629,08 €) est celle de l'exemple du BOSS et du classeur.
- **V14.** Première décision du 11/11/2026 (CDD transformé en CDI hors périmètre), remplacée le même jour après lecture du BOSS § 1080 : calcul poursuivi. Voir « Positions arrêtées ».
- **V9 précisé, puis tranché le 11/11/2026.** Le plafond de D. 241-11 s'apprécie sur l'année. La phrase affichée le dit désormais.

## Lecture de RF Paye (11/11/2026)

Source : RF Paye n° 366, « Cotisations, prestations et chiffres utiles », chapitre 5 « Exonérations et allègements généraux », § 5-1 à 5-11, date de parution 02/2026, lu en entier sur rfpaye.grouperf.com avec l'abonnement de Sabrina. La fiche du Dictionnaire Paye « RGDU (paramètre SMIC) », mise à jour le 01/07/2026, n'est pas ouverte à cet abonnement : non lue.

| Point | Ce que dit RF Paye | Conséquence |
|---|---|---|
| V2, base mensuelle | § 5-4, note ** : SMIC annuel = 1 820 × SMIC horaire, SMIC mensuel = 1/12 × 1 820 × SMIC horaire, ou 151,67 × SMIC horaire | Même lecture que le IV de D. 241-7 : douzième non arrondi, soit 1 823,0333 € avec 12,02 € |
| V14, CDD | § 5-9 : coefficient déterminé pour chaque contrat. Un CDD renouvelé reste le même contrat et la réduction se calcule sur toute la période couverte (renvoi au BOSS § 360). Un contrat à cheval sur deux années : calcul séparé par année | Renouvellement : cumuls continus. Nouveau CDD distinct : nouveau calcul. Transformation en CDI : non traitée par RF Paye |
| V9, plafond | § 5-11 : montant total limité aux cotisations patronales du périmètre (D. 241-11, I) | Conforme à la lecture directe |
| V3, arrondi du montant | Rien sur l'arrondi du montant de la réduction. Seul l'arrondi du coefficient est donné (§ 5-4) | Reste une convention de l'outil |
| SMIC de référence | § 5-4 décrit l'état de février 2026 (SMIC de la période d'emploi, somme des valeurs en cas de hausse). Dépassé par le décret n° 2026-509 du 12 juin 2026 : D. 241-7, II retient le SMIC du 1er janvier 2026 | Le comparateur suit le texte en vigueur |

## Alignement du classeur et de l'article (11/11/2026, décision de Sabrina)

- `assets/matrice-controle-rgdu-2026.xlsx` : Paramètres 2026 B6 devient `=B5*1820/12` (1 823,0333), libellés A6 et C6 réécrits, Tests de bord C6 pointe sur le plafond (5 469,10) et C12 sur le SMIC retenu, trois textes passent de 5 469,09 € à 5 469,10 €. Les 105 formules gardent une valeur en cache. Aucun coefficient ni aucune réduction ne change.
- `ressources/rgdu-cas-particuliers-calcul/` : plafond 5 469,10 €, SMIC retenu 1 823,0333 €, exemple 1 (1 458,43 €, 1 554,59 €, 1 650,75 €), exemple 3 (1 823,0333 €). Coefficients et réductions inchangés.
- `ressources/reduction-generale-cotisations-patronales/` et `outils/matrice-controle-rgdu/` : plafond 5 469,10 €.
- Non modifiés : la mention du SMIC officiel à 1 823,03 € par mois dans les sources de l'article réduction générale et dans l'article trop-payé.


## Positions arrêtées (11/11/2026)

Textes lus en entier sur Légifrance le 11/11/2026, version en vigueur à cette date : article L. 241-13 du code de la sécurité sociale (en vigueur depuis le 1er janvier 2026), articles D. 241-7 à D. 241-11, article L. 133-10, décret n° 2025-1228 du 17 décembre 2025 (article 1er), articles L. 6227-8-1 et L. 6243-2 du code du travail, article L. 813-5 du code de la construction et de l'habitation. BOSS « Allègements généraux » relu aux paragraphes cités. Communiqué BOSS du 05/06/2026 relu.

| Point | Question | Passage lu | Position | Ce que fait l'outil |
|---|---|---|---|---|
| V1 | La loi et le décret du SMIC confirment-ils la formule, le seuil et 12,02 € ? | L. 241-13, II : la réduction s'applique aux revenus « qui sont inférieurs à un montant fixé par décret ». III : le coefficient « devient nul[le] lorsque la rémunération [...] atteint le montant fixé par décret ». III : montant « calculé chaque année civile, pour chaque salarié et pour chaque contrat de travail ». D. 241-7, I : montant fixé « à trois fois le montant du salaire minimum de croissance applicable au 1er janvier 2026 ». Décret n° 2025-1228, art. 1er : « son montant est porté à 12,02 euros l'heure » | Confirmé. Le seuil est strict : à l'égalité, la réduction est nulle | R01 à R07, R13, R14 inchangées. Comparaison stricte en arithmétique exacte |
| V2 | Base mensuelle | D. 241-7, IV : « 1 820 fois le montant horaire » ou « douze fractions identiques ». BOSS § 770 : « salaire minimum horaire × 1820 × 1/12 ». BOSS § 210 : « 3 × Smic horaire × 1820 × 1/12 ». RF Paye § 5-4 | Le comparateur utilise le douzième non arrondi, 1 823,033333… €. Le BOSS présente aussi la valeur mensuelle arrondie de 1 823,03 €. Une concordance avec cette base ne valide pas la paie | Calcul sur la fraction exacte. Une paie sur 1 823,03 € ou 151,67 h est dite compatible avec une autre base |
| V3 | Arrondi du montant | Aucun des articles D. 241-7 à D. 241-11 ne fixe l'arrondi du montant. L. 133-10 : « Le montant des cotisations et contributions sociales et de leurs assiettes déclarées aux organismes de sécurité sociale [...] est arrondi à l'euro le plus proche » | Le comparateur arrondit le montant au centime par convention. Les articles D. 241-7 à D. 241-11 ne fixent pas cet arrondi. L. 133-10 prévoit l'arrondi à l'euro des cotisations, contributions et assiettes déclarées aux organismes. L'écart d'un centime est neutralisé par convention, sans fondement légal | Arrondi au centime, phrase affichée, un centime d'écart n'est pas compté |
| V4 | Taux de FNAL ou effectif | D. 241-7, III : Tdelta 0,3781 pour les employeurs redevables de la contribution « au taux prévu au 1° de l'article L. 813-5 », 0,3821 « au taux prévu au 2° ». L. 813-5 CCH : 0,1 % « pour les employeurs occupant moins de cinquante salariés et pour les employeurs occupés aux activités mentionnées aux 1° à 4° de l'article L. 722-1 du code rural [...] et les coopératives mentionnées à l'article L. 521-1 », 0,5 % « pour les autres employeurs » | Le critère légal est le taux de FNAL | La page demande le taux. L'aide reprend L. 813-5 et demande le taux légalement applicable, sans décrire les règles de franchissement de seuil, non lues |
| V5 | Mots des verdicts | Aucun texte. L. 241-13, V et D. 241-8 : le calcul du mois est une anticipation, régularisée sur l'année | Ce seul écart avec un calcul provisoire ne suffit pas à caractériser une dette ou une créance. Mots neutres | « Aucun écart », « compatible avec une autre base mensuelle », « la paie applique plus que le recalcul », « la paie applique moins que le recalcul » |
| V6 | Apprentis | L. 241-13, II, 4° : la réduction s'applique « aux apprentis pour lesquels l'employeur n'est pas éligible à l'exonération prévue à l'article L. 6227-8-1 du code du travail ». L. 6227-8-1 (apprentissage dans le secteur public non industriel et commercial) : exonération totale des cotisations patronales hors AT-MP. BOSS § 940 : rémunération fixée sous le SMIC, « le salaire minimum est pris en compte [...] pour sa valeur entière », exemple de l'apprenti à 51 % du SMIC | Apprenti éligible : le SMIC de référence n'est pas réduit selon son pourcentage de rémunération. Les corrections habituelles de durée et de présence restent applicables | Traité. Ligne ajoutée dans « Il traite ». Employeur public exonéré : situation « exonération spécifique », hors périmètre |
| V8 | Les situations hors périmètre | Voir le tableau des phrases ci-dessous | Les exclusions de périmètre sont documentées ci-dessous. Les explications résument les règles applicables | Seize situations, phrases corrigées |
| V9 | Plafond des cotisations dues | D. 241-11, I : limité aux cotisations « dues pour l'emploi du salarié au titre des gains et rémunérations versés au cours de l'année », « dans la limite des cotisations et contributions patronales dues au titre du salarié ». II : dérogation en cas de taux d'assurance chômage minoré. BOSS § 340 | Le plafond s'apprécie sur l'année. Ce comparateur ne collecte pas les cotisations nécessaires à sa vérification et ne le calcule pas | Montants présentés « avant plafond », appréciation sur l'année dite, règle du chômage minoré rappelée |
| V10 | Mois isolé au plafond | D. 241-8 : en anticipation, SMIC et rémunération « sont pris en compte pour un mois ». L. 241-13, III : coefficient nul quand la rémunération atteint le montant. BOSS § 210 : l'éligibilité « ne peut donc en principe se faire qu'en fin d'année », et « peut également être appréciée au titre d'un mois » par comparaison des rémunérations et du seuil « rapporté[e] au nombre de mois écoulés depuis le début de l'année » | Sur un mois pris isolément, réduction nulle. L'éligibilité d'un mois peut aussi se lire sur le cumul. Le droit définitif est annuel | Réduction nulle, point à vérifier qui renvoie à la régularisation progressive et à l'année |
| V11 | Statut du résultat | BOSS § 1110 : montant « déterminé à titre provisoire sur la base des paramètres mensuels ». D. 241-9 : régularisation en fin d'année ou progressive | Le résultat est provisoire | « Simulation provisoire du mois. Elle ne valide ni le droit annuel ni la paie régularisée » |
| V12 | Absence et indemnités journalières | D. 241-7, IV, dernier alinéa : rapport entre les revenus d'activité « dus et ceux qui auraient été dus si le salarié avait été présent tout le mois, hors éléments de rémunération qui ne sont pas affectés par l'absence », l'affectation s'entendant « d'une proratisation strictement proportionnelle au temps d'absence ». BOSS § 780 : un élément versé pour une période différente de celle de la paie est toujours non affecté. BOSS § 790 : les indemnités journalières de sécurité sociale subrogées « ne sont pas prises en compte dans ce rapport », les indemnités complémentaires le sont « si elles sont financées en partie ou en totalité par l'employeur » | Confirmé | Phrase d'aide et point à vérifier inchangés |
| V13 | Arrondi du coefficient | D. 241-7, II : « arrondi à quatre décimales, au dix millième le plus proche » | Le coefficient est arrondi à quatre décimales au plus proche. Aucun cas de paie présentant une incidence du risque numérique résiduel n'a été identifié | Inchangé |
| V14 | CDD renouvelé ou transformé en CDI | L. 241-13, III : calcul « pour chaque contrat de travail ». D. 241-7, V : pour les CDD auprès d'un même employeur, coefficient « déterminé pour chaque contrat ». BOSS § 1070 et 1080 : « Si un contrat à durée déterminée (CDD) est renouvelé ou transformé en contrat à durée indéterminée (CDI), la réduction se calcule sur l'ensemble de la période couverte par lesdits contrats, dans la limite de l'année civile. » | CDD renouvelé ou transformé en CDI : un seul calcul, cumuls poursuivis dans l'année civile. Nouveau CDD distinct : calcul propre, cumuls repartis de zéro. Cette position remplace la mise hors périmètre du CDD transformé en CDI | Situation « cdd_cdi » retirée. Aide et point à vérifier réécrits |
| V7 | Exemples DFS du BOSS calculés avec un ancien Tdelta | Sans objet pour l'outil | La déduction forfaitaire spécifique reste hors périmètre | Rien |

### Phrases des situations hors périmètre et leur passage

| Situation | Phrase affichée | Passage |
|---|---|---|
| Exclusion du champ | « Employeur ou salarié susceptible d'être exclu du champ [...] : l'éligibilité se vérifie avant tout calcul. » | L. 241-13, II, 1° à 4°. BOSS § 50 à 140 |
| Contrat de mission | « la réduction se calcule par mission, et le coefficient est multiplié par 1,1 lorsque l'indemnité compensatrice de congés payés est due » | D. 241-7, V. D. 241-10, III (a = 1, b = 1,1). BOSS § 390, 1100 |
| Caisse de congés payés | « le coefficient est multiplié par 100/90 et le SMIC se calcule sans les périodes de congés payés » | D. 241-10, IV. BOSS § 420, 430 |
| Équivalence | « le SMIC est multiplié par 45/35 ou 40/35. Ce facteur est ajusté si la rémunération hors heures supplémentaires n'est pas établie sur la durée équivalente à la durée légale » | D. 241-10, II. BOSS § 990, 1000 |
| Forfait en heures | « le SMIC est corrigé du rapport entre les heures du forfait et 1 607 heures, dans la limite de ces 1 607 heures » | BOSS § 870 |
| Déduction forfaitaire spécifique | « la réduction calculée après l'abattement ne peut pas dépasser 130 % de celle calculée sans l'abattement » | Arrêté du 4 décembre 2019, art. 1er (cité par RF Paye § 5-7 et l'article du site) |
| Taux réduits | « Tdelta est réduit lorsque la somme des taux retenus dans le champ de la réduction est inférieure à Tmin + Tdelta » | D. 241-7, III, dernier alinéa. BOSS § 450 à 480 |
| PPV exonérée | « le plafond annuel des cotisations dues doit être vérifié » | L. 241-13, II (PPV dans l'assiette de la réduction). D. 241-11, I |
| Exonération spécifique | « la RGDU de droit commun ne s'applique pas telle quelle » | L. 241-13, VI. BOSS § 220, 230 |
| Mayotte | « le SMIC horaire y est différent (9,33 € au 1er janvier 2026) » | Décret n° 2025-1228, art. 1er, 2° |
| Durée collective | « le SMIC est ajusté à proportion de cette durée, rapportée à la durée légale » | BOSS § 690 |
| Hors mensualisation | « des règles propres s'appliquent » | D. 241-7, IV. BOSS § 740, 840, 850 |
| Après la rupture | « Aucune réduction n'est calculée sur une somme rattachée à une période postérieure à la rupture » | BOSS § 200 |
| Fin de contrat en juin 2026 | « par tolérance, la formule fondée sur le SMIC du 1er janvier 2026 peut ne pas être appliquée à ce salarié » | Communiqué BOSS du 05/06/2026, « A noter » |
| Changement en cours d'année | « le découpage des périodes est à vérifier » | BOSS § 230 |
| Régularisation annuelle | « ce comparateur ne la reconstitue pas » | D. 241-9, al. 1 |

### Phrases d'aide de la page et leur passage

| Phrase | Passage |
|---|---|
| « 0,10 % pour les employeurs de moins de 50 salariés, pour certains employeurs agricoles et pour les coopératives agricoles. 0,50 % pour les autres. Indiquez le taux légalement applicable à votre entreprise, et pas seulement votre effectif du moment. » | L. 813-5 CCH |
| « L'assiette des cotisations de sécurité sociale, heures supplémentaires et prime de partage de la valeur comprises. » | L. 241-13, II et III. BOSS § 170 |
| « Le nombre d'heures supplémentaires ou complémentaires rémunérées pour le mois. Ne saisissez pas leur majoration de salaire. » | L. 241-13, III. D. 241-7, IV |
| « 35 pour un temps plein. Hors heures complémentaires. » | D. 241-7, IV, al. 2 |
| « Le SMIC de référence est corrigé seulement si le forfait est inférieur à 218 jours. » | D. 241-7, IV, al. 3 |
| Absence : éléments non proratisés retirés, indemnités journalières subrogées exclues, complémentaires incluses | D. 241-7, IV. BOSS § 780, 790 |
| « Un CDD renouvelé ou transformé en CDI se calcule sur toute la période couverte, dans la limite de l'année civile » | BOSS § 1080 |
| « Un abattement forfaitaire, de 15 % au plus » | BOSS § 1120 |
| « La minoration du taux d'assurance chômage liée au bonus-malus ne modifie pas Tdelta. » | L. 241-13, I. D. 241-7, III. BOSS § 490 |
| « L'apprenti éligible : son SMIC de référence n'est pas réduit selon son pourcentage de rémunération. Les corrections habituelles de durée et de présence restent applicables. » | L. 241-13, II, 4°. BOSS § 940 |
| « la réduction est limitée aux cotisations et contributions de son champ effectivement dues sur l'année. Une règle particulière s'applique à la minoration du taux d'assurance chômage résultant du bonus-malus. » | D. 241-11, I et II. BOSS § 340 |
| « L'arrondi au centime est une convention du comparateur. Les articles D. 241-7 à D. 241-11 ne fixent pas cet arrondi du montant. L'article L. 133-10 [...] prévoit l'arrondi à l'euro des cotisations, contributions et assiettes déclarées aux organismes de sécurité sociale. » | D. 241-7 à D. 241-11. L. 133-10 |


### Contre-vérification Codex du 11/11/2026 sur les positions arrêtées

Premier passage : aucune erreur bloquante dans le calcul principal. Positions V1, V4, V7, V10, V11, V12, V14 jugées exactes sans remarque. Corrections appliquées : formulations trop larges resserrées (V2, V3, V5, V6, V8, V9, V13, équivalence, forfait en heures, taux réduits, bonus-malus, « Ce n'est pas une erreur de paie » remplacé par « Cette concordance ne suffit pas à valider la paie »). Deux limites techniques corrigées : en régularisation progressive, une base alternative n'est retenue que si elle reste stable dans l'incertitude du cumul reporté, et le résultat rappelle que seule la base du mois courant change.

Second passage Codex (relecture des corrections ci-dessus) : non réalisé. Le compte Codex a atteint sa limite d'usage le 11/11/2026 à 17 h 57 (retour annoncé le 16/11/2026). Les corrections du premier passage ont été vérifiées par les tests automatiques (141 sur 141) et par la reprise des deux exemples de Codex : cumul reporté 1 823,263327 avec paie à 538,56 € (variante instable écartée, aucune compatibilité affirmée) et décembre à 1 823,49 € (écart signalé, avec le rappel sur le cumul). Une relecture Codex de ces seules corrections reste à faire quand le compte sera rétabli.


## Contre-lecture indépendante du 11/11/2026 au soir

Verdict du relecteur : calcul juste (16 cas recalculés en fractions exactes, identiques au code), publiable après corrections. Corrections appliquées :

| Point | Correction | Source relue |
|---|---|---|
| Phrase « le comparateur affiche Hors périmètre » | « Si vous cochez l'une de ces situations [...] Il ne les détecte pas à votre place. » | Constat de fonctionnement |
| Renvoi vers la matrice et le guide | « abordent une partie de ces situations » | Constat |
| Source du plafond | « Article D. 241-7, I et IV. Le BOSS (§ 160) retient 65 629,08 € par an, sur la base mensuelle arrondie. » Le BOSS § 160 écrit « strictement inférieure à 65 629,08 euros en 2026 ». Le seuil de 5 469,10 € par mois vient du décret (3 × 12,02 × 1 820 / 12) | D. 241-7. BOSS § 160 |
| Source de Tdelta | « Article D. 241-7, III. » | D. 241-7, III |
| Arrondi du montant | « Les articles D. 241-7 à D. 241-11 ne fixent pas cet arrondi. » (la mention de L. 133-10 est retirée de la page, elle reste dans V3) | D. 241-7 à D. 241-11 |
| Absence, indemnités complémentaires | « entrent dans la rémunération due » | BOSS § 790 |
| Entrée ou sortie | « retirez aussi des deux montants les indemnités versées à l'occasion de la rupture, notamment l'indemnité compensatrice de congés payés et l'indemnité de fin de contrat » | BOSS § 720 : sont déduites « les primes forfaitaires et diverses indemnités versées à l'occasion de la rupture du contrat de travail (notamment les indemnités compensatrices de congés payés et les indemnités de fin de contrat) » |
| Sortie en cours de mois | Traitée « en régularisation progressive seulement ». En mois isolé, la case « Décembre, ou dernier mois du contrat » rend « Hors périmètre », et un point à vérifier le rappelle dès qu'une absence, entrée ou sortie est saisie | D. 241-9 |
| Mayotte | « À Mayotte, la formule, le seuil et le SMIC sont différents. » | D. 241-7-1 (coefficient multiplicateur affecté d'un facteur de convergence, formule propre, SMIC applicable à Mayotte). Décret n° 2025-1228, art. 1er, 2° |
| Taux réduits | Mention « taux AT-MP inférieur à 0,49 % » retirée (aucun passage du BOSS ne la porte). Remplacée par la règle du texte : toute situation où la somme des taux effectivement à la charge de l'employeur est inférieure à Tmin + Tdelta. Salarié expatrié ajouté. Les intermittents du spectacle ne sont pas ajoutés : le BOSS § 1170 ne traite que l'imputation de leur réduction, pas Tdelta. La liste de la case et celle du message sont identiques | D. 241-7, III, dernier alinéa. BOSS § 450 à 480 (§ 470 pour les expatriés) |
| Mois isolé positif alors que le cumul dépasse le seuil | Point à vérifier sur tout mois isolé positif : « L'éligibilité s'apprécie aussi sur le cumul des rémunérations depuis janvier [...] » | BOSS § 210 |
| Décembre ou dernier mois en mois isolé | Hors périmètre si la case est cochée. Sinon, avertissement sur tout mois isolé positif. Calculé normalement en régularisation progressive | D. 241-9 |
| Changement de durée contractuelle en cours de mois | Nouvelle situation hors périmètre (`changement_duree`) | Choix de périmètre : un seul champ de durée |

Dix-sept situations hors périmètre après cette passe (seize, plus le changement de durée).
