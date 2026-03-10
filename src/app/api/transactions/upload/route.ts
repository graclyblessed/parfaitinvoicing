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
    const headerLine = lines[0].toLowerCase()
    console.log('Header row:', headerLine)
    
    // Parse header to find column indices
    const headers = parseCSVLine(headerLine)
    const columnMap = mapColumns(headers)
    console.log('Column mapping:', columnMap)
    
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
      
      // Try to parse CSV line
      const parts = parseCSVLine(line)
      
      if (parts.length < 3) {
        skipped++
        parseErrors.push(`Line ${i + 1}: Not enough columns (${parts.length})`)
        continue
      }
      
      // Parse based on bank format
      let parsed: { date: Date; amount: number; description: string; reference?: string } | null = null
      
      if (bankName === 'blank') {
        parsed = parseBlankTransaction(parts, columnMap)
      } else {
        parsed = parseGenericTransaction(parts)
      }
      
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
        if (parseErrors.length < 20) {
          parseErrors.push(`Line ${i + 1}: Could not parse`)
        }
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
      parseErrors: parseErrors.slice(0, 10),
    })
  } catch (error) {
    console.error('Error uploading CSV:', error)
    return NextResponse.json({ 
      error: 'Failed to process CSV file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Map CSV columns to standard names
function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim().replace(/['"]/g, '')
    
    // Date columns
    if (h.includes('valeur_date') || h === 'date_valeur' || h === 'date') {
      map.date = index
    }
    if (h.includes('execution_date') || h === 'date_execution' || h === 'date_operation') {
      map.executionDate = index
    }
    
    // Description columns
    if (h.includes('libelle') || h === 'description' || h === 'label') {
      map.description = index
    }
    
    // Counterparty name
    if (h.includes('nom_contrepartie') || h === 'contrepartie' || h === 'beneficiaire') {
      map.counterparty = index
    }
    
    // Amount columns
    if (h.includes('montant_transaction') || h === 'montant' || h === 'amount') {
      map.amount = index
    }
    
    // Reference columns
    if (h.includes('reference') || h === 'ref') {
      map.reference = index
    }
    
    // Category
    if (h.includes('categorie') || h === 'category') {
      map.category = index
    }
  })
  
  return map
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

// Parse Blank.app CSV format using column mapping
function parseBlankTransaction(parts: string[], columnMap: Record<string, number>): {
  date: Date
  amount: number
  description: string
  reference?: string
} | null {
  console.log('Parsing Blank.app row, parts count:', parts.length, 'columnMap:', columnMap)
  
  // Get date - prefer valeur_date, fallback to execution_date
  let dateStr = ''
  if (columnMap.date !== undefined && parts[columnMap.date]) {
    dateStr = parts[columnMap.date].trim()
  } else if (columnMap.executionDate !== undefined && parts[columnMap.executionDate]) {
    dateStr = parts[columnMap.executionDate].trim()
  }
  
  if (!dateStr) {
    console.log('No date found')
    return null
  }
  
  // Parse date - handle multiple formats
  const date = parseDate(dateStr)
  if (!date) {
    console.log('Could not parse date:', dateStr)
    return null
  }
  
  // Get amount
  let amountStr = ''
  if (columnMap.amount !== undefined && parts[columnMap.amount]) {
    amountStr = parts[columnMap.amount].trim()
  }
  
  if (!amountStr) {
    console.log('No amount found')
    return null
  }
  
  // Parse amount - handle French format
  const amount = parseAmount(amountStr)
  if (isNaN(amount)) {
    console.log('Could not parse amount:', amountStr)
    return null
  }
  
  // Build description from available fields
  let description = ''
  if (columnMap.description !== undefined && parts[columnMap.description]) {
    description = parts[columnMap.description].trim()
  }
  
  // Add counterparty if available
  if (columnMap.counterparty !== undefined && parts[columnMap.counterparty]) {
    const counterparty = parts[columnMap.counterparty].trim()
    if (counterparty && !description.includes(counterparty)) {
      description = description ? `${description} - ${counterparty}` : counterparty
    }
  }
  
  if (!description) {
    description = 'Transaction Blank'
  }
  
  // Get reference if available
  let reference: string | undefined = undefined
  if (columnMap.reference !== undefined && parts[columnMap.reference]) {
    reference = parts[columnMap.reference].trim()
  }
  
  return {
    date,
    amount,
    description,
    reference,
  }
}

// Parse date string into Date object
function parseDate(dateStr: string): Date | null {
  // Remove quotes
  dateStr = dateStr.replace(/['"]/g, '').trim()
  
  // Try different formats
  const patterns = [
    // YYYY-MM-DD
    { regex: /^(\d{4})-(\d{2})-(\d{2})/, order: [1, 2, 3] },
    // DD/MM/YYYY
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})/, order: [3, 2, 1] },
    // DD-MM-YYYY
    { regex: /^(\d{2})-(\d{2})-(\d{4})/, order: [3, 2, 1] },
    // MM/DD/YYYY (US format)
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})/, order: [3, 1, 2] },
  ]
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern.regex)
    if (match) {
      const year = parseInt(match[pattern.order[0]])
      const month = parseInt(match[pattern.order[1]])
      const day = parseInt(match[pattern.order[2]])
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const date = new Date(year, month - 1, day)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
  }
  
  // Try native Date parsing as fallback
  const nativeDate = new Date(dateStr)
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate
  }
  
  return null
}

// Parse amount string into number
function parseAmount(amountStr: string): number {
  // Remove quotes, spaces, and currency symbols
  amountStr = amountStr
    .replace(/['"]/g, '')
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/EUR/g, '')
    .trim()
  
  // Handle French format: comma as decimal separator, dot as thousands separator
  // Example: "1.234,56" -> 1234.56
  if (amountStr.includes(',') && amountStr.includes('.')) {
    // Remove thousand separators (dots), replace comma with dot
    amountStr = amountStr.replace(/\./g, '').replace(',', '.')
  } else if (amountStr.includes(',')) {
    // Just comma as decimal separator
    amountStr = amountStr.replace(',', '.')
  }
  
  const amount = parseFloat(amountStr)
  return amount
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
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ]
  
  let date: Date | null = null
  let amount: number | null = null
  let description = ''
  
  for (const part of parts) {
    // Try to parse date
    for (const pattern of datePatterns) {
      const match = part.match(pattern)
      if (match && !date) {
        if (pattern === datePatterns[0] || pattern === datePatterns[2]) {
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
    
    // Try to parse amount
    const cleanPart = part.replace(/\s/g, '').replace(',', '.')
    const numMatch = cleanPart.match(/^-?\d+\.?\d*$/)
    if (numMatch && amount === null) {
      const parsed = parseFloat(cleanPart)
      if (!isNaN(parsed) && parsed !== 0) {
        amount = parsed
        continue
      }
    }
    
    // Treat as description
    const isDate = datePatterns.some(p => p.test(part))
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
