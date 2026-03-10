import Resend from 'resend'

const resend = new Resend.Resend(process.env.RESEND_API_KEY)

interface DeadlineReminder {
  name: string
  type: string
  dueDate: Date
  amount?: number
}

interface EmailData {
  to: string
  companyName: string
  urgentDeadlines: DeadlineReminder[]
  upcomingDeadlines: DeadlineReminder[]
}

// Format date in French
function formatDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Format currency in Euros
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Get type label
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    IS: 'Impôt sur les Sociétés',
    TVA: 'TVA',
    CFE: 'Cotisation Foncière des Entreprises',
    LIASSE: 'Liasse Fiscale',
    DAS2: 'Déclaration DAS2',
  }
  return labels[type] || type
}

// Get days until deadline
function getDaysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Generate HTML email content
function generateEmailHTML(data: EmailData): string {
  const { companyName, urgentDeadlines, upcomingDeadlines } = data

  const urgentHTML = urgentDeadlines.length > 0
    ? `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #DC2626; font-size: 18px; margin-bottom: 12px;">
        🚨 Échéances Urgentes (3 jours ou moins)
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${urgentDeadlines.map(d => {
          const days = getDaysUntil(d.dueDate)
          return `
            <tr style="border-bottom: 1px solid #FEE2E2;">
              <td style="padding: 12px 0; color: #DC2626; font-weight: 600;">${d.name}</td>
              <td style="padding: 12px 0; text-align: right; color: #DC2626;">${formatDateFR(d.dueDate)}</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #DC2626;">
                ${days <= 0 ? "AUJOURD'HUI!" : `${days} jour${days > 1 ? 's' : ''}`}
              </td>
            </tr>
            <tr style="background-color: #FEF2F2;">
              <td colspan="3" style="padding: 4px 0 12px 0; font-size: 12px; color: #7F1D1D;">
                ${getTypeLabel(d.type)}${d.amount ? ` - ${formatCurrency(d.amount)}` : ''}
              </td>
            </tr>
          `
        }).join('')}
      </table>
    </div>
    `
    : ''

  const upcomingHTML = upcomingDeadlines.length > 0
    ? `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #D97706; font-size: 18px; margin-bottom: 12px;">
        ⏰ Échéances à Venir (7 jours)
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${upcomingDeadlines.map(d => {
          const days = getDaysUntil(d.dueDate)
          return `
            <tr style="border-bottom: 1px solid #FEF3C7;">
              <td style="padding: 12px 0; color: #92400E;">${d.name}</td>
              <td style="padding: 12px 0; text-align: right; color: #92400E;">${formatDateFR(d.dueDate)}</td>
              <td style="padding: 12px 0; text-align: right; color: #D97706; font-weight: 600;">
                ${days} jours
              </td>
            </tr>
            <tr style="background-color: #FFFBEB;">
              <td colspan="3" style="padding: 4px 0 12px 0; font-size: 12px; color: #78350F;">
                ${getTypeLabel(d.type)}${d.amount ? ` - ${formatCurrency(d.amount)}` : ''}
              </td>
            </tr>
          `
        }).join('')}
      </table>
    </div>
    `
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #E5E7EB;">
        <h1 style="color: #1E40AF; font-size: 24px; margin: 0;">
          Parfait Invoicing
        </h1>
        <p style="color: #6B7280; margin-top: 8px;">
          Rappel d'échéances fiscales pour <strong>${companyName}</strong>
        </p>
      </div>

      ${urgentHTML}
      ${upcomingHTML}

      ${urgentDeadlines.length === 0 && upcomingDeadlines.length === 0 ? `
        <div style="text-align: center; padding: 40px 20px; background-color: #F0FDF4; border-radius: 8px;">
          <p style="color: #166534; font-size: 18px; margin: 0;">
            ✅ Aucune échéance imminente
          </p>
          <p style="color: #15803D; margin-top: 8px;">
            Vos prochaines échéances sont à plus de 7 jours.
          </p>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
        <p style="color: #6B7280; font-size: 14px; margin: 0;">
          Connectez-vous à votre <a href="https://parfaitinvoicing.vercel.app" style="color: #2563EB; text-decoration: none;">tableau de bord</a> pour plus de détails.
        </p>
        <p style="color: #9CA3AF; font-size: 12px; margin-top: 16px;">
          Cet email vous est envoyé automatiquement par Parfait Invoicing.<br>
          Pour désactiver ces rappels, modifiez vos paramètres dans l'application.
        </p>
      </div>

    </body>
    </html>
  `
}

// Generate plain text email content
function generateEmailText(data: EmailData): string {
  const { companyName, urgentDeadlines, upcomingDeadlines } = data

  let text = `Parfait Invoicing - Rappel d'échéances fiscales pour ${companyName}\n\n`

  if (urgentDeadlines.length > 0) {
    text += `🚨 ÉCHEANCES URGENTES (3 jours ou moins):\n`
    urgentDeadlines.forEach(d => {
      const days = getDaysUntil(d.dueDate)
      text += `  - ${d.name} (${getTypeLabel(d.type)})\n`
      text += `    Date: ${formatDateFR(d.dueDate)} - ${days <= 0 ? "AUJOURD'HUI!" : `${days} jour${days > 1 ? 's' : ''}`}\n`
      if (d.amount) text += `    Montant: ${formatCurrency(d.amount)}\n`
    })
    text += `\n`
  }

  if (upcomingDeadlines.length > 0) {
    text += `⏰ ÉCHEANCES À VENIR (7 jours):\n`
    upcomingDeadlines.forEach(d => {
      const days = getDaysUntil(d.dueDate)
      text += `  - ${d.name} (${getTypeLabel(d.type)})\n`
      text += `    Date: ${formatDateFR(d.dueDate)} - ${days} jours\n`
      if (d.amount) text += `    Montant: ${formatCurrency(d.amount)}\n`
    })
    text += `\n`
  }

  if (urgentDeadlines.length === 0 && upcomingDeadlines.length === 0) {
    text += `✅ Aucune échéance imminente. Vos prochaines échéances sont à plus de 7 jours.\n\n`
  }

  text += `Connectez-vous à votre tableau de bord: https://parfaitinvoicing.vercel.app\n`
  text += `\nCet email vous est envoyé automatiquement par Parfait Invoicing.`

  return text
}

// Send reminder email
export async function sendReminderEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured. Please add RESEND_API_KEY to your environment variables.' }
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: 'Parfait Invoicing <onboarding@resend.dev>',
      to: data.to,
      subject: `📅 Rappel: ${data.urgentDeadlines.length} échéance(s) urgente(s) - ${data.companyName}`,
      html: generateEmailHTML(data),
      text: generateEmailText(data),
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', result)
    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: String(error) }
  }
}
