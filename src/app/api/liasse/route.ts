import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - List all liasses or get specific year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    if (year) {
      const liasse = await prisma.liasseFiscale.findUnique({
        where: { year: parseInt(year) }
      })
      return NextResponse.json({ liasse })
    }

    const liasses = await prisma.liasseFiscale.findMany({
      orderBy: { year: 'desc' }
    })
    return NextResponse.json({ liasses })
  } catch (error) {
    console.error('Error fetching liasse:', error)
    return NextResponse.json({ error: 'Failed to fetch liasse' }, { status: 500 })
  }
}

// POST - Generate liasse from transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year } = body

    const targetYear = year || new Date().getFullYear() - 1

    // Get all transactions for the fiscal year
    const startDate = new Date(targetYear, 0, 1) // Jan 1st
    const endDate = new Date(targetYear, 11, 31) // Dec 31st

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        labeled: true
      },
      include: {
        category: true
      }
    })

    // Get settings
    const settings = await prisma.settings.findFirst()

    // Calculate values from transactions
    let chiffreAffaires = 0
    let achats = 0
    let loyers = 0
    let chargesLocatives = 0
    let entretienReparation = 0
    let primesAssurance = 0
    let fraisDeplacement = 0
    let fraisPostaux = 0
    let fraisTelecom = 0
    let fraisBancaires = 0
    let cadeaux = 0
    let impotsTaxes = 0
    let autresCharges = 0
    let expertComptable = 0
    let publiciteMarketing = 0
    let formation = 0

    for (const t of transactions) {
      if (t.type === 'income') {
        chiffreAffaires += Math.abs(t.amount)
      } else if (t.type === 'expense') {
        const cat = t.category?.name?.toLowerCase() || ''
        const amount = Math.abs(t.amount)

        if (cat.includes('fourniture') || cat.includes('matériel') || cat.includes('équipement')) {
          achats += amount
        } else if (cat.includes('loyer')) {
          loyers += amount
        } else if (cat.includes('énergie') || cat.includes('électricité') || cat.includes('gaz') || cat.includes('eau')) {
          chargesLocatives += amount
        } else if (cat.includes('assurance')) {
          primesAssurance += amount
        } else if (cat.includes('transport') || cat.includes('déplacement')) {
          fraisDeplacement += amount
        } else if (cat.includes('téléphone') || cat.includes('internet') || cat.includes('telecom')) {
          fraisTelecom += amount
        } else if (cat.includes('bancaire')) {
          fraisBancaires += amount
        } else if (cat.includes('impôt') || cat.includes('taxe') || cat.includes('cfe')) {
          impotsTaxes += amount
        } else if (cat.includes('repas') || cat.includes('réception')) {
          cadeaux += amount
        } else if (cat.includes('expert') || cat.includes('comptable')) {
          expertComptable += amount
        } else if (cat.includes('publicité') || cat.includes('marketing')) {
          publiciteMarketing += amount
        } else if (cat.includes('formation')) {
          formation += amount
        } else {
          autresCharges += amount
        }
      }
    }

    // Calculate totals
    const servicesExterieurs = loyers + chargesLocatives + entretienReparation +
                               primesAssurance + fraisDeplacement + fraisPostaux +
                               fraisTelecom + fraisBancaires + cadeaux + autresCharges +
                               expertComptable + publiciteMarketing + formation

    const totalProduits = chiffreAffaires
    const totalCharges = achats + servicesExterieurs + impotsTaxes
    const resultatCourant = totalProduits - totalCharges

    // Calculate IS
    let isAPayer = 0
    let baseImposableIS = Math.max(0, resultatCourant)
    if (baseImposableIS > 0) {
      if (baseImposableIS <= 42500) {
        isAPayer = baseImposableIS * 0.15
      } else {
        isAPayer = (42500 * 0.15) + ((baseImposableIS - 42500) * 0.25)
      }
    }

    const resultatNet = resultatCourant - isAPayer

    // Create or update liasse
    const liasse = await prisma.liasseFiscale.upsert({
      where: { year: targetYear },
      create: {
        year: targetYear,
        status: 'draft',
        
        // Actif
        immoIncorporelles: 0,
        immoCorporelles: 0,
        immoFinancieres: 0,
        totalImmo: 0,
        stocks: 0,
        creancesClients: 0,
        autresCreances: 0,
        disponibilites: chiffreAffaires - totalCharges,
        totalActifCirculant: chiffreAffaires - totalCharges,
        totalActif: chiffreAffaires - totalCharges,
        
        // Passif
        capital: 1000, // Default minimum capital
        reserves: 0,
        reportANouveau: 0,
        resultatExercice: resultatNet,
        totalCapitauxPropres: 1000 + resultatNet,
        emprunts: 0,
        dettesFournisseurs: 0,
        dettesFiscales: isAPayer,
        dettesSociales: 0,
        autresDettes: 0,
        totalDettes: isAPayer,
        totalPassif: 1000 + resultatNet + isAPayer,
        
        // Compte de résultat
        chiffreAffaires,
        productionStockee: 0,
        productionImmo: 0,
        subventions: 0,
        autresProduits: 0,
        totalProduits,
        achats,
        variationStocks: 0,
        servicesExterieurs,
        chargesPersonnel: 0,
        impotsTaxes,
        dotationsAmort: 0,
        dotationsProvisions: 0,
        chargesFinancieres: 0,
        chargesExceptionnelles: 0,
        totalCharges,
        resultatCourant,
        resultatExceptionnel: 0,
        impotSurSocietes: isAPayer,
        resultatNet,
        
        // Informations
        effectif: 0,
        dureeExercice: 12,
        loyers,
        chargesLocatives,
        entretienReparation,
        primesAssurance,
        fraisDeplacement,
        fraisPostaux,
        fraisTelecom,
        fraisBancaires,
        cadeaux,
        materielsOutils: 0,
        materielsBureau: 0,
        materielsInfo: 0,
        vehicules: 0,
        tvaCollectee: 0,
        tvaDeductible: 0,
        tvaDue: 0,
        remunerationGerant: 0,
        cotisationsSociales: 0,
        
        // Déclaration
        resultatComptable: resultatCourant,
        retraitements: 0,
        resultatFiscal: resultatCourant,
        chargesDeductibles: 0,
        deficitAnterieur: 0,
        deficitUtilise: 0,
        baseImposableIS,
        isAPayer,
      },
      update: {
        // Update with new calculated values
        disponibilites: chiffreAffaires - totalCharges,
        totalActifCirculant: chiffreAffaires - totalCharges,
        totalActif: chiffreAffaires - totalCharges,
        resultatExercice: resultatNet,
        totalCapitauxPropres: 1000 + resultatNet,
        dettesFiscales: isAPayer,
        totalDettes: isAPayer,
        totalPassif: 1000 + resultatNet + isAPayer,
        chiffreAffaires,
        totalProduits,
        achats,
        servicesExterieurs,
        impotsTaxes,
        totalCharges,
        resultatCourant,
        impotSurSocietes: isAPayer,
        resultatNet,
        loyers,
        chargesLocatives,
        primesAssurance,
        fraisDeplacement,
        fraisTelecom,
        fraisBancaires,
        cadeaux,
        baseImposableIS,
        isAPayer,
      }
    })

    return NextResponse.json({
      success: true,
      liasse,
      summary: {
        transactions: transactions.length,
        chiffreAffaires,
        totalCharges,
        resultatCourant,
        isAPayer,
        resultatNet
      }
    })
  } catch (error) {
    console.error('Error generating liasse:', error)
    return NextResponse.json({ error: 'Failed to generate liasse' }, { status: 500 })
  }
}

