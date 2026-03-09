// Liasse Fiscale Types for SASU - Régime Simplifié
// Forms: 2033-SD, 2033-A, 2033-B, 2033-D, 2033-G, 2065

export interface LiasseFiscale {
  id: string
  year: number
  status: 'draft' | 'complete' | 'filed'
  
  // Bilan (Balance Sheet) - Form 2033-A
  actif: Actif
  passif: Passif
  
  // Compte de résultat - Form 2033-D
  compteResultat: CompteResultat
  
  // Informations complémentaires - Form 2033-G
  informations: InformationsComplementaires
  
  // Déclaration résultat - Form 2065
  declarationResultat: DeclarationResultat
  
  createdAt: Date
  updatedAt: Date
}

export interface Actif {
  // Immobilisations
  immobilisationsIncorporelles: number // 010
  immobilisationsCorporelles: number   // 020
  immobilisationsFinancieres: number   // 030
  totalImmobilisations: number         // 040
  
  // Actif circulant
  stocks: number                       // 050
  creancesClients: number              // 060
  autresCreances: number               // 070
  disponibilites: number               // 080 (cash in bank)
  totalActifCirculant: number          // 090
  
  // Total Actif
  totalActif: number                   // 100
}

export interface Passif {
  // Capitaux propres
  capital: number                      // 110
  reserves: number                     // 120
  reportANouveau: number               // 130 (loss carried forward, negative)
  resultatExercice: number             // 140
  totalCapitauxPropres: number         // 150
  
  // Dettes
  emprunts: number                     // 160
  dettesFournisseurs: number           // 170
  dettesFiscales: number               // 180 (IS, TVA due)
  dettesSociales: number               // 190 (URSSAF, retirement)
  autresDettes: number                 // 200
  totalDettes: number                  // 210
  
  // Total Passif
  totalPassif: number                  // 220
}

export interface CompteResultat {
  // Produits (Income)
  chiffreAffaires: number              // 001 (revenue from services)
  productionStockee: number            // 002
  productionImmobilisee: number        // 003
  subventions: number                  // 004
  autresProduits: number               // 005
  totalProduits: number                // 006
  
  // Charges (Expenses)
  achats: number                       // 010
  variationStocks: number              // 011
  servicesExterieurs: number           // 012 (rent, utilities, insurance)
  chargesPersonnel: number             // 013 (salaries if any)
  impotsTaxes: number                  // 014 (CFE, etc.)
  dotationsAmortissements: number      // 015
  dotationsProvisions: number          // 016
  chargesFinancieres: number           // 017 (interest)
  chargesExceptionnelles: number       // 018
  totalCharges: number                 // 019
  
  // Résultat
  resultatCourant: number              // 020 (totalProduits - totalCharges)
  resultatExceptionnel: number         // 021
  impotSurSocietes: number             // 022
  resultatNet: number                  // 023
}

export interface InformationsComplementaires {
  // Informations générales
  effectif: number                     // Number of employees (0 for SASU without employees)
  dureeExercice: number                // Duration in months (usually 12)
  
  // Détail des charges
  loyers: number
  chargesLocatives: number
  entretienReparation: number
  primesAssurance: number
  fraisDeplacement: number
  fraisPostaux: number
  fraisTelecom: number
  fraisBancaires: number
  cadeaux: number
  
  // Détail des immobilisations
  materielsOutils: number
  materielsBureau: number
  materielsInformatique: number
  vehicules: number
  
  // TVA
  tvaCollectee: number
  tvaDeductible: number
  tvaDue: number
  
  // Rémunérations dirigeant
  remunerationGerant: number           // 0 for SASU usually (dividends instead)
  cotisationsSociales: number
}

export interface DeclarationResultat {
  // Form 2065 - Résultat fiscal
  resultatComptable: number            // AA
  retraitements: number                // AB (add backs)
  resultatFiscal: number               // AC
  
  // Déduction
  chargesDeductibles: number           // AD
  
  // Report déficitaire
  deficitAnterieur: number             // AE (losses carried forward)
  deficitUtilise: number               // AF
  
