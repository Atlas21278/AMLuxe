import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Rate limiting simple en mémoire : max 5 tentatives par email sur 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(email)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

function resetRateLimit(email: string) {
  loginAttempts.delete(email)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        if (!checkRateLimit(credentials.email)) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.actif) return null

        const isValid = await bcrypt.compare(credentials.password, user.motDePasse)
        if (!isValid) return null

        resetRateLimit(credentials.email)

        return {
          id: user.id.toString(),
          name: user.nom,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 heures
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
}
