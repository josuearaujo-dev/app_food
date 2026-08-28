'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bike,
  ClipboardList,
  PackageCheck,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'
import { AdminPageContent } from '@/components/layout/admin-app-shell'

type KitchenStatus = 'new' | 'preparing' | 'delivered'

type ActiveOrder = {
  id: string
  criado_em: string
  valor_total: number
  valor_pago: number | null
  status_producao: KitchenStatus
  tipo_atendimento: 'take_out' | 'delivery' | null
  cliente_nome: string | null
}

const FLOW: Array<{ key: KitchenStatus; labelKey: 'ordersColNew' | 'ordersColPreparing' | 'ordersColDelivered' }> = [
  { key: 'new', labelKey: 'ordersColNew' },
  { key: 'preparing', labelKey: 'ordersColPreparing' },
  { key: 'delivered', labelKey: 'ordersColDelivered' },
]

function relativeTime(iso: string, lang: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 1) return lang === 'pt' ? 'agora' : 'just now'
  if (mins < 60) return lang === 'pt' ? `${mins} min` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return lang === 'pt' ? `${hours}h` : `${hours}h ago`
}

function orderNumber(id: string) {
  return id.replace(/-/g, '').slice(-8).toUpperCase()
}

export default function AdminOperationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { t, lang } = useLang()
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('pedidos')
      .select(
        'id, criado_em, valor_total, valor_pago, status_producao, tipo_atendimento, cliente_nome'
      )
      .gte('criado_em', since)
      .order('criado_em', { ascending: true })

    setOrders((data as ActiveOrder[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void load()
    const channel = supabase
      .channel('admin-operations-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        void load()
      })
      .subscribe()
    const timer = setInterval(() => void load(), 60_000)
    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [load, supabase])

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status_producao !== 'delivered'),
    [orders]
  )
  const priority = activeOrders[0]
  const deliveryCount = activeOrders.filter((o) => o.tipo_atendimento === 'delivery').length
  const queueValue = activeOrders.reduce(
    (acc, o) => acc + Number(o.valor_pago ?? o.valor_total ?? 0),
    0
  )

  return (
    <AdminPageContent width="board" className="pb-10">
      <div className="admin-operations-heading">
        <div>
          <p className="admin-eyebrow">{t.adminOpsOverview}</p>
          <h1 className="admin-page-title">{t.adminNavOperations}</h1>
          <p className="admin-intro">{t.adminOpsIntro}</p>
        </div>
        <Link href="/admin/ordens" className="admin-primary-link">
          {t.adminOpsViewQueue}
          <ArrowRight size={17} />
        </Link>
      </div>

      <section className="operations-hero" aria-label={t.adminOpsPriority}>
        <div>
          <span className="operations-hero-kicker">
            <Sparkles size={15} />
            {t.adminOpsPriority}
          </span>
          {loading ? (
            <p className="text-sm text-white/80">{t.ordersLoading}</p>
          ) : priority ? (
            <>
              <strong>#{orderNumber(priority.id)}</strong>
              <p>
                {priority.status_producao === 'new' ? t.ordersColNew : t.ordersColPreparing}
                {priority.cliente_nome ? ` · ${priority.cliente_nome}` : ''} ·{' '}
                {relativeTime(priority.criado_em, lang)}
              </p>
            </>
          ) : (
            <>
              <strong>{t.adminOpsQueueClear}</strong>
              <p>{t.adminOpsQueueClearHint}</p>
            </>
          )}
        </div>
        {priority ? (
          <Link href="/admin/ordens" className="operations-hero-action">
            {t.adminOpsOpenOrder}
            <ArrowRight size={17} />
          </Link>
        ) : null}
      </section>

      <section className="operations-metrics" aria-label={t.adminOpsMetrics}>
        <Metric
          icon={<ClipboardList size={20} />}
          label={t.adminOpsActiveOrders}
          value={String(activeOrders.length)}
          detail={`${deliveryCount} ${t.adminOpsDeliveries}`}
        />
        <Metric
          icon={<Bike size={20} />}
          label={t.adminOpsInDelivery}
          value={String(deliveryCount)}
          detail={t.adminOpsInDeliveryHint}
        />
        <Metric
          icon={<PackageCheck size={20} />}
          label={t.adminOpsPreparing}
          value={String(activeOrders.filter((o) => o.status_producao === 'preparing').length)}
          detail={t.adminOpsPreparingHint}
        />
        <Metric
          icon={<Sparkles size={20} />}
          label={t.adminOpsQueueValue}
          value={`${t.currency}${queueValue.toFixed(2)}`}
          detail={t.adminOpsQueueValueHint}
        />
      </section>

      <section className="operations-status-board">
        <div>
          <p className="admin-eyebrow">{t.adminOpsFlow}</p>
          <h2 className="admin-section-title">{t.adminOpsFlowTitle}</h2>
        </div>
        <div className="operations-status-list">
          {FLOW.map((step) => (
            <Link
              key={step.key}
              href="/admin/ordens"
              className={`operations-status-item admin-status-${step.key}`}
            >
              <span>{t[step.labelKey]}</span>
              <strong>{orders.filter((o) => o.status_producao === step.key).length}</strong>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </AdminPageContent>
  )
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="operations-metric-card">
      <div className="operations-metric-icon">{icon}</div>
      <p className="operations-metric-label">{label}</p>
      <strong className="operations-metric-value">{value}</strong>
      <p className="operations-metric-detail">{detail}</p>
    </article>
  )
}
