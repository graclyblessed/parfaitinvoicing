import { NextRequest, NextResponse } from 'next/server'
import { readFile, existsSync } from 'fs'
import path from 'path'

// Serve receipt file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }
    
    const filePath = path.join('/home/z/my-project/upload/receipts', filename)
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Read file
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      readFile(filePath, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
    
    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }
    
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Serve receipt error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
