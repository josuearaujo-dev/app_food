'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Package } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import {
  type CustomerOrderDetail,
  formatOrderDate,
  kitchenStatusLabel,
  paymentStatusLabel,
} from '@/lib/orders/order-presentation'

type Props = {
  orderId: string
}

export default function PedidoDetailPage({ orderId }: Props) {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')?.trim() ?? ''
  const { t, lang } = useLang()
  const [order, setOrder] = useState<(CustomerOrderDetail & { displayNumber?: string }) | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    const qs = emailParam ? `?email=${encodeURIComponent(emailParam)}` : ''
    const res = await fetch(`/api/pedidos/${orderId}${qs}`)
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error ?? t.orderNotFound)
    }
    setOrder(data.order)
    setError(null)
  }, [orderId, emailParam, t.orderNotFound])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await fetchOrder()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.orderNotFound)
          setOrder(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchOrder, t.orderNotFound])

  useEffect(() => {
    if (!order || error) return
    const timer = setInterval(() => {
      fetchOrder().catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [order, error, fetchOrder])

  const statusSteps = useMemo(
    () => [
      { key: 'new' as const, label: t.orderStatusNew },
      { key: 'preparing' as const, label: t.orderStatusPreparing },
      { key: 'delivered' as const, label: t.orderStatusDelivered },
    ],
    [t]
  )

  const currentStepIndex = order
    ? statusSteps.findIndex((s) => s.key === order.status_producao)
    : -1

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background pb-28">
      <header className="border-b border-border/90 bg-background/90 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <Link
          href="/perfil"
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-accent"
        >
          <ArrowLeft size={16} />
          {t.back}
        </Link>
        <h1 className="text-xl font-bold text-foreground">{t.orderDetailTitle}</h1>
      </header>

      <div className="px-4 pt-4">
        {loading && (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
            <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/perfil" className="mt-4 inline-block text-sm font-semibold text-accent">
              {t.lookupOrder}
            </Link>
          </div>
        )}

        {!loading && order && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.orderNumberLabel}
              </p>
              <p className="mt-1 text-2xl font-bold text-accent">
                #{order.displayNumber ?? order.numero_pedido}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  {paymentStatusLabel(order.status_pagamento, lang)}
                </span>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {kitchenStatusLabel(order.status_producao, lang)}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={15} />
                {formatOrderDate(order.criado_em, lang)}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-4 text-sm font-bold text-foreground">{t.orderProgress}</p>
              <div className="space-y-3">
                {statusSteps.map((step, index) => {
                  const done = index <= currentStepIndex
                  const active = index === currentStepIndex
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          done
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-secondary text-muted-foreground'
                        } ${active ? 'ring-2 ring-accent/30' : ''}`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-sm ${done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Package size={16} className="text-accent" />
                <p className="text-sm font-bold text-foreground">{t.orderItems}</p>
              </div>
              <ul className="space-y-3">
                {order.pedido_itens.map((item) => (
                  <li key={item.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {item.quantidade}x {item.nome_item}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        ${Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                    {item.opcoes_selecionadas?.length ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.opcoes_selecionadas.map((o) => o.label).join(', ')}
                      </p>
                    ) : null}
                    {item.observacao ? (
                      <p className="mt-1 text-xs italic text-muted-foreground">{item.observacao}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-border pt-3">
                <span className="text-sm font-bold text-foreground">{t.total}</span>
                <span className="text-base font-bold text-accent">
                  ${Number(order.valor_total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
