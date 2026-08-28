'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ClipboardList,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Printer,
  Sparkles,
  Store,
  Tag,
  Truck,
  UtensilsCrossed,
  Layers,
} from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  labelKey:
    | 'adminNavOperations'
    | 'adminNavNewOrder'
    | 'adminNavOrders'
    | 'adminNavMenu'
    | 'adminNavCombos'
    | 'adminNavPromos'
    | 'adminNavBanners'
    | 'adminNavDelivery'
    | 'adminNavPrint'
  icon: typeof LayoutDashboard
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', labelKey: 'adminNavOperations', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedido-manual', labelKey: 'adminNavNewOrder', icon: PlusCircle },
  { href: '/admin/ordens', labelKey: 'adminNavOrders', icon: ClipboardList },
  { href: '/admin/cardapio', labelKey: 'adminNavMenu', icon: UtensilsCrossed },
  { href: '/admin/combos', labelKey: 'adminNavCombos', icon: Layers },
  { href: '/admin/promocoes', labelKey: 'adminNavPromos', icon: Tag },
  { href: '/admin/banners', labelKey: 'adminNavBanners', icon: ImageIcon },
  { href: '/admin/delivery', labelKey: 'adminNavDelivery', icon: Truck },
  { href: '/admin/impressao', labelKey: 'adminNavPrint', icon: Printer },
]

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function AdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, toggleLang } = useLang()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="admin-app min-h-screen bg-[#F6F7FA]">
      <header className="sticky top-0 z-50 border-b border-border bg-white pt-[max(0.5rem,env(safe-area-inset-top))] shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/admin" className="flex min-w-0 shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store size={18} />
            </span>
            <span className="min-w-0 hidden sm:block">
              <strong className="block truncate text-sm text-foreground">{t.storeName}</strong>
              <small className="block truncate text-[10px] text-muted-foreground">{t.adminNavSubtitle}</small>
            </span>
          </Link>

          <nav
            ref={navRef}
            aria-label={t.adminPanel}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon size={15} aria-hidden />
                  {t[item.labelKey]}
                </Link>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-lg bg-secondary px-2 py-1.5 text-[10px] font-bold text-muted-foreground"
            >
              {lang === 'en' ? 'PT' : 'EN'}
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-secondary"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="admin-app-content">{children}</div>
    </div>
  )
}

export function AdminPageContent({
  children,
  title,
  eyebrow,
  width = 'wide',
  className,
}: {
  children: ReactNode
  title?: string
  eyebrow?: string
  width?: 'narrow' | 'wide' | 'board' | 'print'
  className?: string
}) {
  const widthClass = {
    narrow: 'max-w-lg',
    wide: 'max-w-4xl',
    board: 'max-w-7xl',
    print: 'max-w-5xl',
  }[width]

  return (
    <div className={cn('mx-auto px-4 py-6', widthClass, className)}>
      {eyebrow || title ? (
        <header className="mb-5">
          {eyebrow ? <p className="admin-eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="admin-page-title">{title}</h1> : null}
        </header>
      ) : null}
      {children}
    </div>
  )
}
