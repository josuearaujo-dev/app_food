'use client'

import { useEffect, useState } from 'react'
import type { DeliveryLocation } from '@/lib/checkout/fulfillment'

type CheckoutConfig = {
  deliveryFee: number
  locations: DeliveryLocation[]
}

export function useCheckoutConfig() {
  const [config, setConfig] = useState<CheckoutConfig>({ deliveryFee: 0, locations: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/checkout-config')
        const data = (await res.json()) as {
          deliveryFee?: number
          locations?: Array<{ id: string; nome: string; taxaEntrega: number }>
        }
        if (!cancelled && res.ok) {
          setConfig({
            deliveryFee: Number(data.deliveryFee ?? 0),
            locations: (data.locations ?? []).map((row) => ({
              id: row.id,
              nome: row.nome,
              taxaEntrega: Number(row.taxaEntrega ?? 0),
            })),
          })
        }
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { ...config, loading }
}