  // Base imposable
  baseImposableIS: number              // AG
  
  // IS calculé
  isAPayer: number                     // AH
}

// French Tax Rates for IS
export const IS_RATES = {
  TAUX_REDUIT: 0.15,                   // 15% up to €42,500
  TAUX_NORMAL: 0.25,                   // 25% above €42,500
  PLAFOND_TAUX_REDUIT: 42500,
}

// Calculate IS (Impôt sur les Sociétés)
export function calculateIS(baseImposable: number): number {
  if (baseImposable <= 0) return 0
  
  if (baseImposable <= IS_RATES.PLAFOND_TAUX_REDUIT) {
    return baseImposable * IS_RATES.TAUX_REDUIT
  }
  
  const partReduite = IS_RATES.PLAFOND_TAUX_REDUIT * IS_RATES.TAUX_REDUIT
  const partNormale = (baseImposable - IS_RATES.PLAFOND_TAUX_REDUIT) * IS_RATES.TAUX_NORMAL
  
  return partReduite + partNormale
}

// TVA Rates
export const TVA_RATES = {
  TAUX_NORMAL: 0.20,                   // 20%
  TAUX_INTERMEDIAIRE: 0.10,            // 10%
  TAUX_REDUIT: 0.055,                  // 5.5%
  TAUX_SUPER_REDUIT: 0.021,            // 2.1%
}

// Calculate totals from raw data
export function calculateActifTotals(actif: Partial<Actif>): Actif {
  const immobilisationsIncorporelles = actif.immobilisationsIncorporelles || 0
  const immobilisationsCorporelles = actif.immobilisationsCorporelles || 0
  const immobilisationsFinancieres = actif.immobilisationsFinancieres || 0
  const stocks = actif.stocks || 0
  const creancesClients = actif.creancesClients || 0
  const autresCreances = actif.autresCreances || 0
  const disponibilites = actif.disponibilites || 0
  
  const totalImmobilisations = immobilisationsIncorporelles + immobilisationsCorporelles + immobilisationsFinancieres
  const totalActifCirculant = stocks + creancesClients + autresCreances + disponibilites
  const totalActif = totalImmobilisations + totalActifCirculant
  
  return {
    immobilisationsIncorporelles,
    immobilisationsCorporelles,
    immobilisationsFinancieres,
    totalImmobilisations,
    stocks,
    creancesClients,
    autresCreances,
    disponibilites,
    totalActifCirculant,
    totalActif,
  }
}

export function calculatePassifTotals(passif: Partial<Passif>): Passif {
  const capital = passif.capital || 0
  const reserves = passif.reserves || 0
  const reportANouveau = passif.reportANouveau || 0
  const resultatExercice = passif.resultatExercice || 0
  const emprunts = passif.emprunts || 0
  const dettesFournisseurs = passif.dettesFournisseurs || 0
  const dettesFiscales = passif.dettesFiscales || 0
  const dettesSociales = passif.dettesSociales || 0
  const autresDettes = passif.autresDettes || 0
  
  const totalCapitauxPropres = capital + reserves + reportANouveau + resultatExercice
  const totalDettes = emprunts + dettesFournisseurs + dettesFiscales + dettesSociales + autresDettes
  const totalPassif = totalCapitauxPropres + totalDettes
  
  return {
    capital,
    reserves,
    reportANouveau,
    resultatExercice,
    totalCapitauxPropres,
    emprunts,
    dettesFournisseurs,
    dettesFiscales,
    dettesSociales,
    autresDettes,
    totalDettes,
    totalPassif,
  }
}

