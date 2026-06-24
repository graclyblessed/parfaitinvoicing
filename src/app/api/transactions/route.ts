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

// Update transaction (for labeling) - also learns the categorization rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, categoryId, type } = body
    
    // Get the transaction first to extract pattern
    const existingTransaction = await db.transaction.findUnique({
      where: { id },
    })
    
    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    // Update the transaction
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
    
    // Learn this categorization for future transactions
    if (categoryId && existingTransaction.description) {
      const pattern = extractPattern(existingTransaction.description)
      const transactionType = type || (existingTransaction.amount >= 0 ? 'income' : 'expense')
      
      try {
        await db.categoryRule.upsert({
          where: { pattern },
          create: {
            pattern,
            categoryId,
            transactionType,
          },
          update: {
            categoryId, // Update if user changed category
            matchCount: { increment: 1 },
            lastUsed: new Date(),
          },
        })
      } catch (e) {
        // Ignore rule creation errors
        console.log('Could not save rule:', e)
      }
    }
    
    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

// Extract pattern from description
function extractPattern(description: string): string {
  const desc = description.toLowerCase().trim()
  
  // Remove common prefixes/suffixes
  let pattern = desc
    .replace(/^\*\s*/, '')
    .replace(/\s*\*$/, '')
  
  // For patterns like "VENDOR* Something", extract "vendor*"
  const starMatch = pattern.match(/^([a-z0-9._-]+\*[a-z0-9._-]*)/)
  if (starMatch) {
    return starMatch[1]
  }
  
  // For domain patterns like "vendor.com" or "vendor.net"
  const domainMatch = pattern.match(/([a-z0-9-]+\.[a-z0-9-]+)/)
  if (domainMatch) {
    return domainMatch[1]
  }
  
  // For card payments like "vendor city country"
  const parts = pattern.split(/\s+/)
  if (parts.length >= 1) {
    // Return first significant word (at least 3 chars)
    for (const part of parts) {
      if (part.length >= 3 && !/^(the|for|and|via|par)$/i.test(part)) {
        return part
      }
    }
  }
  
  // Fallback: return first 20 chars
  return pattern.substring(0, 20)
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
