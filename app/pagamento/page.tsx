'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import {
  loadCheckoutCustomer,
  isValidCheckoutCustomer,
  clearCheckoutCustomer,
  type CheckoutCustomer,
} from '@/lib/checkout-customer'
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react'
import Link from 'next/link'
import Script from 'next/script'

type PaymentProvider = 'clover' | 'paypal'

type CloverElements = {
  create: (
    type: string,
    styles?: Record<string, Record<string, string>>
  ) => {
    mount: (selector: string) => void
    addEventListener: (event: string, handler: (event: unknown) => void) => void
  }
}

type CloverSdk = {
  elements: () => CloverElements
  createToken: () => Promise<{ token?: string; errors?: Record<string, string> }>
}

declare global {
  interface Window {
    Clover?: new (
      publicToken: string,
      options?: { merchantId?: string; locale?: string }
    ) => CloverSdk
    paypal?: {
      Buttons: (options: {
        style?: {
          shape?: 'pill' | 'rect'
          layout?: 'vertical' | 'horizontal'
          color?: 'gold' | 'blue' | 'silver' | 'white' | 'black'
          label?: 'paypal' | 'checkout' | 'pay' | 'buynow' | 'installment'
        }
        createOrder: () => Promise<string>
        onApprove: (
          data: { orderID: string },
          actions: { restart: () => Promise<void> }
        ) => Promise<void>
        onError: (error: unknown) => void
        onCancel?: (data: unknown) => void
      }) => { render: (selector: string) => Promise<void> }
      CardFields: (options: {
        createOrder: () => Promise<string>
        onApprove: (data: { orderID: string }) => Promise<void>
        onError: (error: unknown) => void
        style?: Record<string, Record<string, string>>
      }) => {
        isEligible: () => boolean
        NameField: () => { render: (selector: string) => Promise<void> }
        NumberField: () => { render: (selector: string) => Promise<void> }
        ExpiryField: () => { render: (selector: string) => Promise<void> }
        CVVField: () => { render: (selector: string) => Promise<void> }
        submit: () => Promise<void>
      }
    }
  }
}

const FIELD_STYLES = {
  input: {
    fontSize: '16px',
    fontFamily: 'inherit',
    color: '#531B04',
  },
}

function cartPayload(items: ReturnType<typeof useCart>['items']) {
  return items.map(({ item, quantity, observation, selectedOptions }) => ({
    id: item.id,
    quantity,
    observation,
    selectedOptions: selectedOptions.map((o) => ({
      optionId: o.optionId,
    })),
  }))
}

export default function PagamentoPage() {
  const provider = (
    process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'clover'
  ).toLowerCase() as PaymentProvider

  if (provider === 'paypal') {
    return <PayPalCheckoutPage />
  }

  return <CloverCheckoutPage />
}

function CloverCheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, totalItems, clearCart } = useCart()
  const { t } = useLang()
  const [checkoutCustomer, setCheckoutCustomer] = useState<CheckoutCustomer | null>(null)
  const [customerChecked, setCustomerChecked] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [fieldsReady, setFieldsReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null)
  const [preparedOrder, setPreparedOrder] = useState<{
    orderId: string
    orderNumber: string
    totalCents: number
    fingerprint: string
  } | null>(null)

  const cloverRef = useRef<CloverSdk | null>(null)
  const mountedRef = useRef(false)
  const payingLockRef = useRef(false)

  const publicToken = process.env.NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN ?? ''
  const merchantId = process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID ?? ''
  const cloverEnv = process.env.NEXT_PUBLIC_CLOVER_ENV === 'production' ? 'production' : 'sandbox'
  const sdkSrc =
    cloverEnv === 'production'
      ? 'https://checkout.clover.com/sdk.js'
      : 'https://checkout.sandbox.dev.clover.com/sdk.js'
  const hasPublicConfig = !!publicToken && !!merchantId

  const fingerprint = useMemo(
    () =>
      items
        .map((ci) => {
          const opts = ci.selectedOptions
            .map((o) => o.optionId)
            .sort()
            .join(',')
          return `${ci.item.id}:${ci.quantity}:${ci.observation.trim().toLowerCase()}:${opts}`
        })
        .sort()
        .join('|'),
    [items]
  )

  useEffect(() => {
    const c = loadCheckoutCustomer()
    if (!isValidCheckoutCustomer(c)) {
      router.replace('/checkout/dados')
      return
    }
    setCheckoutCustomer(c)
    setCustomerChecked(true)
  }, [router])

  useEffect(() => {
    setPreparedOrder((prev) => (prev && prev.fingerprint !== fingerprint ? null : prev))
  }, [fingerprint])

  useEffect(() => {
    if (!customerChecked || !checkoutCustomer || !sdkLoaded || !hasPublicConfig) return
    if (!window.Clover || mountedRef.current || items.length === 0) return

    mountedRef.current = true
    try {
      const clover = new window.Clover(publicToken, { merchantId, locale: 'en-US' })
      cloverRef.current = clover
      const elements = clover.elements()

      const cardNumber = elements.create('CARD_NUMBER', FIELD_STYLES)
      const cardDate = elements.create('CARD_DATE', FIELD_STYLES)
      const cardCvv = elements.create('CARD_CVV', FIELD_STYLES)
      const cardPostal = elements.create('CARD_POSTAL_CODE', FIELD_STYLES)

      cardNumber.mount('#card-number')
      cardDate.mount('#card-date')
      cardCvv.mount('#card-cvv')
      cardPostal.mount('#card-postal-code')

      const bindErrors = (key: string, el: ReturnType<CloverElements['create']>) => {
        el.addEventListener('change', (event) => {
          const e = event as { error?: string }
          setFieldErrors((prev) => {
            const next = { ...prev }
            if (e.error) next[key] = e.error
            else delete next[key]
            return next
          })
        })
      }

      bindErrors('card-number', cardNumber)
      bindErrors('card-date', cardDate)
      bindErrors('card-cvv', cardCvv)
      bindErrors('card-postal-code', cardPostal)

      setFieldsReady(true)
    } catch (err) {
      console.error(err)
      setError('Não foi possível inicializar o formulário de cartão.')
      mountedRef.current = false
    }

    return () => {
      cloverRef.current = null
      mountedRef.current = false
      setFieldsReady(false)
    }
  }, [
    customerChecked,
    checkoutCustomer,
    sdkLoaded,
    hasPublicConfig,
    publicToken,
    merchantId,
    items.length,
  ])

  const customerPayload = useCallback(() => {
    const c = checkoutCustomer
    if (!c) throw new Error('Dados do cliente ausentes.')
    return {
      nome: c.nome.trim(),
      email: c.email.trim(),
      telefone: c.telefone.trim(),
      userId: c.userId,
      aceitaSmsAtualizacoes: c.aceitaSmsAtualizacoes,
      aceitaEmailAtualizacoes: c.aceitaEmailAtualizacoes,
      consentiuSalvarCartao: false,
    }
  }, [checkoutCustomer])

  async function ensurePreparedOrder() {
    if (preparedOrder && preparedOrder.fingerprint === fingerprint) {
      return preparedOrder
    }

    const response = await fetch('/api/checkout/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerPayload(),
        cart: cartPayload(items),
      }),
    })
    const data = await response.json()
    if (!response.ok || !data?.orderId) {
      throw new Error(data?.error ?? 'Falha ao preparar o pedido.')
    }

    const next = {
      orderId: data.orderId as string,
      orderNumber: String(data.orderNumber),
      totalCents: Number(data.totalCents),
      fingerprint,
    }
    setPreparedOrder(next)
    return next
  }

  async function handlePay() {
    if (payingLockRef.current || paying || !cloverRef.current) return
    payingLockRef.current = true
    setPaying(true)
    setError(null)

    try {
      const prepared = await ensurePreparedOrder()
      const tokenResult = await cloverRef.current.createToken()
      if (tokenResult.errors) {
        const messages = Object.values(tokenResult.errors).filter(Boolean)
        setError(messages[0] ?? 'Confira os dados do cartão.')
        return
      }
      const source = tokenResult.token
      if (!source?.startsWith('clv_')) {
        setError('Não foi possível tokenizar o cartão.')
        return
      }

      const payRes = await fetch('/api/payments/clover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: prepared.orderId,
          source,
        }),
      })
      const payData = await payRes.json()
      if (!payRes.ok || !payData?.success) {
        setError(payData?.error ?? 'Falha ao processar o pagamento.')
        return
      }

      setSuccessOrderNumber(String(payData.orderNumber || prepared.orderNumber))
      clearCheckoutCustomer()
      clearCart()
      setPreparedOrder(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no pagamento.')
    } finally {
      setPaying(false)
      payingLockRef.current = false
    }
  }

  if (!customerChecked || !checkoutCustomer) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">Carregando checkout...</p>
      </main>
    )
  }

  if (successOrderNumber) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-background px-6 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-4xl text-white shadow-lg">
            ✓
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">Pagamento confirmado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sua ordem foi gerada com sucesso.</p>
        <div className="mt-6 w-full max-w-xs rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Número da ordem</p>
          <p className="mt-1 text-2xl font-bold text-accent">#{successOrderNumber}</p>
        </div>
        <Link
          href="/"
          className="mt-6 w-full max-w-xs rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          Voltar ao cardápio
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 pt-10">
        <Link href="/carrinho" className="text-sm font-semibold text-accent">
          Voltar ao carrinho
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Seu carrinho está vazio.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background pb-28">
      {hasPublicConfig && (
        <Script src={sdkSrc} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} />
      )}

      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 px-4 pb-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link
            href="/checkout/dados"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-base font-bold text-foreground">Payment</h1>
        </div>
      </header>

      <section className="space-y-4 px-4 pt-4">
        <div className="space-y-0.5 rounded-3xl border border-border bg-card p-3 text-xs text-muted-foreground shadow-sm">
          <p className="text-sm font-semibold text-foreground">{checkoutCustomer.nome}</p>
          <p>{checkoutCustomer.email}</p>
          <p>{checkoutCustomer.telefone}</p>
          <Link href="/checkout/dados" className="inline-block pt-1 font-medium text-accent">
            Editar dados
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {totalItems} {totalItems === 1 ? t.item : t.items}
            </span>
            <span>
              {t.currency}
              {totalPrice.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xl font-bold">
            <span>{t.total}</span>
            <span className="text-accent">
              {t.currency}
              {totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2 rounded-3xl border border-border bg-card p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Credit or debit card</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Your payment is processed securely by Clover. Os dados do cartão são enviados diretamente
            para a Clover e não passam pelos nossos servidores.
          </p>

          {!hasPublicConfig && (
            <p className="text-xs text-red-500">
              Configure NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN e NEXT_PUBLIC_CLOVER_MERCHANT_ID.
            </p>
          )}

          <div id="card-number" className="min-h-12 overflow-hidden rounded-xl border border-border bg-white px-2 py-1" />
          <p className="text-[11px] text-red-500" id="card-number-errors" role="alert">
            {fieldErrors['card-number']}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div id="card-date" className="min-h-12 overflow-hidden rounded-xl border border-border bg-white px-2 py-1" />
              <p className="text-[11px] text-red-500" role="alert">
                {fieldErrors['card-date']}
              </p>
            </div>
            <div>
              <div id="card-cvv" className="min-h-12 overflow-hidden rounded-xl border border-border bg-white px-2 py-1" />
              <p className="text-[11px] text-red-500" role="alert">
                {fieldErrors['card-cvv']}
              </p>
            </div>
          </div>
          <div id="card-postal-code" className="min-h-12 overflow-hidden rounded-xl border border-border bg-white px-2 py-1" />
          <p className="text-[11px] text-red-500" role="alert">
            {fieldErrors['card-postal-code']}
          </p>

          <button
            type="button"
            onClick={handlePay}
            disabled={paying || !fieldsReady || !hasPublicConfig}
            className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {paying ? 'Processing...' : 'Pay & Confirm'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}

/** Mantido atrás de NEXT_PUBLIC_PAYMENT_PROVIDER=paypal para rollback. */
function PayPalCheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, totalItems, clearCart } = useCart()
  const { t } = useLang()
  const [checkoutCustomer, setCheckoutCustomer] = useState<CheckoutCustomer | null>(null)
  const [customerChecked, setCustomerChecked] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [paypalError, setPaypalError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState('')
  const [cardFieldsEligible, setCardFieldsEligible] = useState(false)
  const [cardFieldsLoading, setCardFieldsLoading] = useState(false)
  const [method, setMethod] = useState<'paypal' | 'card'>('paypal')
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null)
  const isRenderingRef = useRef(false)
  const cardFieldsRef = useRef<ReturnType<NonNullable<typeof window.paypal>['CardFields']> | null>(
    null
  )

  const paypalEnv = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live' ? 'live' : 'sandbox'
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ''
  const hasValidPayPalClientId = !!paypalClientId && !paypalClientId.includes('YOUR_PAYPAL_CLIENT_ID')

  const paypalScriptSrc = useMemo(() => {
    if (!hasValidPayPalClientId) return ''
    const base =
      paypalEnv === 'live'
        ? 'https://www.paypal.com/sdk/js'
        : 'https://www.sandbox.paypal.com/sdk/js'
    const query = new URLSearchParams({
      'client-id': paypalClientId,
      currency: 'USD',
      intent: 'capture',
      components: 'buttons,card-fields',
    })
    return `${base}?${query.toString()}`
  }, [hasValidPayPalClientId, paypalClientId, paypalEnv])

  useEffect(() => {
    const c = loadCheckoutCustomer()
    if (!isValidCheckoutCustomer(c)) {
      router.replace('/checkout/dados')
      return
    }
    setCheckoutCustomer(c)
    setCustomerChecked(true)
  }, [router])

  function customerPayload() {
    const c = checkoutCustomer
    if (!c) throw new Error('Dados do cliente ausentes.')
    return {
      nome: c.nome.trim(),
      email: c.email.trim(),
      telefone: c.telefone.trim(),
      userId: c.userId,
      aceitaSmsAtualizacoes: c.aceitaSmsAtualizacoes,
      aceitaEmailAtualizacoes: c.aceitaEmailAtualizacoes,
      consentiuSalvarCartao: false,
    }
  }

  async function createOrder() {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerPayload(),
        cart: items.map(({ item, quantity, observation, unitPrice, selectedOptions }) => ({
          id: item.id,
          name: item.nome,
          quantity,
          unitAmount: unitPrice,
          observation,
          selectedOptions,
        })),
      }),
    })
    const orderData = await response.json()
    if (!response.ok || !orderData?.id) {
      throw new Error(orderData?.error ?? 'Falha ao iniciar checkout PayPal.')
    }
    return orderData.id as string
  }

  async function captureOrder(orderID: string) {
    const response = await fetch(`/api/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerPayload(),
        cart: items.map(({ item, quantity, observation, unitPrice, selectedOptions }) => ({
          id: item.id,
          name: item.nome,
          quantity,
          unitAmount: unitPrice,
          observation,
          selectedOptions,
        })),
      }),
    })
    const captureData = await response.json()
    if (!response.ok) {
      throw new Error(captureData?.error ?? 'Falha ao finalizar pedido.')
    }
    const orderNumber =
      (captureData?.order_number as string | undefined) ??
      (captureData?.local_order_id as string | undefined)?.replace(/-/g, '').slice(-8).toUpperCase() ??
      'N/A'
    setSuccessOrderNumber(orderNumber)
    clearCheckoutCustomer()
    clearCart()
    setResultMessage('Pagamento OK')
  }

  useEffect(() => {
    if (!hasValidPayPalClientId) {
      setPaypalError('Configure NEXT_PUBLIC_PAYPAL_CLIENT_ID.')
      return
    }
    if (!customerChecked || !checkoutCustomer) return
    if (!sdkLoaded || !window.paypal || items.length === 0 || isRenderingRef.current) return
    const buttonsContainer = document.querySelector('#paypal-button-container')
    if (!buttonsContainer) return
    buttonsContainer.innerHTML = ''
    isRenderingRef.current = true
    const buttonsInstance = window.paypal.Buttons({
      style: { shape: 'pill', layout: 'vertical', color: 'blue', label: 'pay' },
      createOrder,
      async onApprove(data, actions) {
        try {
          await captureOrder(data.orderID)
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            String((error as { message: string }).message).includes('INSTRUMENT_DECLINED')
          ) {
            return actions.restart()
          }
          setPaypalError(error instanceof Error ? error.message : 'Não foi possível processar.')
        }
      },
      onCancel() {
        setResultMessage('Pagamento cancelado.')
      },
      onError() {
        setPaypalError('Erro no checkout PayPal.')
      },
    })
    const cardFieldsInstance = window.paypal.CardFields({
      createOrder,
      async onApprove(data) {
        await captureOrder(data.orderID)
      },
      onError() {
        setPaypalError('Erro no pagamento com cartão.')
      },
    })
    Promise.all([
      buttonsInstance.render('#paypal-button-container'),
      (async () => {
        if (!cardFieldsInstance.isEligible()) return
        setCardFieldsEligible(true)
        cardFieldsRef.current = cardFieldsInstance
        await Promise.all([
          cardFieldsInstance.NameField().render('#card-name-field'),
          cardFieldsInstance.NumberField().render('#card-number-field'),
          cardFieldsInstance.ExpiryField().render('#card-expiry-field'),
          cardFieldsInstance.CVVField().render('#card-cvv-field'),
        ])
      })(),
    ])
      .catch(() => setPaypalError('Não foi possível inicializar o PayPal.'))
      .finally(() => {
        isRenderingRef.current = false
      })
  }, [sdkLoaded, items, hasValidPayPalClientId, customerChecked, checkoutCustomer])

  if (!customerChecked || !checkoutCustomer) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">Carregando checkout...</p>
      </main>
    )
  }

  if (successOrderNumber) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-2xl font-extrabold">Pagamento confirmado</h1>
        <p className="mt-6 text-2xl font-bold text-accent">#{successOrderNumber}</p>
        <Link href="/" className="mt-6 rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground">
          Voltar ao cardápio
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 pt-10">
        <p className="text-sm text-muted-foreground">Carrinho vazio.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background pb-28">
      {!!paypalScriptSrc && (
        <Script src={paypalScriptSrc} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} />
      )}
      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 px-4 pb-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link href="/checkout/dados" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-base font-bold">Payment (PayPal)</h1>
        </div>
      </header>
      <section className="space-y-4 px-4 pt-4">
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex justify-between font-bold text-xl">
            <span>{t.total}</span>
            <span className="text-accent">
              {t.currency}
              {totalPrice.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalItems} {totalItems === 1 ? t.item : t.items}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-3xl border border-border bg-card p-2">
          <button
            type="button"
            onClick={() => setMethod('paypal')}
            className={`h-11 rounded-2xl text-sm font-semibold ${method === 'paypal' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={14} /> PayPal
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMethod('card')}
            disabled={!cardFieldsEligible}
            className={`h-11 rounded-2xl text-sm font-semibold disabled:opacity-40 ${method === 'card' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <CreditCard size={14} /> Card
            </span>
          </button>
        </div>
        <div className={`${method === 'paypal' ? '' : 'hidden'} rounded-3xl border border-border bg-card p-4`}>
          <div id="paypal-button-container" />
        </div>
        <div className={`${method === 'card' && cardFieldsEligible ? '' : 'hidden'} space-y-2 rounded-3xl border border-border bg-card p-3`}>
          <div id="card-name-field" className="min-h-12" />
          <div id="card-number-field" className="min-h-12" />
          <div className="grid grid-cols-2 gap-2">
            <div id="card-expiry-field" className="min-h-12" />
            <div id="card-cvv-field" className="min-h-12" />
          </div>
          <button
            type="button"
            disabled={cardFieldsLoading}
            onClick={async () => {
              if (!cardFieldsRef.current) return
              setCardFieldsLoading(true)
              try {
                await cardFieldsRef.current.submit()
              } catch (e) {
                setPaypalError(e instanceof Error ? e.message : 'Falha no cartão.')
              } finally {
                setCardFieldsLoading(false)
              }
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            {cardFieldsLoading ? 'Processing...' : 'Pay & Confirm'}
          </button>
        </div>
        {paypalError && <p className="text-xs text-red-500">{paypalError}</p>}
        {resultMessage && <p className="text-xs">{resultMessage}</p>}
      </section>
    </main>
  )
}
