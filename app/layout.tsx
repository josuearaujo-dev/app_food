import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { LangProvider } from '@/lib/lang-context'
import { BottomNav } from '@/components/bottom-nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cadu Cakes & Lanches',
  description: 'Cardápio digital da Cadu Cakes & Lanches',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E1D3C7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <LangProvider>
          <CartProvider>
            {children}
            <BottomNav />
          </CartProvider>
        </LangProvider>
        <Analytics />
      </body>
    </html>
  )
}
