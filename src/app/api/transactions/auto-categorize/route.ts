import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Keyword-based category mapping (fallback)
const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; type: 'income' | 'expense' }> = {
  // Income patterns
  'Prestations de services': {
    type: 'income',
    keywords: ['virement', 'presta', 'facture', 'client', 'honoraires', 'consulting', 'conseil', 'développement', 'mission', 'service']
  },
  'Ventes de produits': {
    type: 'income',
    keywords: ['vente', 'produit', 'commande', 'livraison']
  },
  
  // Expense patterns
  'Fournitures de bureau': {
    type: 'expense',
    keywords: ['bureau', 'papeterie', 'stylo', 'fourniture', 'amazon', 'ldlc', 'fnac', 'boulanger', 'cultura']
  },
  'Logiciels & Abonnements': {
    type: 'expense',
    keywords: ['abonnement', 'software', 'logiciel', 'saas', 'netflix', 'spotify', 'adobe', 'microsoft', 'google', 'dropbox', 'notion', 'slack', 'zoom', 'github', 'vercel', 'ovh', 'gandi', 'domaine', 'hébergement', 'hosting', 'cloud', 'aws', 'azure', 'openai', 'chatgpt', 'claude', 'cursor', 'paddle', 'stripe', 'vpsdime', 'digitalocean', 'linode', 'hetzner']
  },
  'Télécommunications': {
    type: 'expense',
    keywords: ['orange', 'sfr', 'free', 'bouygues', 'mobile', 'internet', 'téléphone', 'forfait', 'fiber', 'fib', 'freebox', 'livebox', 'bbox']
  },
  'Loyer & Charges': {
    type: 'expense',
    keywords: ['loyer', 'charge', 'location', 'bail', 'immeuble', 'coworking']
  },
  'Assurances': {
    type: 'expense',
    keywords: ['assurance', 'mutuelle', 'axa', 'allianz', 'maaf', 'mgen', 'harmonie', 'malakoff']
  },
  'Frais bancaires': {
    type: 'expense',
    keywords: ['banque', 'frais bancaire', 'commission', 'agios', 'crédit mutuel', 'bnpparibas', 'lcl', 'sg ', 'société générale', 'caisse d\'épargne', 'banque populaire', 'blank', 'qonto', 'shine']
  },
  'Frais de déplacement': {
    type: 'expense',
    keywords: ['sncf', 'train', 'avion', 'air france', 'uber', 'bolt', 'taxi', 'vroom', 'kilomètre', 'péage', 'autoroute', 'essence', 'carburant', 'total', 'shell', 'bp ', 'parking', 'vélib', 'navette']
  },
  'Formation': {
    type: 'expense',
    keywords: ['formation', 'cours', 'training', 'udemy', 'coursera', 'openclassroom', 'linkedin learning', 'masterclass', 'certif']
  },
  'Publicité & Marketing': {
    type: 'expense',
    keywords: ['publicité', 'marketing', 'facebook ads', 'google ads', 'linkedin ads', 'seo', 'sea', 'communication', 'flyer', 'impression', 'carte de visite', 'vistaprint']
  },
  'Honoraires (comptable, avocat)': {
    type: 'expense',
    keywords: ['comptable', 'expert-comptable', 'avocat', 'notaire', 'huissier', 'juridique', 'dougs', 'indy', 'legalplace']
  },
  'Materiel informatique': {
    type: 'expense',
    keywords: ['apple', 'macbook', 'imac', 'dell', 'hp ', 'lenovo', 'asus', 'acer', 'ordinateur', 'laptop', 'pc ', 'écran', 'souris', 'clavier', 'webcam', 'casque', 'usb', 'disque dur', 'ssd', 'ram', 'imprimante', 'canon', 'epson']
  },
  'Repas professionnels': {
    type: 'expense',
    keywords: ['restaurant', 'repas', 'déjeuner', 'dîner', 'uber eats', 'deliveroo', 'just eat', 'doordash', 'ticket restaurant', 'slice']
  },
  'Cotisations sociales': {
    type: 'expense',
    keywords: ['urssaf', 'sécu', 'sécurité sociale', 'retraite', 'prevoyance', 'pôle emploi', 'formation prof', 'cotisation', 'social']
  },
  'Impôts et taxes': {
    type: 'expense',
    keywords: ['impôt', 'taxe', 'tva', 'is ', 'cfe', 'cva', 'forfait social', 'prélèvement', 'fiscal', 'dgfip']
  },
  'Rémunération': {
    type: 'expense',
    keywords: ['salaire', 'rémunération', 'bulletin', 'paye', 'net', 'brut']
  },
  'Dividendes': {
    type: 'expense',
    keywords: ['dividende', 'distribution']
  },
  'Retrait espèces': {
    type: 'expense',
    keywords: ['retrait', 'dab', 'distributeur', 'cash', 'espèce', 'guichet', 'withdrawal']
  },
}

// Extract pattern from description (e.g., "PADDLE.NET* VPSDIME Lisboa PRT" -> "paddle.net*")
function extractPattern(description: string): string {
  const desc = description.toLowerCase().trim()
  
  // For patterns like "VENDOR* Something", extract "vendor*"
  const starMatch = desc.match(/^([a-z0-9._-]+\*[a-z0-9._-]*)/)
  if (starMatch) {
    return starMatch[1]
  }
  
  // For domain patterns like "vendor.com" or "vendor.net"
  const domainMatch = desc.match(/([a-z0-9-]+\.[a-z0-9-]+)/)
  if (domainMatch) {
    return domainMatch[1]
  }
  
  // For card payments like "vendor city country", extract first word
  const parts = desc.split(/\s+/)
  if (parts.length >= 1) {
    // Return first significant word (at least 3 chars)
    for (const part of parts) {
      if (part.length >= 3 && !/^(the|for|and|via|par)$/i.test(part)) {
        return part
      }
    }
  }
  
  // Fallback: return first 20 chars
  return desc.substring(0, 20)
}

