// Formulaire 1329-DEF — Calcul de la CVAE (Cotisation sur la Valeur Ajoutée des Entreprises)
// ------------------------------------------------------------------------------------------------
// Références légales :
//   - Loi de finances 2025 (loi n° 2025-127 du 14/02/2025)
//   - Art. 1586 nonies du CGI : formule de la valeur ajoutée
//   - Art. 1586 octies du CGI : barème et taux de la CVAE
//   - Art. 1586 decies du CGI : taxe additionnelle (frais CCI)
//   - Formulaire 1329-DEF applicable au 01/01/2025
//   - Notice officielle 1329-DEF (impots.gouv.fr)
//
// IMPORTANT : La CVAE n'est PAS supprimée. Suppression reportée à 2030.
//
// BARÈME 2025 (taux effectif selon CA HT) — 4 tranches :
//   - CA ≤ 500 000 €              : 0 %
//   - 500 000 € < CA ≤ 3 M€       : 0,063 % × (CA − 500 000) / 2 500 000
//   - 3 M€ < CA ≤ 10 M€           : [0,113 % × (CA − 3 M) / 7 M] + 0,063 %
//   - 10 M€ < CA ≤ 50 M€          : [0,013 % × (CA − 10 M) / 40 M] + 0,175 %
//   - CA > 50 M€                  : 0,19 % (taux maximal)
//
// DÉGRÈVEMENT 2025 : 125 € si CA < 2 M€ (ligne 10, auto-calculé)
// FRANCHISE : CVAE non due si ≤ 63 € (ligne 11 → 0)
// PLAFOND VA : 80 % du CA si CA ≤ 7,6 M€ ; 85 % si CA > 7,6 M€ (ligne 06)
// TAXE ADDITIONNELLE : 13,84 % de la ligne 11 (9,23 % si cessation 2026)
// CONTRIBUTION COMPLÉMENTAIRE : 47,4 % de la ligne 11 (2025 uniquement, sauf cessation)

/** Arrondi à l'entier le plus proche (les montants CVAE sont en euros entiers) */
export function roundEuro(value: number): number {
  return Math.round(value)
}

/** Arrondi à 2 décimales (pour les pourcentages) */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// ============================================================================
// CONSTANTES 2025
// ============================================================================

export const CVAE_CONSTANTS_2025 = {
  annee: 2025,
  taux_cvae_max: 0.0019, // 0,19 % (taux maximal pour CA > 50 M€)
  franchise_cvae_euros: 63, // CVAE non due si ≤ 63 €
  degrevement_euros: 125, // Dégrèvement si CA < 2 M€ (2025)
  seuil_degrevement_ca_ht: 2000000, // 2 M€
  seuil_obligation_declarative_ca_ht: 152500,
  seuil_imposition_effective_ca_ht: 500000,
  // Barème par tranches
  tranches_bareme: [
    { plafondCA: 500000, tauxBase: 0, tauxPente: 0, seuilBas: 0, largeurTranche: 0 },
    { plafondCA: 3000000, tauxBase: 0, tauxPente: 0.00063, seuilBas: 500000, largeurTranche: 2500000 },
    { plafondCA: 10000000, tauxBase: 0.00063, tauxPente: 0.00113, seuilBas: 3000000, largeurTranche: 7000000 },
    { plafondCA: 50000000, tauxBase: 0.00175, tauxPente: 0.00013, seuilBas: 10000000, largeurTranche: 40000000 },
    { plafondCA: Infinity, tauxBase: 0.0019, tauxPente: 0, seuilBas: 50000000, largeurTranche: 0 },
  ],
  taxe_additionnelle_taux: 0.1384, // 13,84 % (frais CCI)
  taxe_additionnelle_taux_cessation_2026: 0.0923, // 9,23 % si cessation
  contribution_complementaire_taux: 0.474, // 47,4 % (2025 uniquement)
  contribution_complementaire_active: true,
  // Plafond VA basé sur le CA (PAS sur le type d'activité)
  plafond_va_ca_bas: 0.80, // 80 % si CA ≤ 7,6 M€
  plafond_va_ca_haut: 0.85, // 85 % si CA > 7,6 M€
  seuil_plafond_va_ca: 7600000, // 7,6 M€
  suppression_cvae_prevue: 2030,
} as const

// ============================================================================
// BARÈME PROGRESSIF DE LA CVAE (4 tranches + palier)
// ============================================================================

