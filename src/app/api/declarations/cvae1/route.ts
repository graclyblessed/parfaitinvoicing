import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  calculateValeurAjoutee,
  daysUntilCVAE1,
  isCVAE1Overdue,
  type VAEffectifsResult,
} from '@/lib/cvae1'
import { getCVAE1Deadline } from '@/lib/tax'

/**
 * CVAE1 / 1330-SAFE — Déclaration de la valeur ajoutée et des effectifs salariés
 *
 * Routes:
 *   GET  /api/declarations/cvae1?fyEndYear=2025
 *        → Calcule la valeur ajoutée à partir des transactions de l'exercice
 *          + récupère le statut de la déclaration (si déjà enregistrée)
 *
 *   POST /api/declarations/cvae1
 *        body: { fyEndYear, action: 'save' | 'file', effectifsSalaries,
 *                reference?, filedAt?, valeurAjouteeOverride? }
 *        → 'save' : enregistre les valeurs calculées + effectifs (statut 'pret')
 *        → 'file' : marque comme télétransmis (statut 'filed') avec référence
 *
 * Note: La taxe CVAE est supprimée depuis 2024, mais la déclaration 1330-SAFE
 * reste OBLIGATOIRE (plafonnement CFE + effectifs salariés).
 * Omission = 150 € d'amende (art. 1729 B CGI).
 */

interface CVAE1DeclarationResponse {
  fyEndYear: number
  periodeLabel: string
  calculation: VAEffectifsResult
  dueDate: string
  daysUntilDue: number
  isOverdue: boolean
  declaration: {
    id: string
    status: string
    reference: string | null
    filedAt: string | null
    amount: number
  } | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fyEndYearStr = searchParams.get('fyEndYear')
    const fyEndYear = fyEndYearStr
      ? parseInt(fyEndYearStr)
      : new Date().getFullYear()

    if (isNaN(fyEndYear)) {
      return NextResponse.json({ error: 'fyEndYear invalide' }, { status: 400 })
    }

    // Fetch all transactions (we'll filter by fiscal year in calculateValeurAjoutee)
    const transactions = await db.transaction.findMany({
      include: { category: true },
    })

    // Fetch company settings to get the VAT regime (franchise / reel_simplifie / reel_normal)
    const settings = await db.settings.findFirst()
    const vatRegime = settings?.vatRegime || 'franchise'

    // Fetch the existing CVAE1 declaration (if any)
    const period = `CVAE1-${fyEndYear}`
    const existing = await db.declaration.findUnique({
      where: { type_year_period: { type: 'CVAE1', year: fyEndYear, period } },
    })

    // Calculate valeur ajoutée (regime-aware HT conversion)
    const calculation = calculateValeurAjoutee({
      transactions,
      fyEndYear,
      effectifsSalaries: 0,
      vatRegime,
    })

    // If declaration exists, use its stored effectifs
    let storedEffectifs = 0
    if (existing?.notes) {
      try {
        const parsed = JSON.parse(existing.notes)
        storedEffectifs = parsed.effectifs || 0
      } catch {
        // legacy notes format, ignore
      }
    }
    calculation.effectifsSalaries = storedEffectifs

    const dueDate = getCVAE1Deadline(fyEndYear)
    const daysUntil = daysUntilCVAE1(fyEndYear)
    const overdue = isCVAE1Overdue(fyEndYear)

    // CVAE applicability check: 1330-SAFE is required only when CA > 152,500 €
    // (CGI art. 1586 octies). Below that, the declaration is not mandatory,
    // but we still compute values + allow filing (soft warning) because the
    // DGFiP may have sent a mise en demeure regardless.
    const SEUIL_OBLIGATION_DECLARATIVE = 152500
    const cvaeNotApplicable = calculation.chiffreAffaires < SEUIL_OBLIGATION_DECLARATIVE
    const cveApplicabilityWarning = cvaeNotApplicable
      ? `CA HT (${calculation.chiffreAffaires.toFixed(0)} €) < 152 500 € — la déclaration 1330-SAFE n'est pas obligatoire. Toutefois, vous pouvez la déposer pour régulariser une mise en demeure.`
      : null

