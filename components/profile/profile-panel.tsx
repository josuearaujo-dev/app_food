'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  LogIn,
  LogOut,
  Package,
  Search,
  User,
  UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'
import { loadRecentOrders, type RecentOrderRef } from '@/lib/orders/guest-order-access'
import {
  formatOrderDate,
  formatOrderMoney,
  isActiveKitchenStatus,
  kitchenStatusLabel,
  paymentStatusLabel,
  type CustomerOrderSummary,
} from '@/lib/orders/order-presentation'

type OrderRow = CustomerOrderSummary & { displayNumber?: string }

type ProfilePanelProps = {
  onClose?: () => void
  compact?: boolean
}

function formatPhoneDisplay(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11) {
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw.trim()
}

export function ProfilePanel({ onClose, compact = false }: ProfilePanelProps) {
  const { t, lang } = useLang()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [nome, setNome] = useState<string | null>(null)
  const [telefone, setTelefone] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState<RecentOrderRef[]>([])
  const [lookupNumber, setLookupNumber] = useState('')
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setEmail(null)
      setNome(null)
      setTelefone(null)
      setLoading(false)
      return
    }

    setEmail(user.email ?? null)
    const { data: perfil } = await supabase
      .from('cliente_perfis')
      .select('nome_completo, telefone')
      .eq('user_id', user.id)
      .maybeSingle()

    const meta = user.user_metadata as { nome_completo?: string; telefone?: string }
    setNome(perfil?.nome_completo ?? meta.nome_completo ?? null)
    setTelefone(perfil?.telefone ?? meta.telefone ?? null)
    setLoading(false)
  }, [supabase])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/pedidos/me')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders ?? [])
      } else {
        setOrders([])
      }
    } catch {
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    setRecentOrders(loadRecentOrders())
  }, [loadProfile])

  useEffect(() => {
    if (email) loadOrders()
    else setOrders([])
  }, [email, loadOrders])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setEmail(null)
    setNome(null)
    setTelefone(null)
    setOrders([])
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLookupLoading(true)
    setLookupError(null)
    try {
      const res = await fetch('/api/pedidos/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: lookupNumber, email: lookupEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.order?.id) {
        setLookupError(t.lookupError)
        return
      }
      onClose?.()
      window.location.href = `/pedido/${data.order.id}?email=${encodeURIComponent(lookupEmail.trim())}`
    } catch {
      setLookupError(t.lookupError)
    } finally {
      setLookupLoading(false)
    }
  }

  const displayName = nome?.trim() || email?.split('@')[0] || t.visitor
  const phoneDisplay = formatPhoneDisplay(telefone)
  const isLoggedIn = !!email
  const showRecent = !isLoggedIn && recentOrders.length > 0

  const { activeOrders, historyOrders } = useMemo(() => {
    const active: OrderRow[] = []
    const history: OrderRow[] = []
    for (const order of orders) {
      if (isActiveKitchenStatus(order.status_producao)) active.push(order)
      else history.push(order)
    }
    return { activeOrders: active, historyOrders: history }
  }, [orders])

  function renderOrderLink(order: OrderRow, active: boolean) {
    const fulfillment =
      order.tipo_atendimento === 'delivery'
        ? t.checkoutDelivery
        : order.tipo_atendimento
          ? t.checkoutPickup
          : null

    return (
      <Link
        key={order.id}
        href={`/pedido/${order.id}`}
        onClick={() => onClose?.()}
        className={`cadu-profile-order ${active ? 'cadu-profile-order--active' : ''}`}
      >
        <div className="cadu-profile-order-icon">
          <Package size={16} />
        </div>
        <div className="cadu-profile-order-body">
          <div className="cadu-profile-order-top">
            <strong>#{order.displayNumber ?? order.numero_pedido}</strong>
            <span className={`cadu-profile-status ${active ? 'is-active' : 'is-done'}`}>
              {kitchenStatusLabel(order.status_producao, lang)}
            </span>
          </div>
          <span className="cadu-profile-order-date">{formatOrderDate(order.criado_em, lang)}</span>
          <div className="cadu-profile-order-meta">
            <span>{formatOrderMoney(order.valor_total, t.currency)}</span>
            <span>{paymentStatusLabel(order.status_pagamento, lang)}</span>
            {fulfillment ? <span>{fulfillment}</span> : null}
          </div>
        </div>
        <ChevronRight size={16} className="cadu-profile-order-chevron" />
      </Link>
    )
  }

  return (
    <div className={`cadu-profile-panel ${compact ? 'cadu-profile-panel--compact' : ''}`}>
      <div className="cadu-profile-hero">
        <div className="cadu-profile-avatar">
          <User size={26} />
        </div>
        <div className="cadu-profile-hero-text">
          {loading ? (
            <div className="cadu-profile-skeleton" />
          ) : (
            <>
              <h2>{displayName}</h2>
              {isLoggedIn ? (
                <>
                  <p>{email}</p>
                  {phoneDisplay ? <p className="cadu-profile-hero-phone">{phoneDisplay}</p> : null}
                </>
              ) : (
                <p>{t.welcomeMsg}</p>
              )}
            </>
          )}
        </div>
      </div>

      {!loading && !isLoggedIn && (
        <div className="cadu-profile-auth-actions">
          <p className="cadu-profile-guest-hint">{t.profileGuestHint}</p>
          <div className="cadu-profile-auth-grid">
            <Link
              href="/conta/entrar?next=%2Fperfil"
              onClick={() => onClose?.()}
              className="cadu-profile-btn cadu-profile-btn--primary"
            >
              <LogIn size={16} />
              {t.login}
            </Link>
            <Link
              href="/conta/cadastro?next=%2Fperfil"
              onClick={() => onClose?.()}
              className="cadu-profile-btn cadu-profile-btn--ghost"
            >
              <UserPlus size={16} />
              {t.signup}
            </Link>
          </div>
        </div>
      )}

      {!loading && isLoggedIn && (
        <button type="button" className="cadu-profile-signout" onClick={handleSignOut}>
          <LogOut size={15} />
          {t.signOut}
        </button>
      )}

      {isLoggedIn && (
        <>
          <section className="cadu-profile-card">
            <div className="cadu-profile-card-head">
              <p className="cadu-profile-card-title">{t.activeOrders}</p>
              {!ordersLoading && activeOrders.length > 0 ? (
                <span className="cadu-profile-count">{activeOrders.length}</span>
              ) : null}
            </div>
            {ordersLoading ? (
              <div className="cadu-profile-skeleton cadu-profile-skeleton--block" />
            ) : activeOrders.length === 0 ? (
              <p className="cadu-profile-empty">{t.noActiveOrders}</p>
            ) : (
              <div className="cadu-profile-order-list">
                {activeOrders.map((order) => renderOrderLink(order, true))}
              </div>
            )}
          </section>

          <section className="cadu-profile-card">
            <div className="cadu-profile-card-head">
              <p className="cadu-profile-card-title">{t.orderHistory}</p>
              {!ordersLoading && historyOrders.length > 0 ? (
                <span className="cadu-profile-count">{historyOrders.length}</span>
              ) : null}
            </div>
            {ordersLoading ? (
              <div className="cadu-profile-skeleton cadu-profile-skeleton--block" />
            ) : historyOrders.length === 0 ? (
              <p className="cadu-profile-empty">{t.noOrderHistory}</p>
            ) : (
              <div className="cadu-profile-order-list">
                {historyOrders.map((order) => renderOrderLink(order, false))}
              </div>
            )}
          </section>
        </>
      )}

      {showRecent && (
        <section className="cadu-profile-card">
          <p className="cadu-profile-card-title">{t.recentOrders}</p>
          <div className="cadu-profile-order-list">
            {recentOrders.map((ref) => (
              <Link
                key={ref.orderId}
                href={`/pedido/${ref.orderId}?email=${encodeURIComponent(ref.email)}`}
                onClick={() => onClose?.()}
                className="cadu-profile-order"
              >
                <div className="cadu-profile-order-icon">
                  <Package size={16} />
                </div>
                <div className="cadu-profile-order-body">
                  <div className="cadu-profile-order-top">
                    <strong>#{ref.orderNumber}</strong>
                  </div>
                  <span className="cadu-profile-order-date">{t.viewOrder}</span>
                </div>
                <ChevronRight size={16} className="cadu-profile-order-chevron" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {!isLoggedIn && (
        <section className="cadu-profile-card">
          <form onSubmit={handleLookup} className="cadu-profile-lookup">
            <div className="cadu-profile-lookup-head">
              <Search size={16} />
              <p>{t.lookupOrder}</p>
            </div>
            <p className="cadu-profile-empty">{t.lookupOrderHint}</p>
            <input
              type="text"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              placeholder={t.orderNumberLabel}
              required
            />
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder={t.orderEmailLabel}
              required
            />
            {lookupError && <p className="cadu-profile-error">{lookupError}</p>}
            <button
              type="submit"
              disabled={lookupLoading}
              className="cadu-profile-btn cadu-profile-btn--primary"
            >
              {lookupLoading ? '...' : t.lookupSubmit}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
