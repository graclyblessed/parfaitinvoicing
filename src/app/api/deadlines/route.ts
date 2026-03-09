import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateTaxDeadlines, getUpcomingDeadlines } from '@/lib/tax'

// Get all deadlines
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const upcoming = searchParams.get('upcoming')
    
    if (upcoming) {
      const days = parseInt(upcoming) || 60
      const deadlines = getUpcomingDeadlines(days)
      return NextResponse.json({ deadlines })
    }
    
    // Get deadlines from database
    let dbDeadlines = await db.taxDeadline.findMany({
      orderBy: { dueDate: 'asc' },
    })
    
    // If no deadlines exist, generate them
    if (dbDeadlines.length === 0) {
      const currentYear = new Date().getFullYear()
      const generatedDeadlines = [
        ...generateTaxDeadlines(currentYear),
        ...generateTaxDeadlines(currentYear + 1),
      ]
      
      await db.taxDeadline.createMany({
        data: generatedDeadlines.map(d => ({
          name: d.name,
          type: d.type,
          dueDate: d.dueDate,
          periodStart: d.periodStart,
          periodEnd: d.periodEnd,
          status: 'pending',
          notes: d.description,
        })),
      })
      
      dbDeadlines = await db.taxDeadline.findMany({
        orderBy: { dueDate: 'asc' },
      })
    }
    
    // Filter by year if specified
    if (year) {
      const yearNum = parseInt(year)
      dbDeadlines = dbDeadlines.filter(d => 
        new Date(d.dueDate).getFullYear() === yearNum
      )
    }
    
    return NextResponse.json({ deadlines: dbDeadlines })
  } catch (error) {
    console.error('Error fetching deadlines:', error)
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 })
  }
}

// Update deadline status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, amount, notes } = body
    
    const deadline = await db.taxDeadline.update({
      where: { id },
      data: {
        status,
        amount,
        notes,
      },
    })
    
    return NextResponse.json({ deadline })
  } catch (error) {
    console.error('Error updating deadline:', error)
    return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 })
  }
}
