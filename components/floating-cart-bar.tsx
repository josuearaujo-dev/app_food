'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'

/** Barra fixa acima da bottom nav quando há itens no carrinho (inspirado no açaí). */
export function FloatingCartBar() {
  const pathname = usePathname()
  const { totalItems, totalPrice } = useCart()
  const { t } = useLang()

  if (totalItems === 0) return null
  if (pathname.startsWith('/admin') || pathname.startsWith('/pagamento') || pathname === '/carrinho') {
    return null
  }

  return (
    <div
      className="fixed left-0 right-0 z-40 mx-auto max-w-lg px-4"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      <Link
        href="/carrinho"
        className="flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg ring-1 ring-primary/20 active:scale-[0.99] transition-transform"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag size={18} strokeWidth={2.2} />
          {t.viewCart} ({totalItems})
        </span>
        <span className="text-sm font-bold tabular-nums">
          {t.currency}
          {totalPrice.toFixed(2)}
        </span>
      </Link>
    </div>
  )
}
