import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// GET - Export transactions to Excel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const type = searchParams.get('type')

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (year) {
      const yearNum = parseInt(year)
      const startDate = new Date(yearNum, 0, 1)
      const endDate = new Date(yearNum, 11, 31)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }
    
    if (type) {
      where.type = type
    }

    // Fetch transactions
    const transactions = await db.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Fetch settings
    const settings = await db.settings.findFirst()

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // === Sheet 1: Transactions ===
    const transactionData = transactions.map((t) => ({
      'Date': new Date(t.date).toLocaleDateString('fr-FR'),
      'Description': t.description,
      'Catégorie': t.category?.name || 'Non catégorisé',
      'Type': t.type === 'income' ? 'Revenu' : 'Dépense',
      'Montant': t.amount,
      'Référence': t.reference || '',
      'Déductible': t.category?.taxDeductible ? 'Oui' : 'Non',
    }))

    const transactionSheet = XLSX.utils.json_to_sheet(transactionData)
    
    // Set column widths
    transactionSheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 50 }, // Description
      { wch: 25 }, // Catégorie
      { wch: 10 }, // Type
      { wch: 15 }, // Montant
      { wch: 20 }, // Référence
      { wch: 10 }, // Déductible
    ]
    
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions')

    // === Sheet 2: Récapitulatif ===
    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = Math.abs(transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0))
    
    const deductibleExpenses = Math.abs(transactions
      .filter(t => t.amount < 0 && t.category?.taxDeductible)
      .reduce((sum, t) => sum + t.amount, 0))
    
    const netResult = totalIncome - totalExpenses
    const taxableIncome = netResult * 0.75 // Approximation after expenses
    const estimatedIS = taxableIncome > 42500 
      ? (42500 * 0.15) + ((taxableIncome - 42500) * 0.25)
      : taxableIncome * 0.15

    const summaryData = [
      { 'Rubrique': 'ENTREPRISE', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'Nom', 'Valeur': settings?.companyName || '', 'Montant': '' },
      { 'Rubrique': 'SIRET', 'Valeur': settings?.companySIRET || '', 'Montant': '' },
      { 'Rubrique': 'Exercice', 'Valeur': year || new Date().getFullYear().toString(), 'Montant': '' },
      { 'Rubrique': '', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'REVENUS', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'Total revenus', 'Valeur': `${transactions.filter(t => t.amount > 0).length} transactions`, 'Montant': totalIncome },
      { 'Rubrique': '', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'DÉPENSES', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'Total dépenses', 'Valeur': `${transactions.filter(t => t.amount < 0).length} transactions`, 'Montant': totalExpenses },
      { 'Rubrique': 'Dont déductibles', 'Valeur': '', 'Montant': deductibleExpenses },
      { 'Rubrique': '', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'RÉSULTAT', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'Résultat net', 'Valeur': '', 'Montant': netResult },
      { 'Rubrique': 'Base taxable estimée', 'Valeur': '', 'Montant': taxableIncome },
      { 'Rubrique': '', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'IMPÔT SOCIÉTÉS', 'Valeur': '', 'Montant': '' },
      { 'Rubrique': 'IS estimé', 'Valeur': '', 'Montant': Math.max(0, estimatedIS) },
    ]
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    summarySheet['!cols'] = [
      { wch: 25 }, // Rubrique
      { wch: 30 }, // Valeur
      { wch: 15 }, // Montant
    ]
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Récapitulatif')

    // === Sheet 3: Par Catégorie ===
    const categoryTotals: Record<string, { income: number; expense: number; count: number }> = {}
    
    transactions.forEach((t) => {
      const catName = t.category?.name || 'Non catégorisé'
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { income: 0, expense: 0, count: 0 }
      }
      categoryTotals[catName].count++
      if (t.amount >= 0) {
        categoryTotals[catName].income += t.amount
      } else {
        categoryTotals[catName].expense += Math.abs(t.amount)
      }
    })

    const categoryData = Object.entries(categoryTotals).map(([name, data]) => ({
      'Catégorie': name,
      'Nombre de transactions': data.count,
      'Total revenus': data.income,
      'Total dépenses': data.expense,
      'Net': data.income - data.expense,
    }))

    const categorySheet = XLSX.utils.json_to_sheet(categoryData)
    categorySheet['!cols'] = [
      { wch: 30 }, // Catégorie
      { wch: 20 }, // Nombre
      { wch: 15 }, // Revenus
      { wch: 15 }, // Dépenses
      { wch: 15 }, // Net
    ]
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Par Catégorie')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="export_${year || new Date().getFullYear()}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return NextResponse.json({ error: 'Failed to export to Excel' }, { status: 500 })
  }
}
