import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Upload receipt for a transaction
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const transactionId = formData.get('transactionId') as string
    const file = formData.get('file') as File
    const notes = formData.get('notes') as string | null
    
    if (!transactionId || !file) {
      return NextResponse.json({ error: 'Missing transactionId or file' }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF' 
      }, { status: 400 })
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 })
    }
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const fileName = `receipt_${transactionId}_${timestamp}.${ext}`
    const filePath = path.join('/home/z/my-project/upload/receipts', fileName)
    
    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Update transaction in database
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        receiptUrl: `/api/transactions/receipt/${fileName}`,
        receiptName: file.name,
        notes: notes || undefined,
      },
    })
    
    return NextResponse.json({
      success: true,
      transaction,
      receiptUrl: `/api/transactions/receipt/${fileName}`,
    })
  } catch (error) {
    console.error('Receipt upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload receipt',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Delete receipt from a transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
    }
    
    // Get transaction to find receipt file
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
    })
    
    if (!transaction || !transaction.receiptUrl) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 404 })
    }
    
    // Extract filename from URL
    const fileName = transaction.receiptUrl.split('/').pop()
    const filePath = path.join('/home/z/my-project/upload/receipts', fileName || '')
    
    // Delete file if exists
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
    
    // Update transaction
    await db.transaction.update({
      where: { id: transactionId },
      data: {
        receiptUrl: null,
        receiptName: null,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Receipt delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete receipt',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
