import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/((?!login|mot-de-passe-oublie|api/auth|api/public|api/webhooks|_next/static|_next/image|favicon\\.ico).*)'],
}
