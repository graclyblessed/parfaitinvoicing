import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all formulaire2572 records or get specific year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    if (year) {
      const formulaire = await db.formulaire2572.findUnique({
        where: { year: parseInt(year) }
      })
      return NextResponse.json({ formulaire })
    }

    const formularies = await db.formulaire2572.findMany({
      orderBy: { year: 'desc' }
    })
    return NextResponse.json({ formularies })
  } catch (error) {
    console.error('Error fetching formulaire2572:', error)
    return NextResponse.json({ error: 'Failed to fetch formulaire 2572' }, { status: 500 })
  }
}

// POST - Generate formulaire2572 from transactions and fiscal data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      year,
      credits = {},
    } = body

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 })
    }

    const targetYear = year

    // Fiscal year: Dec 1 of previous year to Nov 30 of target year
    const startDate = new Date(targetYear - 1, 11, 1)   // Dec 1 of previous year (month index 11)
    const endDate = new Date(targetYear, 10, 30, 23, 59, 59, 999) // Nov 30 of target year (month index 10)

    console.log(`Generating Formulaire 2572 for fiscal year ${targetYear}`)
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Fetch labeled transactions for the fiscal year
    const transactions = await db.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        labeled: true
      }
    })

    console.log(`Found ${transactions.length} labeled transactions`)

    // Calculate total income and expenses
    let totalIncome = 0
    let totalExpenses = 0

    for (const t of transactions) {
      const amount = Math.abs(t.amount)
      if (t.type === 'income') {
        totalIncome += amount
      } else if (t.type === 'expense') {
        totalExpenses += amount
      }
    }

    // Result = income - expenses
    const result = totalIncome - totalExpenses

    // Fetch the existing liasse for this year to get calculated IS values
    const liasse = await db.liasseFiscale.findUnique({
      where: { year: targetYear }
    })

    // Use liasse result if available, otherwise use calculated result
    const usedResult = liasse?.resultatCourant ?? result

    // Fetch settings for company info
    const settings = await db.settings.findFirst()

    // IS Calculation
    const baseTauxReduit = Math.min(42500, Math.max(0, usedResult))
    const baseTauxNormal = Math.max(0, usedResult - 42500)
    const isTauxReduit = baseTauxReduit * 0.15
    const isTauxNormal = baseTauxNormal * 0.25
    const totalISBrut = isTauxReduit + isTauxNormal

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
    const totalISNet = Math.max(0, totalISBrut - totalCreditsImpot)

    // Fetch existing declarations for IS acomptes (Q1, Q2, Q3, Q4)
    const declarations = await db.declaration.findMany({
      where: {
        type: 'IS',
        year: targetYear,
        period: {
          in: [`IS-Q1-${targetYear}`, `IS-Q2-${targetYear}`, `IS-Q3-${targetYear}`, `IS-Q4-${targetYear}`]
        }
      }
    })

    let acompte1 = 0
    let acompte2 = 0
    let acompte3 = 0
    let acompte4 = 0
    let totalAcomptes = 0

    if (declarations.length > 0) {
      // Use actual declaration amounts
      for (const decl of declarations) {
        switch (decl.period) {
          case `IS-Q1-${targetYear}`:
            acompte1 = decl.amount
            break
          case `IS-Q2-${targetYear}`:
            acompte2 = decl.amount
            break
          case `IS-Q3-${targetYear}`:
            acompte3 = decl.amount
            break
          case `IS-Q4-${targetYear}`:
            acompte4 = decl.amount
            break
        }
      }
      totalAcomptes = acompte1 + acompte2 + acompte3 + acompte4
    } else {
      // No declarations found: calculate from previous year's IS
      const previousYearLiasse = await db.liasseFiscale.findUnique({
        where: { year: targetYear - 1 }
      })

      let previousYearIS = 0
      if (previousYearLiasse) {
        previousYearIS = previousYearLiasse.isAPayer || 0
      } else {
        // Try to get from previous year's formulaire2572
        const previousYearFormulaire = await db.formulaire2572.findUnique({
          where: { year: targetYear - 1 }
        })
        if (previousYearFormulaire) {
          previousYearIS = previousYearFormulaire.totalISBrut || 0
        }
      }

      // Each acompte = previous year IS / 4
      const acompteAmount = previousYearIS / 4
      acompte1 = acompteAmount
      acompte2 = acompteAmount
      acompte3 = acompteAmount
      acompte4 = acompteAmount
      totalAcomptes = acompte1 + acompte2 + acompte3 + acompte4
    }

    // Solde = IS net - acomptes (positive = pay, negative = excedent)
    const soldeAPayer = Math.max(0, totalISNet - totalAcomptes)
    const excedent = Math.max(0, totalAcomptes - totalISNet)

    // Contribution sociale: 3.3% on IS net (typically not applicable for small SASU)
    const contributionSociale = 0

    // CFB: not applicable for small companies
    const cfb = 0

    // Result net / deficit
    const resultatNetBenefice = Math.max(0, usedResult)
    const resultatNetDeficit = Math.max(0, -usedResult)

    // Create or update the formulaire2572 record
    const formulaire = await db.formulaire2572.upsert({
      where: { year: targetYear },
      create: {
        year: targetYear,
        status: 'draft',

        // Section 1: Résultat de l'exercice
        resultatNetBenefice,
        resultatNetDeficit,

        // Section 2: IS au taux normal
        baseTauxNormal,
        isTauxNormal,

        // Section 3: IS au taux réduit
        baseTauxReduit,
        isTauxReduit,

        // Section 4: Crédits d'impôt
        creditImpotRecherche,
        creditImpotInnovation,
        creditImpotCooperation,
        creditImpotApprentissage,
        creditImpotFamille,
        creditImpotMEC,
        creditImpotCompetitivite: 0,
        creditImpotAgri: 0,
        creditImpotAutres,
        totalCreditsImpot,

        // Section 5: IS net
        totalISBrut,
        totalISNet,

        // Acomptes
        acompte1,
        acompte2,
        acompte3,
        acompte4,
        totalAcomptes,

        // Section 6: Solde / Excédent
        soldeAPayer,
        excedent,

        // Contributions
        cfb,
        contributionSociale,

        // Impôts étrangers
        impotsEtrangersCr: 0,
      },
      update: {
        // Section 1
        resultatNetBenefice,
        resultatNetDeficit,

        // Section 2
        baseTauxNormal,
        isTauxNormal,

        // Section 3
        baseTauxReduit,
        isTauxReduit,

        // Section 4
        creditImpotRecherche,
        creditImpotInnovation,
        creditImpotCooperation,
        creditImpotApprentissage,
        creditImpotFamille,
        creditImpotMEC,
        creditImpotAutres,
        totalCreditsImpot,

        // Section 5
        totalISBrut,
        totalISNet,

        // Acomptes
        acompte1,
        acompte2,
        acompte3,
        acompte4,
        totalAcomptes,

        // Section 6
        soldeAPayer,
        excedent,

        // Contributions
        cfb,
        contributionSociale,
      }
    })

    console.log(`Formulaire 2572 generated successfully:`)
    console.log(`  - Result: ${usedResult}`)
    console.log(`  - IS brut: ${totalISBrut}`)
    console.log(`  - Credits: ${totalCreditsImpot}`)
    console.log(`  - IS net: ${totalISNet}`)
    console.log(`  - Acomptes: ${totalAcomptes}`)
    console.log(`  - Solde à payer: ${soldeAPayer}`)

    return NextResponse.json({
      success: true,
      formulaire,
      summary: {
        transactions: transactions.length,
        totalIncome,
        totalExpenses,
        result: usedResult,
        totalISBrut,
        totalCreditsImpot,
        totalISNet,
        totalAcomptes,
        soldeAPayer,
        excedent,
      }
    })
  } catch (error) {
    console.error('Error generating formulaire 2572:', error)
    return NextResponse.json({
      error: 'Failed to generate formulaire 2572',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// PUT - Update formulaire2572 manually and recalculate derived fields
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Recalculate total credits
    const totalCreditsImpot =
      (data.creditImpotRecherche || 0) +
      (data.creditImpotInnovation || 0) +
      (data.creditImpotCooperation || 0) +
      (data.creditImpotApprentissage || 0) +
      (data.creditImpotFamille || 0) +
      (data.creditImpotMEC || 0) +
      (data.creditImpotCompetitivite || 0) +
      (data.creditImpotAgri || 0) +
      (data.creditImpotAutres || 0)

    // Recalculate IS brut if base values are provided
    let totalISBrut = data.totalISBrut || 0
    if (data.baseTauxReduit !== undefined || data.baseTauxNormal !== undefined) {
      const isTauxReduit = (data.baseTauxReduit || 0) * 0.15
      const isTauxNormal = (data.baseTauxNormal || 0) * 0.25
      totalISBrut = isTauxReduit + isTauxNormal
      if (!data.isTauxReduit) data.isTauxReduit = isTauxReduit
      if (!data.isTauxNormal) data.isTauxNormal = isTauxNormal
    }

    // Recalculate IS net
    const totalISNet = Math.max(0, totalISBrut - totalCreditsImpot)

    // Recalculate acomptes total
    const totalAcomptes =
      (data.acompte1 || 0) +
      (data.acompte2 || 0) +
      (data.acompte3 || 0) +
      (data.acompte4 || 0)

    // Recalculate solde / excedent
    const soldeAPayer = Math.max(0, totalISNet - totalAcomptes)
    const excedent = Math.max(0, totalAcomptes - totalISNet)

    const formulaire = await db.formulaire2572.update({
      where: { id },
      data: {
        ...data,
        totalCreditsImpot,
        totalISBrut,
        totalISNet,
        totalAcomptes,
        soldeAPayer,
        excedent,
      }
    })

    return NextResponse.json({ success: true, formulaire })
  } catch (error) {
    console.error('Error updating formulaire 2572:', error)
    return NextResponse.json({ error: 'Failed to update formulaire 2572' }, { status: 500 })
  }
}

// DELETE - Delete a formulaire2572 record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.formulaire2572.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting formulaire 2572:', error)
    return NextResponse.json({ error: 'Failed to delete formulaire 2572' }, { status: 500 })
  }
}
