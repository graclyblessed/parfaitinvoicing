# DECISIONS — HT/TTC handling for French tax declarations

## Decision: Regime-aware HT derivation via single `toHT()` helper

**Date**: 2026-06-26
**Status**: Implemented
**Context**: All French tax declarations (liasse 2033-A/B/C/D/E/F/G, CVAE 1329-DEF, CVAE 1330-SAFE) must be filled HT (hors taxes). The app had 3 divergent CA formulas producing inconsistent values across tabs.

## The problem

| Formula | File | Behavior | Correct? |
|---------|------|----------|----------|
| A | `declarations-section.tsx:149` | `income += t.amount` (raw TTC) | ✅ for franchise, ❌ for réel |
| B | `liasse/route.ts:235` | `amountHT = amountTTC / (1 + tvaRate)` (always strip VAT) | ❌ for franchise, ✅ for réel |
| C | `cvae1.ts:125` | `chiffreAffaires += Math.abs(t.amount)` (raw TTC) | ✅ for franchise, ❌ for réel |

No single formula was universally correct because the right way to reach HT depends on the company's VAT regime.

## The legal rule

- **All French tax declarations are HT** — no exceptions (PCG; CGI art. 1586 sexies for CVAE).
- **Franchise en base (CGI art. 293 B)**: Sales are invoiced WITHOUT VAT → stored "TTC" amount already equals HT. Input VAT on purchases is NON-RECOVERABLE → part of the cost (stays TTC).
- **Réel (simplifié or normal)**: Sales are invoiced WITH VAT → stored amount is TTC, must divide to get HT. Input VAT is RECOVERABLE → expenses are HT.

## The solution

A single source-of-truth helper: `src/lib/ht-ttc.ts`

```ts
function toHT(amountTTC, vatRate, regime) {
  if (regime === 'franchise') return Math.abs(amountTTC)  // already HT
  return Math.round((Math.abs(amountTTC) / (1 + vatRate)) * 100) / 100  // strip VAT
}
```

All 3 code paths now call `toHT()` with the company's `settings.vatRegime`:
- `declarations-section.tsx` — income + expenses
- `liasse/route.ts` — all transaction amounts
- `cvae1.ts` — chiffre d'affaires, services extérieurs, charges exclues

## Why not add a per-transaction `tvaRate` field?

The task recommended using the transaction's "actual" VAT rate. However:
1. The `Transaction` model has no `tvaRate` field (only `category.defaultTvaRate`)
2. Adding it requires a Prisma migration + Neon DB update + backfill
3. For a small SASU, the category-level rate is sufficient — most categories have a single rate
4. Under franchise en base (the user's case), the rate is IGNORED anyway (amount = HT)

**Decision**: Keep using `category.defaultTvaRate`. Revisit if the company switches to réel with mixed-rate invoices.

## Why not hard-block CVAE when CA < 152,500 €?

The task suggested blocking the CVAE code path when CA < 152,500 €. However:
1. The user received a mise en demeure from DGFiP despite CA < 152,500 €
2. Blocking would prevent regularization
3. The DGFiP's systems sometimes require filing even when not legally mandatory

**Decision**: Soft warning. The API returns `cvaeNotApplicable: true` + a warning message, but still computes values and allows filing. The UI shows the warning but doesn't block.

## VAT regime values

The existing `Settings.vatRegime` field uses: `"franchise"`, `"reel_simplifie"`, `"reel_normal"`.

**Decision**: Keep these values (no DB migration). The `toHT()` function treats `franchise` as franchise en base, and both `reel_simplifie` + `reel_normal` as réel (strip VAT).

## Impact on historical data

Before this fix, the Liasse Fiscale tab (Formula B) was **understating CA** for franchise en base companies by stripping phantom VAT. After the fix:
- Franchise companies: CA increases (correct — no phantom VAT to strip)
- Réel companies: no change (was already correct)

This is the correct fix. Historical declarations that used the wrong formula should be re-verified.
