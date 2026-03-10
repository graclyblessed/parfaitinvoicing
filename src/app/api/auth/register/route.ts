import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // SINGLE-USER MODE: Check if any user already exists
    const userCount = await db.user.count()
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Les inscriptions sont désactivées. Cette application est en mode mono-utilisateur.' },
        { status: 403 }
      )
    }

    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Check if user exists with this email
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    // Check if there's an existing settings record without a user (for migration)
    const existingSettings = await db.settings.findFirst({
      where: { userId: null },
    })

    if (existingSettings) {
      // Link existing settings to the new user
      await db.settings.update({
        where: { id: existingSettings.id },
        data: { userId: user.id },
      })
    } else {
      // Create default settings for the user
      await db.settings.create({
        data: {
          userId: user.id,
          companyName: name || 'Ma SASU',
          companyAddress: '',
          companySIRET: '',
          companySIREN: '',
          email: email,
        },
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500 }
    )
  }
}