// PUT - Update liasse manually
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    // Recalculate totals
    const totalImmo = (data.immoIncorporelles || 0) + (data.immoCorporelles || 0) + (data.immoFinancieres || 0)
    const totalActifCirculant = (data.stocks || 0) + (data.creancesClients || 0) + (data.autresCreances || 0) + (data.disponibilites || 0)
    const totalActif = totalImmo + totalActifCirculant

    const totalCapitauxPropres = (data.capital || 0) + (data.reserves || 0) + (data.reportANouveau || 0) + (data.resultatExercice || 0)
    const totalDettes = (data.emprunts || 0) + (data.dettesFournisseurs || 0) + (data.dettesFiscales || 0) + (data.dettesSociales || 0) + (data.autresDettes || 0)
    const totalPassif = totalCapitauxPropres + totalDettes

    const totalProduits = (data.chiffreAffaires || 0) + (data.productionStockee || 0) + (data.productionImmo || 0) + (data.subventions || 0) + (data.autresProduits || 0)
    const totalCharges = (data.achats || 0) + (data.variationStocks || 0) + (data.servicesExterieurs || 0) + (data.chargesPersonnel || 0) +
                        (data.impotsTaxes || 0) + (data.dotationsAmort || 0) + (data.dotationsProvisions || 0) +
                        (data.chargesFinancieres || 0) + (data.chargesExceptionnelles || 0)

    const resultatCourant = totalProduits - totalCharges
    const resultatNet = resultatCourant + (data.resultatExceptionnel || 0) - (data.impotSurSocietes || 0)

    // Calculate IS
    let isAPayer = 0
    const baseImposableIS = Math.max(0, resultatCourant)
    if (baseImposableIS > 0) {
      if (baseImposableIS <= 42500) {
        isAPayer = baseImposableIS * 0.15
      } else {
        isAPayer = (42500 * 0.15) + ((baseImposableIS - 42500) * 0.25)
      }
    }

    const liasse = await prisma.liasseFiscale.update({
      where: { id },
      data: {
        ...data,
        totalImmo,
        totalActifCirculant,
        totalActif,
        totalCapitauxPropres,
        totalDettes,
        totalPassif,
        totalProduits,
        totalCharges,
        resultatCourant,
        resultatNet,
        baseImposableIS,
        isAPayer,
        impotSurSocietes: isAPayer,
      }
    })

    return NextResponse.json({ success: true, liasse })
  } catch (error) {
    console.error('Error updating liasse:', error)
    return NextResponse.json({ error: 'Failed to update liasse' }, { status: 500 })
  }
}

// DELETE - Delete a liasse
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    await prisma.liasseFiscale.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting liasse:', error)
    return NextResponse.json({ error: 'Failed to delete liasse' }, { status: 500 })
  }
}
