import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all devis
export async function GET() {
  try {
    const devis = await db.devis.findMany({
      orderBy: { date: 'desc' },
    })
    return NextResponse.json({ devis })
  } catch (error) {
    console.error('Error fetching devis:', error)
    return NextResponse.json({ error: 'Failed to fetch devis' }, { status: 500 })
  }
}

// POST - Create new devis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientName,
      clientAddress,
      clientSIRET,
      clientTVAIntra,
      clientEmail,
      items,
      tvaRate,
      validUntilDays,
      notes,
    } = body

    // Generate devis number (DEV-YYYY-XXXX)
    const year = new Date().getFullYear()
    const count = await db.devis.count({
      where: {
        devisNumber: {
          startsWith: `DEV-${year}`,
        },
      },
    })
    const devisNumber = `DEV-${year}-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items
    const subtotalHT = parsedItems.reduce((sum: number, item: { quantity: number; unitPrice: number }) => 
      sum + (item.quantity * item.unitPrice), 0)
    const tvaRateValue = tvaRate || 20
    const tvaAmount = subtotalHT * (tvaRateValue / 100)
    const totalTTC = subtotalHT + tvaAmount

    // Set valid until date (default 30 days)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (validUntilDays || 30))

    const devis = await db.devis.create({
      data: {
        devisNumber,
        date: new Date(),
        validUntil,
        clientName,
        clientAddress: clientAddress || null,
        clientSIRET: clientSIRET || null,
        clientTVAIntra: clientTVAIntra || null,
        clientEmail: clientEmail || null,
        items: JSON.stringify(parsedItems),
        subtotalHT,
        tvaRate: tvaRateValue,
        tvaAmount,
        totalTTC,
        status: 'draft',
        notes: notes || null,
      },
    })

    return NextResponse.json({ devis })
  } catch (error) {
    console.error('Error creating devis:', error)
    return NextResponse.json({ error: 'Failed to create devis' }, { status: 500 })
  }
}

// PUT - Update devis
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, sentAt, acceptedAt } = body

    const devis = await db.devis.update({
      where: { id },
      data: {
        status,
        sentAt: sentAt ? new Date(sentAt) : undefined,
        acceptedAt: acceptedAt ? new Date(acceptedAt) : undefined,
      },
    })

    return NextResponse.json({ devis })
  } catch (error) {
    console.error('Error updating devis:', error)
    return NextResponse.json({ error: 'Failed to update devis' }, { status: 500 })
  }
}

// DELETE - Delete devis
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Devis ID required' }, { status: 400 })
    }

    await db.devis.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting devis:', error)
    return NextResponse.json({ error: 'Failed to delete devis' }, { status: 500 })
  }
}
