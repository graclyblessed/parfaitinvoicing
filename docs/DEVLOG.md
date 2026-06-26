# DEVLOG — HT/TTC fix

## 2026-06-26: Regime-aware HT/TTC handling

### Problem
3 divergent CA formulas produced inconsistent values across tabs:
- `declarations-section.tsx`: raw TTC (correct for franchise, wrong for réel)
- `liasse/route.ts`: always strip VAT (wrong for franchise, correct for réel)
- `cvae1.ts`: raw TTC (correct for franchise, wrong for réel)

For SAS PARFAIT SERVICES (franchise en base), the Liasse tab was **understating CA** by ~20% (stripping phantom VAT that was never collected).

### Fix
Created `src/lib/ht-ttc.ts` with a single `toHT()` helper that is regime-aware:
- Franchise en base: returns amount as-is (already HT, no VAT collected)
- Réel: strips recoverable VAT to get HT

### Files changed

| File | Change |
|------|--------|
| `src/lib/ht-ttc.ts` | **NEW** — `toHT()`, `toTTC()`, `isFranchiseEnBase()`, `isReel()` |
| `src/lib/cvae1.ts` | Added `vatRegime` param to `calculateValeurAjoutee()`; use `toHT()` |
| `src/components/declarations-section.tsx` | Use `toHT()` for income + expenses; TVA only under réel |
| `src/app/api/liasse/route.ts` | Use `toHT()` instead of inline formula |
| `src/app/api/declarations/cvae1/route.ts` | Fetch `settings.vatRegime`, pass to `calculateValeurAjoutee()`; add CVAE applicability gate (soft warning when CA < 152,500 €) |
| `src/app/api/declarations/1329-def/route.ts` | Fetch `settings.vatRegime`, pass to `calculateValeurAjoutee()` |
| `docs/DECISIONS.md` | **NEW** — rationale |
| `docs/ARCHITECTURE.md` | **NEW** — `toHT` boundary diagram |
| `docs/DEVLOG.md` | **NEW** — this file |

### Tests run

```
Test 1: Franchise, income 2000 @ 0.20 → 2000 ✅
Test 2: Réel, income 1200 @ 0.20 → 1000 ✅
Test 3: Réel normal, income 1200 @ 0.20 → 1000 ✅
Test 4: Franchise, expense 600 @ 0.20 → 600 (non-recoverable) ✅
Test 5: Réel, expense 600 @ 0.20 → 500 (recoverable stripped) ✅
Test 6: Réel, income 1000 @ 0.10 → 909.09 ✅
Test 7: Franchise, income 5000 @ 0 → 5000 ✅
Test 8: Réel, income 5000 @ 0 → 5000 ✅

8 passed, 0 failed
```

### Impact on SAS PARFAIT SERVICES

| Tab | Before (wrong) | After (correct) |
|-----|----------------|-----------------|
| Liasse Fiscale (CA) | ~4,220 € (stripped phantom 20% VAT) | **5,064 €** (correct — franchise = no VAT) |
| Declarations (CA) | 5,064 € (already correct) | 5,064 € (no change) |
| CVAE1 (CA) | 5,064 € (already correct) | 5,064 € (no change) |
| 1329-DEF (CA) | 5,064 € (already correct) | 5,064 € (no change) |

All tabs now show the **same** CA value (5,064 €), consistent and correct.
