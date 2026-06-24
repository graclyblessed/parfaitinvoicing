import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculerCVAE, formatEuro, type CVAEInput, type CVAEResult } from '@/lib/cvae-1329-def'
import { calculateValeurAjoutee } from '@/lib/cvae1'

/**
 * Formulaire 1329-DEF — Déclaration de liquidation et de régularisation de la CVAE
 *
 * Routes:
 *   GET  /api/declarations/1329-def?year=2025
 *   POST /api/declarations/1329-def  { year, action: 'save'|'file', inputs, reference, filedAt }
 */

interface CVAEDEFResponse {
  year: number
  calculation: CVAEResult
  inputs: Partial<CVAEInput>
  form: { id: string; status: string; reference: string | null; filedAt: string | null } | null
  deadline: { dueDate: string; daysUntilDue: number; isOverdue: boolean }
  /** Auto-calculated breakdown from transactions (for dynamic auto-fill) */
  autoCalc: {
    chiffreAffaires: number
    servicesExterieurs: number
    valeurAjoutee: number
    chargesExclues: number
    nombreTransactions: number
    periodeLabel: string
  } | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get('year')
    const year = yearStr ? parseInt(yearStr) : 2025

    if (isNaN(year)) {
      return NextResponse.json({ error: 'year invalide' }, { status: 400 })
    }

    const transactions = await db.transaction.findMany({ include: { category: true } })
    const vaCalc = calculateValeurAjoutee({ transactions, fyEndYear: year, effectifsSalaries: 0 })

    const existing = await db.formulaire1329DEF.findUnique({ where: { year } })

    const inputs: CVAEInput = {
      caHT: existing?.ligne01_CA_periode_reference ?? vaCalc.chiffreAffaires,
      valeurAjoutee: existing?.ligne05_VA_produite ?? vaCalc.valeurAjoutee,
      effectifsSalaries: existing?.effectifsSalaries ?? 0,
      annee: year,
      cessation2026: existing?.cessation_2026 ?? false,
      limitationVANonApplicable: existing?.ligne06_limitation_VA ?? false,
      exonereTaxeAdditionnelle: existing?.exonere_taxe_additionnelle ?? false,
      exonerations: existing?.ligne09_exonerations ?? 0,
      acomptesCVAE: existing?.ligne12_acomptes_CVAE ?? 0,
      acomptesTaxeAdd: existing?.ligne16_acomptes_taxe_add ?? 0,
      acompteContribCompl: existing?.ligne21_acompte_contrib_compl ?? 0,
    }

    const calculation = calculerCVAE(inputs)

    const dueDate = new Date(year + 1, 4, 5)
    const now = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = now > dueDate

