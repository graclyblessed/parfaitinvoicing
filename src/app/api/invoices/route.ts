import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all invoices
export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { date: 'desc' },
    })
    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST - Create new invoice
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
      notes,
    } = body

    // Generate invoice number
    const year = new Date().getFullYear()
    const count = await db.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: `FAC-${year}`,
        },
      },
    })
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items
    const subtotalHT = parsedItems.reduce((sum: number, item: { quantity: number; unitPrice: number }) => 
      sum + (item.quantity * item.unitPrice), 0)
    const tvaRateValue = tvaRate || 20
    const tvaAmount = subtotalHT * (tvaRateValue / 100)
    const totalTTC = subtotalHT + tvaAmount

    // Set due date to 30 days from now
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        date: new Date(),
        dueDate,
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

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}

// PUT - Update invoice
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, paidAt } = body

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        status,
        paidAt: paidAt ? new Date(paidAt) : null,
      },
    })

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}
