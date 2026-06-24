import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Delete unused category by name
export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    
    // Find the category
    const category = await db.category.findFirst({
      where: { name }
    })
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' })
    }
    
    // Check if any transactions use this category
    const transactionCount = await db.transaction.count({
      where: { categoryId: category.id }
    })
    
    if (transactionCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete: ${transactionCount} transactions use this category` 
      })
    }
    
    // Delete the category
    await db.category.delete({
      where: { id: category.id }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: `Category "${name}" deleted successfully` 
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
