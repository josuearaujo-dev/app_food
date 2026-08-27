'use client'

import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

type OrderSuccessScreenProps = {
  orderId?: string | null
  orderNumber: string
  email?: string | null
}

export function OrderSuccessScreen({ orderId, orderNumber, email }: OrderSuccessScreenProps) {
  const { t } = useLang()
  const trackHref =
    orderId && email
      ? `/pedido/${orderId}?email=${encodeURIComponent(email)}`
      : orderId
        ? `/pedido/${orderId}`
        : null

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-background px-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-4xl text-white shadow-lg">
          ✓
        </div>
      </div>
      <h1 className="text-2xl font-extrabold text-foreground">{t.paymentConfirmed}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.paymentConfirmedHint}</p>
      <div className="mt-6 w-full max-w-xs rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.orderNumberLabel}</p>
        <p className="mt-1 text-2xl font-bold text-accent">#{orderNumber}</p>
      </div>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        {trackHref && (
          <Link
            href={trackHref}
            className="rounded-2xl bg-accent py-3.5 text-sm font-bold text-accent-foreground"
          >
            {t.trackOrder}
          </Link>
        )}
        <Link
          href="/"
          className="rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          {t.backToMenu}
        </Link>
      </div>
    </main>
  )
}
