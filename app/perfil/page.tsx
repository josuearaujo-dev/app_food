'use client'

import { User, ChevronRight, ShoppingBag, ChefHat } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

export default function PerfilPage() {
  const { t } = useLang()

  return (
    <main className="min-h-screen bg-background pb-28 max-w-lg mx-auto">
      <header className="border-b border-border/90 bg-background/90 px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <h1 className="text-xl font-bold text-foreground">{t.profileTitle}</h1>
      </header>

      <div className="px-4 mb-6">
        <div className="bg-card rounded-3xl p-5 border border-border flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-accent/10">
            <User size={28} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{t.visitor}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{t.welcomeMsg}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <Link href="/carrinho" className="flex items-center gap-3 bg-card rounded-2xl px-4 py-4 border border-border">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ShoppingBag size={17} className="text-accent" />
          </div>
          <span className="flex-1 text-sm font-medium text-foreground">{t.myCartLink}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
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

      <p className="text-center text-xs text-muted-foreground mt-10">{t.appVersion}</p>
    </main>
  )
}
