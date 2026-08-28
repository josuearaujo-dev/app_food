'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminPageContent } from '@/components/layout/admin-app-shell'
import { useLang } from '@/lib/lang-context'

type KitchenStatus = 'new' | 'preparing' | 'delivered'

type OrderItem = {
  nome_item: string
  quantidade: number
  observacao: string | null
  opcoes_selecionadas:
    | Array<{ label: string; info?: string | null; detailInfo?: string | null }>
    | null
}

type KitchenOrder = {
  id: string
  criado_em: string
  valor_total: number
  valor_pago: number | null
  cliente_nome: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  origem_pagamento: string | null
  status_producao: KitchenStatus
  pedido_itens: OrderItem[]
}

const STATUS_COLUMNS: Array<{ key: KitchenStatus; titleKey: 'ordersColNew' | 'ordersColPreparing' | 'ordersColDelivered' }> = [
  { key: 'new', titleKey: 'ordersColNew' },
  { key: 'preparing', titleKey: 'ordersColPreparing' },
  { key: 'delivered', titleKey: 'ordersColDelivered' },
]

export default function AdminOrdensPage() {
  const supabase = useMemo(() => createClient(), [])
  const { t } = useLang()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('pedidos')
      .select(
        'id, criado_em, valor_total, valor_pago, cliente_nome, cliente_email, cliente_telefone, origem_pagamento, status_producao, pedido_itens(nome_item, quantidade, observacao, opcoes_selecionadas)'
      )
      .order('criado_em', { ascending: false })

    setOrders((data as KitchenOrder[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void fetchOrders()

    const channel = supabase
      .channel('admin-kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        void fetchOrders()
      })
      .subscribe()

    const timer = setInterval(() => {
      void fetchOrders()
    }, 60_000)

    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [fetchOrders, supabase])

  async function updateOrderStatus(order: KitchenOrder, next: KitchenStatus) {
    if (next === order.status_producao) return

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status_producao: next } : o))
    )

    const { error } = await supabase
      .from('pedidos')
      .update({ status_producao: next })
      .eq('id', order.id)

    if (error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status_producao: order.status_producao } : o
        )
      )
    }
  }

  return (
    <AdminPageContent
      width="board"
      title={t.adminNavOrders}
      eyebrow={t.ordersKitchenEyebrow}
    >
      <div className="mb-4 flex justify-end">
        <Link
          href="/admin/pedido-manual"
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
        >
          <Plus size={14} />
          {t.manualOrderNew}
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">{t.ordersLoading}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STATUS_COLUMNS.map((col) => {
            const columnOrders = orders.filter((o) => o.status_producao === col.key)
            const colTitle = t[col.titleKey]
            return (
              <div key={col.key} className="rounded-2xl border border-border bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{colTitle}</h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {columnOrders.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t.ordersEmptyColumn}</p>
                  )}

                  {columnOrders.map((order) => (
                    <div
                      key={order.id}
                      className="w-full rounded-xl border border-border bg-[#FCFCFD] p-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">
                            #{order.id.replace(/-/g, '').slice(-8).toUpperCase()}
                          </p>
                          {order.origem_pagamento === 'counter' ? (
                            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              {t.manualOrderBadge}
                            </span>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-foreground">
                          {t.total} {t.currency}
                          {Number(
                            order.valor_pago != null ? order.valor_pago : order.valor_total ?? 0
                          ).toFixed(2)}
                        </p>
                      </div>
                      {(order.cliente_nome || order.cliente_email || order.cliente_telefone) && (
                        <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
                          {order.cliente_nome && (
                            <p className="font-medium text-foreground">{order.cliente_nome}</p>
                          )}
                          {order.cliente_email && <p>{order.cliente_email}</p>}
                          {order.cliente_telefone && (
                            <p>
                              {t.ordersPhoneLabel} {order.cliente_telefone}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex gap-1">
                        {STATUS_COLUMNS.map((statusCol) => (
                          <button
                            key={`${order.id}-${statusCol.key}`}
                            type="button"
                            onClick={() => updateOrderStatus(order, statusCol.key)}
                            className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                              order.status_producao === statusCol.key
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-white text-muted-foreground'
                            }`}
                          >
                            {t[statusCol.titleKey]}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 space-y-1">
                        {order.pedido_itens?.map((it, i) => (
                          <div key={`${order.id}-${i}`} className="text-xs">
                            <p className="font-medium">
                              {it.quantidade}x {it.nome_item}
                            </p>
                            {it.opcoes_selecionadas && it.opcoes_selecionadas.length > 0 && (
                              <p className="text-muted-foreground">
                                {it.opcoes_selecionadas
                                  .map((op) =>
                                    op?.info ?? op?.detailInfo
                                      ? `${op.label} (${op.info ?? op.detailInfo})`
                                      : op.label
                                  )
                                  .join(' • ')}
                              </p>
                            )}
                            {it.observacao && (
                              <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                                {t.ordersInternalNote}: {it.observacao}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminPageContent>
  )
}
