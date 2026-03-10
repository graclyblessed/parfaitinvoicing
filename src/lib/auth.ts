import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from './db'

// Secret for JWT signing - use env var or fallback
// NOTE: In production, always set NEXTAUTH_SECRET environment variable for security
const AUTH_SECRET = process.env.NEXTAUTH_SECRET || 'IJFdPIkWdnzjRfMlocWsCWkagDUQ2R/SlVx2xLn8jM8='

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
        console.log('Authorize called for:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        console.log('User found:', user ? user.email : 'not found')

        if (!user || !user.password) {
          console.log('No user or no password')
          return null
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        console.log('Password match:', passwordMatch)

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
    async signIn({ user, account }) {
      console.log('SignIn callback:', { email: user.email, provider: account?.provider })
      
      // SINGLE-USER MODE: Check if any user already exists
      const userCount = await db.user.count()
      
      // For Google OAuth (new user registration)
      if (account?.provider === 'google') {
        // Check if this Google email is already registered
        const existingUser = await db.user.findUnique({
          where: { email: user.email || '' },
        })
        
        // If no existing user and there's already a user, block
        if (!existingUser && userCount > 0) {
          return false
        }
      }
      
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
  secret: AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
