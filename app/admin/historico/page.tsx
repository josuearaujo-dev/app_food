'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AdminPageContent } from '@/components/layout/admin-app-shell'
import { useLang } from '@/lib/lang-context'
import { reprintOrder } from '@/lib/admin/kitchen-board'
import {
  formatOrderDate,
  kitchenStatusLabel,
  type KitchenStatus,
} from '@/lib/orders/order-presentation'

type HistoryOrder = {
  id: string
  numero_pedido: string | null
  criado_em: string
  valor_total: number
  valor_pago: number | null
  cliente_nome: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  origem_pagamento: string | null
  status_producao: KitchenStatus
  status_pagamento: string | null
}

type StatusFilter = 'all' | 'delivered' | 'active'

function displayNumber(order: HistoryOrder) {
  return order.numero_pedido ?? order.id.replace(/-/g, '').slice(-8).toUpperCase()
}

export default function AdminHistoricoPage() {
  const supabase = useMemo(() => createClient(), [])
  const { t, lang } = useLang()
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('delivered')
  const [reprintingId, setReprintingId] = useState<string | null>(null)
  const [reprintMsg, setReprintMsg] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('pedidos')
      .select(
        'id, numero_pedido, criado_em, valor_total, valor_pago, cliente_nome, cliente_email, cliente_telefone, origem_pagamento, status_producao, status_pagamento'
      )
      .order('criado_em', { ascending: false })
      .limit(200)

    if (statusFilter === 'delivered') {
      q = q.eq('status_producao', 'delivered')
    } else if (statusFilter === 'active') {
      q = q.in('status_producao', ['new', 'preparing'])
    }

    const { data } = await q
    setOrders((data as HistoryOrder[]) ?? [])
    setLoading(false)
  }, [supabase, statusFilter])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((o) => {
      const hay = [
        displayNumber(o),
        o.cliente_nome,
        o.cliente_email,
        o.cliente_telefone,
        o.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  }, [orders, query])

  async function handleReprint(orderId: string) {
    setReprintingId(orderId)
    setReprintMsg(null)
    try {
      await reprintOrder(orderId)
      setReprintMsg(t.ordersReprintOk)
    } catch (err) {
      setReprintMsg(err instanceof Error ? err.message : t.ordersReprintError)
    } finally {
      setReprintingId(null)
      window.setTimeout(() => setReprintMsg(null), 3500)
    }
  }

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'delivered', label: t.adminHistoryFilterDelivered },
    { key: 'active', label: t.adminHistoryFilterActive },
    { key: 'all', label: t.adminHistoryFilterAll },
  ]

  return (
    <AdminPageContent
      width="wide"
      title={t.adminHistoryTitle}
      eyebrow={t.adminHistoryEyebrow}
    >
      <p className="mb-4 text-sm text-muted-foreground">{t.adminHistoryHint}</p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.adminHistorySearch}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex gap-1 rounded-xl border border-border bg-white p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                statusFilter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {reprintMsg && <p className="mb-3 text-xs font-medium text-muted-foreground">{reprintMsg}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.ordersLoading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.adminHistoryEmpty}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="hidden grid-cols-[1.1fr_1.4fr_1fr_0.8fr_0.9fr_auto] gap-3 border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <span>{t.adminHistoryDate}</span>
            <span>{t.adminHistoryCustomer}</span>
            <span>#</span>
            <span>{t.adminHistoryStatus}</span>
            <span>{t.adminHistoryTotal}</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[1.1fr_1.4fr_1fr_0.8fr_0.9fr_auto] md:items-center md:gap-3"
              >
                <div className="text-xs text-muted-foreground md:text-sm">
                  {formatOrderDate(order.criado_em, lang)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {order.cliente_nome || '—'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[order.cliente_telefone, order.cliente_email].filter(Boolean).join(' · ') ||
                      '—'}
                  </p>
                </div>
                <div className="text-sm font-bold">#{displayNumber(order)}</div>
                <div>
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                    {kitchenStatusLabel(order.status_producao, lang)}
                  </span>
                  {order.origem_pagamento === 'counter' ? (
                    <span className="ml-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {t.manualOrderBadge}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm font-semibold">
                  {t.currency}
                  {Number(order.valor_pago != null ? order.valor_pago : order.valor_total ?? 0).toFixed(
                    2
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleReprint(order.id)}
                  disabled={reprintingId === order.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-55"
                >
                  <Printer size={14} />
                  {reprintingId === order.id ? t.ordersReprinting : t.ordersReprint}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminPageContent>
  )
}
