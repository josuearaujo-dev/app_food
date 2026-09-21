'use client'

import { useLang } from '@/lib/lang-context'
import { StorefrontTracking } from '@/lib/marketing/StorefrontTracking'
import type { PublicMarketingConfig } from '@/lib/marketing/marketing.schema'

export function StorefrontTrackingGate({ config }: { config: PublicMarketingConfig }) {
  const { lang } = useLang()
  return <StorefrontTracking config={config} locale={lang} />
}
