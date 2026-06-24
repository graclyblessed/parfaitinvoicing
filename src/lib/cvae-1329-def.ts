// Formulaire 1329-DEF — Calcul de la CVAE (Cotisation sur la Valeur Ajoutée des Entreprises)
// ------------------------------------------------------------------------------------------------
// Références légales :
//   - Loi de finances 2025 (loi n° 2025-127 du 14/02/2025)
//   - Art. 1586 nonies du CGI : formule de la valeur ajoutée
//   - Art. 1586 octies du CGI : barème et taux de la CVAE
//   - Art. 1586 decies du CGI : taxe additionnelle (frais CCI)
//   - Formulaire 1329-DEF applicable au 01/01/2025
//
// IMPORTANT : La CVAE n'est PAS supprimée. Suppression reportée à 2030.
//   - 2025 : taux maximal 0,19 %
//   - 2026-2027 : taux maximal 0,28 %
//   - 2028 : taux maximal 0,19 %
//   - 2029 : taux maximal 0,09 %
//   - 2030 : suppression
//
// Contribution complémentaire de 47,4 % : dispositif EXCEPTIONNEL 2025 uniquement.

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
  taux_cvae_max: 0.0019, // 0,19 % (taux maximal 2025)
  franchise_cvae_euros: 63, // CVAE non due si ≤ 63 €
  seuil_obligation_declarative_ca_ht: 152500,
  seuil_imposition_effective_ca_ht: 500000,
  taxe_additionnelle_taux: 0.1384, // 13,84 % (frais CCI)
  taxe_additionnelle_taux_cessation_2026: 0.0923, // 9,23 % si cessation
  contribution_complementaire_taux: 0.474, // 47,4 % (2025 uniquement)
  contribution_complementaire_active: true,
  plafond_va_services: 0.80, // VA plafonnée à 80 % du CA (services)
  plafond_va_autres: 0.85, // VA plafonnée à 85 % du CA (autres)
  suppression_cvae_prevue: 2030,
  trajectoire_taux_max: {
    2025: 0.0019,
    2026: 0.0028,
    2027: 0.0028,
    2028: 0.0019,
    2029: 0.0009,
  },
} as const

// ============================================================================
// BARÈME PROGRESSIF DE LA CVAE
// ============================================================================
// Le taux effectif de CVAE dépend du chiffre d'affaires HT :
//   - CA ≤ 500 000 € : 0 % (pas d'imposition effective)
//   - 500 000 € < CA < 7 600 000 € : taux progressif de 0 % à taux_max
//   - CA ≥ 7 600 000 € : taux_max (plat)
//
// Formule du taux effectif (pour 500k < CA < 7.6M) :
//   taux = taux_max × (CA - 500 000) / (7 600 000 - 500 000)
//        = taux_max × (CA - 500 000) / 7 100 000

/**
 * Calcule le taux effectif de CVAE en fonction du chiffre d'affaires HT.
 * @param caHT Chiffre d'affaires HT
 * @param annee Année d'imposition (pour sélectionner le taux max)
 * @returns Taux effectif (ex: 0.00016 pour 0,016 %)
 */
export function calculerTauxEffectifCVAE(caHT: number, annee: number = 2025): number {
  const tauxMax =
    CVAE_CONSTANTS_2025.trajectoire_taux_max[annee as keyof typeof CVAE_CONSTANTS_2025.trajectoire_taux_max] ??
    CVAE_CONSTANTS_2025.taux_cvae_max

  const seuilBas = CVAE_CONSTANTS_2025.seuil_imposition_effective_ca_ht // 500 000
  const seuilHaut = 7600000 // 7,6 M€

  if (caHT <= seuilBas) {
    return 0 // Pas d'imposition effective
  }
  if (caHT >= seuilHaut) {
    return tauxMax // Taux maximal plat
  }
  // Barème progressif
  return tauxMax * ((caHT - seuilBas) / (seuilHaut - seuilBas))
}

// ============================================================================
// CALCUL DE LA VALEUR AJOUTÉE PLAFONNÉE
// ============================================================================

