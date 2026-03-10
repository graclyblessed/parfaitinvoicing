import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from './db'

// Generate a secret for development (NOT for production)
const getSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET
  }
  // In production without NEXTAUTH_SECRET, we need to fail gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error('NEXTAUTH_SECRET is required in production!')
    // Return a placeholder that will cause auth to fail safely
    return 'MISSING_SECRET_PLEASE_SET_NEXTAUTH_SECRET'
  }
  // Development fallback
  return 'development-secret-do-not-use-in-production'
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          return null
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    newUser: '/login?tab=register',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async signIn({ user }) {
      // For Google OAuth users, link existing settings if available
      if (user.email && user.id) {
        const existingSettings = await db.settings.findFirst({
          where: { userId: null },
        })
        
        if (existingSettings) {
          await db.settings.update({
            where: { id: existingSettings.id },
            data: { userId: user.id },
          })
        }
      }
      return true
    },
  },
  secret: getSecret(),
}
