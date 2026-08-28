'use client'

import { AdminCombosPanel } from '@/components/admin-combos-panel'
import { AdminHeader } from '@/components/layout/admin-header'
import { AdminShell } from '@/components/layout/admin-shell'
import { useLang } from '@/lib/lang-context'

export default function AdminCombosPage() {
  const { t } = useLang()

  return (
    <AdminShell
      header={
        <AdminHeader
          title="Combos"
          eyebrow={t.adminPanel}
          backLabel={t.back}
        />
      }
    >
      <AdminCombosPanel />
    </AdminShell>
  )
}
