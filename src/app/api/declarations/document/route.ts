import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// POST - Upload document for declaration
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const declarationId = formData.get('declarationId') as string
    const file = formData.get('file') as File
    
    if (!declarationId || !file) {
      return NextResponse.json({ error: 'Missing declarationId or file' }, { status: 400 })
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'declarations')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${declarationId}_${timestamp}_${originalName}`
    const filepath = path.join(uploadsDir, filename)
    
    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)
    
    // Update declaration with document URL
    const documentUrl = `/uploads/declarations/${filename}`
    const declaration = await prisma.declaration.update({
      where: { id: declarationId },
      data: { 
        documentUrl,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({ success: true, declaration })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Error uploading document' }, { status: 500 })
  }
}
