import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUpcomingDeadlines } from '@/lib/tax'
import { ensureDeadlinesForYears, markOverdueDeadlines } from '@/lib/deadlines-renewal'

// Get all deadlines
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const upcoming = searchParams.get('upcoming')
    const renew = searchParams.get('renew') // force auto-renewal

    if (upcoming) {
      const days = parseInt(upcoming) || 60
      const deadlines = getUpcomingDeadlines(days)
      return NextResponse.json({ deadlines })
    }

    // --- AUTO-RENEWAL: ensure deadlines exist for current + next year ---
    const currentYear = new Date().getFullYear()
    const createdCount = await ensureDeadlinesForYears([currentYear, currentYear + 1])

    // --- AUTO-STATUS: mark overdue deadlines ---
    const overdueMarked = await markOverdueDeadlines()

    // Get deadlines from database
    let dbDeadlines = await db.taxDeadline.findMany({
      orderBy: { dueDate: 'asc' },
    })

    // If still empty (e.g., fresh DB), force-generate current + next year
    if (dbDeadlines.length === 0) {
      await ensureDeadlinesForYears([currentYear, currentYear + 1])
      dbDeadlines = await db.taxDeadline.findMany({
        orderBy: { dueDate: 'asc' },
      })
    }

    // Filter by year if specified
    if (year) {
      const yearNum = parseInt(year)
      dbDeadlines = dbDeadlines.filter(
        (d) => new Date(d.dueDate).getFullYear() === yearNum
      )
    }

    return NextResponse.json({
      deadlines: dbDeadlines,
      meta: {
        autoRenewed: createdCount,
        overdueMarked,
        yearsCovered: [currentYear, currentYear + 1],
        renewed: renew === '1' || createdCount > 0,
      },
    })
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

// Create a new deadline manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, dueDate, periodStart, periodEnd, amount, notes } = body

    const deadline = await db.taxDeadline.create({
      data: {
        name,
        type: type as string,
        dueDate: new Date(dueDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        amount: amount || null,
        status: 'pending',
        notes: notes || null,
      },
    })

    return NextResponse.json({ success: true, deadline })
  } catch (error) {
    console.error('Error creating deadline:', error)
    return NextResponse.json({ error: 'Failed to create deadline' }, { status: 500 })
  }
}
