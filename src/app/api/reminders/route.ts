import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'

// POST - Send reminder email for upcoming deadlines (called by cron or manually)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { days = 7 } = body

    // Get settings
    const settings = await db.settings.findFirst()
    
    if (!settings?.email) {
      return NextResponse.json({ error: 'Email not configured in settings' }, { status: 400 })
    }

    // Get current time boundaries
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    // Get urgent deadlines (within 3 days) - not yet reminded
    const urgentDeadlines = await db.taxDeadline.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: in3Days,
        },
        status: 'pending',
        reminderSent: false,
      },
    })
    
    // Get upcoming deadlines (3-7 days) - not yet reminded
    const upcomingDeadlines = await db.taxDeadline.findMany({
      where: {
        dueDate: {
          gt: in3Days,
          lte: in7Days,
        },
        status: 'pending',
        reminderSent: false,
      },
    })

    // If no deadlines to remind about
    if (urgentDeadlines.length === 0 && upcomingDeadlines.length === 0) {
      return NextResponse.json({ 
        message: 'No deadlines requiring reminders',
        sent: 0 
      })
    }

    // Send the email
    const result = await sendReminderEmail({
      to: settings.email,
      companyName: settings.companyName,
      urgentDeadlines: urgentDeadlines.map(d => ({
        name: d.name,
        type: d.type,
        dueDate: d.dueDate,
        amount: d.amount || undefined,
      })),
      upcomingDeadlines: upcomingDeadlines.map(d => ({
        name: d.name,
        type: d.type,
        dueDate: d.dueDate,
        amount: d.amount || undefined,
      })),
    })

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to send email',
        hint: 'Make sure RESEND_API_KEY is set in your Vercel environment variables'
      }, { status: 500 })
    }

    // Mark all as reminded
    const allDeadlines = [...urgentDeadlines, ...upcomingDeadlines]
    await Promise.all(
      allDeadlines.map((d) =>
        db.taxDeadline.update({
          where: { id: d.id },
          data: {
            reminderSent: true,
            reminderSentAt: new Date(),
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      sent: allDeadlines.length,
      email: settings.email,
      urgent: urgentDeadlines.length,
      upcoming: upcomingDeadlines.length,
      deadlines: allDeadlines.map((d) => ({
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
      })),
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}

// GET - Check for upcoming reminders (for cron job health check)
export async function GET() {
  try {
    const settings = await db.settings.findFirst()
    
    if (!settings?.email) {
      return NextResponse.json({ 
        configured: false,
        message: 'Email not configured in settings. Go to Paramètres to add your email.'
      })
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

    // Check if email service is configured
    const emailConfigured = !!process.env.RESEND_API_KEY

    return NextResponse.json({
      configured: true,
      email: settings.email,
      emailServiceConfigured: emailConfigured,
      emailService: emailConfigured ? 'Resend' : 'Not configured',
      urgent: urgentDeadlines.length,
      upcoming: upcomingDeadlines.length,
      urgentDeadlines: urgentDeadlines.map((d) => ({
        id: d.id,
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
        amount: d.amount,
      })),
      upcomingDeadlines: upcomingDeadlines.map((d) => ({
        id: d.id,
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
        amount: d.amount,
      })),
      message: emailConfigured 
        ? 'Email reminders are fully configured and ready.'
        : 'Add RESEND_API_KEY to Vercel environment variables to enable email sending.',
    })
  } catch (error) {
    console.error('Error checking reminders:', error)
    return NextResponse.json({ error: 'Failed to check reminders' }, { status: 500 })
  }
}
