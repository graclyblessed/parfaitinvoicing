import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get all transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const labeled = searchParams.get('labeled')
    const type = searchParams.get('type')
    const categoryId = searchParams.get('categoryId')
    
    const where: Record<string, unknown> = {}
    
    if (labeled !== null) {
      where.labeled = labeled === 'true'
    }
    
    if (type) {
      where.type = type
    }
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    const transactions = await db.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// Create transaction manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, amount, description, reference, categoryId, type, bankAccount } = body
    
    const transaction = await db.transaction.create({
      data: {
        date: new Date(date),
        amount: parseFloat(amount),
        description,
        reference,
        categoryId: categoryId || null,
        type: type || (parseFloat(amount) >= 0 ? 'income' : 'expense'),
        labeled: !!categoryId,
        bankAccount,
      },
      include: {
        category: true,
      },
    })
    
    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

// Update transaction (for labeling)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, categoryId, type } = body
    
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        categoryId,
        type,
        labeled: !!categoryId,
      },
      include: {
        category: true,
      },
    })
    
    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

// Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }
    
    await db.transaction.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
