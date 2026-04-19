import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all formulaire3517S records or get specific year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    if (year) {
      const formulaire = await db.formulaire3517S.findUnique({
        where: { year: parseInt(year) }
      })
      return NextResponse.json({ formulaire })
    }

    const formularies = await db.formulaire3517S.findMany({
      orderBy: { year: 'desc' }
    })
    return NextResponse.json({ formulaires: formularies })
  } catch (error) {
    console.error('Error fetching formulaire3517S:', error)
    return NextResponse.json({ error: 'Failed to fetch formulaire 3517-S' }, { status: 500 })
  }
}

// POST - Generate formulaire3517S from invoices and transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year, tvaInputs = {} } = body

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 })
    }

    const targetYear = year

    // Fiscal year: Dec 1 of previous year to Nov 30 of target year
    // month index 11 = Dec, month index 10 = Nov
    const startDate = new Date(targetYear - 1, 11, 1)   // Dec 1 (month index 11)
    const endDate = new Date(targetYear, 10, 30, 23, 59, 59, 999) // Nov 30 (month index 10)

    console.log(`Generating Formulaire 3517-S for fiscal year ${targetYear}`)
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // 1. TVA Collectée from invoices (status != 'cancelled')
    const invoices = await db.invoice.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' }
      }
    })

    console.log(`Found ${invoices.length} invoices for TVA collectée`)

    let baseHT20 = 0, tvaCollectee20 = 0
    let baseHT10 = 0, tvaCollectee10 = 0
    let baseHT55 = 0, tvaCollectee55 = 0
    let baseHT21 = 0, tvaCollectee21 = 0

    for (const inv of invoices) {
      const ht = inv.subtotalHT
      const tva = inv.tvaAmount
      switch (inv.tvaRate) {
        case 20: baseHT20 += ht; tvaCollectee20 += tva; break
        case 10: baseHT10 += ht; tvaCollectee10 += tva; break
        case 5.5: baseHT55 += ht; tvaCollectee55 += tva; break
        case 2.1: baseHT21 += ht; tvaCollectee21 += tva; break
      }
    }

    // Apply optional overrides
    if (tvaInputs.baseHT20 !== undefined) baseHT20 = tvaInputs.baseHT20
    if (tvaInputs.tvaCollectee20 !== undefined) tvaCollectee20 = tvaInputs.tvaCollectee20
    if (tvaInputs.baseHT10 !== undefined) baseHT10 = tvaInputs.baseHT10
    if (tvaInputs.tvaCollectee10 !== undefined) tvaCollectee10 = tvaInputs.tvaCollectee10
    if (tvaInputs.baseHT55 !== undefined) baseHT55 = tvaInputs.baseHT55
    if (tvaInputs.tvaCollectee55 !== undefined) tvaCollectee55 = tvaInputs.tvaCollectee55
    if (tvaInputs.baseHT21 !== undefined) baseHT21 = tvaInputs.baseHT21
    if (tvaInputs.tvaCollectee21 !== undefined) tvaCollectee21 = tvaInputs.tvaCollectee21

    const nombreVentes = invoices.length

    // 2. TVA Déductible from transactions (expenses with tax-deductible categories)
    const expenseTransactions = await db.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        labeled: true,
        type: 'expense',
        category: { taxDeductible: true }
      },
      include: { category: true }
    })

    console.log(`Found ${expenseTransactions.length} expense transactions for TVA déductible`)

    let tvaDeductibleBiensServices = 0
    let tvaDeductibleImmobilisations = 0

    for (const t of expenseTransactions) {
      const amount = Math.abs(t.amount)
      // Estimate TVA at 20% for all tax-deductible expenses
      tvaDeductibleBiensServices += amount * 0.20
    }

    // Apply optional overrides
    if (tvaInputs.tvaDeductibleBiensServices !== undefined) tvaDeductibleBiensServices = tvaInputs.tvaDeductibleBiensServices
    if (tvaInputs.tvaDeductibleImmobilisations !== undefined) tvaDeductibleImmobilisations = tvaInputs.tvaDeductibleImmobilisations

    const nombreAchats = expenseTransactions.length

    // 3. Calculate totals
    const totalTVABrute = tvaCollectee20 + tvaCollectee10 + tvaCollectee55 + tvaCollectee21
    const totalBaseHT = baseHT20 + baseHT10 + baseHT55 + baseHT21
    const totalTVADeductible = tvaDeductibleBiensServices + tvaDeductibleImmobilisations
    const totalDeductions = totalTVADeductible
    const tvaNette = totalTVABrute - totalTVADeductible
    const creditTVA = Math.max(0, -tvaNette)
    const tvaNetteDue = Math.max(0, tvaNette)
    const totalAPayer = tvaNetteDue

    // Format period dates
    const periodeStart = `01/12/${targetYear - 1}`
    const periodeEnd = `30/11/${targetYear}`

    // Create or update the formulaire3517S record
    const formulaire = await db.formulaire3517S.upsert({
      where: { year: targetYear },
      create: {
        year: targetYear,
        status: 'draft',

        // Section 1: TVA Collectée
        baseHT20,
        tvaCollectee20,
        baseHT10,
        tvaCollectee10,
        baseHT55,
        tvaCollectee55,
        baseHT21,
        tvaCollectee21,
        totalTVABrute,
        totalBaseHT,

        // Section 2: TVA Déductible
        tvaDeductibleBiensServices,
        tvaDeductibleImmobilisations,
        totalTVADeductible,
        totalDeductions,

        // Section 3: TVA Nette
        tvaNette,
        creditTVA,
        tvaNetteDue,
        totalAPayer,

        // Metadata
        periodeStart,
        periodeEnd,
        nombreVentes,
        nombreAchats,
      },
      update: {
        // Section 1
        baseHT20,
        tvaCollectee20,
        baseHT10,
        tvaCollectee10,
        baseHT55,
        tvaCollectee55,
        baseHT21,
        tvaCollectee21,
        totalTVABrute,
        totalBaseHT,

        // Section 2
        tvaDeductibleBiensServices,
        tvaDeductibleImmobilisations,
        totalTVADeductible,
        totalDeductions,

        // Section 3
        tvaNette,
        creditTVA,
        tvaNetteDue,
        totalAPayer,

        // Metadata
        periodeStart,
        periodeEnd,
        nombreVentes,
        nombreAchats,
      }
    })

    console.log(`Formulaire 3517-S generated successfully:`)
    console.log(`  - TVA collectée: ${totalTVABrute}`)
    console.log(`  - TVA déductible: ${totalTVADeductible}`)
    console.log(`  - TVA nette: ${tvaNette}`)
    console.log(`  - Total à payer: ${totalAPayer}`)

    return NextResponse.json({
      success: true,
      formulaire,
      summary: {
        invoices: invoices.length,
        expenseTransactions: expenseTransactions.length,
        totalTVABrute,
        totalTVADeductible,
        tvaNette,
        totalAPayer,
      }
    })
  } catch (error) {
    console.error('Error generating formulaire 3517-S:', error)
    return NextResponse.json({
      error: 'Failed to generate formulaire 3517-S',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// PUT - Update formulaire3517S manually and recalculate derived fields
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Recalculate derived totals from base values
    const tvaCollectee20 = data.tvaCollectee20 ?? 0
    const tvaCollectee10 = data.tvaCollectee10 ?? 0
    const tvaCollectee55 = data.tvaCollectee55 ?? 0
    const tvaCollectee21 = data.tvaCollectee21 ?? 0

    const baseHT20 = data.baseHT20 ?? 0
    const baseHT10 = data.baseHT10 ?? 0
    const baseHT55 = data.baseHT55 ?? 0
    const baseHT21 = data.baseHT21 ?? 0

    const tvaDeductibleBiensServices = data.tvaDeductibleBiensServices ?? 0
    const tvaDeductibleImmobilisations = data.tvaDeductibleImmobilisations ?? 0

    const totalTVABrute = tvaCollectee20 + tvaCollectee10 + tvaCollectee55 + tvaCollectee21
    const totalBaseHT = baseHT20 + baseHT10 + baseHT55 + baseHT21
    const totalTVADeductible = tvaDeductibleBiensServices + tvaDeductibleImmobilisations
    const totalDeductions = totalTVADeductible
    const tvaNette = totalTVABrute - totalTVADeductible
    const creditTVA = Math.max(0, -tvaNette)
    const tvaNetteDue = Math.max(0, tvaNette)
    const totalAPayer = tvaNetteDue

    const formulaire = await db.formulaire3517S.update({
      where: { id },
      data: {
        ...data,
        totalTVABrute,
        totalBaseHT,
        totalTVADeductible,
        totalDeductions,
        tvaNette,
        creditTVA,
        tvaNetteDue,
        totalAPayer,
      }
    })

    return NextResponse.json({ success: true, formulaire })
  } catch (error) {
    console.error('Error updating formulaire 3517-S:', error)
    return NextResponse.json({ error: 'Failed to update formulaire 3517-S' }, { status: 500 })
  }
}

// DELETE - Delete a formulaire3517S record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.formulaire3517S.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting formulaire 3517-S:', error)
    return NextResponse.json({ error: 'Failed to delete formulaire 3517-S' }, { status: 500 })
  }
}
