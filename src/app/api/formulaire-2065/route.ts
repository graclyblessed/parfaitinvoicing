import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all formulaire2065 records or get specific year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    if (year) {
      const formulaire = await db.formulaire2065.findUnique({
        where: { year: parseInt(year) }
      })
      return NextResponse.json({ formulaire })
    }

    const formularies = await db.formulaire2065.findMany({
      orderBy: { year: 'desc' }
    })
    return NextResponse.json({ formularies })
  } catch (error) {
    console.error('Error fetching formulaire2065:', error)
    return NextResponse.json({ error: 'Failed to fetch formulaire 2065' }, { status: 500 })
  }
}

// POST - Generate formulaire2065 from transactions and fiscal data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      year,
      credits = {},
      deficitAnterieurN1 = 0,
      deficitAnterieurN2 = 0,
      deficitAnterieurN3 = 0,
      reintegrationNeutralite = 0,
      deductionsNeutralite = 0,
    } = body

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 })
    }

    const targetYear = year

    // Fiscal year: Dec 1 of previous year to Nov 30 of target year
    const startDate = new Date(targetYear - 1, 11, 1)   // Dec 1 of previous year (month index 11)
    const endDate = new Date(targetYear, 10, 30, 23, 59, 59, 999) // Nov 30 of target year (month index 10)

    console.log(`Generating Formulaire 2065 for fiscal year ${targetYear}`)
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Fetch labeled transactions for the fiscal year (with category for TVA rate and deductibility)
    const transactions = await db.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        labeled: true
      },
      include: { category: true }
    })

    console.log(`Found ${transactions.length} labeled transactions`)

    // Compute result on HT basis: transactions are stored TTC, so convert with category TVA rate.
    // Non-deductible expense categories (dividendes, retraits, etc.) are excluded from charges.
    let totalIncomeHT = 0
    let totalDeductibleExpensesHT = 0
    let totalNonDeductibleExpensesHT = 0

    for (const t of transactions) {
      const amountTTC = Math.abs(t.amount)
      // BUG FIX: Use category TVA rate for income (default 0.20), but 0 for expenses
      // (expenses should only have TVA removed if the category actually has a TVA rate)
      const rate = t.type === 'income'
        ? (t.category?.defaultTvaRate ?? 0.20)
        : (t.category?.defaultTvaRate ?? 0)
      const amountHT = Math.round((amountTTC / (1 + rate)) * 100) / 100

      if (t.type === 'income') {
        totalIncomeHT += amountHT
      } else if (t.type === 'expense') {
        if (t.category?.taxDeductible) {
          totalDeductibleExpensesHT += amountHT
        } else {
          totalNonDeductibleExpensesHT += amountHT
        }
      }
    }

    // Round accumulated totals
    totalIncomeHT = Math.round(totalIncomeHT * 100) / 100
    totalDeductibleExpensesHT = Math.round(totalDeductibleExpensesHT * 100) / 100
    totalNonDeductibleExpensesHT = Math.round(totalNonDeductibleExpensesHT * 100) / 100

    // Resultat comptable = revenues HT - deductible expenses HT
    const calculatedResult = totalIncomeHT - totalDeductibleExpensesHT

    // Fetch the existing liasse for this year
    const liasse = await db.liasseFiscale.findUnique({
      where: { year: targetYear }
    })

    // Use liasse result if available, otherwise use calculated result
    const resultatComptable = liasse?.resultatCourant ?? calculatedResult

    // Fetch settings for company info
    const settings = await db.settings.findFirst()

    // Resultat fiscal = resultatComptable + reintegrationNeutralite - deductionsNeutralite
    const resultatFiscal = resultatComptable + reintegrationNeutralite - deductionsNeutralite

    // Total deficits
    const totalDeficits = deficitAnterieurN1 + deficitAnterieurN2 + deficitAnterieurN3

    // Deficit utilise = min(totalDeficits, max(0, resultatFiscal))
    const deficitUtilise = Math.min(totalDeficits, Math.max(0, resultatFiscal))

    // Base imposable avant deductions
    const baseImposableAvant = resultatFiscal

    // Base imposable = max(0, baseImposableAvant - deficitUtilise)
    const baseImposable = Math.max(0, baseImposableAvant - deficitUtilise)

    // IS Calculation split (with centime rounding)
    const baseTauxReduit = Math.min(42500, baseImposable)
    const baseTauxNormal = Math.max(0, baseImposable - 42500)
    const isTauxReduit = Math.round(baseTauxReduit * 0.15 * 100) / 100
    const isTauxNormal = Math.round(baseTauxNormal * 0.25 * 100) / 100
    const isTotal = Math.round((isTauxReduit + isTauxNormal) * 100) / 100

    // Credits d'impôt
    const creditImpotRecherche = credits.creditImpotRecherche || 0
    const creditImpotInnovation = credits.creditImpotInnovation || 0
    const creditImpotCooperation = credits.creditImpotCooperation || 0
    const creditImpotApprentissage = credits.creditImpotApprentissage || 0
    const creditImpotFamille = credits.creditImpotFamille || 0
    const creditImpotMEC = credits.creditImpotMEC || 0
    const creditImpotAutres = credits.creditImpotAutres || 0
    const totalCreditsImpot = creditImpotRecherche + creditImpotInnovation + creditImpotCooperation +
      creditImpotApprentissage + creditImpotFamille + creditImpotMEC + creditImpotAutres

    // IS net
    const isNet = Math.max(0, isTotal - totalCreditsImpot)

    // Contribution sociale: 0 (typically not applicable for small SASU)
    const contributionSociale = 0

    // CFB: not applicable for small companies
    const cfb = 0

    // Benefice France = baseImposable (assuming all French revenue)
    const beneficeFrance = baseImposable
    const beneficeEtranger = 0
    const totalBenefice = beneficeFrance + beneficeEtranger

    // Revenus brevets (user can set later)
    const revenusBrevets = 0
    const revenusPatrimoineMobilier = 0

    // Fetch actual IS payments for this fiscal year (acomptes paid during the year)
    const isPayments = await db.taxPayment.findMany({
      where: {
        taxType: 'IS',
        year: targetYear,
        status: 'completed',
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const acomptesVerses = Math.round(isPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100
    const precompteIS = 0

    // Date cloture
    const dateCloture = `30/11/${targetYear}`

    // Annexes
    const annexesFournies = JSON.stringify([
      '2065-BIS',
      '2033-A',
      '2033-D',
      '2033-G',
      '2059'
    ])

    // Create or update the formulaire2065 record
    const formulaire = await db.formulaire2065.upsert({
      where: { year: targetYear },
      create: {
        year: targetYear,
        status: 'draft',

        // Identification
        regimeBenefice: 'RS',
        dureeExercice: 12,
        dateCloture,

        // Section 1: Résultat comptable et fiscal
        resultatComptable,
        reintegrationNeutralite,
        deductionsNeutralite,
        resultatFiscal,

        // Section 2: Déficits reportables
        deficitAnterieurN1,
        deficitAnterieurN2,
        deficitAnterieurN3,
        totalDeficits,
        deficitUtilise,

        // Section 3: Base imposable
        baseImposableAvant,
        baseImposable,

        // Section 4: Calcul de l'IS
        baseTauxReduit,
        baseTauxNormal,
        isTauxReduit,
        isTauxNormal,
        isTotal,

        // Section 5: Crédits d'impôt
        creditImpotRecherche,
        creditImpotInnovation,
        creditImpotCooperation,
        creditImpotApprentissage,
        creditImpotFamille,
        creditImpotMEC,
        creditImpotAutres,
        totalCreditsImpot,

        // Section 6: IS net et contributions
        isNet,
        contributionSociale,
        cfb,

        // Section 7: Répartition géographique
        beneficeFrance,
        beneficeEtranger,
        totalBenefice,

        // Section 8: Informations spécifiques
        revenusBrevets,
        revenusPatrimoineMobilier,

        // Section 9: Précompte et acomptes
        precompteIS,
        acomptesVerses,

        // Section 10: Annexes
        annexesFournies,
      },
      update: {
        // Identification
        dateCloture,

        // Section 1
        resultatComptable,
        reintegrationNeutralite,
        deductionsNeutralite,
        resultatFiscal,

        // Section 2
        deficitAnterieurN1,
        deficitAnterieurN2,
        deficitAnterieurN3,
        totalDeficits,
        deficitUtilise,

        // Section 3
        baseImposableAvant,
        baseImposable,

        // Section 4
        baseTauxReduit,
        baseTauxNormal,
        isTauxReduit,
        isTauxNormal,
        isTotal,

        // Section 5
        creditImpotRecherche,
        creditImpotInnovation,
        creditImpotCooperation,
        creditImpotApprentissage,
        creditImpotFamille,
        creditImpotMEC,
        creditImpotAutres,
        totalCreditsImpot,

        // Section 6
        isNet,
        contributionSociale,
        cfb,

        // Section 7
        beneficeFrance,
        beneficeEtranger,
        totalBenefice,

        // Section 10
        annexesFournies,
      }
    })

    console.log(`Formulaire 2065 generated successfully:`)
    console.log(`  - Résultat comptable: ${resultatComptable}`)
    console.log(`  - Résultat fiscal: ${resultatFiscal}`)
    console.log(`  - Déficits utilisés: ${deficitUtilise}`)
    console.log(`  - Base imposable: ${baseImposable}`)
    console.log(`  - IS total: ${isTotal}`)
    console.log(`  - IS net: ${isNet}`)

    return NextResponse.json({
      success: true,
      formulaire,
      summary: {
        transactions: transactions.length,
        totalIncomeHT,
        totalDeductibleExpensesHT,
        totalNonDeductibleExpensesHT,
        resultatComptable,
        resultatFiscal,
        totalDeficits,
        deficitUtilise,
        baseImposable,
        isTotal,
        totalCreditsImpot,
        isNet,
        beneficeFrance,
      }
    })
  } catch (error) {
    console.error('Error generating formulaire 2065:', error)
    return NextResponse.json({
      error: 'Failed to generate formulaire 2065',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// PUT - Update formulaire2065 manually and recalculate derived fields
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Recalculate resultat fiscal
    const resultatFiscal = (data.resultatComptable || 0) +
      (data.reintegrationNeutralite || 0) -
      (data.deductionsNeutralite || 0)

    // Recalculate total deficits
    const totalDeficits =
      (data.deficitAnterieurN1 || 0) +
      (data.deficitAnterieurN2 || 0) +
      (data.deficitAnterieurN3 || 0)

    // Recalculate deficit utilise
    const deficitUtilise = Math.min(totalDeficits, Math.max(0, resultatFiscal))

    // Recalculate base imposable
    const baseImposableAvant = resultatFiscal
    const baseImposable = Math.max(0, baseImposableAvant - deficitUtilise)

    // Recalculate IS split (with centime rounding)
    const baseTauxReduit = Math.min(42500, baseImposable)
    const baseTauxNormal = Math.max(0, baseImposable - 42500)
    const isTauxReduit = Math.round(baseTauxReduit * 0.15 * 100) / 100
    const isTauxNormal = Math.round(baseTauxNormal * 0.25 * 100) / 100
    const isTotal = Math.round((isTauxReduit + isTauxNormal) * 100) / 100

    // Recalculate total credits
    const totalCreditsImpot =
      (data.creditImpotRecherche || 0) +
      (data.creditImpotInnovation || 0) +
      (data.creditImpotCooperation || 0) +
      (data.creditImpotApprentissage || 0) +
      (data.creditImpotFamille || 0) +
      (data.creditImpotMEC || 0) +
      (data.creditImpotAutres || 0)

    // Recalculate IS net
    const isNet = Math.max(0, isTotal - totalCreditsImpot)

    // Recalculate benefice totals
    const beneficeFrance = data.beneficeFrance ?? baseImposable
    const beneficeEtranger = data.beneficeEtranger ?? 0
    const totalBenefice = beneficeFrance + beneficeEtranger

    const formulaire = await db.formulaire2065.update({
      where: { id },
      data: {
        ...data,
        resultatFiscal,
        totalDeficits,
        deficitUtilise,
        baseImposableAvant,
        baseImposable,
        baseTauxReduit,
        baseTauxNormal,
        isTauxReduit,
        isTauxNormal,
        isTotal,
        totalCreditsImpot,
        isNet,
        beneficeFrance,
        beneficeEtranger,
        totalBenefice,
      }
    })

    return NextResponse.json({ success: true, formulaire })
  } catch (error) {
    console.error('Error updating formulaire 2065:', error)
    return NextResponse.json({ error: 'Failed to update formulaire 2065' }, { status: 500 })
  }
}

// DELETE - Delete a formulaire2065 record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.formulaire2065.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting formulaire 2065:', error)
    return NextResponse.json({ error: 'Failed to delete formulaire 2065' }, { status: 500 })
  }
}
