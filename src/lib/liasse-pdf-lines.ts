// Liasse fiscale PDF line mapping
// Maps the app's calculated LiasseFiscale values to the exact line codes
// on the official PDF forms (2033-A, 2033-B, 2033-E, etc.)
//
// Sources: Official PDFs extracted via pdftotext (impots.gouv.fr)
//   - 2033-A (Bilan simplifié) — applicable 31/12/2023
//   - 2033-B (Compte de résultat simplifié) — applicable 31/12/2024
//   - 2033-E (CET — Détermination VA + effectifs) — applicable 31/12/2021
//   - 2033-C (Immobilisations / Amortissements / Plus-values)
//   - 2033-D (Provisions / Amortissements dérogatoires / Déficits reportables)
//   - 2033-F (Composition du capital social)
//   - 2033-G (Filiales et participations)
//   - 2065-BIS (Annexe à la déclaration 2065 — distributions)

export interface LiasseValues {
  // From LiasseFiscale model
  // 2033-A (Bilan)
  immoIncorporelles: number
  immoCorporelles: number
  immoFinancieres: number
  totalImmo: number
  stocks: number
  creancesClients: number
  autresCreances: number
  disponibilites: number
  totalActifCirculant: number
  totalActif: number
  capital: number
  reserves: number
  reportANouveau: number
  resultatExercice: number
  totalCapitauxPropres: number
  emprunts: number
  dettesFournisseurs: number
  dettesFiscales: number
  dettesSociales: number
  autresDettes: number
  totalDettes: number
  totalPassif: number

  // 2033-B (Compte de résultat)
  chiffreAffaires: number
  productionStockee: number
  productionImmo: number
  subventions: number
  autresProduits: number
  totalProduits: number
  achats: number
  variationStocks: number
  servicesExterieurs: number
  chargesPersonnel: number
  impotsTaxes: number
  dotationsAmort: number
  dotationsProvisions: number
  chargesFinancieres: number
  chargesExceptionnelles: number
  totalCharges: number
  resultatCourant: number
  resultatExceptionnel: number
  impotSurSocietes: number
  resultatNet: number

  // 2033-E (VA + effectifs)
  effectif: number
  // CVAE1 tab already computes these, but we re-expose for 2033-E
  valeurAjoutee: number

  // 2033-B resultat fiscal (section B)
  resultatComptable: number
  retraitements: number
  resultatFiscal: number
  chargesDeductibles: number
  deficitAnterieur: number
  deficitUtilise: number
  baseImposableIS: number
  isAPayer: number
}

// ============================================================================
// 2033-A — BILAN SIMPLIFIÉ (line codes)
// ============================================================================
export const LINES_2033_A = {
  // A - ACTIF
  // 1 - Actif immobilisé
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  AB: { label: 'Immobilisations incorporelles - Fonds commercial', type: 'amount' },
  AC: { label: 'Immobilisations incorporelles - Autres', type: 'amount' },
  AD: { label: 'Immobilisations corporelles', type: 'amount' },
  AE: { label: 'Immobilisations financières', type: 'amount' },
  AF: { label: 'TOTAL I (Actif immobilisé)', type: 'amount', formula: 'AB+AC+AD+AE' },
  // 2 - Actif circulant
  AG: { label: '2 - Actif circulant', type: 'header' },
  AH: { label: 'Stocks matières premières, approvisionnements, en cours de production', type: 'amount' },
  AI: { label: 'Stocks marchandises', type: 'amount' },
  AJ: { label: 'Avances et acomptes versés sur commandes', type: 'amount' },
  AK: { label: 'Créances clients et comptes rattachés', type: 'amount' },
  AL: { label: 'Créances autres', type: 'amount' },
  AM: { label: 'Valeurs mobilières de placement', type: 'amount' },
  AN: { label: 'Disponibilités', type: 'amount' },
  AO: { label: 'Charges constatées d\'avance', type: 'amount' },
  AP: { label: 'TOTAL II (Actif circulant)', type: 'amount', formula: 'AH+AI+AJ+AK+AL+AM+AN+AO' },
  AQ: { label: 'TOTAL GÉNÉRAL (I + II)', type: 'amount', formula: 'AF+AP' },

  // B - PASSIF
  // 1 - Capitaux propres
  BA: { label: 'Capital social ou individuel', type: 'amount' },
  BB: { label: 'Écarts de réévaluation', type: 'amount' },
  BC: { label: 'Réserve légale', type: 'amount' },
  BD: { label: 'Réserves réglementées', type: 'amount' },
  BE: { label: 'Autres réserves', type: 'amount' },
  BF: { label: 'Report à nouveau', type: 'amount' },
  BG: { label: 'Résultat de l\'exercice', type: 'amount' },
  BH: { label: 'Provisions réglementées', type: 'amount' },
  BI: { label: 'Subventions d\'investissement', type: 'amount' },
  BJ: { label: 'TOTAL I (Capitaux propres)', type: 'amount', formula: 'BA+BB+BC+BD+BE+BF+BG+BH+BI' },
  // 2 - Provisions pour risques et charges
  BK: { label: 'TOTAL II (Provisions pour risques et charges)', type: 'amount' },
  // 3 - Dettes
  BL: { label: '3 - Dettes', type: 'header' },
  BM: { label: 'Emprunts et dettes auprès des établissements de crédit', type: 'amount' },
  BN: { label: 'Emprunts et dettes financières divers', type: 'amount' },
  BO: { label: 'Avances et acomptes reçus sur commandes en cours', type: 'amount' },
  BP: { label: 'Dettes fournisseurs et comptes rattachés', type: 'amount' },
  BQ: { label: 'Dettes fiscales et sociales', type: 'amount' },
  BR: { label: 'Dettes sur immobilisations et comptes rattachés', type: 'amount' },
  BS: { label: 'Autres dettes', type: 'amount' },
  BT: { label: 'TOTAL III (Dettes)', type: 'amount', formula: 'BM+BN+BO+BP+BQ+BR+BS' },
  BU: { label: 'TOTAL GÉNÉRAL (I + II + III)', type: 'amount', formula: 'BJ+BK+BT' },
} as const

