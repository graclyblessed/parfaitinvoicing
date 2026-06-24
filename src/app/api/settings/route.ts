import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Get settings
export async function GET() {
  try {
    let settings = await db.settings.findFirst()
    
    // Create default settings if none exist
    if (!settings) {
      settings = await db.settings.create({
        data: {
          companyName: 'Ma SASU',
          companyAddress: '',
          companySIRET: '',
          companySIREN: '',
          companyTVA: null,
          presidentName: null,
          vatRegime: 'franchise',
          fiscalYearStart: 1,
          fiscalYearEnd: 12,
          email: '',
        },
      })
    }
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyName,
      companyAddress,
      companySIRET,
      companySIREN,
      companyTVA,
      presidentName,
      vatRegime,
      fiscalYearStart,
      fiscalYearEnd,
      email,
      googleCalendarId,
    } = body
    
    let settings = await db.settings.findFirst()
    
    if (settings) {
      settings = await db.settings.update({
        where: { id: settings.id },
        data: {
          companyName,
          companyAddress,
          companySIRET,
          companySIREN,
          companyTVA,
          presidentName,
          vatRegime,
          fiscalYearStart,
          fiscalYearEnd,
          email,
          googleCalendarId,
        },
      })
    } else {
      settings = await db.settings.create({
        data: {
          companyName,
          companyAddress,
          companySIRET,
          companySIREN,
          companyTVA,
          presidentName,
          vatRegime,
          fiscalYearStart,
          fiscalYearEnd,
          email,
          googleCalendarId,
        },
      })
    }
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
