'use client'

import { useLang } from '@/lib/lang-context'
import { StorefrontShell } from '@/components/layout/storefront-shell'

type Props = {
  message?: string
}

export function StorefrontLoadingState({ message }: Props) {
  const { t } = useLang()
  return (
    <StorefrontShell>
      <div className="px-4 pt-4">
        <p className="text-sm text-muted-foreground">{message ?? t.checkoutLoading}</p>
      </div>
    </StorefrontShell>
  )
}
