import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ColPsi | Plataforma de Gestión de Agremiados',
    template: '%s | ColPsi',
  },
  description: 'Sistema integral de gestión de agremiados, solvencias y pagos para colegio profesional',
  keywords: ['agremiados', 'solvencias', 'colegio profesional', 'gestión'],
  authors: [{ name: 'ColPsi' }],
  robots: 'noindex, nofollow', // Sistema interno
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  )
}
