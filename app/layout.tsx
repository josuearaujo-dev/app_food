import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { LangProvider } from '@/lib/lang-context'
import { ProfileModalProvider } from '@/lib/profile-modal-context'
import { BottomNav } from '@/components/bottom-nav'
import { FloatingCartBar } from '@/components/floating-cart-bar'
import { StorefrontTrackingGate } from '@/components/marketing/storefront-tracking-gate'
import { getPublicMarketingConfig } from '@/lib/marketing/marketing.repository'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cadu Cakes & Lanches',
  description: 'Cardápio digital da Cadu Cakes & Lanches',
  icons: {
    icon: [
      { url: '/favicon-192.png?v=3', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512.png?v=3', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico?v=3' },
    ],
    apple: [{ url: '/apple-icon.png?v=3', sizes: '192x192', type: 'image/png' }],
    shortcut: '/favicon.ico?v=3',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E1D3C7',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const marketing = await getPublicMarketingConfig()

  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <LangProvider>
          <CartProvider>
            <ProfileModalProvider>
              <StorefrontTrackingGate config={marketing} />
              {children}
              <FloatingCartBar />
              <BottomNav />
            </ProfileModalProvider>
          </CartProvider>
        </LangProvider>
        <Analytics />
      </body>
    </html>
  )
}
