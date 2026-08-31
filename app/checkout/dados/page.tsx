'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Phone, User, Mail, LogOut } from 'lucide-react'
import {
  isValidCheckoutCustomer,
  loadCheckoutCustomer,
  saveCheckoutCustomer,
  type CheckoutCustomer,
  type FulfillmentType,
} from '@/lib/checkout-customer'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { CheckoutSteps } from '@/components/checkout/checkout-steps'
import { FulfillmentSelector } from '@/components/checkout/fulfillment-selector'
import { resolveClientDeliveryFee } from '@/lib/checkout/fulfillment'
import { useCheckoutConfig } from '@/lib/checkout/use-checkout-config'

export default function CheckoutDadosPage() {
  const router = useRouter()
  const supabase = createClient()
  const { totalItems, totalPrice } = useCart()
  const { t } = useLang()
  const { deliveryFee, locations, loading: configLoading } = useCheckoutConfig()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [aceitaSms, setAceitaSms] = useState(false)
  const [aceitaEmail, setAceitaEmail] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('take_out')
  const [localidadeId, setLocalidadeId] = useState('')
  const [localidadeNome, setLocalidadeNome] = useState('')
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const deliveryFeeAmount = resolveClientDeliveryFee(
    fulfillmentType,
    localidadeId || null,
    locations,
    deliveryFee
  )
  const checkoutTotal = Number((totalPrice + deliveryFeeAmount).toFixed(2))

  const loadSession = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUserId(null)
      const saved = loadCheckoutCustomer()
      if (saved) {
        setNome(saved.nome)
        setEmail(saved.email)
        setTelefone(saved.telefone)
        setAceitaSms(saved.aceitaSmsAtualizacoes)
        setAceitaEmail(saved.aceitaEmailAtualizacoes)
        setFulfillmentType(saved.fulfillmentType)
        setLocalidadeId(saved.localidadeEntregaId ?? '')
        setLocalidadeNome(saved.localidadeEntregaNome ?? '')
        setEnderecoEntrega(saved.enderecoEntrega ?? '')
      }
      setLoading(false)
      return
    }

    setUserId(user.id)
    setEmail(user.email ?? '')

    const meta = user.user_metadata as { nome_completo?: string; telefone?: string }
    const { data: perfil } = await supabase
      .from('cliente_perfis')
      .select(
        'nome_completo, telefone, aceita_sms_atualizacoes_pedido, aceita_email_atualizacoes_pedido'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    setNome(perfil?.nome_completo ?? meta.nome_completo ?? '')
    setTelefone(perfil?.telefone ?? meta.telefone ?? '')
    setAceitaSms(!!perfil?.aceita_sms_atualizacoes_pedido)
    setAceitaEmail(!!perfil?.aceita_email_atualizacoes_pedido)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  async function handleSair() {
    await supabase.auth.signOut()
    setUserId(null)
    setEmail('')
    setNome('')
    setTelefone('')
    setAceitaSms(false)
    setAceitaEmail(false)
  }

  async function handleContinuar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const c: CheckoutCustomer = {
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      userId,
      aceitaSmsAtualizacoes: aceitaSms,
      aceitaEmailAtualizacoes: aceitaEmail,
      prefereSalvarCartao: false,
      fulfillmentType,
      localidadeEntregaId: fulfillmentType === 'delivery' ? localidadeId || null : null,
      localidadeEntregaNome: fulfillmentType === 'delivery' ? localidadeNome || null : null,
      enderecoEntrega: fulfillmentType === 'delivery' ? enderecoEntrega.trim() || null : null,
    }

    if (!isValidCheckoutCustomer(c, { deliveryLocationsCount: locations.length })) {
      setErro(
        fulfillmentType === 'delivery' && enderecoEntrega.trim().length < 10
          ? t.checkoutDeliveryAddressError
          : t.checkoutFillError
      )
      return
    }

    setSaving(true)

    if (userId) {
      const { error: upErr } = await supabase.from('cliente_perfis').upsert(
        {
          user_id: userId,
          nome_completo: c.nome,
          telefone: c.telefone,
          aceita_sms_atualizacoes_pedido: aceitaSms,
          aceita_email_atualizacoes_pedido: aceitaEmail,
          prefere_salvar_cartao_futuro: false,
        },
        { onConflict: 'user_id' }
      )
      if (upErr) {
        setErro(upErr.message)
        setSaving(false)
        return
      }
    }

    saveCheckoutCustomer(c)
    setSaving(false)
    router.push('/pagamento')
  }

  if (loading) {
    return (
      <main className="cadu-checkout mx-auto max-w-lg">
        <p className="cadu-checkout-body text-sm text-[var(--cadu-muted)]">{t.checkoutLoading}</p>
      </main>
    )
  }

  return (
    <main className="cadu-checkout mx-auto max-w-lg">
      <header className="cadu-checkout-header">
        <Link href="/carrinho" className="cadu-checkout-back" aria-label={t.back}>
          <ArrowLeft size={18} />
        </Link>
        <h1>{t.checkoutTitle}</h1>
      </header>

      <section className="cadu-checkout-body">
        <CheckoutSteps current={1} />

        <div className="cadu-checkout-card">
          <p className="text-sm leading-relaxed text-[var(--cadu-muted)]">{t.checkoutHint}</p>
        </div>

        {totalItems > 0 && (
          <div className="cadu-checkout-card">
            <p className="cadu-checkout-kicker">{t.myCart}</p>
            <div className="cadu-checkout-summary-row">
              <span>
                {totalItems} {totalItems === 1 ? t.item : t.items}
              </span>
              <span>
                {t.currency}
                {totalPrice.toFixed(2)}
              </span>
            </div>
            {fulfillmentType === 'delivery' && deliveryFeeAmount > 0 ? (
              <div className="cadu-checkout-summary-row">
                <span>{t.checkoutDeliveryFee}</span>
                <span>
                  {t.currency}
                  {deliveryFeeAmount.toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="cadu-checkout-summary-total">
              <span>{t.total}</span>
              <strong>
                {t.currency}
                {checkoutTotal.toFixed(2)}
              </strong>
            </div>
          </div>
        )}

        {userId ? (
          <div className="cadu-checkout-card flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--cadu-muted)]">{t.checkoutConnectedAccount}</p>
            <button
              type="button"
              onClick={handleSair}
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--cadu-pink)]"
            >
              <LogOut size={14} />
              {t.signOut}
            </button>
          </div>
        ) : (
          <div className="cadu-checkout-card space-y-3">
            <p className="text-xs text-[var(--cadu-muted)]">{t.checkoutWantAccount}</p>
            <div className="cadu-checkout-auth-row">
              <Link href="/conta/cadastro?next=%2Fcheckout%2Fdados" className="cadu-checkout-auth-primary">
                {t.signup}
              </Link>
              <Link href="/conta/entrar?next=%2Fcheckout%2Fdados" className="cadu-checkout-auth-secondary">
                {t.login}
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleContinuar} className="space-y-3">
          <FulfillmentSelector
            fulfillmentType={fulfillmentType}
            onFulfillmentTypeChange={setFulfillmentType}
            localidadeId={localidadeId}
            onLocalidadeIdChange={setLocalidadeId}
            localidadeNome={localidadeNome}
            onLocalidadeNomeChange={setLocalidadeNome}
            endereco={enderecoEntrega}
            onEnderecoChange={setEnderecoEntrega}
            locations={locations}
            defaultDeliveryFee={deliveryFee}
            loading={configLoading}
          />

          <div className="cadu-checkout-card space-y-4">
            <div>
              <label htmlFor="nome" className="cadu-checkout-field-label">
                {t.checkoutFullName}
              </label>
              <div className="cadu-checkout-input-wrap">
                <User size={16} />
                <input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  minLength={2}
                  className="cadu-checkout-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="cadu-checkout-field-label">
                {t.checkoutPhone}
              </label>
              <div className="cadu-checkout-input-wrap">
                <Phone size={16} />
                <input
                  id="telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                  className="cadu-checkout-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="cadu-checkout-field-label">
                {t.checkoutEmail}
              </label>
              <div className="cadu-checkout-input-wrap">
                <Mail size={16} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!userId}
                  className="cadu-checkout-input"
                />
              </div>
              {userId && (
                <p className="mt-1 text-[10px] text-[var(--cadu-muted)]">{t.checkoutEmailLinked}</p>
              )}
            </div>
          </div>

          <div className="cadu-checkout-card space-y-3">
            <p className="cadu-checkout-kicker">{t.checkoutCommunication}</p>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-[var(--cadu-muted)]">
              <input
                type="checkbox"
                checked={aceitaSms}
                onChange={(e) => setAceitaSms(e.target.checked)}
                className="mt-0.5 rounded border-[var(--cadu-line)]"
              />
              <span>{t.checkoutSmsUpdates}</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-[var(--cadu-muted)]">
              <input
                type="checkbox"
                checked={aceitaEmail}
                onChange={(e) => setAceitaEmail(e.target.checked)}
                className="mt-0.5 rounded border-[var(--cadu-line)]"
              />
              <span>{t.checkoutEmailUpdates}</span>
            </label>
          </div>

          {erro && (
            <p className="cadu-checkout-error" role="alert">
              {erro}
            </p>
          )}

          <button type="submit" disabled={saving} className="cadu-checkout-btn cadu-checkout-btn--sticky">
            {saving ? t.checkoutSaving : t.checkoutContinuePayment}
          </button>
        </form>
      </section>
    </main>
  )
}
