import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Keyword-based category mapping
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
    keywords: ['abonnement', 'software', 'logiciel', 'saas', 'netflix', 'spotify', 'adobe', 'microsoft', 'google', 'dropbox', 'notion', 'slack', 'zoom', 'github', 'vercel', 'ovh', 'gandi', 'domaine', 'hébergement', 'hosting', 'cloud', 'aws', 'azure', 'openai', 'chatgpt', 'claude', 'cursor']
  },
  'Télécommunications': {
    type: 'expense',
    keywords: ['orange', 'sfr', 'free', 'bouygues', 'mobile', 'internet', 'téléphone', 'forfait', 'fiber', 'fib', 'freebox', 'livebox', 'bbox']
  },
  'Loyer & Charges': {
    type: 'expense',
    keywords: ['loyer', 'charge', 'location', 'bail', 'immeuble', 'coworking', 'bureau']
  },
  'Assurances': {
    type: 'expense',
    keywords: ['assurance', 'mutuelle', 'axa', 'allianz', 'maaf', 'mgen', 'harmonie', 'malakoff']
  },
  'Frais bancaires': {
    type: 'expense',
    keywords: ['banque', 'frais bancaire', 'commission', 'agios', 'crédit mutuel', 'bnpparibas', 'lcl', 'sg', 'société générale', 'caisse d\'épargne', 'banque populaire', 'blank', 'qonto', 'shine']
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
    keywords: ['comptable', 'expert-comptable', 'avocat', 'notaire', 'huissier', 'juridique', 'dougs', 'indy', 'shine', 'legalplace']
  },
  'Materiel informatique': {
    type: 'expense',
    keywords: ['apple', 'macbook', 'imac', 'dell', 'hp ', 'lenovo', 'asus', 'acer', 'ordinateur', 'laptop', 'pc ', 'écran', 'souris', 'clavier', 'webcam', 'casque', 'usb', 'disque dur', 'ssd', 'ram', 'imprimante', 'canon', 'epson', 'hp']
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

// Auto-categorize transactions
export async function POST(request: NextRequest) {
  try {
    // Get all uncategorized transactions
    const uncategorized = await db.transaction.findMany({
      where: {
        OR: [
          { categoryId: null },
          { labeled: false }
        ]
      },
    })
    
    // Get all categories
    const categories = await db.category.findMany()
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]))
    
    let categorized = 0
    const results: Array<{ id: string; description: string; category: string }> = []
    
    for (const transaction of uncategorized) {
      const description = transaction.description.toLowerCase()
      
      // Find matching category
      let bestMatch: { category: string; score: number } | null = null
      
      for (const [categoryName, config] of Object.entries(CATEGORY_KEYWORDS)) {
        // Check if transaction type matches category type
        const transactionType = transaction.amount >= 0 ? 'income' : 'expense'
        if (config.type !== transactionType) continue
        
        // Count keyword matches
        let score = 0
        for (const keyword of config.keywords) {
          if (description.includes(keyword.toLowerCase())) {
            score += keyword.length // Longer keywords get higher score
          }
        }
        
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { category: categoryName, score }
        }
      }
      
      // Apply category if found
      if (bestMatch) {
        const category = categoryMap.get(bestMatch.category.toLowerCase())
        if (category) {
          await db.transaction.update({
            where: { id: transaction.id },
            data: {
              categoryId: category.id,
              type: category.type,
              labeled: true,
            },
          })
          categorized++
          results.push({
            id: transaction.id,
            description: transaction.description.substring(0, 50),
            category: category.name,
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      categorized,
      total: uncategorized.length,
      results: results.slice(0, 50), // Return first 50 for preview
    })
  } catch (error) {
    console.error('Auto-categorize error:', error)
    return NextResponse.json({ 
      error: 'Failed to auto-categorize',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
