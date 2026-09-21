import { redirect } from 'next/navigation'
import { isAdminAppUser } from '@/lib/admin-access'
import { AdminPageContent } from '@/components/layout/admin-app-shell'
import { MarketingForm } from '@/lib/marketing/MarketingForm'
import { getAdminMarketingSettings } from '@/lib/marketing/marketing.repository'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminMarketingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminAppUser(user)) {
    redirect('/admin/login')
  }

  const settings = await getAdminMarketingSettings(supabase as never)

  return (
    <AdminPageContent
      title="Marketing"
      eyebrow="Aquisição e atribuição"
      width="wide"
      className="pb-8"
    >
      <p className="mb-5 -mt-2 text-sm text-muted-foreground">
        Cole os códigos das plataformas. O cardápio passa a rastrear páginas, produtos, valores e
        cada fase do pedido.
      </p>
      <MarketingForm settings={settings} />
    </AdminPageContent>
  )
}
