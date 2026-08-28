'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Minus, Plus, Search, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateOrderTax } from '@/lib/order-tax'
import { useLang } from '@/lib/lang-context'
import { AdminLoadingState } from '@/components/layout/admin-loading-state'
import { AdminPageContent } from '@/components/layout/admin-app-shell'
import { cn } from '@/lib/utils'

type MenuItem = {
  id: string
  nome: string
  preco: number
  categoria_id: string | null
}

type MenuCombo = {
  id: string
  nome: string
  preco: number
}

type CartLine = {
  key: string
  itemId: string | null
  comboId: string | null
  name: string
  quantity: number
  unitAmount: number
  categoriaId: string | null
  observation: string
}

type PaymentMethod = 'cash' | 'card_at_counter'

export function AdminManualOrderPanel() {
  const supabase = useMemo(() => createClient(), [])
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [orderNote, setOrderNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ orderNumber: string; total: number } | null>(null)

  const loadMenu = useCallback(async () => {
    setLoading(true)
    const [{ data: menuRows }, { data: comboRows }] = await Promise.all([
      supabase
        .from('itens_cardapio')
        .select('id, nome, preco, categoria_id')
        .eq('disponivel', true)
        .order('nome'),
      supabase.from('combos').select('id, nome, preco').eq('ativo', true).order('nome'),
    ])
    setItems((menuRows as MenuItem[]) ?? [])
    setCombos((comboRows as MenuCombo[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadMenu()
  }, [loadMenu])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.nome.toLowerCase().includes(q))
  }, [items, search])

  const filteredCombos = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return combos
    return combos.filter((combo) => combo.nome.toLowerCase().includes(q))
  }, [combos, search])

  const subtotal = useMemo(
    () => cart.reduce((acc, line) => acc + line.quantity * line.unitAmount, 0),
    [cart]
  )
  const taxAmount = useMemo(() => calculateOrderTax(subtotal), [subtotal])
  const total = useMemo(() => Number((subtotal + taxAmount).toFixed(2)), [subtotal, taxAmount])

  function addToCart(entry: {
    itemId: string | null
    comboId: string | null
    name: string
    unitAmount: number
    categoriaId: string | null
  }) {
    setSuccess(null)
    setError(null)
    setCart((prev) => {
      const existing = prev.find(
        (line) =>
          line.itemId === entry.itemId &&
          line.comboId === entry.comboId &&
          !line.observation
      )
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          itemId: entry.itemId,
          comboId: entry.comboId,
          name: entry.name,
          quantity: 1,
          unitAmount: entry.unitAmount,
          categoriaId: entry.categoriaId,
          observation: '',
        },
      ]
    })
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.key === key ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line
        )
        .filter((line) => line.quantity > 0)
    )
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key))
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      setError(t.manualOrderEmptyCart)
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/admin/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          paymentMethod,
          note: orderNote.trim() || undefined,
          items: cart.map((line) => ({
            id: line.comboId ?? line.itemId ?? line.key,
            combo_id: line.comboId,
            name: line.name,
            quantity: line.quantity,
            unitAmount: line.unitAmount,
            categoria_id: line.categoriaId,
            observation: line.observation || undefined,
          })),
        }),
      })
      const data = (await response.json()) as {
        error?: string
        order_number?: string
        total?: number
      }
      if (!response.ok) {
        throw new Error(data.error ?? t.manualOrderSubmitError)
      }
      setSuccess({
        orderNumber: data.order_number ?? '',
        total: Number(data.total ?? total),
      })
      setCart([])
      setOrderNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.manualOrderSubmitError)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <AdminLoadingState message={t.loadingAdmin} />
  }

  return (
    <AdminPageContent title={t.manualOrderTitle} eyebrow={t.ordersKitchenEyebrow} width="board">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.manualOrderSearchPlaceholder}
              className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {filteredCombos.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Combos
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredCombos.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() =>
                      addToCart({
                        itemId: null,
                        comboId: combo.id,
                        name: combo.nome,
                        unitAmount: Number(combo.preco),
                        categoriaId: null,
                      })
                    }
                    className="rounded-xl border border-border bg-white px-3 py-3 text-left shadow-sm transition-colors hover:border-primary/40"
                  >
                    <p className="text-sm font-semibold text-foreground">{combo.nome}</p>
                    <p className="text-xs text-accent">
                      {t.currency}
                      {Number(combo.preco).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === 'pt' ? 'Itens' : 'Items'}
            </p>
            <div className="grid max-h-[min(60vh,520px)] gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    addToCart({
                      itemId: item.id,
                      comboId: null,
                      name: item.nome,
                      unitAmount: Number(item.preco),
                      categoriaId: item.categoria_id,
                    })
                  }
                  className="rounded-xl border border-border bg-white px-3 py-3 text-left shadow-sm transition-colors hover:border-primary/40"
                >
                  <p className="text-sm font-semibold text-foreground">{item.nome}</p>
                  <p className="text-xs text-accent">
                    {t.currency}
                    {Number(item.preco).toFixed(2)}
                  </p>
                </button>
              ))}
              {filteredItems.length === 0 && filteredCombos.length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  {t.manualOrderNoResults}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">{t.manualOrderCartTitle}</h2>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.manualOrderEmptyCart}</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {cart.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-[#FCFCFD] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.currency}
                        {line.unitAmount.toFixed(2)} × {line.quantity}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="ml-1 text-[10px] font-semibold text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.manualOrderSubtotal}</span>
                <span>
                  {t.currency}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.manualOrderTax}</span>
                <span>
                  {t.currency}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>{t.total}</span>
                <span className="text-accent">
                  {t.currency}
                  {total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                {t.manualOrderCustomerName}
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.manualOrderCustomerPlaceholder}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                {t.manualOrderPaymentMethod}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['cash', t.manualOrderPayCash],
                    ['card_at_counter', t.manualOrderPayCard],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors',
                      paymentMethod === value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                {t.kitchenNote}
              </label>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                rows={2}
                placeholder={t.kitchenNotePlaceholder}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            ) : null}

            {success ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <p className="font-semibold">{t.manualOrderSuccess}</p>
                <p>
                  #{success.orderNumber} · {t.currency}
                  {success.total.toFixed(2)}
                </p>
                <Link href="/admin/ordens" className="mt-1 inline-block font-semibold underline">
                  {t.manualOrderViewBoard}
                </Link>
              </div>
            ) : null}

            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={() => void handleSubmit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.manualOrderSubmitting}
                </>
              ) : (
                t.manualOrderSubmit
              )}
            </button>
          </div>
        </aside>
      </div>
    </AdminPageContent>
  )
}
