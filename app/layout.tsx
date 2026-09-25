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
  // Avoid mounting database-dependent clients before local setup is complete.
  if (
    process.env.NODE_ENV === 'development' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  ) {
    return (
      <html lang="pt-BR">
        <body className="font-sans antialiased">
          <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">Cadu Cakes &amp; Lanches · Desenvolvimento</p>
            <h1 className="text-3xl font-bold">Configure a conexão com o cardápio</h1>
            <p className="mt-4 leading-relaxed">Preencha as variáveis abaixo no arquivo .env.local, na raiz do projeto, com a URL e a chave pública do seu Supabase.</p>
            <pre className="my-6 overflow-x-auto rounded-2xl border border-border bg-card p-5 text-xs leading-7">{'NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY='}</pre>
            <p className="text-sm leading-relaxed text-muted-foreground">Depois de salvar, atualize esta página. Se necessário, reinicie o servidor com npm run dev. O cardápio e os pedidos precisam dessa conexão para funcionar.</p>
          </main>
        </body>
      </html>
    )
  }

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
