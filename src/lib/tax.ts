// French tax calculations and utilities for SASU

/** Round to 2 decimal places (centime precision) */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// IS (Impôt sur les Sociétés) rates for 2025
export const IS_RATES = {
  reduced: 0.15, // First €42,500 of profit
  standard: 0.25, // Remaining profit
  reducedThreshold: 42500,
  turnoverThreshold: 10000000, // €10M for reduced rate eligibility
}

// TVA rates
export const TVA_RATES = {
  standard: 0.20,    // 20%
  intermediate: 0.10, // 10%
  reduced: 0.055,     // 5.5%
  superReduced: 0.021, // 2.1%
}

// TVA franchise thresholds 2025
export const TVA_FRANCHISE_THRESHOLDS = {
  services: 37500,
  goods: 85000,
  majoratedServices: 42500,
  majoratedGoods: 94000,
}

// Calculate IS (Corporate Tax)
export function calculateIS(profit: number): { reduced: number; standard: number; total: number } {
  if (profit <= IS_RATES.reducedThreshold) {
    return {
      reduced: profit * IS_RATES.reduced,
      standard: 0,
      total: profit * IS_RATES.reduced,
    }
  }
  
  const reducedTax = IS_RATES.reducedThreshold * IS_RATES.reduced
  const standardTax = (profit - IS_RATES.reducedThreshold) * IS_RATES.standard
  
  return {
    reduced: reducedTax,
    standard: standardTax,
    total: reducedTax + standardTax,
  }
}

// IS quarterly payment schedule
export function getISPaymentDates(year: number): Array<{ quarter: number; dueDate: Date; amount: number | null }> {
  return [
    { quarter: 1, dueDate: new Date(year, 2, 15), amount: null },   // March 15
    { quarter: 2, dueDate: new Date(year, 5, 15), amount: null },   // June 15
    { quarter: 3, dueDate: new Date(year, 8, 15), amount: null },   // September 15
    { quarter: 4, dueDate: new Date(year, 11, 15), amount: null },  // December 15
  ]
}

// Calculate IS quarterly payment based on previous year profit
export function calculateISQuarterlyPayment(previousYearProfit: number): number {
  const totalIS = calculateIS(previousYearProfit).total
  return Math.round((totalIS / 4) * 100) / 100
}

// Tax deadlines for SASU
// CVAE1 = 1330-SAFE (Déclaration de la valeur ajoutée et des effectifs salariés)
//   - Even though the CVAE tax was abolished on 01/01/2024, the 1330-SAFE declaration
//     is still MANDATORY: it is used to compute the CFE plafonnement and to declare
//     the salaried workforce (effectifs salariés) used for TVA thresholds, etc.
//   - Missing it triggers a 150 € fine (art. 1729 B CGI), up to 1 500 € in some cases.
export type TaxDeadlineType = 'IS' | 'TVA' | 'CFE' | 'CVAE1' | 'LIASSE' | 'DAS2' | 'TVS' | 'OTHER'

export interface TaxDeadline {
  id: string
  name: string
  type: TaxDeadlineType
  dueDate: Date
  periodStart?: Date
  periodEnd?: Date
  description: string
  penalty?: string
}

// Compute the CVAE1 / 1330-SAFE filing deadline for a given fiscal year.
// Fiscal year ending Nov 30, YYYY → declaration due May 5 of YYYY+1
// (art. 1586 octies II.1 CGI).
// Example: FY 01/12/2024 → 30/11/2025 (fyEndYear=2025) → deadline May 5, 2026.
export function getCVAE1Deadline(fyEndYear: number): Date {
  return new Date(fyEndYear + 1, 4, 5) // May 5 of the year AFTER the FY ends
}