// Auto-categorize transactions
export async function POST(request: NextRequest) {
  try {
    console.log('=== AUTO-CATEGORIZE START ===')
    
    // Get all uncategorized transactions
    const uncategorized = await db.transaction.findMany({
      where: {
        OR: [
          { categoryId: null },
          { labeled: false }
        ]
      },
    })
    
    console.log(`Found ${uncategorized.length} uncategorized transactions`)
    
    // Get all categories
    const categories = await db.category.findMany()
    console.log(`Found ${categories.length} categories`)
    
    // Get all learned rules
    const rules = await db.categoryRule.findMany({
      orderBy: { matchCount: 'desc' }
    })
    console.log(`Found ${rules.length} learned rules`)
    
    // Get previously categorized transactions for learning
    const categorized = await db.transaction.findMany({
      where: {
        labeled: true,
        categoryId: { not: null }
      },
      select: {
        description: true,
        categoryId: true,
        type: true,
      }
    })
    console.log(`Found ${categorized.length} already categorized transactions`)
    
    // Build a map of patterns to categories from existing transactions
    const existingPatterns = new Map<string, { categoryId: string; type: string }>()
    for (const t of categorized) {
      const pattern = extractPattern(t.description)
      if (pattern && !existingPatterns.has(pattern)) {
        existingPatterns.set(pattern, { categoryId: t.categoryId!, type: t.type })
      }
    }
    console.log(`Built ${existingPatterns.size} patterns from existing transactions`)
    
    let categorizedCount = 0
    const results: Array<{ id: string; description: string; category: string; source: string }> = []
    
    for (const transaction of uncategorized) {
      const description = transaction.description.toLowerCase()
      const transactionType = transaction.amount >= 0 ? 'income' : 'expense'
      const pattern = extractPattern(transaction.description)
      
      let bestMatch: { categoryId: string; source: string } | null = null
      
      // 1. First check learned rules (highest priority)
      for (const rule of rules) {
        if (rule.transactionType === transactionType && 
            description.includes(rule.pattern.toLowerCase())) {
          bestMatch = { categoryId: rule.categoryId, source: 'learned_rule' }
          // Update rule usage
          await db.categoryRule.update({
            where: { id: rule.id },
            data: { 
              matchCount: { increment: 1 },
              lastUsed: new Date()
            }
          })
          console.log(`Rule match: "${rule.pattern}" -> category ${rule.categoryId}`)
          break
        }
      }
      
      // 2. Check patterns from existing categorized transactions
      if (!bestMatch) {
        for (const [pat, data] of existingPatterns) {
        if (description.includes(pat) && data.type === transactionType) {
          const category = categories.find(c => c.id === data.categoryId)
          if (category) {
            bestMatch = { categoryId: data.categoryId, source: 'existing_pattern' }
            // Save this as a learned rule for future use
            try {
              await db.categoryRule.upsert({
                where: { pattern: pat },
                create: {
                  pattern: pat,
                  categoryId: data.categoryId,
                  transactionType: data.type,
                },
                update: {
                  matchCount: { increment: 1 },
                  lastUsed: new Date()
                }
              })
              console.log(`Saved new rule: "${pat}" -> ${data.categoryId}`)
            } catch (e) {
              // Ignore upsert errors
            }
            break
          }
        }
      }
      
      // 3. Fallback to keyword matching
      if (!bestMatch) {
        for (const [categoryName, config] of Object.entries(CATEGORY_KEYWORDS)) {
          if (config.type !== transactionType) continue
          
          for (const keyword of config.keywords) {
            if (description.includes(keyword.toLowerCase())) {
              const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
              if (category) {
                bestMatch = { categoryId: category.id, source: 'keyword' }
                // Save this as a learned rule
                try {
                  await db.categoryRule.create({
                    data: {
                      pattern: pattern,
                      categoryId: category.id,
                      transactionType: transactionType,
                    }
                  })
                  console.log(`Created keyword rule: "${pattern}" -> ${category.name}`)
                } catch (e) {
                  // Pattern might already exist
                }
                break
              }
            }
          }
          if (bestMatch) break
        }
      }
      
      // Apply category if found
      if (bestMatch) {
        const category = categories.find(c => c.id === bestMatch!.categoryId)
        if (category) {
          await db.transaction.update({
            where: { id: transaction.id },
            data: {
              categoryId: category.id,
              type: category.type,
              labeled: true,
            },
          })
          categorizedCount++
          if (results.length < 50) {
            results.push({
              id: transaction.id,
              description: transaction.description.substring(0, 50),
              category: category.name,
              source: bestMatch.source,
            })
          }
        }
      }
    }
    
    console.log(`=== AUTO-CATEGORIZE COMPLETE: ${categorizedCount} categorized ===`)
    
    return NextResponse.json({
      success: true,
      categorized: categorizedCount,
      total: uncategorized.length,
      results,
    })
  } catch (error) {
    console.error('Auto-categorize error:', error)
    return NextResponse.json({ 
      error: 'Failed to auto-categorize',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
