import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Send reminder email for upcoming deadlines
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { days = 7 } = body

    // Get settings
    const settings = await db.settings.findFirst()
    
    if (!settings?.email) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 400 })
    }

    // Get upcoming deadlines
    const now = new Date()
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    
    const deadlines = await db.taxDeadline.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: futureDate,
        },
        status: 'pending',
        reminderSent: false,
      },
    })

    if (deadlines.length === 0) {
      return NextResponse.json({ message: 'No deadlines to remind' })
    }

    // Note: In production, you would use a real email service like Resend, SendGrid, or nodemailer
    // For now, we'll just mark them as sent and return the list
    
    // Mark reminders as sent
    await Promise.all(
      deadlines.map((d) =>
        db.taxDeadline.update({
          where: { id: d.id },
          data: {
            reminderSent: true,
            reminderSentAt: new Date(),
          },
        })
      )
    )

    // Log what would be sent
    console.log(`Would send email to ${settings.email} for ${deadlines.length} deadlines:`)
    deadlines.forEach((d) => {
      console.log(`  - ${d.name} due ${d.dueDate.toLocaleDateString('fr-FR')}`)
    })

    return NextResponse.json({
      success: true,
      sent: deadlines.length,
      email: settings.email,
      deadlines: deadlines.map((d) => ({
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
      })),
      message: `In production, this would send an email to ${settings.email}`,
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}

// GET - Check for upcoming reminders (for cron job)
export async function GET() {
  try {
    const settings = await db.settings.findFirst()
    
    if (!settings?.email) {
      return NextResponse.json({ configured: false })
    }

    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    // Get urgent deadlines (within 3 days)
    const urgentDeadlines = await db.taxDeadline.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: in3Days,
        },
        status: 'pending',
      },
    })
    
    // Get upcoming deadlines (within 7 days)
    const upcomingDeadlines = await db.taxDeadline.findMany({
      where: {
        dueDate: {
          gt: in3Days,
          lte: in7Days,
        },
        status: 'pending',
      },
    })

    return NextResponse.json({
      configured: true,
      email: settings.email,
      urgent: urgentDeadlines.length,
      upcoming: upcomingDeadlines.length,
      urgentDeadlines: urgentDeadlines.map((d) => ({
        id: d.id,
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
      })),
      upcomingDeadlines: upcomingDeadlines.map((d) => ({
        id: d.id,
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
      })),
    })
  } catch (error) {
    console.error('Error checking reminders:', error)
    return NextResponse.json({ error: 'Failed to check reminders' }, { status: 500 })
  }
}
