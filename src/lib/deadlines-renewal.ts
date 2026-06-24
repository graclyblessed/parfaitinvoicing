// Shared deadline management logic — used by both /api/deadlines and /api/cron
import { db } from '@/lib/db'
import { generateTaxDeadlines } from '@/lib/tax'

/**
 * Ensure deadlines exist for the given calendar years.
 * Creates missing deadlines (idempotent: matches by name + type + dueDate year).
 * Returns the number of deadlines created.
 *
 * This is the AUTO-RENEWAL mechanism: every time the deadlines API or the cron
 * runs, we make sure deadlines for the current AND next calendar year exist.
 * This guarantees that annual obligations (CVAE1, CFE, TVA-CA12, LIASSE, DAS2)
 * are always pre-created well before their due dates — so nothing slips through.
 */
export async function ensureDeadlinesForYears(years: number[]): Promise<number> {
  let created = 0
  for (const year of years) {
    const generated = generateTaxDeadlines(year)
    for (const d of generated) {
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31, 23, 59, 59)
      const existing = await db.taxDeadline.findFirst({
        where: {
          name: d.name,
          type: d.type,
          dueDate: { gte: yearStart, lte: yearEnd },
        },
      })
      if (!existing) {
        await db.taxDeadline.create({
          data: {
            name: d.name,
            type: d.type,
            dueDate: d.dueDate,
            periodStart: d.periodStart,
            periodEnd: d.periodEnd,
            status: 'pending',
            notes: d.description,
          },
        })
        created++
      }
    }
  }
  return created
}

/**
 * Mark pending deadlines past their due date as "overdue".
 * Ensures the UI shows accurate status for missed deadlines
 * (e.g., the CVAE1 that triggered the mise en demeure).
 */
export async function markOverdueDeadlines(): Promise<number> {
  const now = new Date()
  const result = await db.taxDeadline.updateMany({
    where: {
      status: 'pending',
      dueDate: { lt: now },
    },
    data: { status: 'overdue' },
  })
  return result.count
}

/**
 * Convenience: run both auto-renewal and overdue marking.
 * Returns a summary suitable for logging / API responses.
 */
export async function runDeadlineMaintenance(years?: number[]): Promise<{
  renewed: number
  overdueMarked: number
  yearsCovered: number[]
}> {
  const currentYear = new Date().getFullYear()
  const yearsToCover = years ?? [currentYear, currentYear + 1]
  const renewed = await ensureDeadlinesForYears(yearsToCover)
  const overdueMarked = await markOverdueDeadlines()
  return { renewed, overdueMarked, yearsCovered: yearsToCover }
}