// Map LiasseValues → 2033-A line codes → values
export function mapLiasseTo2033A(v: LiasseValues): Record<string, number | boolean> {
  return {
    AB: 0, // Fonds commercial (rare for services)
    AC: v.immoIncorporelles || 0,
    AD: v.immoCorporelles || 0,
    AE: v.immoFinancieres || 0,
    AF: v.totalImmo || 0,
    AH: v.stocks || 0,
    AK: v.creancesClients || 0,
    AL: v.autresCreances || 0,
    AN: v.disponibilites || 0,
    AP: v.totalActifCirculant || 0,
    AQ: v.totalActif || 0,
    BA: v.capital || 0,
    BF: v.reportANouveau || 0,
    BG: v.resultatExercice || 0,
    BJ: v.totalCapitauxPropres || 0,
    BM: v.emprunts || 0,
    BP: v.dettesFournisseurs || 0,
    BQ: v.dettesFiscales + v.dettesSociales || 0,
    BS: v.autresDettes || 0,
    BT: v.totalDettes || 0,
    BU: v.totalPassif || 0,
  }
}

// ============================================================================
// 2033-B — COMPTE DE RÉSULTAT SIMPLIFIÉ (line codes)
// ============================================================================
export const LINES_2033_B = {
  // A - RÉSULTAT COMPTABLE
  // PRODUITS D'EXPLOITATION
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  AB: { label: 'Ventes de marchandises', type: 'amount' },
  AC: { label: 'Production vendue - Biens', type: 'amount' },
  AD: { label: 'Production vendue - Services', type: 'amount' },
  AE: { label: 'Production stockée (variation)', type: 'amount' },
  AF: { label: 'Production immobilisée', type: 'amount' },
  AG: { label: 'Subventions d\'exploitation reçues', type: 'amount' },
  AH: { label: 'Autres produits', type: 'amount' },
  AI: { label: 'Total des produits d\'exploitation hors TVA (I)', type: 'amount', formula: 'somme produits' },

  // CHARGES D'EXPLOITATION
  AJ: { label: 'Achats de marchandises (y compris droits de douane)', type: 'amount' },
  AK: { label: 'Variation de stock (marchandises)', type: 'amount' },
  AL: { label: 'Achats de matières premières et approvisionnements', type: 'amount' },
  AM: { label: 'Variation de stock (matières premières)', type: 'amount' },
  AN: { label: 'Autres charges externes', type: 'amount' },
  AO: { label: 'Impôts, taxes et versements assimilés', type: 'amount' },
  AP: { label: 'Rémunérations du personnel', type: 'amount' },
  AQ: { label: 'Charges sociales', type: 'amount' },
  AR: { label: 'Dotations aux amortissements', type: 'amount' },
  AS: { label: 'Dotations aux provisions', type: 'amount' },
  AT: { label: 'Autres charges', type: 'amount' },
  AU: { label: 'Total des charges d\'exploitation (II)', type: 'amount', formula: 'somme charges' },
  AV: { label: '1 - RÉSULTAT D\'EXPLOITATION (I - II)', type: 'amount', formula: 'AI-AU' },

  // Produits/charges divers
  AW: { label: 'Produits financiers (III)', type: 'amount' },
  AX: { label: 'Produits exceptionnels (IV)', type: 'amount' },
  AY: { label: 'Charges financières (V)', type: 'amount' },
  AZ: { label: 'Charges exceptionnelles (VI)', type: 'amount' },
  BA: { label: 'Impôts sur les bénéfices (VII)', type: 'amount' },
  BB: { label: '2 - BÉNÉFICE OU PERTE: Produits - Charges', type: 'amount', formula: '(I+III+IV)-(II+V+VI+VII)' },

  // B - RÉSULTAT FISCAL
  BC: { label: 'Résultat comptable (bénéfice)', type: 'amount' },
  // Réintégrations
  BD: { label: 'Rémunérations et avantages non déductibles', type: 'amount' },
  BE: { label: 'Amortissements excédentaires (art. 39-4 CGI)', type: 'amount' },
  BF: { label: 'Provisions non déductibles', type: 'amount' },
  BG: { label: 'Impôts et taxes non déductibles', type: 'amount' },
  BH: { label: 'Réintégrations diverses', type: 'amount' },
  BI: { label: 'Loyers crédit-bail immobilier', type: 'amount' },
  // Déductions
  BJ: { label: 'Total des exonérations/abattements', type: 'amount' },
  BK: { label: 'Déductions diverses', type: 'amount' },
  BL: { label: '1 - RÉSULTAT FISCAL AVANT DÉFICITS (bénéfice)', type: 'amount' },
  BM: { label: 'Déficit de l\'exercice reporté en arrière', type: 'amount' },
  BN: { label: 'Déficits antérieurs reportables imputés', type: 'amount' },
  BO: { label: '2 - RÉSULTAT FISCAL APRÈS DÉFICITS (bénéfice)', type: 'amount', formula: 'BL-BN' },
} as const

