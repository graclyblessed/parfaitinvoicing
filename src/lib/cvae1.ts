// CVAE1 / 1330-SAFE — Calcul de la Valeur Ajoutée et des Effectifs Salariés
// ---------------------------------------------------------------------------
// Références légales :
//   - Art. 1586 nonies du CGI : formule de la valeur ajoutée
//   - Art. 1586 octies II.1 du CGI : obligation déclarative (1330-SAFE)
//   - Art. 1729 B du CGI : amende de 150 € en cas de défaut de dépôt
//
// IMPORTANT : La taxe CVAE elle-même est supprimée depuis le 01/01/2024.
// Cependant, la DÉCLARATION 1330-SAFE reste OBLIGATOIRE car elle sert à :
//   1. Calculer le plafonnement de la CFE (basé sur la valeur ajoutée)
//   2. Déclarer les effectifs salariés (utilisé pour les seuils TVA, etc.)
//
// Formule officielle simplifiée de la Valeur Ajoutée (art. 1586 nonies CGI) :
//   VA =  Produits d'exploitation (CA + production stockée + production immobilisée
//          + subventions d'exploitation + autres produits)
//        - Achats de marchandises et variation de stock de marchandises
//        - Achats de matières premières et approvisionnements et variation de stock
//        - Services extérieurs et autres charges externes
//
//  Pour une SASU de services (pas de marchandises/stocks), cela se ramène à :
//   VA ≈ Chiffre d'affaires - Services extérieurs (loyers, honoraires, fournitures,
//          logiciels, télécom, assurances, frais de déplacement, etc.)
//
//  NE SONT PAS déduits de la VA :
//   - Rémunérations et cotisations sociales (charges de personnel)
//   - Impôts et taxes
//   - Dotations aux amortissements et provisions
//   - Charges financières et exceptionnelles
//   - Dividendes

import type { TaxDeadlineType } from './tax'

/** Arrondi à 2 décimales (précision centime) */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export interface VAEffectifsInput {
  /** Transactions pour l'exercice fiscal concerné */
  transactions: Array<{
    date: string | Date
    amount: number
    type: string // 'income' | 'expense' | 'unknown'
    category?: {
      defaultTvaRate?: number
      taxDeductible?: boolean
      name?: string
    } | null
  }>
  /** Année de fin d'exercice (ex: 2025 pour FY 01/12/2024 → 30/11/2025) */
  fyEndYear: number
  /** Mois de fin d'exercice (1-12, défaut 11 = novembre) */
  fyEndMonth?: number
  /** Effectifs salariés (moyenne annuelle) — saisi manuellement par l'utilisateur */
  effectifsSalaries?: number
}

export interface VAEffectifsResult {
  /** Chiffre d'affaires HT (produits d'exploitation) */
  chiffreAffaires: number
  /** Total des services extérieurs et achats (déductibles de la VA) */
  servicesExterieurs: number
  /** Valeur ajoutée calculée (peut être négative) */
  valeurAjoutee: number
  /** Effectifs salariés (saisi) */
  effectifsSalaries: number
  /** Détail des charges exclues de la VA (récapitulatif) */
  chargesExclues: number
  /** Nombre de transactions utilisées pour le calcul */
  nombreTransactions: number
  /** Période concernée (texte) */
  periodeLabel: string
}

/**
 * Détermine si une charge est déductible de la valeur ajoutée
 * (i.e. s'agit-il d'un service extérieur / achat, ou d'une charge de personnel/impôt ?).
 *
 * Heuristique basée sur la catégorie :
 *  - taxDeductible = false  → NON déductible de la VA (rétribution, dividende, impôt, retrait)
 *  - taxDeductible = true + defaultTvaRate = 0 → NON déductible de la VA
 *      (cotisations sociales, rémunération, frais bancaires, impôts)
 *  - taxDeductible = true + defaultTvaRate > 0 → DÉDUCTIBLE de la VA
 *      (fournitures, logiciels, télécom, loyer, assurances, formation, marketing,
 *       honoraires, matériel, frais de déplacement, repas pro)
 */
export function isDeductibleFromVA(category: {
  defaultTvaRate?: number
  taxDeductible?: boolean
} | null | undefined): boolean {
  if (!category) return false
  if (category.taxDeductible === false) return false
  const rate = category.defaultTvaRate ?? 0
  return rate > 0
}

