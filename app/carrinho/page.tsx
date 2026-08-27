'use client'

import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function CarrinhoPage() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems, clearCart } =
    useCart()
  const { t } = useLang()

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col bg-background">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border/90 bg-background/90 px-4 pb-4 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-foreground">{t.myCart}</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
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
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background pb-52">
      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 px-4 pb-4 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-foreground">{t.myCart}</h1>
          </div>
          <button
            onClick={clearCart}
            className="text-xs text-muted-foreground font-medium underline underline-offset-2"
          >
            {t.clearAll}
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {items.map(({ cartItemId, item, quantity, totalPrice: itemTotal, observation, selectedOptions }) => (
          <div key={cartItemId} className="flex gap-3 bg-card rounded-2xl p-3 border border-border">
            {item.imagem_url ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <span className="text-2xl">🍽️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground line-clamp-1">{item.nome}</p>
              <p className="mt-0.5 text-sm font-bold text-accent">
                {t.currency}{itemTotal.toFixed(2)}
              </p>
              {observation && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Obs: {observation}
                </p>
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
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-2 py-1">
                  <button
                    onClick={() => updateQuantity(cartItemId, quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-background"
                    aria-label="Remove one"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(cartItemId, quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                    aria-label="Add one"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(cartItemId)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500"
                  aria-label={`Remove ${item.nome}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo fixo */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 pt-4 max-w-lg mx-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{totalItems} {totalItems === 1 ? t.item : t.items}</span>
            <span>{t.currency}{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
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
      </div>
    </main>
  )
}
