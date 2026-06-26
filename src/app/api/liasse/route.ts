import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mapLiasseTo2033A, mapLiasseTo2033B, mapLiasseTo2033E } from '@/lib/liasse-pdf-lines'
import { toHT } from '@/lib/ht-ttc'

// Category to Liasse field mapping
const CATEGORY_TO_LIASSE: Record<string, {
  field: string
  section: 'produit' | 'charge' | 'actif' | 'passif'
  line2033?: string
}> = {
  // Income
  'Prestations de services': { field: 'chiffreAffaires', section: 'produit', line2033: '2033-D A' },
  'Ventes de produits': { field: 'chiffreAffaires', section: 'produit', line2033: '2033-D A' },
  'Autres revenus': { field: 'autresProduits', section: 'produit', line2033: '2033-D E' },
  
  // Expenses - Services extérieurs
  'Fournitures de bureau': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Logiciels & Abonnements': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Télécommunications': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Frais bancaires': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Frais de déplacement': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Formation': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Publicité & Marketing': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Repas professionnels': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  
  // Expenses - Autres charges
  'Loyer & Charges': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Assurances': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  
  // Expenses - Honoraires
  'Honoraires (comptable, avocat)': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  
  // Expenses - Achats
  'Materiel informatique': { field: 'achats', section: 'charge', line2033: '2033-D F' },
  
  // Expenses - Charges sociales et fiscales
  'Cotisations sociales': { field: 'chargesPersonnel', section: 'charge', line2033: '2033-D H' },
  'Rémunération': { field: 'chargesPersonnel', section: 'charge', line2033: '2033-D H' },
  'Impôts et taxes': { field: 'impotsTaxes', section: 'charge', line2033: '2033-D I' },
  
  // Non-deductible - BUG-014 FIX: Dividendes are NOT charges, they're profit distribution
  'Dividendes': { field: 'nonDeductible', section: 'charge' },
  'Dépenses diverses justifiées': { field: 'servicesExterieurs', section: 'charge', line2033: '2033-D G' },
  'Retrait espèces': { field: 'nonDeductible', section: 'charge' },
  'Non catégorisé': { field: 'autresCharges', section: 'charge', line2033: '2033-D G' },
}