    const response: CVAE1DeclarationResponse = {
      fyEndYear,
      periodeLabel: calculation.periodeLabel,
      calculation,
      dueDate: dueDate.toISOString(),
      daysUntilDue: daysUntil,
      isOverdue: overdue,
      declaration: existing
        ? {
            id: existing.id,
            status: existing.status,
            reference: existing.documentUrl,
            filedAt: existing.filedAt?.toISOString() ?? null,
            amount: existing.amount,
          }
        : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in CVAE1 GET:', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul CVAE1' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fyEndYear,
      action, // 'save' | 'file'
      effectifsSalaries = 0,
      reference,
      filedAt,
      valeurAjouteeOverride,
    } = body

    if (!fyEndYear || typeof fyEndYear !== 'number') {
      return NextResponse.json(
        { error: 'fyEndYear requis (nombre)' },
        { status: 400 }
      )
    }

    if (action !== 'save' && action !== 'file') {
      return NextResponse.json(
        { error: "action requis ('save' ou 'file')" },
        { status: 400 }
      )
    }

    // Recompute VA (or use override)
    let valeurAjoutee = 0
    if (typeof valeurAjouteeOverride === 'number') {
      valeurAjoutee = valeurAjouteeOverride
    } else {
      const transactions = await db.transaction.findMany({
        include: { category: true },
      })
      const settings = await db.settings.findFirst()
      const vatRegime = settings?.vatRegime || 'franchise'
      const calc = calculateValeurAjoutee({
        transactions,
        fyEndYear,
        effectifsSalaries,
        vatRegime,
      })
      valeurAjoutee = calc.valeurAjoutee
    }

    const period = `CVAE1-${fyEndYear}`
    const dueDate = getCVAE1Deadline(fyEndYear)
    const notes = JSON.stringify({
      effectifs: effectifsSalaries,
      valeurAjoutee,
      periode: `FY${fyEndYear}`,
    })

    const status = action === 'file' ? 'filed' : 'pending'

    const declaration = await db.declaration.upsert({
      where: { type_year_period: { type: 'CVAE1', year: fyEndYear, period } },
      create: {
        type: 'CVAE1',
        year: fyEndYear,
        period,
        amount: 0,
        dueDate,
        status,
        notes,
        filedAt: action === 'file' ? new Date(filedAt || Date.now()) : null,
        documentUrl: reference || null,
      },
      update: {
        amount: 0,
        dueDate,
        notes,
        status,
        filedAt: action === 'file' ? new Date(filedAt || Date.now()) : null,
        documentUrl: reference || null,
      },
    })

    // If filed, also mark the corresponding TaxDeadline as done
    // The TaxDeadline for this FY has dueDate in year (fyEndYear + 1)
    if (action === 'file') {
      const deadlineYear = fyEndYear + 1
      const yearStart = new Date(deadlineYear, 0, 1)
      const yearEnd = new Date(deadlineYear, 11, 31, 23, 59, 59)
      await db.taxDeadline.updateMany({
        where: {
          type: 'CVAE1',
          dueDate: { gte: yearStart, lte: yearEnd },
          status: { in: ['pending', 'overdue'] },
        },
        data: { status: 'done' },
      })
    }

    return NextResponse.json({
      success: true,
      declaration,
      valeurAjoutee,
      effectifsSalaries,
      message:
        action === 'file'
          ? `Déclaration CVAE1/${fyEndYear} marquée comme télétransmise (réf: ${reference || '—'})`
          : `Valeurs CVAE1/${fyEndYear} enregistrées (prêt à télétransmettre)`,
    })
  } catch (error) {
    console.error('Error in CVAE1 POST:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde CVAE1: ' + msg },
      { status: 500 }
    )
  }
}