/**
 * Calcule le taux effectif de CVAE en fonction du chiffre d'affaires HT.
 * Barème 2025 (loi de finances 2025) :
 *   - CA ≤ 500 000 €              : 0 %
 *   - 500 000 € < CA ≤ 3 M€       : 0,063 % × (CA − 500 000) / 2 500 000
 *   - 3 M€ < CA ≤ 10 M€           : [0,113 % × (CA − 3 M) / 7 M] + 0,063 %
 *   - 10 M€ < CA ≤ 50 M€          : [0,013 % × (CA − 10 M) / 40 M] + 0,175 %
 *   - CA > 50 M€                  : 0,19 %
 *
 * @param caHT Chiffre d'affaires HT
 * @returns Taux effectif (ex: 0.0001512 pour 0,01512 %)
 */
export function calculerTauxEffectifCVAE(caHT: number): number {
  const tranches = CVAE_CONSTANTS_2025.tranches_bareme

  for (const t of tranches) {
    if (caHT <= t.plafondCA) {
      if (t.tauxPente === 0) {
        return t.tauxBase // Tranche à 0 % ou palier final à 0,19 %
      }
      // Tranche progressive : tauxBase + tauxPente × (CA − seuilBas) / largeurTranche
      return t.tauxBase + (t.tauxPente * (caHT - t.seuilBas)) / t.largeurTranche
    }
  }
  // Ne devrait jamais être atteint (dernière tranche = Infinity)
  return CVAE_CONSTANTS_2025.taux_cvae_max
}

// ============================================================================
// CALCUL DE LA VALEUR AJOUTÉE PLAFONNÉE
// ============================================================================

/**
 * Applique le plafonnement de la VA.
 * La VA ne peut pas dépasser 80 % du CA (si CA ≤ 7,6 M€) ou 85 % (si CA > 7,6 M€).
 * Certaines entreprises (caractère financier) sont dispensées — case L06.
 *
 * @param va Valeur ajoutée produite
 * @param caHT Chiffre d'affaires HT
 * @param limitationNonApplicable true si la case L06 est cochée (plafonnement non applicable)
 */
export function plafonnerVA(
  va: number,
  caHT: number,
  limitationNonApplicable: boolean = false
): number {
  if (limitationNonApplicable) return va
  const plafond =
    caHT <= CVAE_CONSTANTS_2025.seuil_plafond_va_ca
      ? CVAE_CONSTANTS_2025.plafond_va_ca_bas * caHT
      : CVAE_CONSTANTS_2025.plafond_va_ca_haut * caHT
  return Math.min(va, plafond)
}

// ============================================================================
// CALCUL DU DÉGRÈVEMENT (ligne 10)
// ============================================================================

/**
 * Calcule le dégrèvement de 125 € applicable si CA < 2 M€ (année 2025).
 * Ce dégrèvement est positionné sur la ligne 10 (réduction supplémentaire).
 */
export function calculerDegrevement(caHT: number): number {
  return caHT < CVAE_CONSTANTS_2025.seuil_degrevement_ca_ht
    ? CVAE_CONSTANTS_2025.degrevement_euros
    : 0
}

// ============================================================================
// CALCUL COMPLET DU FORMULAIRE 1329-DEF
// ============================================================================

export interface CVAEInput {
  /** Chiffre d'affaires HT de la période de référence (ligne 01) — À SAISIR */
  caHT: number
  /** Valeur ajoutée produite (ligne 05) — À SAISIR (reprendre 2059-E ligne SA ou 2033-E ligne 117) */
  valeurAjoutee: number
  /** Effectifs salariés (déclarés simultanément) */
  effectifsSalaries: number
  /** Année d'imposition (défaut: 2025) */
  annee?: number
  /** Cessation d'activité en 2026 (modifie les taux) */
  cessation2026?: boolean
  /** Case L06 : limitation VA non applicable (entreprises financières) */
  limitationVANonApplicable?: boolean
  /** Exonération de la taxe additionnelle (artisans non CCI, coopératives, etc.) */
  exonereTaxeAdditionnelle?: boolean
  /** Exonérations de plein droit (ligne 09) — seulement si concerné */
  exonerations?: number
  /** Acomptes CVAE versés (ligne 12) — À SAISIR (relevés 1329-AC juin + septembre) */
  acomptesCVAE?: number
  /** Acomptes taxe additionnelle versés (ligne 16) — À SAISIR */
  acomptesTaxeAdd?: number
  /** Acompte contribution complémentaire versé (ligne 21) — À SAISIR (100 % en sept 2025) */
  acompteContribCompl?: number
}

