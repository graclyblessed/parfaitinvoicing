import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const userCount = await db.user.count()
    
    return NextResponse.json({
      canRegister: userCount === 0,
      message: userCount > 0 
        ? 'Les inscriptions sont désactivées. Cette application est en mode mono-utilisateur.' 
        : null
    })
  } catch (error) {
    console.error('Check registration error:', error)
    return NextResponse.json(
      { canRegister: false, message: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}
