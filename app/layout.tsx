import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { LangProvider } from '@/lib/lang-context'
import { BottomNav } from '@/components/bottom-nav'
import favicon192 from '@/logo/favicon-192.png'
import favicon512 from '@/logo/favicon-512.png'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cadu Cakes & Lanches',
  description: 'Cardapio digital de bolos, doces e lanches artesanais.',
  icons: {
    icon: [
      { url: favicon192.src, sizes: '192x192', type: 'image/png' },
      { url: favicon512.src, sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [favicon192.src],
    apple: [favicon192.src],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#531B04',
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
