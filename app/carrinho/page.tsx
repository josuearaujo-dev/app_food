'use client'

import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { StorefrontFixedFooter } from '@/components/layout/storefront-fixed-footer'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontShell } from '@/components/layout/storefront-shell'

export default function CarrinhoPage() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems, clearCart } = useCart()
  const { t } = useLang()

  if (items.length === 0) {
    return (
      <StorefrontShell
        fullHeight
        header={<StorefrontHeader title={t.myCart} backHref="/" backLabel={t.back} />}
        contentClassName="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <ShoppingBag size={32} className="text-accent" />
        </div>
        <h2 className="font-bold text-xl text-foreground">{t.emptyCart}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t.emptyCartHint}</p>
        <Link
          href="/"
          className="mt-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          {t.viewMenu}
        </Link>
      </StorefrontShell>
    )
  }

  return (
    <StorefrontShell
      bottomPadding="footer"
      header={
        <StorefrontHeader
          title={t.myCart}
          backHref="/"
          backLabel={t.back}
          trailing={
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-medium text-muted-foreground underline underline-offset-2"
            >
              {t.clearAll}
            </button>
          }
        />
      }
    >
      <div className="space-y-3 px-4 pt-4">
        {items.map(({ cartItemId, item, quantity, totalPrice: itemTotal, observation, selectedOptions }) => (
          <div key={cartItemId} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            {item.imagem_url ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <img src={item.imagem_url} alt={item.nome} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <span className="text-2xl">🍽️</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.nome}</p>
              <p className="mt-0.5 text-sm font-bold text-accent">
                {t.currency}
                {itemTotal.toFixed(2)}
              </p>
              {observation && (
                <p className="mt-1 text-[11px] text-muted-foreground">Obs: {observation}</p>
              )}
              {selectedOptions.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {selectedOptions
                    .map((o) =>
                      o.groupType === 'extra' && o.groupName
                        ? `${o.groupName}: ${o.label}`
                        : o.label
                    )
                    .join(' • ')}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-secondary px-2 py-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(cartItemId, quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-background"
                    aria-label="Remove one"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-4 text-center text-xs font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(cartItemId, quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                    aria-label="Add one"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(cartItemId)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500"
                  aria-label={`Remove ${item.nome}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <StorefrontFixedFooter>
        <div className="mb-4 space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {totalItems} {totalItems === 1 ? t.item : t.items}
            </span>
            <span>
              {t.currency}
              {totalPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>{t.total}</span>
            <span className="text-accent">
              {t.currency}
              {totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
        <Link
          href="/checkout/dados"
          className="block w-full rounded-2xl bg-primary py-4 text-center text-sm font-bold text-primary-foreground transition-opacity active:opacity-90"
        >
          {t.placeOrder}
        </Link>
      </StorefrontFixedFooter>
    </StorefrontShell>
  )
}