export interface CVAEResult {
  // Section I : CA
  ligne01_CA: number
  ligne04_pourcentage_VA: number
  // Section II : VA
  ligne05_VA_produite: number
  ligne05b_VA_plafonnee: number
  ligne06_limitation_non_applicable: boolean
  ligne07_CVAE_brute: number
  // Section III : Cotisation
  ligne08_cotisation_avant_reduction: number
  ligne09_exonerations: number
  ligne10_reduction_supplementaire: number // Dégrèvement 125 € (auto)
  ligne11_CVAE_due: number
  ligne12_acomptes_CVAE: number
  ligne13_solde_CVAE_payer: number
  ligne14_excedent_CVAE: number
  // Taxe additionnelle
  ligne15_taxe_add_due: number
  ligne16_acomptes_taxe_add: number
  ligne17_solde_taxe_add_payer: number
  ligne18_excedent_taxe_add: number
  // Contribution complémentaire
  ligne20_contrib_compl_due: number
  ligne21_acompte_contrib_compl: number
  ligne22_solde_contrib_payer: number
  ligne23_excedent_contrib: number
  // Section IV : Totaux
  ligne24_total_acomptes: number
  ligne25_total_payer: number
  ligne26_total_excedents: number
  ligne27_CVAE_DUE_paiement: number
  ligne28_excedent_versement: number
  // Méta
  taux_effectif: number
  franchise_appliquee: boolean
  degrevement_applique: boolean
  cessation_2026: boolean
  exonere_taxe_additionnelle: boolean
}

/**
 * Calcule l'intégralité du formulaire 1329-DEF.
 *
 * CHAMPS À SAISIR par l'utilisateur (tout le reste est auto-calculé) :
 *   - Ligne 01 : CA HT
 *   - Ligne 05 : Valeur ajoutée produite
 *   - Ligne 12 : Acomptes CVAE versés
 *   - Ligne 16 : Acomptes taxe additionnelle versés
 *   - Ligne 21 : Acompte contribution complémentaire versé
 *
 * CALCUL AUTO :
 *   - Ligne 04 : % VA = VA / CA (+1/4 si cessation)
 *   - Ligne 06 : Plafond VA (80% si CA ≤ 7,6M€, 85% sinon)
 *   - Ligne 07 : CVAE brute = VA plafonnée × taux effectif
 *   - Ligne 08 : Cotisation avant réduction = L07
 *   - Ligne 10 : Dégrèvement 125 € si CA < 2 M€ (2025)
 *   - Ligne 11 : CVAE due = L08 - L09 - L10 ; 0 si ≤ 63 € (franchise)
 *   - Ligne 15 : Taxe add = L11 × 13,84 % (ou 9,23 % si cessation)
 *   - Ligne 20 : Contribution compl = L11 × 47,4 % (2025 uniquement, sauf cessation)
 *   - Lignes 13/14, 17/18, 22/23 : Soldes / excédents
 *   - Lignes 24-28 : Totaux
 */
