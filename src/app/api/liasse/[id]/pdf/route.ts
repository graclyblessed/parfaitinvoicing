import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const liasse = await prisma.liasseFiscale.findUnique({
      where: { id }
    })

    if (!liasse) {
      return NextResponse.json({ error: 'Liasse not found' }, { status: 404 })
    }

    // Get settings
    const settings = await prisma.settings.findFirst()

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Header
    doc.fontSize(16).font('Helvetica-Bold')
       .text('LIASSE FISCALE - REGIME SIMPLIFIE', { align: 'center' })
    doc.fontSize(12).font('Helvetica')
       .text(`Exercice ${liasse.year}`, { align: 'center' })
    doc.moveDown(0.5)

    // Company Info
    if (settings) {
      doc.fontSize(10)
         .text(settings.companyName, { align: 'left' })
         .text(`SIRET: ${settings.companySIRET}`, { align: 'left' })
         .text(settings.companyAddress, { align: 'left' })
      doc.moveDown(1)
    }

    // Helper functions
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.round(amount)) + ' €'
    }

    const drawTable = (title: string, rows: Array<{ label: string; value: number; bold?: boolean }>) => {
      doc.fontSize(12).font('Helvetica-Bold').text(title)
      doc.moveDown(0.3)
      
      const tableTop = doc.y
      const col1X = 50
      const col2X = 400
      
      doc.fontSize(9)
      rows.forEach((row, index) => {
        const y = tableTop + (index * 18)
        
        if (row.bold) {
          doc.font('Helvetica-Bold')
            .rect(col1X, y - 2, 495, 16).fill('#f0f0f0')
            .fillColor('black')
        } else {
          doc.font('Helvetica')
        }
        
        doc.text(row.label, col1X + 5, y)
        doc.text(formatCurrency(row.value), col2X, y, { align: 'right', width: 95 })
      })
      
      doc.y = tableTop + (rows.length * 18) + 10
    }

    // PAGE 1: Compte de Résultat (Form 2033-D)
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold')
       .text('FORMULAIRE 2033-D - COMPTE DE RESULTAT', { align: 'center' })
    doc.moveDown(1)

    drawTable('PRODUITS (Charges)', [
      { label: 'Chiffre d\'affaires', value: liasse.chiffreAffaires },
      { label: 'Production stockée', value: liasse.productionStockee },
      { label: 'Production immobilisée', value: liasse.productionImmo },
      { label: 'Subventions d\'exploitation', value: liasse.subventions },
      { label: 'Autres produits', value: liasse.autresProduits },
      { label: 'TOTAL PRODUITS', value: liasse.totalProduits, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('CHARGES (Dépenses)', [
      { label: 'Achats de marchandises, matières premières', value: liasse.achats },
      { label: 'Variation de stocks', value: liasse.variationStocks },
      { label: 'Services extérieurs (loyers, assurances, etc.)', value: liasse.servicesExterieurs },
      { label: 'Charges de personnel', value: liasse.chargesPersonnel },
      { label: 'Impôts et taxes', value: liasse.impotsTaxes },
      { label: 'Dotations aux amortissements', value: liasse.dotationsAmort },
      { label: 'Dotations aux provisions', value: liasse.dotationsProvisions },
      { label: 'Charges financières', value: liasse.chargesFinancieres },
      { label: 'Charges exceptionnelles', value: liasse.chargesExceptionnelles },
      { label: 'TOTAL CHARGES', value: liasse.totalCharges, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('RESULTAT', [
      { label: 'Résultat courant', value: liasse.resultatCourant },
      { label: 'Résultat exceptionnel', value: liasse.resultatExceptionnel },
      { label: 'Impôt sur les sociétés', value: liasse.impotSurSocietes },
      { label: 'RESULTAT NET DE L\'EXERCICE', value: liasse.resultatNet, bold: true },
    ])

    // PAGE 2: Bilan Actif (Form 2033-A)
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold')
       .text('FORMULAIRE 2033-A - BILAN ACTIF', { align: 'center' })
    doc.moveDown(1)

    drawTable('IMMOBILISATIONS', [
      { label: 'Immobilisations incorporelles', value: liasse.immoIncorporelles },
      { label: 'Immobilisations corporelles', value: liasse.immoCorporelles },
      { label: 'Immobilisations financières', value: liasse.immoFinancieres },
      { label: 'TOTAL IMMOBILISATIONS', value: liasse.totalImmo, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('ACTIF CIRCULANT', [
      { label: 'Stocks', value: liasse.stocks },
      { label: 'Créances clients', value: liasse.creancesClients },
      { label: 'Autres créances', value: liasse.autresCreances },
      { label: 'Disponibilités (trésorerie)', value: liasse.disponibilites },
      { label: 'TOTAL ACTIF CIRCULANT', value: liasse.totalActifCirculant, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('TOTAL ACTIF', [
      { label: 'TOTAL GENERAL ACTIF', value: liasse.totalActif, bold: true },
    ])

    // PAGE 3: Bilan Passif
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold')
       .text('FORMULAIRE 2033-A - BILAN PASSIF', { align: 'center' })
    doc.moveDown(1)

    drawTable('CAPITAUX PROPRES', [
      { label: 'Capital social', value: liasse.capital },
      { label: 'Réserves', value: liasse.reserves },
      { label: 'Report à nouveau', value: liasse.reportANouveau },
      { label: 'Résultat de l\'exercice', value: liasse.resultatExercice },
      { label: 'TOTAL CAPITAUX PROPRES', value: liasse.totalCapitauxPropres, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('DETTES', [
      { label: 'Emprunts et dettes financières', value: liasse.emprunts },
      { label: 'Dettes fournisseurs', value: liasse.dettesFournisseurs },
      { label: 'Dettes fiscales (IS, TVA)', value: liasse.dettesFiscales },
      { label: 'Dettes sociales', value: liasse.dettesSociales },
      { label: 'Autres dettes', value: liasse.autresDettes },
      { label: 'TOTAL DETTES', value: liasse.totalDettes, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('TOTAL PASSIF', [
      { label: 'TOTAL GENERAL PASSIF', value: liasse.totalPassif, bold: true },
    ])

    // PAGE 4: Informations complémentaires (Form 2033-G)
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold')
       .text('FORMULAIRE 2033-G - INFORMATIONS COMPLEMENTAIRES', { align: 'center' })
    doc.moveDown(1)

    doc.fontSize(10).font('Helvetica')
       .text(`Effectif: ${liasse.effectif} salarié(s)`)
       .text(`Durée de l'exercice: ${liasse.dureeExercice} mois`)
    doc.moveDown(1)

    drawTable('DETAIL DES CHARGES EXTERNES', [
      { label: 'Loyers', value: liasse.loyers },
      { label: 'Charges locatives (énergie, eau)', value: liasse.chargesLocatives },
      { label: 'Entretien et réparations', value: liasse.entretienReparation },
      { label: 'Primes d\'assurance', value: liasse.primesAssurance },
      { label: 'Frais de déplacement', value: liasse.fraisDeplacement },
      { label: 'Frais postaux', value: liasse.fraisPostaux },
      { label: 'Frais de télécommunication', value: liasse.fraisTelecom },
      { label: 'Frais bancaires', value: liasse.fraisBancaires },
      { label: 'Cadeaux, frais de réception', value: liasse.cadeaux },
    ])

    doc.moveDown(0.5)

    drawTable('TVA', [
      { label: 'TVA collectée', value: liasse.tvaCollectee },
      { label: 'TVA déductible', value: liasse.tvaDeductible },
      { label: 'TVA due', value: liasse.tvaDue },
    ])

    // PAGE 5: Déclaration IS (Form 2065)
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold')
       .text('FORMULAIRE 2065 - DECLARATION DES RESULTATS', { align: 'center' })
    doc.moveDown(1)

    drawTable('CALCUL DU RESULTAT FISCAL', [
      { label: 'Résultat comptable', value: liasse.resultatComptable },
      { label: 'Retraitements (réintégrations)', value: liasse.retraitements },
      { label: 'RESULTAT FISCAL', value: liasse.resultatFiscal, bold: true },
    ])

    doc.moveDown(0.5)

    drawTable('DEFICITES REPORTABLES', [
      { label: 'Déficit antérieur reportable', value: liasse.deficitAnterieur },
      { label: 'Déficit utilisé', value: liasse.deficitUtilise },
    ])

    doc.moveDown(0.5)

    drawTable('BASE IMPOSABLE ET IS', [
      { label: 'Base imposable à l\'IS', value: liasse.baseImposableIS, bold: true },
      { label: 'IS à payer (15% jusqu\'à 42 500 €, 25% au-delà)', value: liasse.isAPayer, bold: true },
    ])

    // Footer on last page
    doc.moveDown(2)
    doc.fontSize(8).font('Helvetica-Oblique')
       .text('Ce document est généré automatiquement par Parfait Invoicing.', { align: 'center' })
       .text('Il doit être vérifié et validé avant toute soumission à l\'administration fiscale.', { align: 'center' })

    // Finalize PDF
    const pdf = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.end()
    })

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="liasse_fiscale_${liasse.year}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