export function mapLiasseTo2033B(v: LiasseValues): Record<string, number | boolean> {
  return {
    AD: v.chiffreAffaires || 0, // Services (SAS PARFAIT SERVICES)
    AF: v.productionImmo || 0,
    AG: v.subventions || 0,
    AH: v.autresProduits || 0,
    AI: v.totalProduits || 0,
    AJ: 0, // Achats marchandises (rare for services)
    AL: v.achats || 0,
    AN: v.servicesExterieurs || 0,
    AO: v.impotsTaxes || 0,
    AP: 0, // Rémunérations (dans chargesPersonnel)
    AQ: v.chargesPersonnel || 0, // Charges sociales
    AR: v.dotationsAmort || 0,
    AS: v.dotationsProvisions || 0,
    AT: v.chargesExceptionnelles || 0,
    AU: v.totalCharges || 0,
    AV: v.resultatCourant || 0,
    AY: v.chargesFinancieres || 0,
    BA: v.impotSurSocietes || 0,
    BB: v.resultatNet || 0,
    BC: v.resultatComptable || 0,
    BL: v.resultatFiscal || 0,
    BO: v.baseImposableIS || 0,
  }
}

// ============================================================================
// 2033-E — CET / VALEUR AJOUTÉE + EFFECTIFS (line codes)
// ============================================================================
export const LINES_2033_E = {
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  // DÉCLARATION DES EFFECTIFS
  AB: { label: 'Effectif moyen du personnel', type: 'number' },
  AC: { label: '- dont apprentis', type: 'number' },
  AD: { label: '- dont handicapés', type: 'number' },
  AE: { label: 'Effectifs affectés à l\'activité artisanale', type: 'number' },

  // CALCUL DE LA VALEUR AJOUTÉE
  // I - CHIFFRE D'AFFAIRES DE RÉFÉRENCE CVAE
  AF: { label: 'Ventes de produits fabriqués, prestations de services et marchandises', type: 'amount' },
  AG: { label: 'Redevances pour concessions, brevets, licences', type: 'amount' },
  AH: { label: 'Plus-values de cession d\'immobilisations (activité normale)', type: 'amount' },
  AI: { label: 'Refacturations de frais (transfert de charges)', type: 'amount' },
  AJ: { label: 'TOTAL 1 (CA de référence CVAE)', type: 'amount', formula: 'AF+AG+AH+AI' },

  // II - AUTRES PRODUITS
  AK: { label: 'Autres produits de gestion courante', type: 'amount' },
  AL: { label: 'Production immobilisée', type: 'amount' },
  AM: { label: 'Subventions d\'exploitation reçues', type: 'amount' },
  AN: { label: 'Variation positive des stocks', type: 'amount' },
  AO: { label: 'Transferts de charges déductibles de la VA', type: 'amount' },
  AP: { label: 'Rentrées sur créances amorties', type: 'amount' },
  AQ: { label: 'TOTAL 2 (Autres produits)', type: 'amount', formula: 'somme' },

  // III - CHARGES
  AR: { label: 'Achats', type: 'amount' },
  AS: { label: 'Variation négative des stocks', type: 'amount' },
  AT: { label: 'Services extérieurs (hors loyers et redevances)', type: 'amount' },
  AU: { label: 'Loyers et redevances (hors location-gérance/crédit-bail)', type: 'amount' },
  AV: { label: 'Taxes déductibles de la VA', type: 'amount' },
  AW: { label: 'Autres charges de gestion courante', type: 'amount' },
  AX: { label: 'Charges déductibles VA afférentes à la production immobilisée', type: 'amount' },
  AY: { label: 'Fraction déductible VA des dotations aux amortissements (credit-bail)', type: 'amount' },
  AZ: { label: 'Moins-values de cession d\'immobilisations (activité normale)', type: 'amount' },
  BA: { label: 'TOTAL 3 (Charges)', type: 'amount', formula: 'somme' },

  // IV - VALEUR AJOUTÉE PRODUITE
  BB: { label: 'Valeur ajoutée produite (Total 1 + Total 2 - Total 3)', type: 'amount', formula: 'AJ+AQ-BA' },
} as const

