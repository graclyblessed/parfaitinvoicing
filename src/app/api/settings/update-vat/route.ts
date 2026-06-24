import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const settings = await db.settings.findFirst()
    
    if (settings) {
      const updated = await db.settings.update({
        where: { id: settings.id },
        data: { vatRegime: 'reel_simplifie' }
      })
      return NextResponse.json({ success: true, settings: updated })
    } else {
      // Create settings with reel_simplifie
      const created = await db.settings.create({
        data: {
          companyName: 'Ma SASU',
          companyAddress: '',
          companySIRET: '',
          companySIREN: '',
          companyTVA: null,
          vatRegime: 'reel_simplifie',
          fiscalYearStart: 1,
          fiscalYearEnd: 12,
          email: '',
        }
      })
      return NextResponse.json({ success: true, settings: created })
    }
  } catch (error) {
    console.error('Error updating VAT regime:', error)
    return NextResponse.json({ error: 'Failed to update VAT regime' }, { status: 500 })
  }
}
