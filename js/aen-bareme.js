/* ============================================
   ACOMPIA — Barème de l'avantage en nature véhicule
   Extrait de la page simulateur pour être testable isolément
   (voir tests/aen-bareme.test.js). Logique inchangée.
   ============================================ */
/* ============================================================
   Moteur de calcul (maquette) · barème validé de l'article
   VERROUILLÉ ET CONFORME AU POC — NE PAS MODIFIER.
   Montants en CENTIMES entiers. Taux en entiers (÷100).
   ============================================================ */
const BAREME = {
  annee: 2026,
  constantes: {
    2020: { plafondElecAncien: 180000 },
    2021: { plafondElecAncien: 180000 },
    2022: { plafondElecAncien: 180000 },
    2023: { plafondElecAncien: 180000 },
    2024: { plafondElecAncien: 196490 },
    2025: { plafondElecNouveau: 458200, plafondElecAncien: 200030, plafondElecReelNouveau: 200030 },
    2026: { plafondElecNouveau: 464160, plafondElecAncien: 202630, plafondElecReelNouveau: 202630 }
  },
  taux: {
    post: { achat: { non: { jeune: 15, ancien: 10 }, oui: { jeune: 20, ancien: 15 } },
            location: { non: 50, oui: 67 } },
    pre:  { achat: { non: { jeune: 9,  ancien: 6  }, oui: { jeune: 12, ancien: 9  } },
            location: { non: 30, oui: 40 } }
  }
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurC = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
function fmt(cents) {
  return (cents % 100 === 0 ? eur : eurC).format(cents / 100);
}
function fmtMois(centsAnnuels, mois = 12) {
  return eur.format(Math.round(centsAnnuels / mois / 100));
}

function parseMontant(txt) {
  if (txt == null) return null;
  let s = String(txt).replace(/[\s  €]/g, '');
  if (s === '') return null;
  s = s.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}

function moisEntames(debut, fin) {
  if (!debut || !fin) return 12;
  const d = new Date(debut), f = new Date(fin);
  if (isNaN(d) || isNaN(f) || f < d) return null;
  let mois = (f.getFullYear() - d.getFullYear()) * 12 + (f.getMonth() - d.getMonth()) + 1;
  return Math.max(1, Math.min(12, mois));
}

function calculer(etat) {
  const alertes = [];

  /* ===== Qualification ===== */
  if (!etat.typevhc) return { incomplet: true, etape: 'qualification' };
  if (etat.typevhc === 'vu') {
    return { analyse: true, genre: 'aucun',
      motif: "Un véhicule utilitaire n'est pas considéré comme un avantage en nature lorsque l'employeur indique par écrit (règlement intérieur, note de service, contrat) qu'il est utilisé à des fins uniquement professionnelles (tolérance BOSS, rubrique Avantages en nature). Si un usage privé est possible ou si aucun écrit n'existe, le cas relève d'une analyse individuelle." };
  }
  if (etat.typevhc === 'deuxroues') {
    return { analyse: true, genre: 'specifique',
      motif: "Les deux-roues motorisés et les vélos de fonction obéissent à des règles propres, distinctes du forfait automobile. Ce cas est hors périmètre du simulateur." };
  }
  if (etat.typevhc === 'salarie') {
    return { analyse: true, genre: 'aucun',
      motif: "Un véhicule appartenant au salarié ne crée pas d'avantage en nature : les trajets professionnels relèvent du régime des frais professionnels et du barème kilométrique, un sujet distinct de ce simulateur." };
  }
  if (!etat.attribution) return { incomplet: true, etape: 'qualification' };
  if (etat.attribution === 'non') {
    return { analyse: true, genre: 'aucun',
      motif: "Sans attribution permanente à un salarié identifié (véhicule partagé, pool, véhicule restitué chaque soir), il n'y a pas d'avantage en nature forfaitaire, à condition de pouvoir le prouver. Attention : l'attribution de fait, un véhicule conservé le soir et le week-end sans écrit, est le premier chef de redressement de la matière. La charge de la preuve pèse sur l'employeur." };
  }
  if (!etat.beneficiaire) return { incomplet: true, etape: 'qualification' };
  if (etat.beneficiaire === 'tns') {
    return { analyse: true, genre: 'specifique',
      motif: "Le forfait de l'arrêté est réservé aux salariés et aux dirigeants assimilés salariés. Pour un gérant majoritaire ou un autre travailleur non salarié, l'avantage relève d'une logique propre, avec des enjeux sociaux et fiscaux différents. Ce cas est hors périmètre du simulateur." };
  }
  if (etat.beneficiaire === 'assimile') {
    alertes.push("Pour un dirigeant assimilé salarié (président de SAS, gérant minoritaire ou égalitaire), l'évaluation forfaitaire est admise dans les mêmes conditions que pour un salarié.");
  }

  /* ===== Cas hors périmètre du calcul ===== */
  if (etat.energie === 'electrique' && etat.periode === 'pre') {
    return { analyse: true, genre: 'specifique',
      motif: "Un véhicule 100 % électrique mis à disposition entre le 1er janvier 2020 et le 31 janvier 2025 bénéficie d'un abattement de 50 % plafonné (2 000,30 € en 2025, 2 026,30 € en 2026), sans condition d'éco-score, avec exclusion des frais d'électricité payés par l'employeur (arrêté du 25 février 2025, art. 3, III, C). Ce cas est hors périmètre du simulateur." };
  }
  if (etat.age === 'bascule') {
    return { analyse: true, genre: 'complexe',
      motif: "Le véhicule franchit le cap des 5 ans en cours d'année : la date de bascule entre les deux taux n'est pas fixée par les textes. Ce cas mérite une analyse individuelle." };
  }
  if (etat.energie !== 'electrique' && etat.carburant === 'partiel') {
    return { analyse: true, genre: 'complexe',
      motif: "Une prise en charge partielle du carburant (carte plafonnée, prise en charge limitée) ne correspond ni au taux de base ni au forfait global : l'avantage se calcule au taux de base majoré du carburant privé réellement pris en charge. Ce cas mérite une analyse individuelle." };
  }

  const grille = BAREME.taux[etat.periode];
  const carb = (etat.energie === 'electrique') ? 'non' : etat.carburant;
  let taux, base, libBase;

  if (etat.mode === 'achat') {
    taux = grille.achat[carb][etat.age];
    base = etat.prixAchat;
    libBase = "Prix d'achat TTC";
  } else {
    taux = grille.location[carb];
    base = etat.coutLocation;
    libBase = 'Coût annuel de la location TTC';
  }
  if (base == null || isNaN(base) || base <= 0) return { incomplet: true };

  const lignes = [];
  let montant = Math.round(base * taux / 100);
  lignes.push({ lib: 'Évaluation forfaitaire', formule: fmt(base) + ' × ' + taux + ' %', mnt: montant });

  if (etat.mode === 'location' && (etat.prixLoueur || etat.prixCatalogue)) {
    let ref = etat.prixLoueur || etat.prixCatalogue;
    if (etat.prixLoueur && etat.prixCatalogue) {
      const rabais = etat.prixCatalogue - etat.prixLoueur;
      const rabaisMax = Math.round(etat.prixCatalogue * 30 / 100);
      if (rabais > rabaisMax) {
        ref = etat.prixCatalogue - rabaisMax;
        alertes.push('Rabais loueur supérieur à 30 % du prix catalogue : le prix de référence est ramené à 70 % du prix catalogue.');
      }
    } else if (!etat.prixLoueur) {
      alertes.push('Prix d\'achat du loueur non renseigné : le plafonnement est estimé à partir du prix catalogue. Le loueur peut communiquer le prix qu\'il a réellement payé pour un plafond exact.');
    }
    const tauxAchat = grille.achat[carb][etat.age];
    const plafond = Math.round(ref * tauxAchat / 100);
    if (plafond < montant) {
      montant = plafond;
      lignes.push({ lib: 'Plafonnement (règle achat)', formule: fmt(ref) + ' × ' + tauxAchat + ' %', mnt: plafond });
    }
  }

  if (etat.prorata === null) return { erreur: 'La date de fin doit être postérieure à la date de début.' };
  const prorata = etat.prorata ?? 12;

  function appliquerAbattement(m) {
    const brut = Math.round(m * 70 / 100);
    const plafond = Math.round(BAREME.constantes[BAREME.annee].plafondElecNouveau * prorata / 12);
    const abatt = Math.min(brut, plafond);
    return { abatt, plafonne: brut > plafond, plafond };
  }

  if (prorata < 12) {
    const proratise = Math.round(montant * prorata / 12);
    lignes.push({ lib: 'Prorata : ' + prorata + ' mois de mise à disposition', formule: fmt(montant) + ' × ' + prorata + '/12', mnt: proratise });
    montant = proratise;
  }

  function resultatFinal(m, avecAbatt) {
    const ls = lignes.slice();
    let mF = m;
    if (avecAbatt) {
      const { abatt, plafonne, plafond } = appliquerAbattement(m);
      ls.push({ lib: 'Abattement véhicule électrique (70 %' + (plafonne ? ', plafonné' : '') + ')',
        formule: 'min(70 % × ' + fmt(m) + ' ; ' + fmt(plafond) + ')', mnt: -abatt, negatif: true });
      mF = m - abatt;
    }
    if (etat.participation > 0) {
      const deduit = Math.min(etat.participation, mF);
      ls.push({ lib: 'Participation du salarié', formule: 'max(0 ; ' + fmt(mF) + ' − ' + fmt(etat.participation) + ')', mnt: -deduit, negatif: true });
      mF = Math.max(0, mF - deduit);
      if (mF === 0) alertes.push("La participation du salarié couvre l'évaluation : l'avantage en nature est nul.");
    }
    return { montant: mF, lignes: ls };
  }

  const estElecEligible = etat.energie === 'electrique' && etat.periode === 'post';
  let sortie;
  if (estElecEligible && etat.ecoscore === 'oui') {
    sortie = { simple: resultatFinal(montant, true) };
    alertes.push("Régime de faveur électrique applicable jusqu'au 31 décembre 2027. Pour un contrat courant au-delà, sans prolongation du dispositif, l'avantage remontera fortement en 2028 : anticipez.");
  } else if (estElecEligible && etat.ecoscore === 'nsp') {
    sortie = { double: { avec: resultatFinal(montant, true), sans: resultatFinal(montant, false) } };
  } else if (estElecEligible && etat.ecoscore === 'non') {
    sortie = { simple: resultatFinal(montant, false) };
    alertes.push("Sans éco-score, l'abattement de 70 % ne s'applique pas.");
  } else if (estElecEligible && !etat.ecoscore) {
    return { incomplet: true };
  } else {
    sortie = { simple: resultatFinal(montant, false) };
  }

  if (etat.energie === 'hybride' && carb === 'oui') {
    alertes.push("Hybride rechargeable : si l'employeur prend en charge l'électricité, le traitement de cette prise en charge relève d'une analyse individuelle.");
  }
  if (etat.energie === 'electrique' && etat.borne === 'oui') {
    alertes.push("La borne de recharge financée au domicile du salarié constitue un avantage distinct, avec ses propres règles et plafonds (arrêté du 25 février 2025, art. 4) : analyse individuelle recommandée.");
  }
  if (etat.restitution) {
    alertes.push("Trajets domicile-travail seuls ou restitution pendant les congés et week-ends : une déduction, voire une absence d'avantage, est possible sous conditions de preuve. Le montant affiché ne tient pas compte de cette déduction : analyse individuelle recommandée.");
  }

  const regimeTxt = (etat.mode === 'achat' ? 'Forfait achat' : 'Forfait location') +
    (carb === 'oui' ? ', carburant pris en charge' : '') +
    ' · barème applicable aux mises à disposition ' +
    (etat.periode === 'post' ? 'à compter du 1er février 2025' : "antérieures au 1er février 2025");

  const artRef = 'arrêté du 25 février 2025, ' +
    (etat.periode === 'post' ? 'art. 3, III, B' : 'art. 3, III, A') +
    (estElecEligible && etat.ecoscore !== 'non' ? ' et art. 3, III, D' : '');

  return { ...sortie, alertes, regime: regimeTxt, artRef, prorataMois: prorata,
    baseLib: libBase, base, taux };
}
