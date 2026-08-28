'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  User,
  ChevronRight,
  ShoppingBag,
  ChefHat,
  LogIn,
  LogOut,
  UserPlus,
  Package,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'
import { createClient } from '@/lib/supabase/client'
import { loadRecentOrders } from '@/lib/orders/guest-order-access'
import {
  formatOrderDate,
  kitchenStatusLabel,
  type CustomerOrderSummary,
} from '@/lib/orders/order-presentation'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontShell } from '@/components/layout/storefront-shell'

type OrderRow = CustomerOrderSummary & { displayNumber?: string }

export default function PerfilPage() {
  const { t, lang } = useLang()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [nome, setNome] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState(loadRecentOrders())
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
      setLoading(false)
      return
    }

    setEmail(user.email ?? null)
    const { data: perfil } = await supabase
      .from('cliente_perfis')
      .select('nome_completo')
      .eq('user_id', user.id)
      .maybeSingle()

    const meta = user.user_metadata as { nome_completo?: string }
    setNome(perfil?.nome_completo ?? meta.nome_completo ?? null)
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
      window.location.href = `/pedido/${data.order.id}?email=${encodeURIComponent(lookupEmail.trim())}`
    } catch {
      setLookupError(t.lookupError)
    } finally {
      setLookupLoading(false)
    }
  }

  const displayName = nome?.trim() || email?.split('@')[0] || t.visitor
  const isLoggedIn = !!email
  const showRecent = !isLoggedIn && recentOrders.length > 0

  return (
    <StorefrontShell
      header={<StorefrontHeader title={t.profileTitle} sticky={false} className="[&>div]:pb-6" />}
    >
      <div className="px-4 mb-6 mt-4">
        <div className="bg-card rounded-3xl p-5 border border-border flex items-center gap-4 shadow-sm">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10">
            <User size={28} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-5 w-32 animate-pulse rounded-lg bg-secondary" />
            ) : (
              <>
                <h2 className="text-base font-bold text-foreground truncate">{displayName}</h2>
                <p className="text-muted-foreground text-sm mt-0.5 truncate">
                  {isLoggedIn ? email : t.welcomeMsg}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {!loading && !isLoggedIn && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/conta/entrar?next=%2Fperfil"
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-semibold text-primary-foreground"
            >
              <LogIn size={16} />
              {t.login}
            </Link>
            <Link
              href="/conta/cadastro?next=%2Fperfil"
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-xs font-semibold text-foreground"
            >
              <UserPlus size={16} />
              {t.signup}
            </Link>
          </div>
        )}

        {!loading && isLoggedIn && (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-foreground"
          >
            <LogOut size={17} className="text-muted-foreground" />
            {t.signOut}
          </button>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">
            {t.myOrders}
          </p>

          {isLoggedIn && ordersLoading && (
            <div className="px-4 pb-4">
              <div className="h-16 animate-pulse rounded-xl bg-secondary" />
            </div>
          )}

          {isLoggedIn && !ordersLoading && orders.length === 0 && (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{t.noOrdersYet}</p>
          )}

          {isLoggedIn &&
            orders.map((order) => (
              <Link
                key={order.id}
                href={`/pedido/${order.id}`}
                className="flex items-center gap-3 border-t border-border px-4 py-3.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                  <Package size={16} className="text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    #{order.displayNumber ?? order.numero_pedido}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatOrderDate(order.criado_em, lang)} ·{' '}
                    {kitchenStatusLabel(order.status_producao, lang)}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            ))}

          {showRecent && (
            <>
              <p className="border-t border-border px-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t.recentOrders}
              </p>
              {recentOrders.map((ref) => (
                <Link
                  key={ref.orderId}
                  href={`/pedido/${ref.orderId}?email=${encodeURIComponent(ref.email)}`}
                  className="flex items-center gap-3 border-t border-border px-4 py-3.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <Package size={16} className="text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">#{ref.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{t.viewOrder}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              ))}
            </>
          )}

          {!isLoggedIn && !showRecent && (
            <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              {t.noOrdersHint}
            </p>
          )}

          <form onSubmit={handleLookup} className="border-t border-border px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-accent" />
              <p className="text-sm font-semibold text-foreground">{t.lookupOrder}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t.lookupOrderHint}</p>
            <input
              type="text"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              placeholder={t.orderNumberLabel}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              required
            />
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder={t.orderEmailLabel}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              required
            />
            {lookupError && <p className="text-xs text-red-600">{lookupError}</p>}
            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {lookupLoading ? '...' : t.lookupSubmit}
            </button>
          </form>
        </div>

        <Link
          href="/carrinho"
          className="flex items-center gap-3 bg-card rounded-2xl px-4 py-4 border border-border shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ShoppingBag size={17} className="text-accent" />
          </div>
          <span className="flex-1 text-sm font-medium text-foreground">{t.myCartLink}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">
            Admin
          </p>
          <Link href="/admin" className="flex items-center gap-3 px-4 py-4 border-t border-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <ChefHat size={17} className="text-accent" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{t.adminPanel}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">{t.appVersion}</p>
    </StorefrontShell>
  )
}
