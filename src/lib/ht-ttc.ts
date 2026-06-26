// =============================================================================
// HT / TTC conversion — SINGLE SOURCE OF TRUTH for all French tax declarations
// =============================================================================
//
// LEGAL RULE (do not optimize away):
//   ALL French tax declarations are filled HT (hors taxes) — no exceptions.
//   This includes: liasse 2033-A/B/C/D/E/F/G, CVAE 1329-DEF, CVAE 1330-SAFE.
//
//   - Compte de résultat / bilan are always HT (Plan Comptable Général;
//     VAT is neither a product nor a charge).
//   - CVAE CA and valeur ajoutée derive from the HT P&L (CGI art. 1586 sexies).
//
// REGIME-AWARE BEHAVIOR:
//   The DB stores every transaction `amount` as TTC (matches bank statements).
//   How we reach HT depends on the company's VAT regime:
//
//   - FRANCHISE EN BASE (CGI art. 293 B):
//       * Sales are invoiced WITHOUT VAT → stored "TTC" amount already equals HT.
//         → toHT() returns the amount AS-IS (no division).
//       * Input VAT on purchases is NON-RECOVERABLE → part of the cost.
//         → Expenses stay TTC in the P&L (= the stored amount).
//       * Net effect: toHT() returns abs(amount) for BOTH income and expenses.
//
//   - REEL (simplifié or normal):
//       * Sales are invoiced WITH VAT → stored amount is TTC.
//         → toHT() divides by (1 + vatRate) to get HT.
//       * Input VAT on purchases is RECOVERABLE → not part of the cost.
//         → Expenses are recorded HT in the P&L.
//       * Exception: expenses with NON-RECOVERABLE VAT (e.g., meals at 50%,
//         fuel) stay TTC even at reel. This is handled separately via
//         category.taxDeductible — NOT by this function.
//
// IMPORTANT:
//   `category.taxDeductible` (income-tax deductibility) ≠ VAT recoverability.
//   This function only handles the HT/TTC conversion based on the VAT regime.
//   Income-tax deductibility is a separate concept handled in the liasse logic.

/**
 * The company's VAT regime.
 * - `franchise`: Franchise en base de TVA (CGI art. 293 B) — no VAT collected
 * - `reel_simplifié`: Réel simplifié (CA12) — VAT collected, annual return
 * - `reel_normal`: Réel normal (CA3) — VAT collected, monthly/quarterly return
 *
 * Source: Settings.vatRegime (Prisma) — the single source of truth for the
 * company's VAT regime. Never hardcoded, never inferred from category rates.
 */
export type VatRegime = 'franchise' | 'reel_simplifie' | 'reel_normal'

/**
 * Returns true if the company is in franchise en base de TVA.
 * Under franchise, no VAT is collected on sales and input VAT is non-recoverable.
 */
export function isFranchiseEnBase(regime: string | undefined | null): boolean {
  return regime === 'franchise'
}

/**
 * Returns true if the company is at réel (simplifié or normal).
 * Under réel, VAT is collected on sales and input VAT is recoverable.
 */
export function isReel(regime: string | undefined | null): boolean {
  return regime === 'reel_simplifie' || regime === 'reel_normal'
}

/**
 * Converts a TTC amount to the amount that should appear in tax declarations.
 *
 * - Franchise en base: returns the amount AS-IS (already HT for sales;
 *   non-recoverable VAT stays in expenses).
 * - Réel: divides by (1 + vatRate) to strip recoverable VAT → HT.
 *
 * @param amountTTC  The TTC amount from the DB (signed; only abs is used)
 * @param vatRate    The VAT rate (0, 0.055, 0.10, or 0.20). For franchise,
 *                   this is ignored (amount returned as-is).
 * @param regime     The company's VAT regime from Settings.vatRegime
 * @returns          The HT amount (rounded to 2 decimal places)
 *
 * @example
 * // Franchise en base — sales have no VAT, amount is already HT
 * toHT(2000, 0.20, 'franchise')  // → 2000 (NOT 1666.67)
 *
 * // Réel — sales include 20% VAT, strip it
 * toHT(1200, 0.20, 'reel_simplifie')  // → 1000
 *
 * // Franchise en base — expense with non-recoverable VAT stays TTC
 * toHT(600, 0.20, 'franchise')  // → 600 (VAT is part of cost)
 *
 * // Réel — expense with recoverable VAT, strip it
 * toHT(600, 0.20, 'reel_simplifie')  // → 500
 */
export function toHT(
  amountTTC: number,
  vatRate: number,
  regime: string | undefined | null
): number {
  const abs = Math.abs(amountTTC)
  if (isFranchiseEnBase(regime)) {
    // Franchise en base: amount is already HT (sales) or stays TTC (expenses
    // with non-recoverable VAT). Either way, return as-is.
    return abs
  }
  // Réel (simplifié or normal): strip recoverable VAT to get HT
  const rate = vatRate || 0
  if (rate === 0) return abs
  return Math.round((abs / (1 + rate)) * 100) / 100
}

/**
 * Inverse of toHT — converts HT to TTC (useful for invoice generation).
 * Under franchise, HT = TTC (no VAT), so returns as-is.
 * Under réel, multiplies by (1 + vatRate).
 */
export function toTTC(
  amountHT: number,
  vatRate: number,
  regime: string | undefined | null
): number {
  if (isFranchiseEnBase(regime)) return Math.abs(amountHT)
  return Math.round(Math.abs(amountHT) * (1 + (vatRate || 0)) * 100) / 100
}
