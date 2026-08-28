'use client'

import { AdminCombosPanel } from '@/components/admin-combos-panel'
import { AdminPageContent } from '@/components/layout/admin-app-shell'
import { useLang } from '@/lib/lang-context'

export default function AdminCombosPage() {
  const { t } = useLang()

  return (
    <AdminPageContent title={t.adminNavCombos} eyebrow={t.adminPanel} width="wide">
      <AdminCombosPanel />
    </AdminPageContent>
  )
}