    const response: CVAEDEFResponse = {
      year,
      calculation,
      inputs,
      form: existing
        ? {
            id: existing.id,
            status: existing.status,
            reference: existing.reference_teletransmission,
            filedAt: existing.filedAt?.toISOString() ?? null,
          }
        : null,
      deadline: { dueDate: dueDate.toISOString(), daysUntilDue, isOverdue },
      autoCalc: {
        chiffreAffaires: vaCalc.chiffreAffaires,
        servicesExterieurs: vaCalc.servicesExterieurs,
        valeurAjoutee: vaCalc.valeurAjoutee,
        chargesExclues: vaCalc.chargesExclues,
        nombreTransactions: vaCalc.nombreTransactions,
        periodeLabel: vaCalc.periodeLabel,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in 1329-DEF GET:', error)
    return NextResponse.json({ error: 'Erreur lors du calcul 1329-DEF' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year, action, inputs, reference, filedAt } = body

    if (!year || typeof year !== 'number') {
      return NextResponse.json({ error: 'year requis (nombre)' }, { status: 400 })
    }
    if (action !== 'save' && action !== 'file') {
      return NextResponse.json({ error: "action requis ('save' ou 'file')" }, { status: 400 })
    }

    const fullInputs: CVAEInput = {
      caHT: inputs?.caHT ?? 0,
      valeurAjoutee: inputs?.valeurAjoutee ?? 0,
      effectifsSalaries: inputs?.effectifsSalaries ?? 0,
      annee: year,
      cessation2026: inputs?.cessation2026 ?? false,
      limitationVANonApplicable: inputs?.limitationVANonApplicable ?? false,
      exonereTaxeAdditionnelle: inputs?.exonereTaxeAdditionnelle ?? false,
      exonerations: inputs?.exonerations ?? 0,
      acomptesCVAE: inputs?.acomptesCVAE ?? 0,
      acomptesTaxeAdd: inputs?.acomptesTaxeAdd ?? 0,
      acompteContribCompl: inputs?.acompteContribCompl ?? 0,
    }

    const calc = calculerCVAE(fullInputs)
    const status = action === 'file' ? 'filed' : 'complete'
    const periodeLabel = `01/12/${year - 1} au 30/11/${year}`

    const form = await db.formulaire1329DEF.upsert({
      where: { year },
      create: {
        year,
        status,
        ligne01_CA_periode_reference: fullInputs.caHT,
        ligne02_CA_reel: 0,
        ligne03_CA_groupe: 0,
        ligne04_pourcentage_VA: calc.ligne04_pourcentage_VA,
        ligne05_VA_produite: fullInputs.valeurAjoutee,
        ligne06_limitation_VA: fullInputs.limitationVANonApplicable ?? false,
        ligne07_CVAE_brute: calc.ligne07_CVAE_brute,
        ligne08_cotisation_avant_reduction: calc.ligne08_cotisation_avant_reduction,
        ligne09_exonerations: fullInputs.exonerations ?? 0,
        ligne10_reduction_supplementaire: fullInputs.reductionSupplementaire ?? 0,
        ligne11_CVAE_due: calc.ligne11_CVAE_due,
        ligne12_acomptes_CVAE: fullInputs.acomptesCVAE ?? 0,
        ligne13_solde_CVAE_payer: calc.ligne13_solde_CVAE_payer,
        ligne14_excedent_CVAE: calc.ligne14_excedent_CVAE,
        ligne15_taxe_add_due: calc.ligne15_taxe_add_due,
        ligne16_acomptes_taxe_add: fullInputs.acomptesTaxeAdd ?? 0,
        ligne17_solde_taxe_add_payer: calc.ligne17_solde_taxe_add_payer,
        ligne18_excedent_taxe_add: calc.ligne18_excedent_taxe_add,
        ligne20_contrib_compl_due: calc.ligne20_contrib_compl_due,
        ligne21_acompte_contrib_compl: fullInputs.acompteContribCompl ?? 0,
        ligne22_solde_contrib_payer: calc.ligne22_solde_contrib_payer,
        ligne23_excedent_contrib: calc.ligne23_excedent_contrib,
        ligne24_total_acomptes: calc.ligne24_total_acomptes,
        ligne25_total_payer: calc.ligne25_total_payer,
        ligne26_total_excedents: calc.ligne26_total_excedents,
        ligne27_CVAE_DUE_paiement: calc.ligne27_CVAE_DUE_paiement,
        ligne28_excedent_versement: calc.ligne28_excedent_versement,
        cessation_2026: fullInputs.cessation2026 ?? false,
        exonere_taxe_additionnelle: fullInputs.exonereTaxeAdditionnelle ?? false,
        effectifsSalaries: fullInputs.effectifsSalaries ?? 0,
        periodeLabel,
        reference_teletransmission: reference || null,
        filedAt: action === 'file' ? new Date(filedAt || Date.now()) : null,
      },
      update: {
        status,
        ligne01_CA_periode_reference: fullInputs.caHT,
        ligne04_pourcentage_VA: calc.ligne04_pourcentage_VA,
        ligne05_VA_produite: fullInputs.valeurAjoutee,
        ligne06_limitation_VA: fullInputs.limitationVANonApplicable ?? false,
        ligne07_CVAE_brute: calc.ligne07_CVAE_brute,
        ligne08_cotisation_avant_reduction: calc.ligne08_cotisation_avant_reduction,
        ligne09_exonerations: fullInputs.exonerations ?? 0,
        ligne10_reduction_supplementaire: fullInputs.reductionSupplementaire ?? 0,
        ligne11_CVAE_due: calc.ligne11_CVAE_due,
        ligne12_acomptes_CVAE: fullInputs.acomptesCVAE ?? 0,
        ligne13_solde_CVAE_payer: calc.ligne13_solde_CVAE_payer,
        ligne14_excedent_CVAE: calc.ligne14_excedent_CVAE,
        ligne15_taxe_add_due: calc.ligne15_taxe_add_due,
        ligne16_acomptes_taxe_add: fullInputs.acomptesTaxeAdd ?? 0,
        ligne17_solde_taxe_add_payer: calc.ligne17_solde_taxe_add_payer,
        ligne18_excedent_taxe_add: calc.ligne18_excedent_taxe_add,
        ligne20_contrib_compl_due: calc.ligne20_contrib_compl_due,
        ligne21_acompte_contrib_compl: fullInputs.acompteContribCompl ?? 0,
        ligne22_solde_contrib_payer: calc.ligne22_solde_contrib_payer,
        ligne23_excedent_contrib: calc.ligne23_excedent_contrib,
        ligne24_total_acomptes: calc.ligne24_total_acomptes,
        ligne25_total_payer: calc.ligne25_total_payer,
        ligne26_total_excedents: calc.ligne26_total_excedents,
        ligne27_CVAE_DUE_paiement: calc.ligne27_CVAE_DUE_paiement,
        ligne28_excedent_versement: calc.ligne28_excedent_versement,
        cessation_2026: fullInputs.cessation2026 ?? false,
        exonere_taxe_additionnelle: fullInputs.exonereTaxeAdditionnelle ?? false,
        effectifsSalaries: fullInputs.effectifsSalaries ?? 0,
        periodeLabel,
        reference_teletransmission: reference || null,
        filedAt: action === 'file' ? new Date(filedAt || Date.now()) : null,
      },
    })

    if (action === 'file') {
      const deadlineYear = year + 1
      const yearStart = new Date(deadlineYear, 0, 1)
      const yearEnd = new Date(deadlineYear, 11, 31, 23, 59, 59)
      await db.taxDeadline.updateMany({
        where: {
          type: 'CVAE1',
          dueDate: { gte: yearStart, lte: yearEnd },
          status: { in: ['pending', 'overdue'] },
        },
        data: { status: 'done' },
      })
    }

    const totalAPayer = calc.ligne27_CVAE_DUE_paiement
    const excedent = calc.ligne28_excedent_versement

    return NextResponse.json({
      success: true,
      form,
      calculation: calc,
      totalAPayer,
      excedent,
      message:
        action === 'file'
          ? `Formulaire 1329-DEF/${year} marqué comme télétransmis (réf: ${reference || '—'}). ${
              totalAPayer > 0
                ? `Total à payer: ${formatEuro(totalAPayer)}.`
                : excedent > 0
                ? `Excédent à rembourser: ${formatEuro(excedent)}.`
                : 'Néant (acomptes = cotisation due).'
            }`
          : `Valeurs 1329-DEF/${year} enregistrées. ${
              totalAPayer > 0
                ? `Total à payer estimé: ${formatEuro(totalAPayer)}.`
                : excedent > 0
                ? `Excédent estimé: ${formatEuro(excedent)}.`
                : 'CVAE non due (franchise ou acomptes couvrent la cotisation).'
            }`,
    })
  } catch (error) {
    console.error('Error in 1329-DEF POST:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde 1329-DEF: ' + msg },
      { status: 500 }
    )
  }
}