/**
 * Applique le plafonnement de la VA.
 * La VA ne peut pas dépasser 80 % du CA (entreprises de services) ou 85 % (autres).
 * @param va Valeur ajoutée produite
 * @param caHT Chiffre d'affaires HT
 * @param isServices true si entreprise de services (plafond 80%), false sinon (85%)
 * @param limitationNonApplicable true si la case L06 est cochée (plafonnement non applicable)
 */
export function plafonnerVA(
  va: number,
  caHT: number,
  isServices: boolean = true,
  limitationNonApplicable: boolean = false
): number {
  if (limitationNonApplicable) return va
  const plafond = isServices
    ? CVAE_CONSTANTS_2025.plafond_va_services * caHT
    : CVAE_CONSTANTS_2025.plafond_va_autres * caHT
  return Math.min(va, plafond)
}

// ============================================================================
// CALCUL COMPLET DU FORMULAIRE 1329-DEF
// ============================================================================

export interface CVAEInput {
  /** Chiffre d'affaires HT de la période de référence (ligne 01) */
  caHT: number
  /** Valeur ajoutée produite (ligne 05) */
  valeurAjoutee: number
  /** Effectifs salariés (déclarés simultanément) */
  effectifsSalaries: number
  /** Année d'imposition (défaut: 2025) */
  annee?: number
  /** Cessation d'activité en 2026 (modifie les taux) */
  cessation2026?: boolean
  /** Case L06 : limitation VA non applicable */
  limitationVANonApplicable?: boolean
  /** Entreprise de services (plafond VA 80%) ou autre (85%) */
  isServices?: boolean
  /** Exonérations (ligne 09) — saisie manuelle */
  exonerations?: number
  /** Réduction supplémentaire (ligne 10) — saisie manuelle */
  reductionSupplementaire?: number
  /** Acomptes CVAE versés (ligne 12) — juin + septembre */
  acomptesCVAE?: number
  /** Acomptes taxe additionnelle versés (ligne 16) */
  acomptesTaxeAdd?: number
  /** Acompte contribution complémentaire versé (ligne 21) — 100 % en sept 2025 */
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
  ligne10_reduction_supplementaire: number
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
  cessation_2026: boolean
}

/**
 * Calcule l'intégralité du formulaire 1329-DEF.
 *
 * Logique :
 * 1. VA produite (L05) → plafonnée à 80%/85% du CA (sauf case L06)
 * 2. Taux effectif selon CA (barème progressif)
 * 3. CVAE brute (L07) = VA plafonnée × taux effectif
 * 4. CVAE due (L11) = L08 - L09 - L10 ; si ≤ 63 € → 0 (franchise)
 * 5. Taxe additionnelle (L15) = L11 × 13,84 % (ou 9,23 % si cessation)
 * 6. Contribution complémentaire (L20) = L11 × 47,4 % (2025 uniquement, sauf cessation)
 * 7. Soldes / excédents par section
 * 8. Total à payer (L27) ou excédent (L28)
 */
export function calculerCVAE(input: CVAEInput): CVAEResult {
  const {
    caHT,
    valeurAjoutee,
    annee = 2025,
    cessation2026 = false,
    limitationVANonApplicable = false,
    isServices = true,
    exonerations = 0,
    reductionSupplementaire = 0,
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
  const ligne05b_VA_plafonnee = plafonnerVA(
    valeurAjoutee,
    caHT,
    isServices,
    limitationVANonApplicable
  )
  const ligne06_limitation_non_applicable = limitationVANonApplicable

  // Taux effectif
  const taux_effectif = calculerTauxEffectifCVAE(caHT, annee)

  // Ligne 07 : CVAE brute = VA plafonnée × taux effectif
  const ligne07_CVAE_brute = roundEuro(ligne05b_VA_plafonnee * taux_effectif)

  // --- Section III : Cotisation ---
  const ligne08_cotisation_avant_reduction = ligne07_CVAE_brute
  const ligne09_exonerations = exonerations
  const ligne10_reduction_supplementaire = reductionSupplementaire

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
  const ligne15_taxe_add_due = roundEuro(ligne11_CVAE_due * tauxTaxeAdd)
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
    ligne06_limitation_non_applicable: ligne06_limitation_non_applicable,
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
    cessation_2026: cessation2026,
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
