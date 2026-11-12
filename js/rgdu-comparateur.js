/* ============================================
   ACOMPIA — Comparateur RGDU mensuel (calcul pur)
   Réduction générale dégressive unique, périodes d'emploi 2026.
   Aucune dépendance, aucun accès au DOM, aucun envoi réseau.
   Chaque règle porte le numéro du registre
   docs/outils/comparateur-rgdu_regles.md (R01, R02...).
   Tests : tests/rgdu-comparateur.test.js
   ============================================ */
(function (racine) {
  'use strict';

  /* R01 à R07 : paramètres de l'année 2026. */
  var PARAMETRES_2026 = {
    annee: 2026,
    smicHoraire: 12.02,          /* R03 : SMIC horaire au 1er janvier 2026, retenu toute l'année */
    smicMensuel: 12.02 * 1820 / 12,              /* R04 : douzième non arrondi de 1 820 x SMIC horaire (D. 241-7, IV), soit 1 823,0333... € */
    smicMensuelExact: ['12.02', '1820', '12'],   /* la même valeur, en fraction exacte */
    dureeLegaleHebdo: 35,
    joursForfait: 218,           /* R09 */
    tmin: 0.02,                  /* R02 */
    tdelta: { fnal010: 0.3781, fnal050: 0.3821 }, /* R02 : selon le taux de FNAL applicable */
    p: 1.75,                     /* R01 */
    seuilMultiple: 3             /* R05 */
  };

  /* Bornes de saisie : au-delà, le comparateur refuse plutôt que de calculer (R17). */
  var BORNES = { remunerationMax: 1000000, heuresSupMax: 300, cumulMax: 20000000 };

  /* Autres bases mensuelles rencontrées en paie (R04). Elles servent à lire un écart, pas à le valider. */
  var BASES_ALTERNATIVES = [
    { code: '1823_03', libelle: '1 823,03 € par mois', valeur: 1823.03, exact: ['1823.03', '1', '1'] },
    { code: '151_67', libelle: '151,67 heures', valeur: 12.02 * 151.67, exact: ['12.02', '151.67', '1'] }
  ];

  /* Situations que le comparateur ne traite pas (R17). */
  var SITUATIONS_HORS_PERIMETRE = {
    non_eligible: "Employeur ou salarié susceptible d'être exclu du champ de la réduction (particulier employeur, employeur public, mandataire sans contrat de travail, stagiaire) : l'éligibilité se vérifie avant tout calcul.",
    interim: "Contrat de mission : la réduction se calcule par mission, et le coefficient est multiplié par 1,1 lorsque l'indemnité compensatrice de congés payés est due.",
    caisse_conges: "Caisse de congés payés : le coefficient est multiplié par 100/90 et le SMIC se calcule sans les périodes de congés payés.",
    equivalence: "Conducteur routier soumis au régime d'équivalence concerné : le SMIC est multiplié par 45/35 ou 40/35. Ce facteur est ajusté si la rémunération hors heures supplémentaires n'est pas établie sur la durée équivalente à la durée légale.",
    forfait_heures: "Forfait annuel en heures : le SMIC est corrigé du rapport entre les heures du forfait et 1 607 heures, dans la limite de ces 1 607 heures. Ce comparateur ne traite pas ce cas.",
    dfs: "Déduction forfaitaire spécifique : la réduction calculée après l'abattement ne peut pas dépasser 130 % de celle calculée sans l'abattement.",
    taux_reduits: "Taux de cotisations patronales inférieurs au droit commun (journaliste à la pige, VRP à cartes multiples, profession médicale à temps partiel pour plusieurs employeurs, salarié expatrié, retraite complémentaire prise en charge à moins de 60 % par l'employeur, ou toute situation où la somme des taux des cotisations et contributions effectivement à la charge de l'employeur est inférieure à Tmin + Tdelta) : la valeur Tdelta est alors réduite. Ce comparateur ne traite pas ces situations.",
    ppv_exoneree: "Prime de partage de la valeur exonérée versée dans le mois ou comprise dans les cumuls : le plafond annuel des cotisations dues doit être vérifié. Le comparateur ne le recalcule pas.",
    exoneration_specifique: "Exonération spécifique non cumulable, régime spécial ou activité mixte d'aide à domicile : la RGDU de droit commun ne s'applique pas telle quelle.",
    mayotte: "À Mayotte, la formule, le seuil et le SMIC sont différents. Le comparateur ne traite pas ce territoire.",
    duree_collective: "Durée collective inférieure à 35 heures : le SMIC est ajusté à proportion de cette durée, rapportée à la durée légale. Ce cas n'est pas codé dans le comparateur.",
    non_mensualise: "Salarié hors mensualisation, rémunéré à la tâche ou sans horaire : des règles propres s'appliquent.",
    apres_rupture: "Somme versée après la rupture du contrat : son rattachement se vérifie d'abord. Aucune réduction n'est calculée sur une somme rattachée à une période postérieure à la rupture.",
    fin_juin_2026: "Contrat terminé entre le 1er et le 30 juin 2026 : par tolérance, la formule fondée sur le SMIC du 1er janvier 2026 peut ne pas être appliquée à ce salarié.",
    changement_annee: "Changement de régime d'exonération ou de valeurs Tmin et Tdelta en cours d'année : le découpage des périodes est à vérifier.",
    changement_duree: "Changement de durée contractuelle en cours de mois : le comparateur ne retient qu'une durée par mois. Ce cas n'est pas traité.",
    regularisation_annuelle: "Décembre ou dernier mois du contrat : la paie de ce mois porte la régularisation de l'année ou du contrat. Un calcul sur ce seul mois ne s'y compare pas. Comparez en régularisation progressive, avec les cumuls."
  };

  /* Arrondi au plus proche, la demie s'éloignant de zéro, comme ARRONDI d'un tableur.
     La conversion à quinze chiffres significatifs réduit les effets du flottant.
     Elle peut déplacer une valeur située très près d'une limite d'arrondi. */
  function arrondir(valeur, decimales) {
    var f = Math.pow(10, decimales);
    var corrige = Number((valeur * f).toPrecision(15));
    var r = Math.round(Math.abs(corrige)) / f;
    return corrige < 0 ? -r : r;
  }

  function estNombre(x) {
    return typeof x === 'number' && isFinite(x);
  }
  /* Une valeur est « fournie » dès qu'elle n'est ni absente ni vide, même si elle est illisible. */
  function fourni(x) {
    return x !== undefined && x !== null && x !== '';
  }

  /* Lit un nombre saisi à la française : « 1 823,03 », « 1823.03 », « 2 035,71 € ».
     Refuse tout le reste : pourcentage, texte, séparateurs mal placés, saut de ligne. */
  function lireNombre(texte) {
    if (typeof texte === 'number') return isFinite(texte) ? texte : NaN;
    if (texte === null || texte === undefined) return NaN;
    var s = String(texte);
    if (/[\r\n\t]/.test(s)) return NaN;
    s = s.replace(/^[   ]+|[   ]+$/g, '').replace(/[   ]*€$/, '');
    var m = /^(-?)(\d{1,3}(?:[   ]\d{3})+|\d+)(?:[.,](\d+))?$/.exec(s);
    if (!m) return NaN;
    return parseFloat(m[1] + m[2].replace(/[   ]/g, '') + (m[3] ? '.' + m[3] : ''));
  }

  /* ---------- Arithmétique exacte (fractions d'entiers longs) ----------
     Le test d'éligibilité (R05) et l'arrondi des montants (R15) se font sans binaire :
     3 x 673,12 vaut 2019,3600000000001 en flottant, et une marge forfaitaire
     refuserait à tort une rémunération réellement sous le plafond. */
  var EXACT = typeof BigInt === 'function';
  function grand(x) { return BigInt(x); }
  /* Nombre saisi (décimal) vers fraction exacte, d'après son écriture décimale la plus courte. */
  function zeros(k) { return new Array(k + 1).join('0'); }
  function frac(x) {
    var s = typeof x === 'string' ? x : String(x);
    var neg = s.charAt(0) === '-';
    if (neg) s = s.slice(1);
    var exposant = 0;
    var e = s.search(/e/i);
    if (e >= 0) { exposant = parseInt(s.slice(e + 1), 10); s = s.slice(0, e); }   /* 1e-7, 1e+21 : développés exactement */
    var parts = s.split('.');
    var dec = parts[1] || '';
    var chiffres = parts[0] + dec;
    var decimales = dec.length - exposant;
    if (decimales < 0) { chiffres += zeros(-decimales); decimales = 0; }
    var n = grand(chiffres);
    return { n: neg ? -n : n, d: grand('1' + zeros(decimales)) };
  }
  function fmul(a, b) { return { n: a.n * b.n, d: a.d * b.d }; }
  function fdiv(a, b) { return { n: a.n * b.d, d: a.d * b.n }; }
  function fadd(a, b) { return { n: a.n * b.d + b.n * a.d, d: a.d * b.d }; }
  /* a < b, pour des dénominateurs positifs. */
  function finf(a, b) { return a.n * b.d < b.n * a.d; }
  function fnombre(a) {
    var e15 = grand('1000000000000000');
    return Number((a.n * e15) / a.d) / 1e15;
  }
  /* Arrondi exact d'une fraction positive ou nulle, à « decimales » chiffres, demie vers le haut. */
  function farrondir(a, decimales) {
    var f = grand('1' + new Array(decimales + 1).join('0'));
    var deux = grand(2);
    var q = (deux * a.n * f + a.d) / (deux * a.d);
    return Number(q) / Number(f);
  }
  /* Montant = rémunération x coefficient (quatre décimales), arrondi au centime sans binaire.
     « remuFraction » porte la rémunération exacte quand elle est un cumul. */
  function montantExact(remuneration, coef, remuFraction) {
    if (!EXACT) return arrondir(remuneration * coef, 2);
    return farrondir(fmul(remuFraction || frac(remuneration), { n: grand(Math.round(coef * 10000)), d: grand(10000) }), 2);
  }
  /* SMIC de référence du mois en fraction exacte. Renvoie null si l'exact est indisponible. */
  function smicExact(e, p) {
    if (!EXACT) return null;
    var base;
    if (e.baseExacte) base = fdiv(fmul(frac(e.baseExacte[0]), frac(e.baseExacte[1])), frac(e.baseExacte[2]));
    else if (estNombre(e.baseMensuelle)) base = frac(e.baseMensuelle);
    else if (p.smicMensuelExact) base = fdiv(fmul(frac(p.smicMensuelExact[0]), frac(p.smicMensuelExact[1])), frac(p.smicMensuelExact[2]));
    else base = frac(p.smicMensuel);
    var heuresHebdo = estNombre(e.heuresHebdo) ? e.heuresHebdo : p.dureeLegaleHebdo;
    var s = base;
    if (heuresHebdo < p.dureeLegaleHebdo) s = fdiv(fmul(s, frac(heuresHebdo)), frac(p.dureeLegaleHebdo));
    if (estNombre(e.forfaitJours) && e.forfaitJours > 0 && e.forfaitJours < p.joursForfait) s = fdiv(fmul(s, frac(e.forfaitJours)), frac(p.joursForfait));
    if (e.rapportExact) s = fdiv(fmul(s, frac(e.rapportExact[0])), frac(e.rapportExact[1]));
    else if (estNombre(e.rapportAbsence)) s = fmul(s, frac(e.rapportAbsence));
    if (estNombre(e.facteurA)) s = fmul(s, frac(e.facteurA));
    if (estNombre(e.heuresSup) && e.heuresSup > 0) s = fadd(s, fmul(frac(e.heuresSup), frac(p.smicHoraire)));
    return s;
  }
  /* R05 : strictement inférieur à 3 SMIC de référence. Exact si possible. */
  function sousLePlafond(remuneration, smicReference, smicFraction, p, remuFraction) {
    if (EXACT) {
      var s = smicFraction || frac(smicReference);
      return finf(remuFraction || frac(remuneration), fmul(s, frac(p.seuilMultiple)));
    }
    return remuneration < p.seuilMultiple * smicReference;
  }
  /* Sans arithmétique exacte, une rémunération collée au plafond n'est pas tranchée. */
  function voisinageNonTranche(remuneration, smicReference, p) {
    return !EXACT && Math.abs(p.seuilMultiple * smicReference - remuneration) < 1e-6;
  }

  /* R01, R06, R07 : coefficient à partir de la rémunération et du SMIC de référence. */
  function coefficient(remuneration, smicReference, tdelta, facteurB, params, smicFraction, remuFraction) {
    var p = params || PARAMETRES_2026;
    var b = estNombre(facteurB) ? facteurB : 1;
    var plafond = p.seuilMultiple * smicReference;
    var eligible = sousLePlafond(remuneration, smicReference, smicFraction, p, remuFraction);
    var terme = Math.max(0, 0.5 * (plafond / remuneration - 1));
    var brut = arrondir(p.tmin + tdelta * Math.pow(terme, p.p), 4); /* R06 : quatre décimales */
    var plafonne = Math.min(brut, arrondir(p.tmin + tdelta, 4));    /* R07 : maximum Tmin + Tdelta */
    var final = arrondir(plafonne * b, 4);
    return {
      eligible: eligible,
      nonTranche: voisinageNonTranche(remuneration, smicReference, p),
      plafondIndividuel: arrondir(plafond, 2),
      coefficientAvantPlafond: brut,
      coefficient: eligible ? final : 0
    };
  }

  /* R08 à R11 : SMIC de référence du mois. Reprend pas à pas le classeur. */
  function smicReferenceMois(e, params) {
    var p = params || PARAMETRES_2026;
    var base = estNombre(e.baseMensuelle) ? e.baseMensuelle : p.smicMensuel;
    var heuresHebdo = estNombre(e.heuresHebdo) ? e.heuresHebdo : p.dureeLegaleHebdo;
    var prorata = Math.min(1, heuresHebdo / p.dureeLegaleHebdo);    /* R08 */
    var s = base * prorata;
    if (estNombre(e.forfaitJours) && e.forfaitJours > 0 && e.forfaitJours < p.joursForfait) {
      s = s * e.forfaitJours / p.joursForfait;                      /* R09 */
    }
    var rapport = estNombre(e.rapportAbsence) ? e.rapportAbsence : 1;
    s = s * rapport;                                                /* R10 */
    s = s * (estNombre(e.facteurA) ? e.facteurA : 1);               /* non accessible depuis la page */
    var heures = (estNombre(e.heuresSup) ? e.heuresSup : 0);
    var majoration = heures * p.smicHoraire;                        /* R11 : sans majoration, après corrections */
    return { prorata: prorata, rapportAbsence: rapport, majorationHeures: majoration, valeur: s + majoration };
  }

  /* Calcul sans contrôle de périmètre. Sert au calcul public et aux tests de parité avec le classeur. */
  function calculBrut(e, params) {
    var p = params || PARAMETRES_2026;
    var tdelta = estNombre(e.tdelta) ? e.tdelta : p.tdelta[e.fnal === 'fnal050' ? 'fnal050' : 'fnal010'];
    var smic = smicReferenceMois(e, p);
    var exact = smicExact(e, p);
    var c = coefficient(e.remuneration, smic.valeur, tdelta, e.facteurB, p, exact);
    var reduction = c.eligible ? montantExact(e.remuneration, c.coefficient) : 0;   /* R15 */
    return {
      smicReference: exact ? fnombre(exact) : smic.valeur,
      smicFraction: exact,
      nonTranche: c.nonTranche,
      prorata: smic.prorata,
      rapportAbsence: smic.rapportAbsence,
      majorationHeures: smic.majorationHeures,
      tdelta: tdelta,
      eligible: c.eligible,
      plafondIndividuel: c.plafondIndividuel,
      coefficientAvantPlafond: c.coefficientAvantPlafond,
      coefficient: c.coefficient,
      reduction: reduction
    };
  }

  function incomplet(manques) {
    return { etat: 'incomplet', manques: manques };
  }
  function horsPerimetre(raisons) {
    return { etat: 'hors_perimetre', raisons: raisons };
  }

  /* Point d'entrée public : un salarié, un mois.
     entree = {
       fnal: 'fnal010' | 'fnal050',
       heuresHebdo, forfaitJours, heuresSup, remuneration,
       remuDue, remuTheorique,            (absence, entrée ou sortie en cours de mois)
       situations: [codes hors périmètre],
       methode: 'mois' | 'progressive',
       cumulRemuAnterieur, cumulSmicAnterieur, cumulReductionAnterieure,
       cumulSmicDecimales                 (facultatif : décimales saisies pour le SMIC cumulé)
     }
     Une valeur absente (undefined, null, '') vaut « non saisie ».
     Une valeur présente mais illisible (NaN) rend le calcul incomplet : elle n'est jamais remplacée. */
  function calculerMois(entree, params) {
    var p = params || PARAMETRES_2026;
    var e = entree || {};
    var raisons = [];
    var manques = [];
    var i;

    /* R17 : situations particulières déclarées. */
    var situations = e.situations || [];
    for (i = 0; i < situations.length; i++) {
      /* D. 241-9 : en régularisation progressive, le dernier mois se calcule comme les autres, sur les cumuls. */
      if (situations[i] === 'regularisation_annuelle' && e.methode === 'progressive') continue;
      raisons.push(SITUATIONS_HORS_PERIMETRE[situations[i]] || 'Situation particulière non reconnue par le comparateur.');
    }
    if (fourni(e.annee) && e.annee !== p.annee) {
      raisons.push("Période d'emploi hors 2026 : les paramètres de ce comparateur ne valent que pour 2026.");
    }
    if (raisons.length) return horsPerimetre(raisons);

    var methode = fourni(e.methode) ? e.methode : 'mois';
    if (methode !== 'mois' && methode !== 'progressive') manques.push('La méthode de calcul : mois isolé ou régularisation progressive.');
    if (e.fnal !== 'fnal010' && e.fnal !== 'fnal050') manques.push("Le taux de FNAL de l'employeur : 0,10 % ou 0,50 %.");
    if (!estNombre(e.remuneration)) manques.push('La rémunération brute du mois.');
    if (fourni(e.heuresHebdo) && !estNombre(e.heuresHebdo)) manques.push('La durée contractuelle hebdomadaire.');
    if (fourni(e.heuresSup) && !estNombre(e.heuresSup)) manques.push("Le nombre d'heures supplémentaires ou complémentaires.");
    if (fourni(e.forfaitJours) && !estNombre(e.forfaitJours)) manques.push('Le nombre de jours du forfait annuel.');
    var aDue = fourni(e.remuDue), aTheo = fourni(e.remuTheorique);
    if (aDue !== aTheo) {
      manques.push("Les deux montants de l'absence : la rémunération due et celle qui aurait été due sans l'absence.");
    } else if (aDue && (!estNombre(e.remuDue) || !estNombre(e.remuTheorique))) {
      manques.push("Les deux montants de l'absence, en chiffres.");
    }
    var progressive = methode === 'progressive';
    if (progressive) {
      if (!estNombre(e.cumulRemuAnterieur)) manques.push('Le cumul des rémunérations des mois précédents.');
      if (!estNombre(e.cumulSmicAnterieur)) manques.push('Le cumul des SMIC de référence des mois précédents.');
      if (!estNombre(e.cumulReductionAnterieure)) manques.push('Le cumul des réductions déjà appliquées.');
    }
    if (manques.length) return incomplet(manques);

    /* Valeurs que le comparateur refuse de traiter plutôt que de deviner. */
    var heuresHebdo = fourni(e.heuresHebdo) ? e.heuresHebdo : p.dureeLegaleHebdo;
    var heuresSup = fourni(e.heuresSup) ? e.heuresSup : 0;
    var forfait = fourni(e.forfaitJours) ? e.forfaitJours : 0;
    if (e.remuneration <= 0) raisons.push('Mois sans rémunération, ou rémunération négative : ce mois se traite dans la régularisation.');
    if (e.remuneration > BORNES.remunerationMax) raisons.push('Rémunération hors de la plage acceptée par le comparateur.');
    if (heuresHebdo <= 0) raisons.push('Durée contractuelle nulle ou négative.');
    if (heuresHebdo > p.dureeLegaleHebdo) raisons.push('Durée contractuelle supérieure à 35 heures : saisissez 35 heures et portez le surplus mensuel en heures supplémentaires.');
    if (heuresSup < 0 || heuresSup > BORNES.heuresSupMax) raisons.push("Nombre d'heures supplémentaires hors de la plage 0 à 300.");
    if (forfait !== 0) {
      if (forfait < 1 || forfait > p.joursForfait) raisons.push('Forfait annuel en jours hors de la plage 1 à 218.');
      if (heuresHebdo !== p.dureeLegaleHebdo) raisons.push('Forfait en jours et durée hebdomadaire réduite saisis ensemble : situation à traiter à la main.');
      if (heuresSup > 0) raisons.push("Forfait en jours et heures supplémentaires saisis ensemble : un forfait en jours ne majore pas le SMIC de référence.");
    }
    var rapport = 1;
    if (aDue && aTheo) {
      if (e.remuTheorique < 0.01 || e.remuDue < 0 || e.remuTheorique > BORNES.remunerationMax || e.remuDue > BORNES.remunerationMax) raisons.push("Montants de l'absence incohérents ou hors de la plage acceptée par le comparateur.");
      else {
        rapport = e.remuDue / e.remuTheorique;                       /* R10 */
        if (rapport > 1 + 1e-12) raisons.push("Rapport d'absence supérieur à 1, non pris en charge : vérifiez les éléments retenus dans les deux montants.");
        if (heuresSup > 0) raisons.push("Absence et heures supplémentaires dans le même mois : les heures structurelles se corrigent de l'absence, pas les heures ponctuelles. Ce partage se fait à la main.");
      }
    }
    if (progressive) {
      if (e.cumulRemuAnterieur < 0 || e.cumulSmicAnterieur < 0 || e.cumulReductionAnterieure < 0) raisons.push('Cumul antérieur négatif : situation à traiter à la main.');
      if (e.cumulRemuAnterieur > BORNES.cumulMax || e.cumulSmicAnterieur > BORNES.cumulMax || e.cumulReductionAnterieure > BORNES.cumulMax) raisons.push('Cumul hors de la plage acceptée par le comparateur.');
    }
    if (raisons.length) return horsPerimetre(raisons);

    var donnees = {
      fnal: e.fnal,
      heuresHebdo: heuresHebdo,
      forfaitJours: forfait,
      heuresSup: heuresSup,
      rapportAbsence: rapport,
      rapportExact: (aDue && aTheo) ? [e.remuDue, e.remuTheorique] : null,
      remuneration: e.remuneration
    };
    var mois = calculBrut(donnees, p);
    var sortie = {
      etat: 'calcule',
      methode: methode,
      fnal: e.fnal,
      remuneration: e.remuneration,
      smicReference: arrondir(mois.smicReference, 2),
      smicReferenceExact: mois.smicReference,
      prorata: mois.prorata,
      rapportAbsence: rapport,
      majorationHeures: arrondir(mois.majorationHeures, 2),
      tdelta: mois.tdelta,
      coefficientMaximal: arrondir(p.tmin + mois.tdelta, 4),
      plafondIndividuel: mois.plafondIndividuel,
      eligible: mois.eligible,
      nonTranche: mois.nonTranche,
      coefficient: mois.coefficient,
      reduction: mois.reduction,
      variantes: []
    };

    if (progressive) {
      /* R14 : régularisation progressive, sur les cumuls depuis le début de l'année ou du contrat. */
      var cumulRemu = e.cumulRemuAnterieur + e.remuneration;
      var cumulSmic = e.cumulSmicAnterieur + mois.smicReference;
      var cumulSmicFraction = mois.smicFraction ? fadd(frac(e.cumulSmicAnterieur), mois.smicFraction) : null;
      var cumulRemuFraction = EXACT ? fadd(frac(e.cumulRemuAnterieur), frac(e.remuneration)) : null;
      if (cumulSmicFraction) { cumulSmic = fnombre(cumulSmicFraction); cumulRemu = fnombre(cumulRemuFraction); }
      /* R14 bis : le SMIC cumulé saisi a pu être arrondi lors de son report. Son incertitude vaut
         une demi-unité de sa dernière décimale saisie : 0,50 € sans décimale, 0,005 € au centime.
         Si l'éligibilité ou le coefficient changent dans cet intervalle, aucun montant n'est rendu.
         Un cumul nul (premier mois) est exact. */
      var decimalesReport = (String(e.cumulSmicAnterieur).split('.')[1] || '').length;
      if (/e/i.test(String(e.cumulSmicAnterieur))) decimalesReport = 0;
      /* La page transmet le nombre de décimales réellement saisies (les zéros finaux comptent). */
      if (estNombre(e.cumulSmicDecimales)) decimalesReport = Math.min(12, Math.max(0, Math.floor(e.cumulSmicDecimales)));
      var demi = 0.5 * Math.pow(10, -decimalesReport);
      var bornes = e.cumulSmicAnterieur === 0 ? [] : [-1, 1];
      for (i = 0; i < bornes.length; i++) {
        var smicBorne = cumulSmic + bornes[i] * demi;
        var fracBorne = cumulSmicFraction ? fadd(cumulSmicFraction, { n: grand(bornes[i]), d: grand('2' + zeros(decimalesReport)) }) : null;
        var cb = coefficient(cumulRemu, smicBorne, mois.tdelta, 1, p, fracBorne, cumulRemuFraction);
        var cc = coefficient(cumulRemu, cumulSmic, mois.tdelta, 1, p, cumulSmicFraction, cumulRemuFraction);
        if (cb.eligible !== cc.eligible || cb.coefficient !== cc.coefficient) {
          return horsPerimetre(["Le résultat dépend des dernières décimales du SMIC de référence cumulé. Saisissez ce cumul avec plus de décimales, ou vérifiez ce mois à la main."]);
        }
      }
      var c = coefficient(cumulRemu, cumulSmic, mois.tdelta, 1, p, cumulSmicFraction, cumulRemuFraction);
      var reductionCumulee = c.eligible ? montantExact(cumulRemu, c.coefficient, cumulRemuFraction) : 0;
      sortie.nonTranche = c.nonTranche;
      sortie.cumulRemuneration = arrondir(cumulRemu, 2);
      sortie.cumulSmicReference = arrondir(cumulSmic, 2);
      sortie.cumulSmicReferenceExact = cumulSmic;
      sortie.eligible = c.eligible;
      sortie.plafondIndividuel = c.plafondIndividuel;
      sortie.coefficient = c.coefficient;
      sortie.reductionCumulee = reductionCumulee;
      sortie.reductionMoisIsole = mois.reduction;
      sortie.reduction = arrondir(reductionCumulee - e.cumulReductionAnterieure, 2);
      /* R04 : mêmes cumuls antérieurs, SMIC du mois sur une autre base. Sert à lire un écart, sans le valider. */
      for (i = 0; i < BASES_ALTERNATIVES.length; i++) {
        var altMois = calculBrut({
          fnal: donnees.fnal, heuresHebdo: donnees.heuresHebdo, forfaitJours: donnees.forfaitJours,
          heuresSup: donnees.heuresSup, rapportAbsence: donnees.rapportAbsence, rapportExact: donnees.rapportExact,
          remuneration: donnees.remuneration,
          baseMensuelle: BASES_ALTERNATIVES[i].valeur, baseExacte: BASES_ALTERNATIVES[i].exact
        }, p);
        var altFraction = altMois.smicFraction ? fadd(frac(e.cumulSmicAnterieur), altMois.smicFraction) : null;
        var altCumul = altFraction ? fnombre(altFraction) : e.cumulSmicAnterieur + altMois.smicReference;
        var ca = coefficient(cumulRemu, altCumul, mois.tdelta, 1, p, altFraction, cumulRemuFraction);
        var altCumulee = ca.eligible ? montantExact(cumulRemu, ca.coefficient, cumulRemuFraction) : 0;
        /* Une variante n'est retenue que si elle reste stable dans l'incertitude du cumul reporté. */
        var altStable = true;
        for (var j = 0; j < bornes.length; j++) {
          var altFracBorne = altFraction ? fadd(altFraction, { n: grand(bornes[j]), d: grand('2' + zeros(decimalesReport)) }) : null;
          var cab = coefficient(cumulRemu, altCumul + bornes[j] * demi, mois.tdelta, 1, p, altFracBorne, cumulRemuFraction);
          if (cab.eligible !== ca.eligible || cab.coefficient !== ca.coefficient) altStable = false;
        }
        if (!altStable) { sortie.variantesInstables = true; continue; }
        sortie.variantes.push({ code: BASES_ALTERNATIVES[i].code, libelle: BASES_ALTERNATIVES[i].libelle, reduction: arrondir(altCumulee - e.cumulReductionAnterieure, 2) });
      }
    } else {
      /* R04 : mêmes données, autres bases mensuelles. Sert à lire un écart, sans le valider. */
      for (i = 0; i < BASES_ALTERNATIVES.length; i++) {
        var alt = calculBrut({
          fnal: donnees.fnal, heuresHebdo: donnees.heuresHebdo, forfaitJours: donnees.forfaitJours,
          heuresSup: donnees.heuresSup, rapportAbsence: donnees.rapportAbsence, rapportExact: donnees.rapportExact,
          remuneration: donnees.remuneration,
          baseMensuelle: BASES_ALTERNATIVES[i].valeur, baseExacte: BASES_ALTERNATIVES[i].exact
        }, p);
        sortie.variantes.push({ code: BASES_ALTERNATIVES[i].code, libelle: BASES_ALTERNATIVES[i].libelle, reduction: alt.reduction });
      }
    }
    if (!estNombre(sortie.reduction) || !estNombre(sortie.smicReferenceExact)) {
      return horsPerimetre(['Valeurs hors de la plage acceptée par le comparateur.']);
    }
    if (sortie.nonTranche) {
      return horsPerimetre(["Rémunération au voisinage immédiat du plafond de trois SMIC : ce navigateur ne permet pas de trancher l'éligibilité au centime. Vérifiez à la main."]);
    }
    return sortie;
  }

  /* Compare le recalcul au montant porté en paie.
     Convention de signe : positif pour une réduction, négatif pour une reprise. */
  function comparer(resultat, montantPaie) {
    if (!resultat || resultat.etat !== 'calcule') return { etat: 'sans_objet' };
    if (!estNombre(montantPaie) || Math.abs(montantPaie) > BORNES.cumulMax) return { etat: 'incomplet', manques: ['La réduction portée en paie pour ce mois, en chiffres.'] };
    var ecart = arrondir(montantPaie - resultat.reduction, 2);
    var sortie = { etat: 'compare', montantPaie: arrondir(montantPaie, 2), ecart: ecart, concordeAvec: null };
    /* Montant arrondi au centime par convention (D. 241-7 à D. 241-11 ne fixent pas cet arrondi) : un centime d'écart n'est pas compté. */
    if (Math.abs(ecart) <= 0.01) {
      sortie.sens = 'aucun';
    } else {
      var v = resultat.variantes || [];
      for (var i = 0; i < v.length; i++) {
        if (Math.abs(arrondir(montantPaie - v[i].reduction, 2)) <= 0.01) { sortie.concordeAvec = v[i]; break; }
      }
      sortie.sens = sortie.concordeAvec ? 'base' : (ecart > 0 ? 'paie_superieure' : 'paie_inferieure');
    }
    return sortie;
  }

  /* Points à vérifier, selon le sens de l'écart et les données saisies (R16, R18, R19). */
  function pointsAVerifier(resultat, comparaison, entree) {
    var pts = [];
    var e = entree || {};
    if (!resultat || resultat.etat !== 'calcule') return pts;
    var comp = comparaison && comparaison.etat === 'compare' ? comparaison : null;
    if (comp && comp.sens === 'base') {
      pts.push(comp.concordeAvec.code === '151_67'
        ? 'Le montant en paie est compatible avec une base de 151,67 heures. Cette base est une tolérance réservée aux employeurs qui rémunèrent leurs salariés sur 151,67 heures. Vérifiez la base réellement utilisée.'
        : "Le montant en paie est compatible avec la base mensuelle arrondie de 1 823,03 € que présente le BOSS. Le comparateur utilise le douzième non arrondi de 1 820 fois le SMIC horaire, comme l'article D. 241-7. Vérifiez la base utilisée et les autres paramètres. Cette concordance ne suffit pas à valider la paie.");
    }
    if (comp && comp.sens === 'base' && resultat.methode === 'progressive') {
      pts.push("En régularisation progressive, cette comparaison change seulement la base du mois courant. Elle conserve le SMIC cumulé antérieur saisi. Une autre base appliquée aux mois précédents demande de vérifier aussi ce cumul.");
    }
    if (comp && (comp.sens === 'paie_superieure' || comp.sens === 'paie_inferieure') && resultat.variantesInstables) {
      pts.push("La compatibilité avec une autre base mensuelle dépend des dernières décimales du SMIC cumulé. Saisissez davantage de décimales ou vérifiez le calcul à la main.");
    }
    if (comp && comp.sens === 'paie_inferieure' && resultat.methode === 'mois' && resultat.reduction > 0 && comp.montantPaie >= arrondir(resultat.reduction * 0.85, 2)) {
      pts.push("Un abattement forfaitaire, de 15 % au plus, peut avoir été appliqué pour anticiper des éléments de rémunération non mensuels.");
    }
    if (comp && (comp.sens === 'paie_superieure' || comp.sens === 'paie_inferieure')) {
      pts.push(resultat.methode === 'progressive'
        ? "Vérifiez les trois cumuls saisis et leur découpage : même contrat, depuis janvier ou depuis l'embauche (un CDD renouvelé ou transformé en CDI poursuit ses cumuls dans la limite de l'année civile, un nouveau CDD distinct repart de zéro), sans changement de régime d'exonération ni de valeurs Tmin et Tdelta. L'arrondi du SMIC de référence cumulé peut modifier le coefficient, l'éligibilité et le montant de la réduction. Reportez-le avec ses décimales."
        : 'Votre logiciel régularise peut-être chaque mois sur les cumuls depuis janvier. Refaites alors la comparaison en régularisation progressive.');
      pts.push("La valeur Tdelta retenue suppose des taux de cotisations patronales de droit commun et le taux de FNAL indiqué. La minoration du taux d'assurance chômage liée au bonus-malus ne modifie pas Tdelta.");
    }
    if (resultat.methode === 'mois' && resultat.eligible && resultat.reduction > 0) {
      pts.push("L'éligibilité s'apprécie aussi sur le cumul des rémunérations depuis janvier. Des rémunérations élevées les mois précédents peuvent annuler la réduction de ce mois : comparez alors en régularisation progressive.");
      pts.push("Si ce mois est décembre ou le dernier mois du contrat, la paie porte la régularisation de l'année ou du contrat. L'écart affiché ne vaut pas pour ce mois : cochez cette situation, ou comparez en régularisation progressive.");
    }
    if (resultat.methode === 'mois' && !resultat.eligible) {
      pts.push("La rémunération du mois atteint trois fois le SMIC de référence du salarié, plafond proratisé comme le SMIC : calculée sur ce seul mois, la réduction est nulle. L'éligibilité d'un mois peut aussi s'apprécier sur le cumul des rémunérations depuis janvier : comparez alors en régularisation progressive. Le droit définitif se juge sur l'année.");
    }
    if (resultat.methode === 'progressive' && !resultat.eligible) {
      pts.push('La rémunération cumulée atteint trois fois le SMIC de référence cumulé. Le droit cumulé est nul et les réductions déjà appliquées sont reprises.');
    }
    if (estNombre(e.heuresSup) && e.heuresSup > 0) {
      pts.push('Les heures supplémentaires et complémentaires se comptent en nombre, pour le mois, sans leur majoration.');
      if (resultat.prorata < 1) pts.push('La durée contractuelle se saisit hors heures complémentaires. Les compter deux fois gonfle le SMIC de référence.');
    }
    if (resultat.rapportAbsence < 1) {
      pts.push("Dans les deux montants de l'absence, retirez les éléments qui ne sont pas réduits en stricte proportion de l'absence. Les primes annuelles ou trimestrielles en sont toujours retirées.");
      pts.push("Les indemnités journalières de sécurité sociale versées par subrogation n'entrent pas dans ces montants. Les indemnités complémentaires financées en partie ou en totalité par l'employeur entrent dans la rémunération due.");
      pts.push("En cas d'entrée ou de sortie, retirez aussi des deux montants les indemnités versées à l'occasion de la rupture, notamment l'indemnité compensatrice de congés payés et l'indemnité de fin de contrat. Un mois de sortie se compare en régularisation progressive.");
    }
    if (resultat.reduction > 0) {
      pts.push("Ce montant est calculé avant plafonnement. En règle générale, la réduction est limitée aux cotisations et contributions de son champ effectivement dues sur l'année. Une règle particulière s'applique à la minoration du taux d'assurance chômage résultant du bonus-malus. Le comparateur ne recalcule pas ce plafond.");
    }
    return pts;
  }

  var EN_TETE = /^(identifiant|id|matricule|salari[ée]|nom)$/i;
  var EN_TETE_COLONNE = /heure|r[ée]mun|r[ée]duc|brut|paie|\bhs\b/i;

  /* Lot : une ligne par salarié présent tout le mois, sans forfait ni situation particulière.
     Colonnes : identifiant ; heures hebdo ; heures sup. ou compl. ; rémunération brute ; réduction en paie
     Séparateur : point-virgule ou tabulation. Une ligne d'en-tête est reconnue à son premier libellé. */
  /* Un en-tête a cinq colonnes, aucun chiffre, et ses quatre libellés de données sont reconnus.
     Toute autre ligne est gardée comme une ligne de salarié, avec son diagnostic. */
  function estEnTete(c) {
    if (c.length !== 5) return false;
    for (var k = 1; k < c.length; k++) {
      if (/\d/.test(c[k]) || !EN_TETE_COLONNE.test(c[k])) return false;
    }
    return true;
  }

  function analyserLot(texte, options) {
    var o = options || {};
    var lignes = String(texte || '').split(/\r\n|\n|\r/);
    var sortie = [];
    var enTeteVu = false;
    for (var i = 0; i < lignes.length; i++) {
      var brute = lignes[i];
      if (!brute.trim()) continue;
      var c = brute.split(brute.indexOf('\t') >= 0 ? '\t' : ';');
      for (var k = 0; k < c.length; k++) c[k] = c[k].replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
      /* En-tête : premier libellé reconnu ET aucune colonne chiffrée. « ID;35;0;2200;538,56 » reste un salarié. */
      if (!enTeteVu && sortie.length === 0 && EN_TETE.test(c[0]) && estEnTete(c)) { enTeteVu = true; continue; }
      var ligne = { numero: sortie.length + 1, ligneSource: i + 1, identifiant: c[0] || ('Ligne ' + (i + 1)) };
      if (o.confirmeOrdinaire !== true) {
        ligne.resultat = incomplet(['La confirmation que les salariés du lot étaient présents tout le mois, sans forfait ni situation particulière.']);
        ligne.comparaison = { etat: 'sans_objet' };
        sortie.push(ligne);
        continue;
      }
      if (c.length !== 5) {
        ligne.resultat = incomplet(['Cinq colonnes attendues : identifiant, heures hebdomadaires, heures supplémentaires, rémunération, réduction en paie.']);
        ligne.comparaison = { etat: 'sans_objet' };
        sortie.push(ligne);
        continue;
      }
      var entree = {
        fnal: o.fnal,
        heuresHebdo: c[1] === '' ? NaN : lireNombre(c[1]),
        heuresSup: c[2] === '' ? 0 : lireNombre(c[2]),
        remuneration: lireNombre(c[3]),
        methode: 'mois'
      };
      ligne.entree = entree;
      ligne.resultat = calculerMois(entree, o.params);
      ligne.comparaison = comparer(ligne.resultat, lireNombre(c[4]));
      sortie.push(ligne);
    }
    return sortie;
  }

  function champCsv(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    s = s.replace(/[\u0000-\u001f\u007f]/g, ' ');     /* aucun caractère de contrôle dans une cellule */
    if (/^\s*[=+\-@]/.test(s)) s = "'" + s;           /* neutralise les formules à l'ouverture dans un tableur */
    return /[";]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function nombreCsv(x, d) {
    return estNombre(x) ? x.toFixed(d).replace('.', ',') : '';
  }
  var LIBELLES_ETAT = { calcule: 'Calculé', incomplet: 'Calcul incomplet', hors_perimetre: 'Hors périmètre' };
  var LIBELLES_SENS = { aucun: 'Aucun écart', base: 'Compatible avec une autre base mensuelle', paie_superieure: 'Paie supérieure au recalcul', paie_inferieure: 'Paie inférieure au recalcul' };

  function versCsv(lignes) {
    var out = ['Identifiant;État;Rémunération brute;SMIC de référence;Coefficient;Réduction recalculée avant plafond des cotisations dues;Réduction en paie;Écart;Lecture;Détail'];
    for (var i = 0; i < lignes.length; i++) {
      var l = lignes[i], r = l.resultat || {}, c = l.comparaison || {};
      var detail = r.etat === 'incomplet' ? (r.manques || []).join(' ') : r.etat === 'hors_perimetre' ? (r.raisons || []).join(' ') : '';
      var lecture = LIBELLES_SENS[c.sens] || '';
      if (r.etat === 'calcule' && c.etat === 'incomplet') lecture = 'Réduction en paie illisible';
      out.push([
        champCsv(l.identifiant),
        LIBELLES_ETAT[r.etat] || '',
        nombreCsv(r.remuneration, 2),
        nombreCsv(r.smicReferenceExact, 6),
        nombreCsv(r.coefficient, 4),
        nombreCsv(r.reduction, 2),
        nombreCsv(c.montantPaie, 2),
        nombreCsv(c.ecart, 2),
        champCsv(lecture),
        champCsv(detail)
      ].join(';'));
    }
    return '﻿' + out.join('\r\n') + '\r\n';
  }

  racine.RGDU = {
    PARAMETRES_2026: PARAMETRES_2026,
    SITUATIONS_HORS_PERIMETRE: SITUATIONS_HORS_PERIMETRE,
    LIBELLES_ETAT: LIBELLES_ETAT,
    LIBELLES_SENS: LIBELLES_SENS,
    arrondir: arrondir,
    lireNombre: lireNombre,
    coefficient: coefficient,
    smicReferenceMois: smicReferenceMois,
    calculBrut: calculBrut,
    exact: EXACT,
    calculerMois: calculerMois,
    comparer: comparer,
    pointsAVerifier: pointsAVerifier,
    analyserLot: analyserLot,
    versCsv: versCsv
  };
})(typeof window !== 'undefined' ? window : globalThis);
