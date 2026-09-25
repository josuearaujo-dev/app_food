'use client'

import { useEffect, useState } from 'react'

export function useStoreStatus() {
  const [acceptingOrders, setAcceptingOrders] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/store-status', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as { acceptingOrders?: boolean } | null
        if (!cancelled) setAcceptingOrders(data?.acceptingOrders === true)
      })
      .catch(() => {
        if (!cancelled) setAcceptingOrders(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { acceptingOrders, loading }
}