export function calculerCVAE(input: CVAEInput): CVAEResult {
  const {
    caHT,
    valeurAjoutee,
    cessation2026 = false,
    limitationVANonApplicable = false,
    exonereTaxeAdditionnelle = false,
    exonerations = 0,
    acomptesCVAE = 0,
    acomptesTaxeAdd = 0,
    acompteContribCompl = 0,
  } = input

  // --- Section I : CA ---
  const ligne01_CA = caHT
  // Ligne 04 : % VA = VA / CA (avec majoration +1/4 si cessation)
  const pourcentageVABrut = caHT > 0 ? valeurAjoutee / caHT : 0
  const ligne04_pourcentage_VA = cessation2026 ? pourcentageVABrut * 1.25 : pourcentageVABrut

  // --- Section II : VA ---
  const ligne05_VA_produite = valeurAjoutee
  const ligne05b_VA_plafonnee = plafonnerVA(valeurAjoutee, caHT, limitationVANonApplicable)
  const ligne06_limitation_non_applicable = limitationVANonApplicable

  // Taux effectif selon le barème 2025
  const taux_effectif = calculerTauxEffectifCVAE(caHT)

  // Ligne 07 : CVAE brute = VA plafonnée × taux effectif
  const ligne07_CVAE_brute = roundEuro(ligne05b_VA_plafonnee * taux_effectif)

  // --- Section III : Cotisation ---
  const ligne08_cotisation_avant_reduction = ligne07_CVAE_brute
  const ligne09_exonerations = exonerations

  // Ligne 10 : Dégrèvement de 125 € si CA < 2 M€ (2025) — auto-calculé
  const degrevement = calculerDegrevement(caHT)
  const ligne10_reduction_supplementaire = degrevement

  // Ligne 11 : CVAE due = L08 - L09 - L10 ; franchise 63 €
  const cvaeDueCalculee = ligne08_cotisation_avant_reduction - ligne09_exonerations - ligne10_reduction_supplementaire
  const franchise_appliquee = cvaeDueCalculee <= CVAE_CONSTANTS_2025.franchise_cvae_euros
  const ligne11_CVAE_due = franchise_appliquee ? 0 : cvaeDueCalculee

  // Acomptes et soldes CVAE
  const ligne12_acomptes_CVAE = acomptesCVAE
  const ligne13_solde_CVAE_payer = Math.max(0, ligne11_CVAE_due - ligne12_acomptes_CVAE)
  const ligne14_excedent_CVAE = Math.max(0, ligne12_acomptes_CVAE - ligne11_CVAE_due)

  // Taxe additionnelle (frais CCI)
  const tauxTaxeAdd = cessation2026
    ? CVAE_CONSTANTS_2025.taxe_additionnelle_taux_cessation_2026
    : CVAE_CONSTANTS_2025.taxe_additionnelle_taux
  // Si exonéré de taxe additionnelle → 0
  const ligne15_taxe_add_due = exonereTaxeAdditionnelle ? 0 : roundEuro(ligne11_CVAE_due * tauxTaxeAdd)
  const ligne16_acomptes_taxe_add = acomptesTaxeAdd
  const ligne17_solde_taxe_add_payer = Math.max(0, ligne15_taxe_add_due - ligne16_acomptes_taxe_add)
  const ligne18_excedent_taxe_add = Math.max(0, ligne16_acomptes_taxe_add - ligne15_taxe_add_due)

  // Contribution complémentaire (47,4 % — 2025 uniquement, sauf cessation)
  const contribComplActive = CVAE_CONSTANTS_2025.contribution_complementaire_active && !cessation2026
  const ligne20_contrib_compl_due = contribComplActive
    ? roundEuro(ligne11_CVAE_due * CVAE_CONSTANTS_2025.contribution_complementaire_taux)
    : 0
  const ligne21_acompte_contrib_compl = acompteContribCompl
  const ligne22_solde_contrib_payer = Math.max(0, ligne20_contrib_compl_due - ligne21_acompte_contrib_compl)
  const ligne23_excedent_contrib = Math.max(0, ligne21_acompte_contrib_compl - ligne20_contrib_compl_due)

  // --- Section IV : Totaux ---
  const ligne24_total_acomptes = ligne12_acomptes_CVAE + ligne16_acomptes_taxe_add + ligne21_acompte_contrib_compl
  const ligne25_total_payer = ligne13_solde_CVAE_payer + ligne17_solde_taxe_add_payer + ligne22_solde_contrib_payer
  const ligne26_total_excedents = ligne14_excedent_CVAE + ligne18_excedent_taxe_add + ligne23_excedent_contrib

  // Ligne 27 ou 28 (une seule est renseignée)
  const ligne27_CVAE_DUE_paiement = Math.max(0, ligne25_total_payer - ligne26_total_excedents)
  const ligne28_excedent_versement = Math.max(0, ligne26_total_excedents - ligne25_total_payer)

  return {
    ligne01_CA,
    ligne04_pourcentage_VA: round2(ligne04_pourcentage_VA * 100), // en %
    ligne05_VA_produite,
    ligne05b_VA_plafonnee,
    ligne06_limitation_non_applicable,
    ligne07_CVAE_brute,
    ligne08_cotisation_avant_reduction,
    ligne09_exonerations,
    ligne10_reduction_supplementaire,
    ligne11_CVAE_due,
    ligne12_acomptes_CVAE,
    ligne13_solde_CVAE_payer,
    ligne14_excedent_CVAE,
    ligne15_taxe_add_due,
    ligne16_acomptes_taxe_add,
    ligne17_solde_taxe_add_payer,
    ligne18_excedent_taxe_add,
    ligne20_contrib_compl_due,
    ligne21_acompte_contrib_compl,
    ligne22_solde_contrib_payer,
    ligne23_excedent_contrib,
    ligne24_total_acomptes,
    ligne25_total_payer,
    ligne26_total_excedents,
    ligne27_CVAE_DUE_paiement,
    ligne28_excedent_versement,
    taux_effectif: round2(taux_effectif * 100), // en %
    franchise_appliquee,
    degrevement_applique: degrevement > 0,
    cessation_2026: cessation2026,
    exonere_taxe_additionnelle: exonereTaxeAdditionnelle,
  }
}

/** Formate un montant en euros entiers */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}
