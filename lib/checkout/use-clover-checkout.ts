'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import type { CheckoutCustomer } from '@/lib/checkout-customer'
import { customerToPayload } from '@/lib/checkout-customer'
import { buildOrderFingerprint } from '@/lib/checkout/fulfillment'
import {
  buildCartPayload,
  CLOVER_FIELD_STYLES,
  cloverMountIds,
  type CloverElementsApi,
  type CloverSdk,
} from '@/lib/checkout/clover-ui'
import { useRecaptchaBadgeFix } from '@/lib/checkout/use-recaptcha-badge-fix'

declare global {
  interface Window {
    Clover?: new (
      publicToken: string,
      options?: { merchantId?: string; locale?: string }
    ) => CloverSdk
  }
}

type SuccessOrder = {
  orderId: string
  orderNumber: string
  email: string
}

type Options = {
  mountPrefix: string
  enabled: boolean
  checkoutCustomer: CheckoutCustomer | null
  sdkLoaded: boolean
  onSuccess: (order: SuccessOrder) => void
}

export function useCloverCheckout({
  mountPrefix,
  enabled,
  checkoutCustomer,
  sdkLoaded,
  onSuccess,
}: Options) {
  const { items, clearCart } = useCart()
  const { t, lang } = useLang()
  const [fieldsReady, setFieldsReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [preparedOrder, setPreparedOrder] = useState<{
    orderId: string
    orderNumber: string
    totalCents: number
    fingerprint: string
  } | null>(null)

  const cloverRef = useRef<CloverSdk | null>(null)
  const mountedRef = useRef(false)
  const payingLockRef = useRef(false)
  const mountIds = useMemo(() => cloverMountIds(mountPrefix), [mountPrefix])

  useRecaptchaBadgeFix(enabled && sdkLoaded)

  const publicToken = process.env.NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN ?? ''
  const merchantId = process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID ?? ''
  const hasPublicConfig = !!publicToken && !!merchantId

  const cartFingerprint = useMemo(
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

  const orderFingerprint = useMemo(() => {
    if (!checkoutCustomer) return cartFingerprint
    return buildOrderFingerprint(cartFingerprint, customerToPayload(checkoutCustomer))
  }, [cartFingerprint, checkoutCustomer])

  useEffect(() => {
    setPreparedOrder((prev) => (prev && prev.fingerprint !== orderFingerprint ? null : prev))
  }, [orderFingerprint])

  useEffect(() => {
    if (!enabled || !sdkLoaded || !hasPublicConfig) return
    if (!window.Clover || mountedRef.current || items.length === 0) return

    mountedRef.current = true
    try {
      const clover = new window.Clover(publicToken, {
        merchantId,
        locale: lang === 'pt' ? 'pt-BR' : 'en-US',
      })
      cloverRef.current = clover
      const elements = clover.elements()

      const cardNumber = elements.create('CARD_NUMBER', CLOVER_FIELD_STYLES)
      const cardDate = elements.create('CARD_DATE', CLOVER_FIELD_STYLES)
      const cardCvv = elements.create('CARD_CVV', CLOVER_FIELD_STYLES)
      const cardPostal = elements.create('CARD_POSTAL_CODE', CLOVER_FIELD_STYLES)

      cardNumber.mount(mountIds.number)
      cardDate.mount(mountIds.date)
      cardCvv.mount(mountIds.cvv)
      cardPostal.mount(mountIds.postal)

      const bindErrors = (key: string, el: ReturnType<CloverElementsApi['create']>) => {
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
      setError(t.paymentInitError)
      mountedRef.current = false
    }

    return () => {
      cloverRef.current = null
      mountedRef.current = false
      setFieldsReady(false)
      setFieldErrors({})
    }
  }, [
    enabled,
    sdkLoaded,
    hasPublicConfig,
    publicToken,
    merchantId,
    items.length,
    lang,
    mountIds,
    t.paymentInitError,
  ])

  async function handlePay(customerOverride?: CheckoutCustomer) {
    const activeCustomer = customerOverride ?? checkoutCustomer
    if (payingLockRef.current || paying || !cloverRef.current || !activeCustomer) return
    payingLockRef.current = true
    setPaying(true)
    setError(null)

    const payload = customerToPayload(activeCustomer)

    try {
      const prepared = await (async () => {
        if (preparedOrder && preparedOrder.fingerprint === orderFingerprint) {
          return preparedOrder
        }
        const response = await fetch('/api/checkout/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: payload,
            cart: buildCartPayload(items),
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
          fingerprint: orderFingerprint,
        }
        setPreparedOrder(next)
        return next
      })()
      const tokenResult = await cloverRef.current.createToken()
      if (tokenResult.errors) {
        const messages = Object.values(tokenResult.errors).filter(Boolean)
        setError(messages[0] ?? t.paymentCheckCard)
        return
      }
      const source = tokenResult.token
      if (!source?.startsWith('clv_')) {
        setError(t.paymentTokenError)
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
        setPreparedOrder(null)
        setError(payData?.error ?? 'Falha ao processar o pagamento.')
        return
      }

      const orderNumber = String(payData.orderNumber || prepared.orderNumber)
      const orderId = String(payData.orderId || prepared.orderId)
      const email = activeCustomer.email.trim()
      onSuccess({ orderId, orderNumber, email })
      clearCart()
      setPreparedOrder(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no pagamento.')
    } finally {
      setPaying(false)
      payingLockRef.current = false
    }
  }

  return {
    hasPublicConfig,
    fieldsReady,
    paying,
    error,
    fieldErrors,
    handlePay,
    mountPrefix,
  }
}
