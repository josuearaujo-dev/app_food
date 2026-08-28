'use client'

import Link from 'next/link'
import {
  Gift,
  ImageIcon,
  MapPin,
  Printer,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
  Layers,
} from 'lucide-react'
import { useLang } from '@/lib/lang-context'

const LINKS = [
  { href: '/admin/ordens', labelKey: 'adminHubOrders', icon: ShoppingBag },
  { href: '/admin/pedido-manual', labelKey: 'adminHubCounter', icon: UtensilsCrossed },
  { href: '/admin/combos', labelKey: 'adminHubCombos', icon: Layers },
  { href: '/admin/promocoes', labelKey: 'adminHubPromos', icon: Tag },
  { href: '/admin/banners', labelKey: 'adminHubBanners', icon: ImageIcon },
  { href: '/admin/delivery', labelKey: 'adminHubDelivery', icon: MapPin },
  { href: '/admin/impressao', labelKey: 'adminHubPrint', icon: Printer },
  { href: '/admin/extras-biblioteca', labelKey: 'adminHubExtras', icon: Gift },
] as const

export function AdminHubNav() {
  const { t } = useLang()

  return (
    <nav
      className="border-b border-border bg-white px-4 py-3"
      aria-label={t.adminHubTitle}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {t.adminHubTitle}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide md:flex-wrap">
        {LINKS.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-[#FCFCFD] px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-white"
          >
            <Icon size={14} className="text-primary" />
            {t[labelKey]}
          </Link>
        ))}
      </div>
    </nav>
  )
}
