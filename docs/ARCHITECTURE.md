# ARCHITECTURE — `toHT()` boundary

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                   DB (Neon PostgreSQL)                   │
│  Transaction.amount = TTC (signed, matches bank stmts)  │
│  Settings.vatRegime = "franchise" | "reel_simplifie" |  │
│                       "reel_normal"                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              src/lib/ht-ttc.ts (SINGLE SOURCE)          │
│                                                         │
│  toHT(amountTTC, vatRate, regime) → HT amount           │
│                                                         │
│  • franchise: return abs(amountTTC)  [already HT]       │
│  • reel:      return amountTTC / (1 + vatRate) [strip]  │
└────────────────────────┬────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ declarations │ │  liasse  │ │   cvae1.ts   │
   │ -section.tsx │ │ route.ts │ │ (used by     │
   │ (Formula A)  │ │(Formula B)│ │ cvae1 +      │
   │              │ │          │ │ 1329-def APIs)│
   └──────────────┘ └──────────┘ └──────────────┘
           │             │             │
           ▼             ▼             ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ Declarations │ │  Liasse  │ │ CVAE1 tab +  │
   │ tab (IS/TVA) │ │ Fiscale  │ │ 1329-DEF tab │
   │              │ │ tab + PDF│ │              │
   │              │ │ filler   │ │              │
   └──────────────┘ └──────────┘ └──────────────┘
```

## Boundary rules

1. **`toHT()` is the ONLY place** that converts TTC → HT. No inline formulas elsewhere.
2. **`vatRegime` always comes from `Settings`** (DB), never hardcoded, never inferred from category rates.
3. **`category.defaultTvaRate`** is used as the VAT rate (not a per-transaction field — see DECISIONS.md).
4. **`category.taxDeductible`** (income-tax deductibility) is separate from VAT recoverability — do not conflate.

## Files that import `toHT()`

| File | Purpose |
|------|---------|
| `src/lib/ht-ttc.ts` | Definition (source of truth) |
| `src/lib/cvae1.ts` | VA calculation (CVAE1 + 1329-DEF tabs) |
| `src/components/declarations-section.tsx` | Client-side fiscal year data |
| `src/app/api/liasse/route.ts` | Liasse fiscale generation |

## API data flow

```
Client component
  → fetch('/api/liasse?year=2025')
    → GET handler fetches transactions + settings
    → calls toHT(amountTTC, tvaRate, settings.vatRegime) per transaction
    → returns { liasse, pdfLines } with HT values
  → renders HT values in UI
```

## Testing

Acceptance tests in `test-ht-ttc.ts` (run before each deploy):
- Franchise: `toHT(2000, 0.20, 'franchise')` → 2000 (not 1666.67)
- Réel: `toHT(1200, 0.20, 'reel_simplifie')` → 1000
- Same `toHT()` feeds all 4 declaration outputs (no divergence)
- Switching `vatRegime` flips all outputs consistently