export function mapLiasseTo2033E(v: LiasseValues, effectifsSalaries: number = 0): Record<string, number | boolean> {
  return {
    AB: effectifsSalaries, // Effectif moyen
    AF: v.chiffreAffaires || 0, // CA référence CVAE
    AJ: v.chiffreAffaires || 0, // Total 1
    AR: v.achats || 0,
    AT: v.servicesExterieurs || 0, // Services extérieurs
    BA: v.achats + v.servicesExterieurs || 0, // Total 3
    BB: v.valeurAjoutee || 0, // VA produite
  }
}

// ============================================================================
// 2033-C — IMMOBILISATIONS / AMORTISSEMENTS / PLUS-VALUES
// ============================================================================
export const LINES_2033_C = {
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  // Tableau des immobilisations
  AB: { label: 'Immobilisations incorporelles', type: 'amount' },
  AC: { label: 'Immobilisations corporelles', type: 'amount' },
  AD: { label: 'Immobilisations financières', type: 'amount' },
  AE: { label: 'Total immobilisations', type: 'amount' },
  // Amortissements
  AF: { label: 'Amortissements incorporels', type: 'amount' },
  AG: { label: 'Amortissements corporels', type: 'amount' },
  AH: { label: 'Total amortissements', type: 'amount' },
  // Plus-values / Moins-values
  AI: { label: 'Plus-values courte durée', type: 'amount' },
  AJ: { label: 'Plus-values longue durée', type: 'amount' },
  AK: { label: 'Moins-values courte durée', type: 'amount' },
  AL: { label: 'Moins-values longue durée', type: 'amount' },
} as const

// ============================================================================
// 2033-D — PROVISIONS / AMORTISSEMENTS DÉROGATOIRES / DÉFICITS REPORTABLES
// ============================================================================
export const LINES_2033_D = {
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  AB: { label: 'Provisions réglementées (début d\'année)', type: 'amount' },
  AC: { label: 'Provisions réglementées (augmentations)', type: 'amount' },
  AD: { label: 'Provisions réglementées (diminutions)', type: 'amount' },
  AE: { label: 'Provisions réglementées (fin d\'année)', type: 'amount' },
  AF: { label: 'Provisions pour risques et charges (début)', type: 'amount' },
  AG: { label: 'Provisions pour risques et charges (augmentations)', type: 'amount' },
  AH: { label: 'Provisions pour risques et charges (diminutions)', type: 'amount' },
  AI: { label: 'Provisions pour risques et charges (fin)', type: 'amount' },
  AJ: { label: 'Amortissements dérogatoires (début)', type: 'amount' },
  AK: { label: 'Amortissements dérogatoires (augmentations)', type: 'amount' },
  AL: { label: 'Amortissements dérogatoires (diminutions)', type: 'amount' },
  AM: { label: 'Amortissements dérogatoires (fin)', type: 'amount' },
  AN: { label: 'Déficits reportables (début d\'année)', type: 'amount' },
  AO: { label: 'Déficit de l\'exercice à reporter', type: 'amount' },
  AP: { label: 'Déficits imputés', type: 'amount' },
  AQ: { label: 'Déficits reportables (fin d\'année)', type: 'amount' },
} as const