// Generate tax deadlines for a year (deadlines that FALL DUE in the given calendar year)
export function generateTaxDeadlines(year: number): TaxDeadline[] {
  const deadlines: TaxDeadline[] = []

  // IS - Quarterly payments (acomptes) — fall due in the same calendar year as the FY end
  const isDates = getISPaymentDates(year)
  isDates.forEach((d, i) => {
    deadlines.push({
      id: `IS-Q${i + 1}-${year}`,
      name: `IS - Acompte Q${i + 1}`,
      type: 'IS',
      dueDate: d.dueDate,
      periodStart: new Date(year, i * 3, 1),
      periodEnd: new Date(year, i * 3 + 2, 31),
      description: `Acompte d'impôt sur les sociétés - Trimestre ${i + 1}`,
      penalty: 'Pénalité de 10% + intérêts de retard',
    })
  })

  // TVA - Annual (CA12) - for franchise en base, it's declarative only
  deadlines.push({
    id: `TVA-CA12-${year}`,
    name: 'TVA - Déclaration annuelle (CA12)',
    type: 'TVA',
    dueDate: new Date(year, 4, 3), // May 3rd (2nd working day after May 1st)
    periodStart: new Date(year - 2, 11, 1),  // Dec 1 of year-2 (fiscal year start)
    periodEnd: new Date(year - 1, 10, 30),    // Nov 30 of year-1 (fiscal year end)
    description: 'Déclaration annuelle de TVA - Régime simplifié',
    penalty: 'Pénalité de 10% + intérêts de retard',
  })

  // CVAE1 / 1330-SAFE - Déclaration de la valeur ajoutée et des effectifs salariés
  // For a fiscal year ending Nov 30 of `year-1`, declaration falls due May 5 of `year`.
  // getCVAE1Deadline(fyEndYear) returns May 5 of fyEndYear+1, so we pass (year-1).
  deadlines.push({
    id: `CVAE1-${year}`,
    name: 'CVAE1 - Déclaration valeur ajoutée (1330-SAFE)',
    type: 'CVAE1',
    dueDate: getCVAE1Deadline(year - 1),
    periodStart: new Date(year - 2, 11, 1),  // Dec 1 of year-2 (fiscal year start)
    periodEnd: new Date(year - 1, 10, 30),    // Nov 30 of year-1 (fiscal year end)
    description:
      "Déclaration de la valeur ajoutée et des effectifs salariés (1330-SAFE). " +
      "Bien que la taxe CVAE soit supprimée depuis 2024, cette déclaration reste OBLIGATOIRE " +
      "(plafonnement CFE + déclaration des effectifs). Omission = 150 € d'amende (art. 1729 B CGI).",
    penalty: "Amende de 150 € (portée à 1 500 € dans certains cas) + intérêts de retard",
  })

  // Liasse Fiscale
  deadlines.push({
    id: `LIASSE-${year}`,
    name: 'Liasse Fiscale + Bilan',
    type: 'LIASSE',
    dueDate: new Date(year, 4, 3), // May 3rd (same as CA12 for Réel Simplifié)
    periodStart: new Date(year - 2, 11, 1),  // Dec 1 of year-2 (fiscal year start)
    periodEnd: new Date(year - 1, 10, 30),    // Nov 30 of year-1 (fiscal year end)
    description: 'Déclaration de résultats et liasse fiscale - Régime simplifié',
    penalty: 'Pénalité de 10% minimum',
  })

  // CFE (Cotisation Foncière des Entreprises)
  deadlines.push({
    id: `CFE-${year}`,
    name: 'CFE - Cotisation Foncière',
    type: 'CFE',
    dueDate: new Date(year, 11, 15), // December 15
    description: 'Cotisation Foncière des Entreprises',
    penalty: 'Pénalité de 10%',
  })

  // DAS2 - Declaration of fees paid to third parties
  deadlines.push({
    id: `DAS2-${year}`,
    name: 'DAS2 - Honoraires versés',
    type: 'DAS2',
    dueDate: new Date(year, 0, 31), // January 31
    periodStart: new Date(year - 2, 11, 1),  // Dec 1 of year-2 (fiscal year start)
    periodEnd: new Date(year - 1, 10, 30),    // Nov 30 of year-1 (fiscal year end)
    description: 'Déclaration des honoraires, commissions et ristournes',
    penalty: 'Pénalité de 10%',
  })

  return deadlines
}

// List of ANNUAL obligation types (excluding quarterly IS acomptes).
// Used by the annual-obligations overview and auto-renewal logic.
export const ANNUAL_OBLIGATION_TYPES: TaxDeadlineType[] = [
  'TVA',
  'CVAE1',
  'LIASSE',
  'CFE',
  'DAS2',
]

// Human-readable labels for each obligation type
export const OBLIGATION_LABELS: Record<TaxDeadlineType, string> = {
  IS: 'Impôt sur les Sociétés (acomptes)',
  TVA: 'TVA - Déclaration annuelle (CA12)',
  CVAE1: 'CVAE1 - Valeur ajoutée (1330-SAFE)',
  LIASSE: 'Liasse Fiscale + Bilan',
  CFE: 'CFE - Cotisation Foncière',
  DAS2: 'DAS2 - Honoraires versés',
  TVS: 'TVS - Taxe sur les véhicules',
  OTHER: 'Autre',
}

