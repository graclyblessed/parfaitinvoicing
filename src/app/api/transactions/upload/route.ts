import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// CSV Upload endpoint
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bankName = formData.get('bankName') as string || 'default'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    // Skip header row and process data
    const transactions: Array<{
      date: Date
      amount: number
      description: string
      reference: string | null
      type: string
      labeled: boolean
      bankAccount: string
      rawCsvData: string
    }> = []
    let skipped = 0
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Try to parse CSV line - handle different formats
      const parts = parseCSVLine(line)
      
      if (parts.length < 3) {
        skipped++
        continue
      }
      
      // Try to detect date, amount, description format
      const parsed = parseTransaction(parts, bankName)
      
      if (parsed) {
        // Check for duplicates
        const existing = await db.transaction.findFirst({
          where: {
            date: parsed.date,
            amount: parsed.amount,
            description: parsed.description,
          },
        })
        
        if (!existing) {
          transactions.push({
            date: parsed.date,
            amount: parsed.amount,
            description: parsed.description,
            reference: parsed.reference || null,
            type: parsed.amount >= 0 ? 'income' : 'expense',
            labeled: false,
            bankAccount: bankName,
            rawCsvData: line,
          })
        } else {
          skipped++
        }
      } else {
        skipped++
      }
    }
    
    // Insert all new transactions
    if (transactions.length > 0) {
      await db.transaction.createMany({
        data: transactions,
      })
    }
    
    return NextResponse.json({
      success: true,
      imported: transactions.length,
      skipped,
      total: lines.length - 1,
    })
  } catch (error) {
    console.error('Error uploading CSV:', error)
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 })
  }
}

// Parse CSV line handling quotes and different delimiters
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Parse transaction from CSV parts - handles common French bank formats
function parseTransaction(parts: string[], _bankName: string): { 
  date: Date
  amount: number
  description: string
  reference?: string 
} | null {
  // Try different date formats
  const datePatterns = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ]
  
  let date: Date | null = null
  let amount: number | null = null
  let description = ''
  let reference = ''
  
  for (const part of parts) {
    // Try to parse date
    for (const pattern of datePatterns) {
      const match = part.match(pattern)
      if (match && !date) {
        if (pattern === datePatterns[0] || pattern === datePatterns[2]) {
          // DD/MM/YYYY or DD-MM-YYYY
          const day = parseInt(match[1])
          const month = parseInt(match[2])
          const year = parseInt(match[3])
          date = new Date(year, month - 1, day)
        } else {
          // YYYY-MM-DD
          const year = parseInt(match[1])
          const month = parseInt(match[2])
          const day = parseInt(match[3])
          date = new Date(year, month - 1, day)
        }
        continue
      }
    }
    
    // Try to parse amount (French format with comma for decimals)
    const cleanPart = part.replace(/\s/g, '').replace(',', '.')
    const numMatch = cleanPart.match(/^-?\d+\.?\d*$/)
    if (numMatch && amount === null) {
      const parsed = parseFloat(cleanPart)
      if (!isNaN(parsed) && parsed !== 0) {
        amount = parsed
        continue
      }
    }
    
    // Treat as description if not date or amount
    const isDate = datePatterns.some(p => part.match(p))
    const cleanAmount = part.replace(/\s/g, '').replace(',', '.')
    const isAmount = cleanAmount.match(/^-?\d+\.?\d*$/)
    
    if (!isDate && !isAmount && part.trim()) {
      if (description) {
        description += ' ' + part
      } else {
        description = part
      }
    }
  }
  
  if (!date || amount === null) {
    return null
  }
  
  return {
    date,
    amount: amount!,
    description: description || 'Transaction sans description',
    reference: reference || undefined,
  }
}
