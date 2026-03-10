import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Seed missing default categories
export async function POST(request: NextRequest) {
  try {
    const newCategories = [
      { name: 'Dépenses diverses justifiées', type: 'expense', color: '#78716C', icon: 'receipt', taxDeductible: true },
      { name: 'Retrait espèces', type: 'expense', color: '#A8A29E', icon: 'wallet', taxDeductible: false },
    ]
    
    const added: string[] = []
    const existing: string[] = []
    
    for (const cat of newCategories) {
      const exists = await db.category.findFirst({
        where: { name: cat.name }
      })
      
      if (!exists) {
        await db.category.create({ data: cat })
        added.push(cat.name)
      } else {
        existing.push(cat.name)
      }
    }
    
    return NextResponse.json({
      success: true,
      added,
      existing,
      message: `Added ${added.length} new categories, ${existing.length} already existed`
    })
  } catch (error) {
    console.error('Seed categories error:', error)
    return NextResponse.json({ 
      error: 'Failed to seed categories',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