// GET - List all liasses or get specific year
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    if (year) {
      const liasse = await db.liasseFiscale.findUnique({
        where: { year: parseInt(year) }
      })

      // Compute PDF line mappings from the liasse values
      let pdfLines: Record<string, Record<string, number | boolean>> = {}
      if (liasse) {
        const values: Record<string, number> = {
          immoIncorporelles: liasse.immoIncorporelles,
          immoCorporelles: liasse.immoCorporelles,
          immoFinancieres: liasse.immoFinancieres,
          totalImmo: liasse.totalImmo,
          stocks: liasse.stocks,
          creancesClients: liasse.creancesClients,
          autresCreances: liasse.autresCreances,
          disponibilites: liasse.disponibilites,
          totalActifCirculant: liasse.totalActifCirculant,
          totalActif: liasse.totalActif,
          capital: liasse.capital,
          reserves: liasse.reserves,
          reportANouveau: liasse.reportANouveau,
          resultatExercice: liasse.resultatExercice,
          totalCapitauxPropres: liasse.totalCapitauxPropres,
          emprunts: liasse.emprunts,
          dettesFournisseurs: liasse.dettesFournisseurs,
          dettesFiscales: liasse.dettesFiscales,
          dettesSociales: liasse.dettesSociales,
          autresDettes: liasse.autresDettes,
          totalDettes: liasse.totalDettes,
          totalPassif: liasse.totalPassif,
          chiffreAffaires: liasse.chiffreAffaires,
          productionStockee: liasse.productionStockee,
          productionImmo: liasse.productionImmo,
          subventions: liasse.subventions,
          autresProduits: liasse.autresProduits,
          totalProduits: liasse.totalProduits,
          achats: liasse.achats,
          variationStocks: liasse.variationStocks,
          servicesExterieurs: liasse.servicesExterieurs,
          chargesPersonnel: liasse.chargesPersonnel,
          impotsTaxes: liasse.impotsTaxes,
          dotationsAmort: liasse.dotationsAmort,
          dotationsProvisions: liasse.dotationsProvisions,
          chargesFinancieres: liasse.chargesFinancieres,
          chargesExceptionnelles: liasse.chargesExceptionnelles,
          totalCharges: liasse.totalCharges,
          resultatCourant: liasse.resultatCourant,
          resultatExceptionnel: liasse.resultatExceptionnel,
          impotSurSocietes: liasse.impotSurSocietes,
          resultatNet: liasse.resultatNet,
          effectif: liasse.effectif,
          valeurAjoutee: liasse.tvaCollectee - liasse.tvaDeductible, // placeholder; real VA computed by CVAE1
          resultatComptable: liasse.resultatComptable,
          retraitements: liasse.retraitements,
          resultatFiscal: liasse.resultatFiscal,
          chargesDeductibles: liasse.chargesDeductibles,
          deficitAnterieur: liasse.deficitAnterieur,
          deficitUtilise: liasse.deficitUtilise,
          baseImposableIS: liasse.baseImposableIS,
          isAPayer: liasse.isAPayer,
        }
        pdfLines = {
          '2033-A': mapLiasseTo2033A(values as any),
          '2033-B': mapLiasseTo2033B(values as any),
          '2033-E': mapLiasseTo2033E(values as any, liasse.effectif),
        }
      }

      return NextResponse.json({ liasse, pdfLines })
    }

    const liasses = await db.liasseFiscale.findMany({
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

    // For fiscal year ending Nov 30, 2026 (year=2026), we need transactions from Dec 1, 2025 to Nov 30, 2026
    const targetYear = year || new Date().getFullYear() - 1
    
    // Fiscal year: starts December of previous year, ends November of target year
    const startDate = new Date(targetYear - 1, 11, 1) // Dec 1 of previous year
    const endDate = new Date(targetYear, 10, 30, 23, 59, 59, 999) // Nov 30 of target year

    console.log(`Generating liasse for fiscal year ${targetYear}`)
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    const transactions = await db.transaction.findMany({
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

    console.log(`Found ${transactions.length} labeled transactions`)

    // Get settings
    const settings = await db.settings.findFirst()

    // BUG-008 FIX: Read capital from settings (default to 0 if not set)
    const companyCapital = settings?.capital || 0

    // BUG-011 FIX: Compute TVA data for liasse from transactions
    let liasseTvaCollectee = 0
    let liasseTvaDeductible = 0
    for (const t of transactions) {
      const amountTTC = Math.abs(t.amount)
      const rate = t.category?.defaultTvaRate ?? 0
      if (rate > 0) {
        const tva = Math.round((amountTTC * rate / (1 + rate)) * 100) / 100
        if (t.type === 'income') {
          liasseTvaCollectee += tva
        } else if (t.type === 'expense' && t.category?.taxDeductible) {
          liasseTvaDeductible += tva
        }
      }
    }
    liasseTvaCollectee = Math.round(liasseTvaCollectee * 100) / 100
    liasseTvaDeductible = Math.round(liasseTvaDeductible * 100) / 100
    const liasseTvaDue = Math.round((liasseTvaCollectee - liasseTvaDeductible) * 100) / 100
    console.log(`Liasse TVA: collectée=${liasseTvaCollectee}, déductible=${liasseTvaDeductible}, due=${liasseTvaDue}`)

    // Initialize all fields
    const liasseData: Record<string, number> = {
      chiffreAffaires: 0,
      autresProduits: 0,
      achats: 0,
      servicesExterieurs: 0,
      chargesPersonnel: 0,
      impotsTaxes: 0,
      dotationsAmort: 0,
      dotationsProvisions: 0,
      chargesFinancieres: 0,
      chargesExceptionnelles: 0,
      autresCharges: 0,
      nonDeductible: 0,
      
      // Detail fields for 2033-G
      loyers: 0,
      chargesLocatives: 0,
      entretienReparation: 0,
      primesAssurance: 0,
      fraisDeplacement: 0,
      fraisPostaux: 0,
      fraisTelecom: 0,
      fraisBancaires: 0,
      cadeaux: 0,
      repasProfessionnels: 0,
      publiciteMarketing: 0,
      formation: 0,
      expertComptable: 0,
      remunerationGerant: 0,
      cotisationsSociales: 0,
    }

    // Category breakdown for transparency
    const categoryBreakdown: Record<string, { count: number; total: number; field: string }> = {}

    // Process each transaction - convert TTC to HT for liasse fiscale
    // Using regime-aware toHT() — under franchise en base, amount is already HT
    // (no VAT collected); under reel, strip recoverable VAT.
    const vatRegime = settings?.vatRegime || 'franchise'
    for (const t of transactions) {
      const catName = t.category?.name || 'Non catégorisé'
      const amountTTC = Math.abs(t.amount)
      const tvaRate = t.category?.defaultTvaRate ?? 0
      const amountHT = toHT(amountTTC, tvaRate, vatRegime)
      
      // Track category breakdown (in HT)
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { count: 0, total: 0, field: 'unknown' }
      }
      categoryBreakdown[catName].count++
      categoryBreakdown[catName].total += amountHT

      if (t.type === 'income') {
        liasseData.chiffreAffaires += amountHT
        categoryBreakdown[catName].field = 'chiffreAffaires'
      } else if (t.type === 'expense') {
        const mapping = CATEGORY_TO_LIASSE[catName] || CATEGORY_TO_LIASSE['Non catégorisé']
        
        if (mapping && mapping.field !== 'nonDeductible') {
          liasseData[mapping.field] = (liasseData[mapping.field] || 0) + amountHT
          categoryBreakdown[catName].field = mapping.field
        } else if (mapping?.field === 'nonDeductible') {
          liasseData.nonDeductible += amountHT
          categoryBreakdown[catName].field = 'nonDeductible (not included)'
        }

        // Track specific expense types for 2033-G
        const cat = catName.toLowerCase()
        if (cat.includes('loyer')) liasseData.loyers += amountHT
        if (cat.includes('assurance')) liasseData.primesAssurance += amountHT
        if (cat.includes('déplacement') || cat.includes('transport')) liasseData.fraisDeplacement += amountHT
        if (cat.includes('télécom') || cat.includes('téléphone') || cat.includes('internet')) liasseData.fraisTelecom += amountHT
        if (cat.includes('bancaire')) liasseData.fraisBancaires += amountHT
        if (cat.includes('repas') || cat.includes('restaurant')) liasseData.repasProfessionnels += amountHT
        if (cat.includes('publicité') || cat.includes('marketing')) liasseData.publiciteMarketing += amountHT
        if (cat.includes('formation')) liasseData.formation += amountHT
        if (cat.includes('comptable') || cat.includes('avocat') || cat.includes('honoraire')) liasseData.expertComptable += amountHT
        if (cat.includes('rémunération') || cat.includes('salaire')) liasseData.remunerationGerant += amountHT
        if (cat.includes('cotisation') || cat.includes('social')) liasseData.cotisationsSociales += amountHT
      }
    }

    // Round all accumulated HT totals to avoid floating point errors
    for (const key of Object.keys(liasseData)) {
      liasseData[key] = Math.round(liasseData[key] * 100) / 100
    }

    // Calculate totals (all in HT)
    const totalProduits = Math.round((liasseData.chiffreAffaires + liasseData.autresProduits) * 100) / 100
    // BUG-010 FIX: Include dotationsProvisions in totalCharges
    const totalCharges = Math.round((liasseData.achats + 
                        liasseData.servicesExterieurs + 
                        liasseData.chargesPersonnel + 
                        liasseData.impotsTaxes + 
                        liasseData.dotationsAmort + 
                        liasseData.dotationsProvisions +
                        liasseData.chargesFinancieres + 
                        liasseData.chargesExceptionnelles) * 100) / 100

    const resultatCourant = Math.round((totalProduits - totalCharges) * 100) / 100

    // Look up previous year's liasse for deficit carry-forward
    const previousLiasse = await db.liasseFiscale.findUnique({
      where: { year: targetYear - 1 }
    })
    const deficitAnterieur = previousLiasse && previousLiasse.resultatNet < 0
      ? Math.round(Math.abs(previousLiasse.resultatNet) * 100) / 100
      : 0

    // Calculate IS (Impôt sur les Sociétés) with deficit carry-forward
    let isAPayer = 0
    let deficitUtilise = 0
    const resultatAvantDeficit = Math.max(0, resultatCourant)
    const baseImposableIS = Math.max(0, resultatAvantDeficit - deficitAnterieur)
    if (baseImposableIS > 0) {
      if (resultatAvantDeficit <= 42500) {
        // Entire result fits in reduced rate bracket
        isAPayer = Math.round(baseImposableIS * 0.15 * 100) / 100 // Taux réduit PME
      } else if (baseImposableIS <= 42500) {
        isAPayer = Math.round(baseImposableIS * 0.15 * 100) / 100
      } else {
        isAPayer = Math.round(((42500 * 0.15) + ((baseImposableIS - 42500) * 0.25)) * 100) / 100 // Taux standard au-delà
      }
      deficitUtilise = Math.round((resultatAvantDeficit - baseImposableIS) * 100) / 100
    } else if (deficitAnterieur > 0) {
      // Full deficit absorbed, remaining deficit carries forward
      deficitUtilise = Math.round(resultatAvantDeficit * 100) / 100
    }

    const resultatNet = Math.round((resultatCourant - isAPayer) * 100) / 100

    // Estimate cash position - fiscal year transactions only
    const fiscalYearIncome = await db.transaction.aggregate({
      where: { type: 'income', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    })
    const fiscalYearExpenses = await db.transaction.aggregate({
      where: { type: 'expense', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    })
    const disponibilites = Math.round(((fiscalYearIncome._sum.amount || 0) - Math.abs(fiscalYearExpenses._sum.amount || 0)) * 100) / 100

    // Create or update liasse
    const liasse = await db.liasseFiscale.upsert({
      where: { year: targetYear },
      create: {
        year: targetYear,
        status: 'draft',
        
        // Actif (Bilan)
        immoIncorporelles: 0,
        immoCorporelles: 0,
        immoFinancieres: 0,
        totalImmo: 0,
        stocks: 0,
        creancesClients: 0,
        autresCreances: 0,
        disponibilites: Math.max(0, disponibilites),
        totalActifCirculant: Math.max(0, disponibilites),
        totalActif: Math.max(0, disponibilites),
        
        // Passif (Bilan)
        capital: companyCapital,
        reserves: 0,
        reportANouveau: 0,
        resultatExercice: resultatNet,
        totalCapitauxPropres: companyCapital + resultatNet,
        emprunts: 0,
        dettesFournisseurs: 0,
        dettesFiscales: isAPayer,
        dettesSociales: 0,
        autresDettes: 0,
        totalDettes: isAPayer,
        totalPassif: companyCapital + resultatNet + isAPayer,
        
        // Compte de résultat
        chiffreAffaires: liasseData.chiffreAffaires,
        productionStockee: 0,
        productionImmo: 0,
        subventions: 0,
        autresProduits: liasseData.autresProduits,
        totalProduits,
        achats: liasseData.achats,
        variationStocks: 0,
        servicesExterieurs: liasseData.servicesExterieurs,
        chargesPersonnel: liasseData.chargesPersonnel,
        impotsTaxes: liasseData.impotsTaxes,
        dotationsAmort: liasseData.dotationsAmort,
        dotationsProvisions: 0,
        chargesFinancieres: liasseData.chargesFinancieres,
        chargesExceptionnelles: liasseData.chargesExceptionnelles,
        totalCharges,
        resultatCourant,
        resultatExceptionnel: 0,
        impotSurSocietes: isAPayer,
        resultatNet,
        
        // Informations complémentaires (2033-G)
        effectif: 0,
        dureeExercice: 12,
        loyers: liasseData.loyers,
        chargesLocatives: liasseData.chargesLocatives,
        entretienReparation: liasseData.entretienReparation,
        primesAssurance: liasseData.primesAssurance,
        fraisDeplacement: liasseData.fraisDeplacement,
        fraisPostaux: liasseData.fraisPostaux,
        fraisTelecom: liasseData.fraisTelecom,
        fraisBancaires: liasseData.fraisBancaires,
        cadeaux: liasseData.cadeaux,
        repasProfessionnels: liasseData.repasProfessionnels,
        formation: liasseData.formation,
        publiciteMarketing: liasseData.publiciteMarketing,
        expertComptable: liasseData.expertComptable,
        materielsOutils: 0,
        materielsBureau: 0,
        materielsInfo: 0,
        vehicules: 0,
        tvaCollectee: liasseTvaCollectee,
        tvaDeductible: liasseTvaDeductible,
        tvaDue: liasseTvaDue,
        remunerationGerant: liasseData.remunerationGerant,
        cotisationsSociales: liasseData.cotisationsSociales,
        
        // Déclaration (2065)
        resultatComptable: resultatCourant,
        retraitements: 0,
        resultatFiscal: resultatCourant,
        chargesDeductibles: 0,
        deficitAnterieur,
        deficitUtilise,
        baseImposableIS,
        isAPayer,
      },
      update: {
        // Update all calculated values
        disponibilites: Math.max(0, disponibilites),
        totalActifCirculant: Math.max(0, disponibilites),
        totalActif: Math.max(0, disponibilites),
        resultatExercice: resultatNet,
        totalCapitauxPropres: companyCapital + resultatNet,
        capital: companyCapital,
        dettesFiscales: isAPayer,
        totalDettes: isAPayer,
        totalPassif: companyCapital + resultatNet + isAPayer,
        chiffreAffaires: liasseData.chiffreAffaires,
        autresProduits: liasseData.autresProduits,
        totalProduits,
        achats: liasseData.achats,
        servicesExterieurs: liasseData.servicesExterieurs,
        chargesPersonnel: liasseData.chargesPersonnel,
        impotsTaxes: liasseData.impotsTaxes,
        dotationsAmort: liasseData.dotationsAmort,
        chargesFinancieres: liasseData.chargesFinancieres,
        chargesExceptionnelles: liasseData.chargesExceptionnelles,
        totalCharges,
        resultatCourant,
        impotSurSocietes: isAPayer,
        resultatNet,
        loyers: liasseData.loyers,
        primesAssurance: liasseData.primesAssurance,
        fraisDeplacement: liasseData.fraisDeplacement,
        fraisTelecom: liasseData.fraisTelecom,
        fraisBancaires: liasseData.fraisBancaires,
        cadeaux: liasseData.cadeaux,
        repasProfessionnels: liasseData.repasProfessionnels,
        formation: liasseData.formation,
        publiciteMarketing: liasseData.publiciteMarketing,
        expertComptable: liasseData.expertComptable,
        remunerationGerant: liasseData.remunerationGerant,
        cotisationsSociales: liasseData.cotisationsSociales,
        deficitAnterieur,
        deficitUtilise,
        baseImposableIS,
        isAPayer,
      }
    })

    console.log(`Liasse generated successfully:`)
    console.log(`  - CA: ${liasseData.chiffreAffaires}`)
    console.log(`  - Charges: ${totalCharges}`)
    console.log(`  - Résultat: ${resultatCourant}`)
    console.log(`  - IS: ${isAPayer}`)

    return NextResponse.json({
      success: true,
      liasse,
      summary: {
        transactions: transactions.length,
        chiffreAffaires: liasseData.chiffreAffaires,
        totalCharges,
        resultatCourant,
        isAPayer,
        resultatNet,
        nonDeductible: liasseData.nonDeductible,
        repasProfessionnels: liasseData.repasProfessionnels,
        deficitAnterieur,
        deficitUtilise,
        baseImposableIS,
        disponibilites,
      },
      categoryBreakdown,
    })
  } catch (error) {
    console.error('Error generating liasse:', error)
    return NextResponse.json({ 
      error: 'Failed to generate liasse',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
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

    // BUG-013 FIX: Calculate IS on resultatCourant (before exceptionnel and IS), not resultatNet
    let isAPayer = 0
    const baseImposableIS = Math.max(0, resultatCourant)
    if (baseImposableIS > 0) {
      if (baseImposableIS <= 42500) {
        isAPayer = Math.round(baseImposableIS * 0.15 * 100) / 100
      } else {
        isAPayer = Math.round((42500 * 0.15 + (baseImposableIS - 42500) * 0.25) * 100) / 100
      }
    }

    const liasse = await db.liasseFiscale.update({
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

    await db.liasseFiscale.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting liasse:', error)
    return NextResponse.json({ error: 'Failed to delete liasse' }, { status: 500 })
  }
}
