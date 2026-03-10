import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// CSV Upload endpoint
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bankName = formData.get('bankName') as string || 'default'
    
    console.log('Upload request received:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      bankName 
    })
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const text = await file.text()
    console.log('CSV content length:', text.length)
    console.log('CSV first 500 chars:', text.substring(0, 500))
    
    const lines = text.split('\n').filter(line => line.trim())
    console.log('Number of lines:', lines.length)
    
    if (lines.length < 2) {
      return NextResponse.json({ 
        error: 'File appears to be empty or has no data rows',
        linesFound: lines.length 
      }, { status: 400 })
    }
    
    // Log header row for debugging
    console.log('Header row:', lines[0])
    
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
    const parseErrors: string[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Try to parse CSV line - handle different formats
      const parts = parseCSVLine(line)
      
      if (parts.length < 2) {
        skipped++
        parseErrors.push(`Line ${i + 1}: Not enough columns (${parts.length})`)
        continue
      }
      
      // Try to detect date, amount, description format
      const parsed = parseTransaction(parts, bankName)
      
      if (parsed) {
        console.log(`Line ${i + 1} parsed:`, { 
          date: parsed.date, 
          amount: parsed.amount, 
          description: parsed.description.substring(0, 50) 
        })
        
        // Check for duplicates
        try {
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
        } catch (dbError) {
          console.error('Database check error:', dbError)
          // Still add the transaction even if check fails
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
        }
      } else {
        skipped++
        parseErrors.push(`Line ${i + 1}: Could not parse - ${parts.join(' | ')}`)
      }
    }
    
    console.log(`Parsed ${transactions.length} transactions, skipped ${skipped}`)
    
    // Insert all new transactions
    if (transactions.length > 0) {
      try {
        await db.transaction.createMany({
          data: transactions,
        })
        console.log(`Successfully inserted ${transactions.length} transactions`)
      } catch (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ 
          error: 'Failed to insert transactions',
          details: String(insertError),
          parsedCount: transactions.length
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      success: true,
      imported: transactions.length,
      skipped,
      total: lines.length - 1,
      parseErrors: parseErrors.slice(0, 10), // Return first 10 errors for debugging
    })
  } catch (error) {
    console.error('Error uploading CSV:', error)
    return NextResponse.json({ 
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
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
  
  // Generic parser for other banks
  return parseGenericTransaction(parts)
}

// Parse Blank.app CSV format
// Expected formats:
// 1. Date;Description;Amount;Balance
// 2. Date;Description;Debit;Credit;Balance
// 3. Date;Label;Amount
function parseBlankTransaction(parts: string[]): {
  date: Date
  amount: number
  description: string
  reference?: string
} | null {
  if (parts.length < 2) return null
  
  // Date patterns - support multiple formats
  const datePatterns = [
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, type: 'ddmmyyyy' },
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, type: 'yyyymmdd' },
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, type: 'ddmmyyyy' },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, type: 'ddmmyyyy' },
  ]
  
  let date: Date | null = null
  let dateIndex = -1
  let amount: number | null = null
  let amountIndex = -1
  let description = ''
  
  // Find date column
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    
    for (const pattern of datePatterns) {
      const match = part.match(pattern.regex)
      if (match) {
        if (pattern.type === 'ddmmyyyy') {
          const day = parseInt(match[1])
          const month = parseInt(match[2])
          const year = parseInt(match[3])
          date = new Date(year, month - 1, day)
        } else {
          const year = parseInt(match[1])
          const month = parseInt(match[2])
          const day = parseInt(match[3])
          date = new Date(year, month - 1, day)
        }
        dateIndex = i
        break
      }
    }
    if (dateIndex >= 0) break
  }
  
  if (!date || dateIndex < 0) {
    console.log('No date found in parts:', parts)
    return null
  }
  
  // Find amount column - look for numeric values
  // Try to find debit/credit columns or single amount column
  let debit: number | null = null
  let credit: number | null = null
  
  for (let i = 0; i < parts.length; i++) {
    if (i === dateIndex) continue
    
    const part = parts[i].trim()
    
    // Skip empty parts
    if (!part) continue
    
    // Try to parse as number (handle French format with comma for decimals)
    const cleanPart = part
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.\-]/g, '')
    
    if (cleanPart && /^-?\d+\.?\d*$/.test(cleanPart)) {
      const num = parseFloat(cleanPart)
      if (!isNaN(num)) {
        // Check if this might be a balance (usually the last number)
        // or an amount
        if (amountIndex < 0) {
          amount = num
          amountIndex = i
        }
      }
    }
  }
  
  // If no amount found, check for separate debit/credit columns
  if (amount === null) {
    // Look for two numeric columns after date (debit + credit pattern)
    const numericParts: { index: number; value: number }[] = []
    for (let i = 0; i < parts.length; i++) {
      if (i === dateIndex) continue
      const cleanPart = parts[i].trim().replace(/\s/g, '').replace(',', '.')
      if (/^\d+\.?\d*$/.test(cleanPart)) {
        numericParts.push({ index: i, value: parseFloat(cleanPart) })
      }
    }
    
    if (numericParts.length >= 2) {
      // Assume first is debit, second is credit
      debit = numericParts[0].value
      credit = numericParts[1].value
      amount = credit - debit // Credit is positive, debit is negative
    }
  }
  
  if (amount === null) {
    console.log('No amount found in parts:', parts)
    return null
  }
  
  // Find description (non-date, non-amount text column)
  for (let i = 0; i < parts.length; i++) {
    if (i === dateIndex || i === amountIndex) continue
    
    const part = parts[i].trim()
    if (part && !/^-?\d/.test(part.replace(/\s/g, '').replace(',', '.'))) {
      description = part
      break
    }
  }
  
  if (!description) {
    description = 'Transaction Blank'
  }
  
  return {
    date,
    amount,
    description,
  }
}

// Generic parser for other banks
function parseGenericTransaction(parts: string[]): {
  date: Date
  amount: number
  description: string
  reference?: string
} | null {
  // Date patterns
  const datePatterns = [
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, type: 'ddmmyyyy' },
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, type: 'yyyymmdd' },
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, type: 'ddmmyyyy' },
  ]
  
  let date: Date | null = null
  let amount: number | null = null
  let description = ''
  
  for (const part of parts) {
    // Try to parse date
    for (const pattern of datePatterns) {
      const match = part.match(pattern.regex)
      if (match && !date) {
        if (pattern.type === 'ddmmyyyy') {
          const day = parseInt(match[1])
          const month = parseInt(match[2])
          const year = parseInt(match[3])
          date = new Date(year, month - 1, day)
        } else {
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
    const isDate = datePatterns.some(p => p.regex.test(part))
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
  }
}
