import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendReminderEmail, getEmailProviderStatus } from '@/lib/email'
import { runDeadlineMaintenance } from '@/lib/deadlines-renewal'

// Vercel Cron Job endpoint - runs daily at 8:00 AM UTC
// Configured in vercel.json
export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel Cron request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow requests without auth in development
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    console.log('🕐 Cron job started: Checking for fiscal deadline reminders...')

    // --- STEP 1: AUTO-RENEWAL — ensure deadlines exist for current + next year ---
    // This guarantees annual obligations (CVAE1, CFE, TVA-CA12, LIASSE, DAS2) are
    // always pre-created well before their due dates, so nothing slips through.
    const maintenance = await runDeadlineMaintenance()
    console.log(
      `📅 Deadline maintenance: ${maintenance.renewed} new deadlines created, ` +
        `${maintenance.overdueMarked} marked overdue (years ${maintenance.yearsCovered.join(', ')})`
    )

    // Get settings
    const settings = await db.settings.findFirst()

    if (!settings?.email) {
      console.log('⚠️ No email configured in settings')
      return NextResponse.json({
        status: 'skipped',
        reason: 'No email configured in settings',
        maintenance,
      })
    }

    // Check email provider
    const providerStatus = getEmailProviderStatus()
    if (!providerStatus.configured) {
      console.log('⚠️ No email provider configured:', providerStatus.message)
      return NextResponse.json({
        status: 'skipped',
        reason: providerStatus.message,
        maintenance,
      })
    }

    // Get current time boundaries
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

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

    console.log(
      `📊 Found ${urgentDeadlines.length} urgent, ${upcomingDeadlines.length} upcoming deadlines`
    )

    // If no deadlines to remind about
    if (urgentDeadlines.length === 0 && upcomingDeadlines.length === 0) {
      console.log('✅ No deadlines requiring reminders today')
      return NextResponse.json({
        status: 'success',
        sent: 0,
        message: 'No deadlines requiring reminders',
        maintenance,
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
      console.error('❌ Failed to send email:', result.error)
      return NextResponse.json({ 
        status: 'error',
        error: result.error 
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

    console.log(`✅ Email sent to ${settings.email} for ${allDeadlines.length} deadlines via ${providerStatus.provider}`)
    
    return NextResponse.json({
      status: 'success',
      sent: allDeadlines.length,
      email: settings.email,
      provider: providerStatus.provider,
      urgent: urgentDeadlines.length,
      upcoming: upcomingDeadlines.length,
      maintenance,
      deadlines: allDeadlines.map((d) => ({
        name: d.name,
        dueDate: d.dueDate,
        type: d.type,
      })),
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ 
      status: 'error',
      error: String(error) 
    }, { status: 500 })
  }
}
