'use client'

import { LogoLoadingScreen } from '@/components/logo-loading-screen'
import { AdminShell } from '@/components/layout/admin-shell'

type Props = {
  message?: string
}

export function AdminLoadingState({ message }: Props) {
  return (
    <AdminShell tone="default" className="flex items-center justify-center">
      <LogoLoadingScreen variant="fullscreen" message={message} />
    </AdminShell>
  )
}