/**
 * Calcule la valeur ajoutée et les effectifs salariés pour la déclaration 1330-SAFE.
 *
 * Exercice fiscal : si fyEndYear = 2025 et fyEndMonth = 11,
 *   la période est du 01/12/2024 au 30/11/2025.
 */
export function calculateValeurAjoutee(input: VAEffectifsInput): VAEffectifsResult {
  const { transactions, fyEndYear, effectifsSalaries = 0 } = input
  const fyEndMonth = input.fyEndMonth ?? 11

  // Bornes de l'exercice fiscal
  // Début : 1er du mois SUIVANT la fin d'exercice de l'année précédente
  // Fin : dernier jour du mois de fin d'exercice de l'année courante
  const fyStart = new Date(fyEndYear - 1, fyEndMonth, 1) // ex: 01/12/2024
  const fyEnd = new Date(fyEndYear, fyEndMonth, 0)       // ex: 30/11/2025 (jour 0 = dernier jour du mois précédent)

  let chiffreAffaires = 0
  let servicesExterieurs = 0
  let chargesExclues = 0
  let nombreTransactions = 0

  for (const t of transactions) {
    const date = new Date(t.date)
    if (date < fyStart || date > fyEnd) continue
    nombreTransactions++

    if (t.amount > 0 || t.type === 'income') {
      // Produit → entre dans le chiffre d'affaires
      chiffreAffaires += Math.abs(t.amount)
    } else {
      // Charge
      const amount = Math.abs(t.amount)
      if (isDeductibleFromVA(t.category)) {
        servicesExterieurs += amount
      } else {
        chargesExclues += amount
      }
    }
  }

  const valeurAjoutee = round2(chiffreAffaires - servicesExterieurs)

  // Libellé période
  const formatD = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const periodeLabel = `Du ${formatD(fyStart)} au ${formatD(fyEnd)}`

  return {
    chiffreAffaires: round2(chiffreAffaires),
    servicesExterieurs: round2(servicesExterieurs),
    valeurAjoutee,
    effectifsSalaries,
    chargesExclues: round2(chargesExclues),
    nombreTransactions,
    periodeLabel,
  }
}

/** Formate un montant en euros (format français) */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/** Vérifie si une déclaration CVAE1 est en retard (après la date limite) */
export function isCVAE1Overdue(fyEndYear: number, now: Date = new Date()): boolean {
  // La déclaration pour l'exercice se terminant le 30/11/fyEndYear est due le 05/05/(fyEndYear+1)
  const due = new Date(fyEndYear + 1, 4, 5) // 5 mai de l'année suivante
  return now > due
}

/** Nombre de jours restants avant la date limite CVAE1 (négatif si en retard) */
export function daysUntilCVAE1(fyEndYear: number, now: Date = new Date()): number {
  const due = new Date(fyEndYear + 1, 4, 5)
  due.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// Registre des obligations annuelles (pour l'aperçu "Obligations annuelles")
// ---------------------------------------------------------------------------

export type ObligationStatus = 'a_faire' | 'pret' | 'teletransmis' | 'accuse_recu' | 'en_retard'

export interface AnnualObligation {
  type: TaxDeadlineType
  label: string
  dueDate: Date
  status: ObligationStatus
  /** Référence de l'accusé de réception (si télétransmis) */
  reference?: string
  /** Date de télétransmission */
  filedAt?: Date
  /** Montant à payer (si applicable — CVAE1 = 0 € car taxe supprimée) */
  amount?: number
  /** Période concernée */
  periodLabel: string
  /** Description courte */
  description: string
}

export const OBLIGATION_STATUS_LABELS: Record<ObligationStatus, string> = {
  a_faire: 'À faire',
  pret: 'Prêt à télétransmettre',
  teletransmis: 'Télétransmis',
  accuse_recu: 'Accusé de réception reçu',
  en_retard: 'En retard',
}

export const OBLIGATION_STATUS_COLORS: Record<ObligationStatus, string> = {
  a_faire: 'bg-slate-100 text-slate-700 border-slate-300',
  pret: 'bg-blue-50 text-blue-700 border-blue-300',
  teletransmis: 'bg-amber-50 text-amber-700 border-amber-300',
  accuse_recu: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  en_retard: 'bg-red-50 text-red-700 border-red-300',
}
