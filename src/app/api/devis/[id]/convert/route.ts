import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Convert devis to facture
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the devis
    const devis = await db.devis.findUnique({
      where: { id },
    })

    if (!devis) {
      return NextResponse.json({ error: 'Devis not found' }, { status: 404 })
    }

    if (devis.status === 'converted') {
      return NextResponse.json({ error: 'Devis already converted' }, { status: 400 })
    }

    if (devis.status !== 'accepted') {
      return NextResponse.json({ error: 'Devis must be accepted before conversion' }, { status: 400 })
    }

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

    // Set due date to 30 days from now
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Create invoice from devis
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        date: new Date(),
        dueDate,
        clientName: devis.clientName,
        clientAddress: devis.clientAddress,
        clientSIRET: devis.clientSIRET,
        clientTVAIntra: devis.clientTVAIntra,
        clientEmail: devis.clientEmail,
        items: devis.items,
        subtotalHT: devis.subtotalHT,
        tvaRate: devis.tvaRate,
        tvaAmount: devis.tvaAmount,
        totalTTC: devis.totalTTC,
        status: 'sent',
        notes: devis.notes,
        devisId: devis.id,
      },
    })

    // Update devis status
    await db.devis.update({
      where: { id },
      data: {
        status: 'converted',
        convertedToInvoiceId: invoice.id,
      },
    })

    return NextResponse.json({ invoice, devis })
  } catch (error) {
    console.error('Error converting devis to invoice:', error)
    return NextResponse.json({ error: 'Failed to convert devis' }, { status: 500 })
  }
}
