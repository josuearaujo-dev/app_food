'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { formatPromotionHints } from '@/lib/promo-hint-format'
import {
  loadFulfillmentPreference,
  loadCheckoutCustomer,
  saveFulfillmentPreference,
  type FulfillmentType,
} from '@/lib/checkout-customer'
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Tag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ORDER_TAX_RATE, calculateOrderTax } from '@/lib/order-tax'
import { createClient } from '@/lib/supabase/client'

export default function CarrinhoPage() {
  const router = useRouter()
  const {
    items,
    updateQuantity,
    removeItem,
    totalItems,
    clearCart,
    promoCode,
    setPromoCode,
    promotionResult,
    promotionLoading,
    promotionError,
    subtotalBeforePromo,
    totalWithPromotion,
  } = useCart()
  const { t, lang } = useLang()
  const supabase = createClient()
  const [promoDraft, setPromoDraft] = useState(promoCode)
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | null>(null)
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [deliveryLocations, setDeliveryLocations] = useState<Array<{ id: string; taxaEntrega: number }>>([])
  const [authChoiceOpen, setAuthChoiceOpen] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(false)

  useEffect(() => {
    setPromoDraft(promoCode)
  }, [promoCode])

  useEffect(() => {
    setFulfillmentType(loadFulfillmentPreference())
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/checkout-config')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) return
        const fee = Number(data?.deliveryFee ?? 0)
        if (active && Number.isFinite(fee) && fee >= 0) {
          setDeliveryFee(fee)
        }
        const locationsRaw = Array.isArray(data?.locations) ? data.locations : []
        if (active) {
          setDeliveryLocations(
            locationsRaw
              .map((loc: unknown) => {
                const row = loc as { id?: unknown; taxaEntrega?: unknown }
                const id = String(row.id ?? '')
                const taxaEntrega = Number(row.taxaEntrega ?? 0)
                if (!id || !Number.isFinite(taxaEntrega) || taxaEntrega < 0) return null
                return { id, taxaEntrega: Number(taxaEntrega.toFixed(2)) }
              })
              .filter((row: { id: string; taxaEntrega: number } | null): row is { id: string; taxaEntrega: number } => row != null)
          )
        }
      })
      .catch(() => {
        /* no-op */
      })
    return () => {
      active = false
    }
  }, [])

  const hasFreeDeliveryPromotion = Boolean(promotionResult?.deliveryFreeEligible)
  const checkoutCustomer = loadCheckoutCustomer()
  const locationFee =
    checkoutCustomer?.localidadeEntregaId
      ? deliveryLocations.find((loc) => loc.id === checkoutCustomer.localidadeEntregaId)?.taxaEntrega
      : null
  const deliveryFeeApplied =
    fulfillmentType === 'delivery' && !hasFreeDeliveryPromotion
      ? Number((locationFee ?? deliveryFee).toFixed(2))
      : 0
  const totalWithDeliveryFee = Number((totalWithPromotion + deliveryFeeApplied).toFixed(2))
  const orderTax = calculateOrderTax(totalWithDeliveryFee)
  const totalWithTax = Number((totalWithDeliveryFee + orderTax).toFixed(2))

  async function handleProceed() {
    if (!fulfillmentType) {
      setFulfillmentError(
        lang === 'pt'
          ? 'Escolha se o pedido e para retirada ou delivery.'
          : 'Choose take out or delivery before continuing.'
      )
      return
    }
    setFulfillmentError(null)
    saveFulfillmentPreference(fulfillmentType)
    setCheckingAuth(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCheckingAuth(false)
    if (user) {
      router.push('/checkout/dados')
      return
    }
    setAuthChoiceOpen(true)
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col bg-background md:px-6">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border/80 bg-card/85 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl md:px-0">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card shadow-sm transition-colors active:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">{t.myCart}</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
            <ShoppingBag size={30} strokeWidth={1.5} className="text-primary" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground">{t.emptyCart}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.emptyCartHint}</p>
          <Link
            href="/"
            className="mt-1 rounded-xl bg-primary px-10 py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-opacity active:opacity-90"
          >
            {t.viewMenu}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] bg-background pb-80 md:px-6 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl md:px-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card shadow-sm transition-colors active:bg-muted"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">{t.myCart}</h1>
          </div>
          <button
            onClick={clearCart}
            className="text-xs text-muted-foreground font-medium underline underline-offset-2"
          >
            {t.clearAll}
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 md:px-0">
        <div className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-6 md:space-y-0">
          <section className="space-y-3">
        {promotionResult && promotionResult.discountAmount > 0 && (
          <div className="flex gap-2 rounded-xl border border-primary/35 bg-primary/8 p-3 text-sm shadow-sm">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-foreground">{t.cartPromoApplied}</p>
              <p className="text-muted-foreground leading-snug">{t.cartPromoStoreOff}</p>
              {promotionResult.breakdown.map((b) => (
                <p key={b.label} className="text-xs text-foreground/90">
                  {b.label}: −{t.currency}
                  {b.amount.toFixed(2)}
                </p>
              ))}
            </div>
          </div>
        )}
        {promotionResult &&
          promotionResult.discountAmount <= 0 &&
          formatPromotionHints(promotionResult.hints, lang, t.currency).map((line) => (
            <p
              key={line}
              className="rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs leading-snug text-muted-foreground"
            >
              {line}
            </p>
          ))}
        {promotionResult?.codeInvalid && promoCode.trim() ? (
          <p className="text-xs text-destructive">{t.cartPromoInvalid}</p>
        ) : null}
        {promotionError ? <p className="text-xs text-destructive">{promotionError}</p> : null}

        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {lang === 'pt' ? 'Atendimento' : 'Fulfillment'}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setFulfillmentType('take_out')
                setFulfillmentError(null)
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                fulfillmentType === 'take_out'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              {lang === 'pt' ? 'Retirada' : 'Take out'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFulfillmentType('delivery')
                setFulfillmentError(null)
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                fulfillmentType === 'delivery'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              {lang === 'pt' ? 'Delivery' : 'Delivery'}
            </button>
          </div>
          {fulfillmentError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {fulfillmentError}
            </p>
          ) : null}
        </div>

        {items.map(({ cartItemId, item, quantity, totalPrice: itemTotal, observation, selectedOptions }) => (
          <div
            key={cartItemId}
            className="flex gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-(--shadow-card)"
          >
            {item.imagem_url ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <img src={item.imagem_url} alt={item.nome} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                <ShoppingBag size={20} strokeWidth={1.5} className="text-primary/40" aria-hidden />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground line-clamp-1">{item.nome}</p>
              <p className="mt-0.5 font-serif text-sm font-semibold text-primary">
                {t.currency}
                {itemTotal.toFixed(2)}
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
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/80 px-2 py-1">
                  <button
                    onClick={() => updateQuantity(cartItemId, quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-card"
                    aria-label="Remove one"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-4 text-center text-xs font-bold">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(cartItemId, quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
                    aria-label="Add one"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(cartItemId)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                  aria-label={`Remove ${item.nome}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.cartPromoCodeLabel}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={promoDraft}
              onChange={(e) => setPromoDraft(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder=""
              autoCapitalize="characters"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => setPromoCode(promoDraft.trim())}
              className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
            >
              {t.cartPromoApply}
            </button>
            {promoCode.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setPromoDraft('')
                  setPromoCode('')
                }}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
              >
                Remover
              </button>
            ) : null}
          </div>
        </div>
          </section>

          <aside className="hidden md:sticky md:top-24 md:block">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {totalItems} {totalItems === 1 ? t.item : t.items}
                  </span>
                  {promotionLoading ? <span className="text-[11px] tabular-nums opacity-70">…</span> : null}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t.cartSubtotal}</span>
                  <span className="tabular-nums">
                    {t.currency}
                    {subtotalBeforePromo.toFixed(2)}
                  </span>
                </div>
                {promotionResult && promotionResult.discountAmount > 0 ? (
                  <div className="flex justify-between text-xs font-medium text-primary">
                    <span>{t.cartDiscount}</span>
                    <span className="tabular-nums">
                      −{t.currency}
                      {promotionResult.discountAmount.toFixed(2)}
                    </span>
                  </div>
                ) : null}
                {deliveryFeeApplied > 0 ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{lang === 'pt' ? 'Taxa de entrega' : 'Delivery fee'}</span>
                    <span className="tabular-nums">
                      {t.currency}
                      {deliveryFeeApplied.toFixed(2)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {lang === 'pt'
                      ? `Imposto (${(ORDER_TAX_RATE * 100).toFixed(2)}%)`
                      : `Tax (${(ORDER_TAX_RATE * 100).toFixed(2)}%)`}
                  </span>
                  <span className="tabular-nums">
                    {t.currency}
                    {orderTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>{t.total}</span>
                  <span className="text-lg tabular-nums text-primary">
                    {t.currency}
                    {totalWithTax.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleProceed()}
                disabled={!fulfillmentType || checkingAuth}
                className={`block w-full rounded-xl py-3 text-center text-sm font-semibold shadow-md transition-opacity ${
                  fulfillmentType && !checkingAuth
                    ? 'bg-primary text-primary-foreground active:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground opacity-70'
                }`}
              >
                {checkingAuth ? '...' : t.placeOrder}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Resumo fixo */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg border-t border-border/80 bg-card/95 px-4 pt-4 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {totalItems} {totalItems === 1 ? t.item : t.items}
            </span>
            {promotionLoading ? (
              <span className="text-[11px] tabular-nums opacity-70">…</span>
            ) : null}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t.cartSubtotal}</span>
            <span className="tabular-nums">
              {t.currency}
              {subtotalBeforePromo.toFixed(2)}
            </span>
          </div>
          {promotionResult && promotionResult.discountAmount > 0 ? (
            <div className="flex justify-between text-xs font-medium text-primary">
              <span>{t.cartDiscount}</span>
              <span className="tabular-nums">
                −{t.currency}
                {promotionResult.discountAmount.toFixed(2)}
              </span>
            </div>
          ) : null}
          {deliveryFeeApplied > 0 ? (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{lang === 'pt' ? 'Taxa de entrega' : 'Delivery fee'}</span>
              <span className="tabular-nums">
                {t.currency}
                {deliveryFeeApplied.toFixed(2)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {lang === 'pt'
                ? `Imposto (${(ORDER_TAX_RATE * 100).toFixed(2)}%)`
                : `Tax (${(ORDER_TAX_RATE * 100).toFixed(2)}%)`}
            </span>
            <span className="tabular-nums">
              {t.currency}
              {orderTax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>{t.total}</span>
            <span className="font-serif text-lg tabular-nums text-primary">
              {t.currency}
              {totalWithTax.toFixed(2)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleProceed()}
          disabled={!fulfillmentType || checkingAuth}
          className={`block w-full rounded-xl py-4 text-center text-sm font-semibold shadow-md transition-opacity ${
            fulfillmentType && !checkingAuth
              ? 'bg-primary text-primary-foreground active:opacity-90'
              : 'cursor-not-allowed bg-muted text-muted-foreground opacity-70'
          }`}
        >
          {checkingAuth ? '...' : t.placeOrder}
        </button>
      </div>

      {authChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={lang === 'pt' ? 'Fechar modal' : 'Close modal'}
            onClick={() => setAuthChoiceOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
            <p className="text-base font-bold text-foreground">
              {lang === 'pt' ? 'Salvar seus dados para próximos pedidos?' : 'Save your details for next orders?'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lang === 'pt'
                ? 'Escolha como deseja continuar.'
                : 'Choose how you want to continue.'}
            </p>
            <div className="mt-4 grid gap-2">
              <Link
                href="/checkout/dados"
                className="rounded-xl border border-border bg-background px-4 py-3 text-center text-sm font-semibold text-foreground"
                onClick={() => setAuthChoiceOpen(false)}
              >
                {lang === 'pt' ? 'Entrar como convidado' : 'Continue as guest'}
              </Link>
              <Link
                href="/conta/cadastro?next=%2Fcheckout%2Fdados"
                className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                onClick={() => setAuthChoiceOpen(false)}
              >
                {lang === 'pt' ? 'Criar conta' : 'Create account'}
              </Link>
              <Link
                href="/conta/entrar?next=%2Fcheckout%2Fdados"
                className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-foreground"
                onClick={() => setAuthChoiceOpen(false)}
              >
                {lang === 'pt' ? 'Já tenho conta' : 'I already have an account'}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
