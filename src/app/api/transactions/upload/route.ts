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
function parseTransaction(parts: string[], bankName: string): { 
  date: Date
  amount: number
  description: string
  reference?: string 
} | null {
  // Blank.app specific format
  if (bankName === 'blank') {
    return parseBlankTransaction(parts)
  }
  
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

// Parse Blank.app CSV format
// Expected format: Date;Description;Amount;Balance (or similar)
function parseBlankTransaction(parts: string[]): {
  date: Date
  amount: number
  description: string
  reference?: string
} | null {
  // Blank.app typically uses semicolon separator
  // Format variations:
  // 1. Date;Description;Amount;Balance
  // 2. Date;Description;Debit;Credit;Balance
  // 3. Date;Label;Amount
  
  if (parts.length < 3) return null
  
  // Try to parse date from first column
  let dateIndex = -1
  let amountIndex = -1
  let descriptionIndex = -1
  
  // Date patterns
  const datePatterns = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ]
  
  for (let i = 0; i < Math.min(parts.length, 5); i++) {
    const part = parts[i].trim()
    
    // Check for date
    for (const pattern of datePatterns) {
      if (pattern.test(part)) {
        dateIndex = i
        break
      }
    }
    
    // Check for amount (French or English format)
    const cleanPart = part.replace(/\s/g, '').replace(',', '.')
    if (/^-?\d+\.?\d*$/.test(cleanPart) && amountIndex === -1 && i !== dateIndex) {
      const num = parseFloat(cleanPart)
      if (!isNaN(num) && num !== 0) {
        amountIndex = i
      }
    }
  }
  
  if (dateIndex === -1 || amountIndex === -1) {
    return null
  }
  
  // Find description (usually between date and amount)
  for (let i = 0; i < parts.length; i++) {
    if (i !== dateIndex && i !== amountIndex) {
      const part = parts[i].trim()
      if (part && !/^-?\d/.test(part.replace(/\s/g, ''))) {
        descriptionIndex = i
        break
      }
    }
  }
  
  // Parse date
  const dateStr = parts[dateIndex].trim()
  let date: Date | null = null
  
  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern)
    if (match) {
      if (pattern === datePatterns[0] || pattern === datePatterns[2]) {
        // DD/MM/YYYY or DD-MM-YYYY
        date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
      } else {
        // YYYY-MM-DD
        date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      }
      break
    }
  }
  
  if (!date) return null
  
  // Parse amount
  const amountStr = parts[amountIndex].replace(/\s/g, '').replace(',', '.')
  const amount = parseFloat(amountStr)
  if (isNaN(amount)) return null
  
  // Get description
  const description = descriptionIndex >= 0 
    ? parts[descriptionIndex].trim() 
    : 'Transaction Blank'
  
  return {
    date,
    amount,
    description: description || 'Transaction Blank',
  }
}
