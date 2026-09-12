'use client'

import { ShoppingBag, ChefHat, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'
import { ProfilePanel } from '@/components/profile/profile-panel'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontShell } from '@/components/layout/storefront-shell'

export default function PerfilPage() {
  const { t } = useLang()

  return (
    <StorefrontShell
      header={<StorefrontHeader title={t.profileTitle} sticky={false} className="[&>div]:pb-6" />}
    >
      <div className="px-4 mt-4 mb-4">
        <ProfilePanel />
      </div>

      <div className="px-4 space-y-3 pb-4">
        <Link
          href="/carrinho"
          className="flex items-center gap-3 bg-card rounded-2xl px-4 py-4 border border-border shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ShoppingBag size={17} className="text-accent" />
          </div>
          <span className="flex-1 text-sm font-medium text-foreground">{t.myCartLink}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">
            Admin
          </p>
          <Link href="/admin" className="flex items-center gap-3 px-4 py-4 border-t border-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <ChefHat size={17} className="text-accent" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{t.adminPanel}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6 mb-4">{t.appVersion}</p>
    </StorefrontShell>
  )
}
