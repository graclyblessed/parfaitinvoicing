import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'

// GET - Download invoice as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const invoice = await db.invoice.findUnique({
      where: { id },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get company settings
    const settings = await db.settings.findFirst()

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
    })

    // Buffer to store PDF
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // Header - Company info
    doc.fontSize(20).font('Helvetica-Bold').text(settings?.companyName || 'Mon Entreprise', 50, 50)
    doc.fontSize(10).font('Helvetica')
    if (settings?.companyAddress) {
      const addressLines = settings.companyAddress.split('\n')
      addressLines.forEach((line, i) => {
        doc.text(line, 50, 80 + (i * 12))
      })
    }
    if (settings?.companySIRET) {
      doc.text(`SIRET: ${settings.companySIRET}`, 50, 120)
    }
    if (settings?.companyTVA) {
      doc.text(`TVA: ${settings.companyTVA}`, 50, 132)
    }

    // Invoice title (right side)
    doc.fontSize(24).font('Helvetica-Bold').text('FACTURE', 400, 50, { align: 'right' })
    doc.fontSize(10).font('Helvetica')
    doc.text(invoice.invoiceNumber, 400, 80, { align: 'right' })
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('fr-FR')}`, 400, 95, { align: 'right' })
    doc.text(`Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, 400, 110, { align: 'right' })

    // Client info box
    doc.rect(50, 160, 250, 80).stroke()
    doc.fontSize(10).font('Helvetica-Bold').text('FACTURÉ À:', 60, 170)
    doc.font('Helvetica').text(invoice.clientName, 60, 185)
    if (invoice.clientAddress) {
      const clientAddressLines = invoice.clientAddress.split('\n')
      clientAddressLines.forEach((line, i) => {
        doc.text(line, 60, 200 + (i * 12))
      })
    }
    if (invoice.clientSIRET) {
      doc.text(`SIRET: ${invoice.clientSIRET}`, 60, 225)
    }
    // BUG-024 FIX: Show client TVA intracommunautaire on invoice
    if (invoice.clientTVAIntra) {
      doc.text(`TVA Intracommunautaire: ${invoice.clientTVAIntra}`, 60, 237)
    }

    // Items table header
    let y = 280
    doc.rect(50, y, 495, 25).fill('#f0f0f0')
    doc.fillColor('black')
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Description', 60, y + 8)
    doc.text('Qté', 320, y + 8)
    doc.text('Prix unitaire', 370, y + 8)
    doc.text('Total HT', 470, y + 8)

    // Items
    y += 35
    doc.font('Helvetica')
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items
    
    items.forEach((item: { description: string; quantity: number; unitPrice: number }) => {
      doc.text(item.description, 60, y, { width: 250 })
      doc.text(item.quantity.toString(), 320, y)
      doc.text(formatCurrency(item.unitPrice), 370, y)
      doc.text(formatCurrency(item.quantity * item.unitPrice), 470, y)
      y += 25
    })

    // Totals
    y += 20
    doc.fontSize(10)
    doc.text('Sous-total HT', 370, y, { width: 100, align: 'right' })
    doc.text(formatCurrency(invoice.subtotalHT), 470, y)
    
    y += 20
    doc.text(`TVA (${invoice.tvaRate}%)`, 370, y, { width: 100, align: 'right' })
    doc.text(formatCurrency(invoice.tvaAmount), 470, y)
    
    y += 25
    doc.fontSize(12).font('Helvetica-Bold')
    doc.text('Total TTC', 370, y, { width: 100, align: 'right' })
    doc.text(formatCurrency(invoice.totalTTC), 470, y)

    // Payment info
    y += 50
    doc.fontSize(10).font('Helvetica-Bold').text('Modalités de paiement:', 50, y)
    doc.font('Helvetica').text('Paiement à réception de facture, sous 30 jours.', 50, y + 15)
    
    if (settings?.companyTVA) {
      y += 35
      doc.font('Helvetica-Bold').text('Coordonnées bancaires:', 50, y)
      doc.font('Helvetica').text('IBAN: FRXX XXXX XXXX XXXX XXXX XXXX XX', 50, y + 15)
      doc.text('BIC: XXXXXXX', 50, y + 30)
    }

    // Footer
    doc.fontSize(8).font('Helvetica')
    doc.text(
      `${settings?.companyName || 'Mon Entreprise'} - ${settings?.companyAddress || ''} - SIRET: ${settings?.companySIRET || ''}`,
      50, 780,
      { align: 'center', width: 495 }
    )
    
    if (invoice.notes) {
      doc.fontSize(9).font('Helvetica-Oblique')
      doc.text(`Note: ${invoice.notes}`, 50, y + 60, { width: 495 })
    }

    // Finalize PDF
    doc.end()

    // Wait for PDF to be generated
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}
