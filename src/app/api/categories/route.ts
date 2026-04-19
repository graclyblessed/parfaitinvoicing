import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_CATEGORIES } from '@/lib/tax'

// Initialize default categories
export async function GET() {
  try {
    // Ensure all default categories exist with correct TVA rates
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await db.category.findFirst({
        where: { name: cat.name }
      })
      
      if (!existing) {
        await db.category.create({
          data: {
            name: cat.name,
            type: cat.type,
            color: cat.color,
            icon: cat.icon,
            taxDeductible: cat.taxDeductible,
            defaultTvaRate: cat.defaultTvaRate,
          },
        })
      } else if ((existing.defaultTvaRate ?? 0.20) !== cat.defaultTvaRate) {
        // Sync correct TVA rate on existing categories
        await db.category.update({
          where: { id: existing.id },
          data: { defaultTvaRate: cat.defaultTvaRate }
        })
      }
    }
    
    const categories = await db.category.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, color, icon, taxDeductible } = body
    
    const category = await db.category.create({
      data: {
        name,
        type: type || 'expense',
        color: color || '#3B82F6',
        icon,
        taxDeductible: taxDeductible ?? true,
      },
    })
    
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
