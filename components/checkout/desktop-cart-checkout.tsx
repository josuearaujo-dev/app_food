'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { useMediaMinWidth } from '@/lib/hooks/use-media-min-width'
import {
  clearCheckoutCustomer,
  isValidCheckoutCustomer,
  loadCheckoutCustomer,
  saveCheckoutCustomer,
  type CheckoutCustomer,
} from '@/lib/checkout-customer'
import { useCloverCheckout } from '@/lib/checkout/use-clover-checkout'
import { CloverCardFields } from '@/components/checkout/clover-card-fields'
import { saveRecentOrder } from '@/lib/orders/guest-order-access'

type SuccessOrder = {
  orderId: string
  orderNumber: string
  email: string
}

const MOUNT_PREFIX = 'desktop-'

export function DesktopCartCheckout() {
  const isDesktop = useMediaMinWidth(981)
  const { items, totalItems, totalPrice, updateQuantity, removeItem } = useCart()
  const { t } = useLang()
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [aceitaSms, setAceitaSms] = useState(false)
  const [aceitaEmail, setAceitaEmail] = useState(false)
  const [customerReady, setCustomerReady] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [successOrder, setSuccessOrder] = useState<SuccessOrder | null>(null)

  const cloverEnv = process.env.NEXT_PUBLIC_CLOVER_ENV === 'production' ? 'production' : 'sandbox'
  const sdkSrc =
    cloverEnv === 'production'
      ? 'https://checkout.clover.com/sdk.js'
      : 'https://checkout.sandbox.dev.clover.com/sdk.js'
  const hasPublicConfig =
    !!process.env.NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN && !!process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID

  const checkoutCustomer = useMemo<CheckoutCustomer | null>(() => {
    if (!customerReady) return null
    return {
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      userId,
      aceitaSmsAtualizacoes: aceitaSms,
      aceitaEmailAtualizacoes: aceitaEmail,
      prefereSalvarCartao: false,
    }
  }, [customerReady, nome, email, telefone, userId, aceitaSms, aceitaEmail])

  const loadSession = useCallback(async () => {
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
      }
      setCustomerReady(true)
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
    setCustomerReady(true)
  }, [supabase])

  useEffect(() => {
    if (isDesktop) loadSession()
  }, [isDesktop, loadSession])

  const handleSuccess = useCallback((order: SuccessOrder) => {
    saveRecentOrder(order)
    clearCheckoutCustomer()
    setSuccessOrder(order)
  }, [])

  const cloverEnabled = isDesktop && items.length > 0 && customerReady

  const { fieldsReady, paying, error, fieldErrors, handlePay } = useCloverCheckout({
    mountPrefix: MOUNT_PREFIX,
    enabled: cloverEnabled,
    checkoutCustomer: isValidCheckoutCustomer(checkoutCustomer) ? checkoutCustomer : null,
    sdkLoaded,
    onSuccess: handleSuccess,
  })

  async function persistCustomer(): Promise<CheckoutCustomer | null> {
    setFormError(null)
    const c: CheckoutCustomer = {
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      userId,
      aceitaSmsAtualizacoes: aceitaSms,
      aceitaEmailAtualizacoes: aceitaEmail,
      prefereSalvarCartao: false,
    }

    if (!isValidCheckoutCustomer(c)) {
      setFormError(t.checkoutFillError)
      return null
    }

    if (userId) {
      await supabase.from('cliente_perfis').upsert(
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
    }

    saveCheckoutCustomer(c)
    return c
  }

  async function onPayClick() {
    const saved = await persistCustomer()
    if (!saved) return
    await handlePay(saved)
  }

  if (!isDesktop) return null

  if (successOrder) {
    return (
      <div className="cadu-desktop-checkout-success">
        <div className="cadu-desktop-checkout-success-icon">✓</div>
        <strong>{t.paymentConfirmed}</strong>
        <p>{t.paymentConfirmedHint}</p>
        <p className="cadu-desktop-checkout-order">#{successOrder.orderNumber}</p>
        <Link
          href={`/pedido/${successOrder.orderId}?email=${encodeURIComponent(successOrder.email)}`}
          className="cadu-desktop-checkout-success-link"
        >
          {t.trackOrder}
        </Link>
        <button
          type="button"
          className="cadu-desktop-checkout-success-reset"
          onClick={() => setSuccessOrder(null)}
        >
          {t.backToMenu}
        </button>
      </div>
    )
  }

  return (
    <>
      {hasPublicConfig && items.length > 0 && (
        <Script src={sdkSrc} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} />
      )}

      {items.length === 0 ? (
        <div className="cadu-cart-empty">
          <ShoppingBag size={48} strokeWidth={1.3} />
          <strong>{t.emptyCart}</strong>
          <p>{t.emptyCartHint}</p>
        </div>
      ) : (
        <div className="cadu-desktop-checkout-scroll">
          <div className="cadu-cart-items cadu-cart-items--checkout">
            {items.map((line) => (
              <div key={line.cartItemId} className="cadu-cart-item">
                <div className="cadu-cart-item-top">
                  <strong>
                    {line.quantity}x {line.item.nome}
                  </strong>
                  <button
                    type="button"
                    className="cadu-cart-item-remove"
                    onClick={() => removeItem(line.cartItemId)}
                    aria-label="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {line.selectedOptions.length > 0 && (
                  <p className="cadu-cart-item-options">
                    {line.selectedOptions.map((o) => o.label).join(' · ')}
                  </p>
                )}
                {line.observation && <p className="cadu-cart-item-options">Obs: {line.observation}</p>}
                <div className="cadu-cart-item-actions">
                  <div className="cadu-cart-qty">
                    <button
                      type="button"
                      onClick={() =>
                        line.quantity <= 1
                          ? removeItem(line.cartItemId)
                          : updateQuantity(line.cartItemId, line.quantity - 1)
                      }
                      aria-label="Diminuir"
                    >
                      <Minus size={12} />
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.cartItemId, line.quantity + 1)}
                      aria-label="Aumentar"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <strong className="cadu-cart-item-price">
                    {t.currency}
                    {line.totalPrice.toFixed(2)}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          <div className="cadu-desktop-checkout-panel">
            <p className="cadu-sidebar-section-title">{t.checkoutTitle}</p>

            {!userId && (
              <div className="cadu-sidebar-auth">
                <Link href="/conta/cadastro">{t.signup}</Link>
                <Link href="/conta/entrar">{t.login}</Link>
              </div>
            )}

            <div className="cadu-sidebar-fields">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={t.checkoutFullName}
                className="cadu-sidebar-input"
              />
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder={t.checkoutPhone}
                className="cadu-sidebar-input"
                type="tel"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.checkoutEmail}
                className="cadu-sidebar-input"
                type="email"
                disabled={!!userId}
              />
            </div>

            <div className="cadu-sidebar-checks">
              <label>
                <input type="checkbox" checked={aceitaSms} onChange={(e) => setAceitaSms(e.target.checked)} />
                <span>{t.checkoutSmsUpdates}</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={aceitaEmail}
                  onChange={(e) => setAceitaEmail(e.target.checked)}
                />
                <span>{t.checkoutEmailUpdates}</span>
              </label>
            </div>

            <p className="cadu-sidebar-section-title">{t.paymentCardTitle}</p>
            <p className="cadu-sidebar-note">{t.paymentSecureNote}</p>

            {!hasPublicConfig ? (
              <p className="cadu-sidebar-error">Clover não configurado.</p>
            ) : (
              <CloverCardFields mountPrefix={MOUNT_PREFIX} fieldErrors={fieldErrors} compact />
            )}

            <div className="cadu-sidebar-summary">
              <div className="cadu-sidebar-summary-row">
                <span>
                  {t.total} ({totalItems} {totalItems === 1 ? t.item : t.items})
                </span>
                <strong>
                  {t.currency}
                  {totalPrice.toFixed(2)}
                </strong>
              </div>
            </div>

            {(formError || error) && (
              <p className="cadu-sidebar-error" role="alert">
                {formError ?? error}
              </p>
            )}

            <button
              type="button"
              className="cadu-sidebar-pay"
              disabled={paying || !fieldsReady || !hasPublicConfig}
              onClick={onPayClick}
            >
              {paying
                ? t.paymentProcessing
                : `${t.paymentPayConfirm} · ${t.currency}${totalPrice.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