export function calculateCompteResultatTotals(compte: Partial<CompteResultat>): CompteResultat {
  const chiffreAffaires = compte.chiffreAffaires || 0
  const productionStockee = compte.productionStockee || 0
  const productionImmobilisee = compte.productionImmobilisee || 0
  const subventions = compte.subventions || 0
  const autresProduits = compte.autresProduits || 0
  
  const achats = compte.achats || 0
  const variationStocks = compte.variationStocks || 0
  const servicesExterieurs = compte.servicesExterieurs || 0
  const chargesPersonnel = compte.chargesPersonnel || 0
  const impotsTaxes = compte.impotsTaxes || 0
  const dotationsAmortissements = compte.dotationsAmortissements || 0
  const dotationsProvisions = compte.dotationsProvisions || 0
  const chargesFinancieres = compte.chargesFinancieres || 0
  const chargesExceptionnelles = compte.chargesExceptionnelles || 0
  
  const totalProduits = chiffreAffaires + productionStockee + productionImmobilisee + subventions + autresProduits
  const totalCharges = achats + variationStocks + servicesExterieurs + chargesPersonnel + 
                       impotsTaxes + dotationsAmortissements + dotationsProvisions + 
                       chargesFinancieres + chargesExceptionnelles
  
  const resultatCourant = totalProduits - totalCharges
  const resultatExceptionnel = compte.resultatExceptionnel || 0
  const resultatAvantImpot = resultatCourant + resultatExceptionnel
  const impotSurSocietes = resultatAvantImpot > 0 ? calculateIS(resultatAvantImpot) : 0
  const resultatNet = resultatAvantImpot - impotSurSocietes
  
  return {
    chiffreAffaires,
    productionStockee,
    productionImmobilisee,
    subventions,
    autresProduits,
    totalProduits,
    achats,
    variationStocks,
    servicesExterieurs,
    chargesPersonnel,
    impotsTaxes,
    dotationsAmortissements,
    dotationsProvisions,
    chargesFinancieres,
    chargesExceptionnelles,
    totalCharges,
    resultatCourant,
    resultatExceptionnel,
    impotSurSocietes,
    resultatNet,
  }
}

// Generate liasse fiscale from transactions
export function generateLiasseFromTransactions(
  transactions: Array<{ amount: number; type: string; category?: { name: string } | null }>,
  settings: { companyName: string; capital?: number },
  year: number
): Partial<LiasseFiscale> {
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
  
  for (const t of transactions) {
    if (t.type === 'income') {
      chiffreAffaires += Math.abs(t.amount)
    } else if (t.type === 'expense') {
      const cat = t.category?.name?.toLowerCase() || ''
      const amount = Math.abs(t.amount)
      
      if (cat.includes('fourniture') || cat.includes('matériel')) {
        achats += amount
      } else if (cat.includes('loyer')) {
        loyers += amount
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
        autresCharges += amount
      } else if (cat.includes('énergie') || cat.includes('électricité')) {
        chargesLocatives += amount
      } else {
        autresCharges += amount
      }
    }
  }
  
  const servicesExterieurs = loyers + chargesLocatives + entretienReparation + 
                             primesAssurance + fraisDeplacement + fraisPostaux + 
                             fraisTelecom + fraisBancaires + cadeaux + autresCharges
  
  const compteResultat = calculateCompteResultatTotals({
    chiffreAffaires,
    achats,
    servicesExterieurs,
    impotsTaxes,
  })
  
  return {
    year,
    status: 'draft',
    compteResultat,
    actif: calculateActifTotals({
      capital: settings.capital || 0,
      disponibilites: chiffreAffaires - (achats + servicesExterieurs + impotsTaxes),
    }),
    passif: calculatePassifTotals({
      capital: settings.capital || 1000, // Default minimum capital
      resultatExercice: compteResultat.resultatNet,
    }),
    informations: {
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
      materielsInformatique: 0,
      vehicules: 0,
      tvaCollectee: 0,
      tvaDeductible: 0,
      tvaDue: 0,
      remunerationGerant: 0,
      cotisationsSociales: 0,
    },
    declarationResultat: {
      resultatComptable: compteResultat.resultatCourant,
      retraitements: 0,
      resultatFiscal: compteResultat.resultatCourant,
      chargesDeductibles: 0,
      deficitAnterieur: 0,
      deficitUtilise: 0,
      baseImposableIS: Math.max(0, compteResultat.resultatCourant),
      isAPayer: compteResultat.impotSurSocietes,
    },
  }
}
