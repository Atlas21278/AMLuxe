import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: 'AMLuxe — Gestion achat/revente',
  description: 'Application de gestion de sacs de luxe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-[#0f0f13] text-white">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