// Get upcoming deadlines
export function getUpcomingDeadlines(days: number = 60): TaxDeadline[] {
  const currentYear = new Date().getFullYear()
  const deadlines = [
    ...generateTaxDeadlines(currentYear),
    ...generateTaxDeadlines(currentYear + 1),
  ]
  
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  
  return deadlines
    .filter(d => d.dueDate >= now && d.dueDate <= futureDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Format date
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

// Get days until deadline
export function getDaysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Urgency level for deadline
export function getUrgencyLevel(daysUntil: number): 'overdue' | 'urgent' | 'warning' | 'normal' {
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 7) return 'urgent'
  if (daysUntil <= 30) return 'warning'
  return 'normal'
}

// Cash flow calculation
export interface CashFlowMonth {
  month: number
  year: number
  monthName: string
  income: number
  expenses: number
  taxPayments: number
  netFlow: number
  cumulativeBalance: number
}

export function calculateCashFlow(
  transactions: Array<{ date: Date; amount: number; type: string }>,
  startMonth: number,
  startYear: number,
  months: number = 12,
  startingBalance: number = 0
): CashFlowMonth[] {
  const result: CashFlowMonth[] = []
  let cumulative = startingBalance
  
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  
  for (let i = 0; i < months; i++) {
    const month = ((startMonth - 1 + i) % 12) + 1
    const year = startYear + Math.floor((startMonth - 1 + i) / 12)
    
    const monthTransactions = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === month && d.getFullYear() === year
    })
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    // Estimate tax payments for this month
    let taxPayments = 0
    // IS Q1: April (month 4)
    if (month === 4) taxPayments += 0 // Will be calculated based on profit
    // IS Q2: July (month 7)
    if (month === 7) taxPayments += 0
    // IS Q3: October (month 10)
    if (month === 10) taxPayments += 0
    // IS Q4: January (month 1)
    if (month === 1) taxPayments += 0
    // TVA: May (month 5) - if applicable
    if (month === 5) taxPayments += 0
    // CFE: December (month 12)
    if (month === 12) taxPayments += 0
    
    const netFlow = income - expenses - taxPayments
    cumulative += netFlow
    
    result.push({
      month,
      year,
      monthName: monthNames[month - 1],
      income,
      expenses,
      taxPayments,
      netFlow,
      cumulativeBalance: cumulative,
    })
  }
  
  return result
}

// Default transaction categories with correct French TVA rates
// TVA rates: 0.20 (normal), 0.10 (intermédiaire), 0.055 (réduit), 0 (exonéré/NC)
export const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Prestations de services', type: 'income', color: '#22C55E', icon: 'briefcase', taxDeductible: false, defaultTvaRate: 0.20 },
  { name: 'Ventes de produits', type: 'income', color: '#10B981', icon: 'shopping-cart', taxDeductible: false, defaultTvaRate: 0.20 },
  { name: 'Autres revenus', type: 'income', color: '#34D399', icon: 'plus', taxDeductible: false, defaultTvaRate: 0.20 },

  // Expenses - Business (20% TVA)
  { name: 'Fournitures de bureau', type: 'expense', color: '#EF4444', icon: 'paperclip', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Logiciels & Abonnements', type: 'expense', color: '#F97316', icon: 'monitor', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Télécommunications', type: 'expense', color: '#F59E0B', icon: 'phone', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Loyer & Charges', type: 'expense', color: '#EAB308', icon: 'home', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Assurances', type: 'expense', color: '#84CC16', icon: 'shield', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Formation', type: 'expense', color: '#3B82F6', icon: 'book', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Publicité & Marketing', type: 'expense', color: '#6366F1', icon: 'megaphone', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Honoraires (comptable, avocat)', type: 'expense', color: '#8B5CF6', icon: 'user', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Materiel informatique', type: 'expense', color: '#A855F7', icon: 'laptop', taxDeductible: true, defaultTvaRate: 0.20 },
  { name: 'Dépenses diverses justifiées', type: 'expense', color: '#78716C', icon: 'receipt', taxDeductible: true, defaultTvaRate: 0.20 },

  // Expenses - 10% TVA (taux intermédiaire)
  { name: 'Frais de déplacement', type: 'expense', color: '#0EA5E9', icon: 'car', taxDeductible: true, defaultTvaRate: 0.10 },
  { name: 'Repas professionnels', type: 'expense', color: '#D946EF', icon: 'utensils', taxDeductible: true, defaultTvaRate: 0.10 },

  // Expenses - 0% TVA (exonérés / hors champ)
  { name: 'Frais bancaires', type: 'expense', color: '#06B6D4', icon: 'credit-card', taxDeductible: true, defaultTvaRate: 0 },
  { name: 'Cotisations sociales', type: 'expense', color: '#EC4899', icon: 'heart', taxDeductible: true, defaultTvaRate: 0 },
  { name: 'Rémunération', type: 'expense', color: '#71717A', icon: 'user-check', taxDeductible: true, defaultTvaRate: 0 },
  { name: 'Impôts et taxes', type: 'expense', color: '#F43F5E', icon: 'file-text', taxDeductible: false, defaultTvaRate: 0 },
  { name: 'Dividendes', type: 'expense', color: '#71717A', icon: 'dollar-sign', taxDeductible: false, defaultTvaRate: 0 },
  { name: 'Retrait espèces', type: 'expense', color: '#A8A29E', icon: 'wallet', taxDeductible: false, defaultTvaRate: 0 },
  { name: 'Non catégorisé', type: 'expense', color: '#94A3B8', icon: 'help-circle', taxDeductible: false, defaultTvaRate: 0 },
]
