import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all declarations
export async function GET(request: NextRequest) {
  try {
    const declarations = await db.declaration.findMany({
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    
    return NextResponse.json({ declarations })
  } catch (error) {
    console.error('Error fetching declarations:', error)
    return NextResponse.json({ error: 'Error fetching declarations' }, { status: 500 })
  }
}

// POST - Create a new declaration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, year, period, amount, dueDate } = body
    
    // Calculate due date based on type and period
    let calculatedDueDate = dueDate
    if (!calculatedDueDate) {
      if (type === 'TVA') {
        // CA12 due May 3rd of year after FY
        calculatedDueDate = new Date(year + 1, 4, 3)
      } else if (type === 'IS') {
        // IS acomptes due 15th of Mar/Jun/Sep/Dec
        const quarter = parseInt(period.match(/Q(\d)/)?.[1] || '1')
        const monthMap: Record<number, number> = { 1: 2, 2: 5, 3: 8, 4: 11 }
        calculatedDueDate = new Date(year, monthMap[quarter], 15)
      } else {
        calculatedDueDate = new Date(year, 11, 15) // Default to Dec 15
      }
    }
    
    const declaration = await db.declaration.create({
      data: {
        type,
        year,
        period,
        amount,
        dueDate: new Date(calculatedDueDate),
        status: 'pending'
      }
    })
    
    return NextResponse.json({ success: true, declaration })
  } catch (error) {
    console.error('Error creating declaration:', error)
    return NextResponse.json({ error: 'Error creating declaration' }, { status: 500 })
  }
}

// PUT - Update declaration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, filedAt, documentUrl } = body
    
    const declaration = await db.declaration.update({
      where: { id },
      data: {
        status: status || undefined,
        filedAt: filedAt ? new Date(filedAt) : undefined,
        documentUrl: documentUrl || undefined,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({ success: true, declaration })
  } catch (error) {
    console.error('Error updating declaration:', error)
    return NextResponse.json({ error: 'Error updating declaration' }, { status: 500 })
  }
}
