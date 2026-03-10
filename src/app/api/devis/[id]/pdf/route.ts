import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'

// GET - Download devis as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const devis = await db.devis.findUnique({
      where: { id },
    })

    if (!devis) {
      return NextResponse.json({ error: 'Devis not found' }, { status: 404 })
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

    // Devis title (right side)
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#2563eb').text('DEVIS', 400, 50, { align: 'right' })
    doc.fillColor('black')
    doc.fontSize(10).font('Helvetica')
    doc.text(devis.devisNumber, 400, 80, { align: 'right' })
    doc.text(`Date: ${new Date(devis.date).toLocaleDateString('fr-FR')}`, 400, 95, { align: 'right' })
    doc.text(`Valide jusqu'au: ${new Date(devis.validUntil).toLocaleDateString('fr-FR')}`, 400, 110, { align: 'right' })

    // Status badge
    const statusColors: Record<string, string> = {
      draft: '#6b7280',
      sent: '#3b82f6',
      accepted: '#22c55e',
      rejected: '#ef4444',
      converted: '#8b5cf6',
    }
    const statusLabels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      converted: 'Converti',
    }
    doc.fontSize(10).fillColor(statusColors[devis.status] || '#6b7280')
    doc.text(`Statut: ${statusLabels[devis.status] || devis.status}`, 400, 125, { align: 'right' })
    doc.fillColor('black')

    // Client info box
    doc.rect(50, 160, 250, 100).stroke()
    doc.fontSize(10).font('Helvetica-Bold').text('DESTINATAIRE:', 60, 170)
    doc.font('Helvetica').text(devis.clientName, 60, 185)
    if (devis.clientAddress) {
      const clientAddressLines = devis.clientAddress.split('\n')
      clientAddressLines.forEach((line, i) => {
        doc.text(line, 60, 200 + (i * 12))
      })
    }
    if (devis.clientSIRET) {
      doc.text(`SIRET: ${devis.clientSIRET}`, 60, 235)
    }
    if (devis.clientTVAIntra) {
      doc.text(`TVA: ${devis.clientTVAIntra}`, 60, 247)
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
    const items = typeof devis.items === 'string' ? JSON.parse(devis.items) : devis.items
    
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
    doc.text(formatCurrency(devis.subtotalHT), 470, y)
    
    y += 20
    doc.text(`TVA (${devis.tvaRate}%)`, 370, y, { width: 100, align: 'right' })
    doc.text(formatCurrency(devis.tvaAmount), 470, y)
    
    y += 25
    doc.fontSize(12).font('Helvetica-Bold')
    doc.text('Total TTC', 370, y, { width: 100, align: 'right' })
    doc.text(formatCurrency(devis.totalTTC), 470, y)

    // Validity notice
    y += 60
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6b7280')
    doc.text(`Ce devis est valable jusqu'au ${new Date(devis.validUntil).toLocaleDateString('fr-FR')}.`, 50, y)
    doc.text('En signant ce devis, vous acceptez les conditions ci-dessus.', 50, y + 15)
    doc.fillColor('black')

    // Signature area
    y += 50
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('SIGNATURE DU CLIENT', 50, y)
    doc.text('DATE ET CACHET', 350, y)
    
    y += 20
    doc.rect(50, y, 200, 60).stroke()
    doc.rect(350, y, 200, 60).stroke()

    // Footer
    doc.fontSize(8).font('Helvetica')
    doc.text(
      `${settings?.companyName || 'Mon Entreprise'} - ${settings?.companyAddress || ''} - SIRET: ${settings?.companySIRET || ''}`,
      50, 780,
      { align: 'center', width: 495 }
    )
    
    if (devis.notes) {
      doc.fontSize(9).font('Helvetica-Oblique')
      doc.text(`Note: ${devis.notes}`, 50, y + 80, { width: 495 })
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
        'Content-Disposition': `attachment; filename="${devis.devisNumber}.pdf"`,
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
