import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all declarations
export async function GET(request: NextRequest) {
  try {
    const declarations = await db.declaration.findMany({
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    
    return NextResponse.json({ declarations })
  } catch (error) {
    console.error('Error fetching declarations:', error)
    return NextResponse.json({ error: 'Error fetching declarations' }, { status: 500 })
  }
}

// POST - Create a new declaration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, year, period, amount, dueDate } = body

    // --- Input validation ---
    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Type de déclaration manquant (IS ou TVA requis)' }, { status: 400 })
    }
    if (!year || typeof year !== 'number' || isNaN(year)) {
      return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
    }
    if (!period || typeof period !== 'string') {
      return NextResponse.json({ error: 'Période manquante' }, { status: 400 })
    }

    // Sanitize amount — ensure it's a valid number, default to 0
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0

    // Calculate due date based on type and period
    let calculatedDueDate = dueDate
    if (!calculatedDueDate) {
      if (type === 'TVA') {
        // CA12 due May 3rd of year after FY
        calculatedDueDate = new Date(year + 1, 4, 3)
      } else if (type === 'IS') {
        // IS acomptes due 15th of Mar/Jun/Sep/Dec
        const quarter = parseInt(period.match(/Q(\d)/)?.[1] || '1')
        const monthMap: Record<number, number> = { 1: 2, 2: 5, 3: 8, 4: 11 }
        calculatedDueDate = new Date(year, monthMap[quarter], 15)
      } else {
        calculatedDueDate = new Date(year, 11, 15) // Default to Dec 15
      }
    }

    // Ensure dueDate is valid
    const finalDueDate = new Date(calculatedDueDate)
    if (isNaN(finalDueDate.getTime())) {
      return NextResponse.json({ error: 'Date limite invalide' }, { status: 400 })
    }

    // Use upsert to handle duplicate creation gracefully
    const declaration = await db.declaration.upsert({
      where: {
        type_year_period: { type, year, period }
      },
      create: {
        type,
        year,
        period,
        amount: safeAmount,
        dueDate: finalDueDate,
        status: 'pending'
      },
      update: {
        amount: safeAmount,
        dueDate: finalDueDate,
      }
    })

    return NextResponse.json({ success: true, declaration })
  } catch (error) {
    console.error('Error creating declaration:', error)
    const msg = error instanceof Error ? error.message : String(error)

    // Return more specific error messages based on common Prisma errors
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'Cette déclaration existe déjà. Modifiez-la au lieu de la recréer.' }, { status: 409 })
    }
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return NextResponse.json({
        error: 'Table de déclarations introuvable en base de données. Veuillez relancer un déploiement (deploy) sur Vercel pour synchroniser la base.',
        details: msg
      }, { status: 500 })
    }
    if (msg.includes('connect') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return NextResponse.json({
        error: 'Impossible de se connecter à la base de données. Vérifiez DATABASE_URL dans les variables d\'environnement Vercel.',
        details: msg
      }, { status: 500 })
    }

    return NextResponse.json({ error: 'Erreur lors de la création: ' + msg }, { status: 500 })
  }
}

// PUT - Update declaration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, filedAt, documentUrl, amount } = body
    
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }
    if (status) updateData.status = status
    if (filedAt) updateData.filedAt = new Date(filedAt)
    if (documentUrl) updateData.documentUrl = documentUrl
    if (amount !== undefined) updateData.amount = amount
    
    const declaration = await db.declaration.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({ success: true, declaration })
  } catch (error) {
    console.error('Error updating declaration:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
