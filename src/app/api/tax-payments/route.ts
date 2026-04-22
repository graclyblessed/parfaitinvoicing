import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all tax payments with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const taxType = searchParams.get('taxType')
    const declarationId = searchParams.get('declarationId')
    const isHistorical = searchParams.get('isHistorical')

    const where: Record<string, unknown> = {}

    if (year) where.year = parseInt(year)
    if (taxType) where.taxType = taxType
    if (declarationId) where.declarationId = declarationId
    if (isHistorical !== null && isHistorical !== undefined && isHistorical !== '') {
      where.isHistorical = isHistorical === 'true'
    }

    const payments = await db.taxPayment.findMany({
      where,
      include: {
        declaration: {
          select: { id: true, type: true, year: true, period: true, status: true }
        },
        transaction: {
          select: { id: true, date: true, amount: true, description: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('Error fetching tax payments:', error)
    return NextResponse.json(
      { error: 'Impossible de récupérer les paiements d\'impôts' },
      { status: 500 }
    )
  }
}

// POST - Create a new tax payment record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      taxType,
      year,
      period,
      label,
      amount,
      paymentDate,
      declarationId,
      dueDate,
      paymentMethod,
      reference,
      transactionId,
      receiptUrl,
      notes,
      isHistorical,
    } = body

    // Validation des champs obligatoires
    if (!taxType) {
      return NextResponse.json({ error: 'Le type d\'impôt est obligatoire (IS, TVA, CFE, TVS, etc.)' }, { status: 400 })
    }
    if (!year || isNaN(parseInt(year))) {
      return NextResponse.json({ error: 'L\'année fiscale est obligatoire' }, { status: 400 })
    }
    if (!period) {
      return NextResponse.json({ error: 'La période est obligatoire (ex: IS-Q1-2025)' }, { status: 400 })
    }
    if (!label) {
      return NextResponse.json({ error: 'Le libellé est obligatoire' }, { status: 400 })
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Le montant doit être un nombre positif' }, { status: 400 })
    }
    if (!paymentDate) {
      return NextResponse.json({ error: 'La date de paiement est obligatoire' }, { status: 400 })
    }

    const parsedYear = parseInt(year)
    const parsedAmount = parseFloat(amount)
    const parsedPaymentDate = new Date(paymentDate)

    if (isNaN(parsedPaymentDate.getTime())) {
      return NextResponse.json({ error: 'La date de paiement est invalide' }, { status: 400 })
    }

    // Détection de doublon : même type + année + période + montant dans la même semaine
    const oneWeekAgo = new Date(parsedPaymentDate)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekLater = new Date(parsedPaymentDate)
    oneWeekLater.setDate(oneWeekLater.getDate() + 7)

    const existingPayment = await db.taxPayment.findFirst({
      where: {
        taxType,
        year: parsedYear,
        period,
        amount: parsedAmount,
        paymentDate: {
          gte: oneWeekAgo,
          lte: oneWeekLater,
        },
        status: { not: 'cancelled' }
      }
    })

    if (existingPayment) {
      return NextResponse.json({
        error: 'Un paiement similaire existe déjà',
        details: `Paiement trouvé le ${existingPayment.paymentDate.toLocaleDateString('fr-FR')} pour ${existingPayment.label} (${existingPayment.amount} €). Vérifiez qu'il ne s'agit pas d'un doublon.`,
        existingPaymentId: existingPayment.id
      }, { status: 409 })
    }

    // Vérifier que la déclaration existe si declarationId est fourni
    if (declarationId) {
      const declaration = await db.declaration.findUnique({ where: { id: declarationId } })
      if (!declaration) {
        return NextResponse.json({ error: 'La déclaration spécifiée n\'existe pas' }, { status: 404 })
      }
    }

    // Vérifier que la transaction existe si transactionId est fourni
    if (transactionId) {
      const transaction = await db.transaction.findUnique({ where: { id: transactionId } })
      if (!transaction) {
        return NextResponse.json({ error: 'La transaction spécifiée n\'existe pas' }, { status: 404 })
      }
    }

    // Créer le paiement
    const payment = await db.taxPayment.create({
      data: {
        taxType,
        year: parsedYear,
        period,
        label,
        amount: parsedAmount,
        paymentDate: parsedPaymentDate,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentMethod: paymentMethod || null,
        reference: reference || null,
        transactionId: transactionId || null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
        isHistorical: isHistorical === true,
        declarationId: declarationId || null,
      },
      include: {
        declaration: {
          select: { id: true, type: true, year: true, period: true, status: true }
        },
        transaction: {
          select: { id: true, date: true, amount: true, description: true }
        }
      }
    })

    // Si une déclaration est liée, la marquer comme payée
    if (declarationId) {
      try {
        await db.declaration.update({
          where: { id: declarationId },
          data: { status: 'paid' }
        })
      } catch (updateError) {
        console.error('Warning: could not update declaration status:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      payment,
      message: isHistorical
        ? `Paiement antérieur enregistré: ${label} (${parsedAmount} €)`
        : `Paiement enregistré: ${label} (${parsedAmount} €)`
    })
  } catch (error) {
    console.error('Error creating tax payment:', error)
    return NextResponse.json({
      error: 'Erreur lors de l\'enregistrement du paiement',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// PUT - Update a tax payment (for corrections)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'L\'identifiant du paiement est obligatoire' }, { status: 400 })
    }

    // Vérifier que le paiement existe
    const existingPayment = await db.taxPayment.findUnique({
      where: { id },
      include: { declaration: true }
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
    }

    // Si le statut passe à 'cancelled' et qu'une déclaration était liée, la remettre en 'pending'
    if (data.status === 'cancelled' && existingPayment.declarationId && existingPayment.declaration) {
      try {
        await db.declaration.update({
          where: { id: existingPayment.declarationId },
          data: { status: 'pending' }
        })
      } catch (updateError) {
        console.error('Warning: could not revert declaration status:', updateError)
      }
    }

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'taxType', 'year', 'period', 'label', 'amount', 'paymentDate',
      'dueDate', 'paymentMethod', 'reference', 'status', 'transactionId',
      'receiptUrl', 'notes', 'isHistorical', 'declarationId'
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (['paymentDate', 'dueDate'].includes(field) && data[field]) {
          updateData[field] = new Date(data[field])
        } else if (['year', 'amount'].includes(field)) {
          updateData[field] = parseFloat(data[field])
        } else if (field === 'isHistorical') {
          updateData[field] = data[field] === true
        } else {
          updateData[field] = data[field]
        }
      }
    }

    const payment = await db.taxPayment.update({
      where: { id },
      data: updateData,
      include: {
        declaration: {
          select: { id: true, type: true, year: true, period: true, status: true }
        },
        transaction: {
          select: { id: true, date: true, amount: true, description: true }
        }
      }
    })

    // Si la déclaration est liée et le statut est 'completed', la marquer comme payée
    if (payment.declarationId && data.status === 'completed') {
      try {
        await db.declaration.update({
          where: { id: payment.declarationId },
          data: { status: 'paid' }
        })
      } catch (updateError) {
        console.error('Warning: could not update declaration status:', updateError)
      }
    }

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error('Error updating tax payment:', error)
    return NextResponse.json({
      error: 'Erreur lors de la mise à jour du paiement',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// DELETE - Delete a tax payment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'L\'identifiant est obligatoire' }, { status: 400 })
    }

    // Vérifier que le paiement existe et récupérer la déclaration liée
    const payment = await db.taxPayment.findUnique({
      where: { id },
      include: { declaration: true }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
    }

    // Si une déclaration était liée, la remettre en 'pending'
    if (payment.declarationId && payment.declaration) {
      try {
        await db.declaration.update({
          where: { id: payment.declarationId },
          data: { status: 'pending' }
        })
      } catch (updateError) {
        console.error('Warning: could not revert declaration status:', updateError)
      }
    }

    await db.taxPayment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tax payment:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du paiement' }, { status: 500 })
  }
}