// ============================================================================
// 2033-F — COMPOSITION DU CAPITAL SOCIAL
// ============================================================================
export const LINES_2033_F = {
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  AB: { label: 'Nombre d\'associés/porteurs de parts', type: 'number' },
  AC: { label: 'Nombre de personnes physiques', type: 'number' },
  AD: { label: 'Nombre de personnes morales', type: 'number' },
  AE: { label: 'Capital social total', type: 'amount' },
  // Détail des associés ≥ 10%
  AF: { label: 'Nom/raison sociale associé 1', type: 'text' },
  AG: { label: 'Nombre de parts associé 1', type: 'number' },
  AH: { label: 'Pourcentage détention associé 1', type: 'percent' },
} as const

// ============================================================================
// 2033-G — FILIALES ET PARTICIPATIONS
// ============================================================================
export const LINES_2033_G = {
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  AB: { label: 'Nombre total de filiales/participations', type: 'number' },
  AC: { label: 'Nom filiale 1', type: 'text' },
  AD: { label: 'SIREN filiale 1', type: 'text' },
  AE: { label: 'Pourcentage détention filiale 1', type: 'percent' },
} as const

// ============================================================================
// 2065-BIS — ANNEXE À LA DÉCLARATION 2065 (distributions)
// ============================================================================
export const LINES_2065_BIS = {
  AA: { label: 'Néant (case à cocher)', type: 'boolean' },
  AB: { label: 'Distributions versées (brut)', type: 'amount' },
  AC: { label: 'Retenue à la source (acompte)', type: 'amount' },
  AD: { label: 'Distributions nettes', type: 'amount' },
  AE: { label: 'Rémunérations sans bénéficiaire désigné', type: 'amount' },
  AF: { label: 'Prêts/avances aux associés', type: 'amount' },
} as const

// ============================================================================
// Form metadata for UI
// ============================================================================
export const LIASSE_FORMS = [
  {
    code: '2033-A',
    title: 'Bilan simplifié',
    mandatory: true,
    description: 'Actif (immobilisations + circulant) et Passif (capitaux propres + dettes)',
    lines: LINES_2033_A,
    mapper: 'mapLiasseTo2033A',
  },
  {
    code: '2033-B',
    title: 'Compte de résultat simplifié',
    mandatory: true,
    description: 'Produits, charges, résultat comptable et résultat fiscal',
    lines: LINES_2033_B,
    mapper: 'mapLiasseTo2033B',
  },
  {
    code: '2033-E',
    title: 'Détermination de la valeur ajoutée et effectifs',
    mandatory: true,
    description: 'CET — VA + effectifs salariés (alimente le 1330-SAFE)',
    lines: LINES_2033_E,
    mapper: 'mapLiasseTo2033E',
  },
  {
    code: '2033-C',
    title: 'Immobilisations / Amortissements / Plus-values',
    mandatory: false,
    description: 'Uniquement si vous avez des immobilisations ou plus-values',
    lines: LINES_2033_C,
    mapper: null,
  },
  {
    code: '2033-D',
    title: 'Provisions / Amortissements dérogatoires / Déficits',
    mandatory: false,
    description: 'Uniquement si provisions, amortissements dérogatoires ou déficits reportables',
    lines: LINES_2033_D,
    mapper: null,
  },
  {
    code: '2033-F',
    title: 'Composition du capital social',
    mandatory: false,
    description: 'Uniquement si associés détenant ≥ 10% du capital',
    lines: LINES_2033_F,
    mapper: null,
  },
  {
    code: '2033-G',
    title: 'Filiales et participations',
    mandatory: false,
    description: 'Uniquement si vous avez des filiales/participations',
    lines: LINES_2033_G,
    mapper: null,
  },
  {
    code: '2065-BIS',
    title: 'Annexe 2065 (distributions, prêts associés)',
    mandatory: false,
    description: 'Uniquement si dividendes distribués ou prêts aux associés',
    lines: LINES_2065_BIS,
    mapper: null,
  },
] as const

export type FormCode = (typeof LIASSE_FORMS)[number]['code']
