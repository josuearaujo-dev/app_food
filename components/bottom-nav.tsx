'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { useProfileModal } from '@/lib/profile-modal-context'
import { cn } from '@/lib/utils'
import { shouldHideBottomNav } from '@/lib/layout/page-chrome'

export function BottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()
  const { lang, t, toggleLang } = useLang()
  const { openProfile, open } = useProfileModal()

  if (shouldHideBottomNav(pathname)) return null

  const navItems = [
    { href: '/', icon: Home, label: t.home },
    { href: '/busca', icon: Search, label: t.search },
    { href: '/carrinho', icon: ShoppingBag, label: t.cart },
  ]

  return (
    <nav
      className="cadu-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isCart = href === '/carrinho'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 relative px-3 py-1 rounded-xl transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-accent' : ''} />
                {isCart && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </span>
              <span className={cn('text-[10px] font-medium', isActive ? 'text-accent' : '')}>{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={openProfile}
          className={cn(
            'flex flex-col items-center gap-1 relative px-3 py-1 rounded-xl transition-colors',
            open || pathname.startsWith('/perfil')
              ? 'text-accent'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={t.profile}
          aria-expanded={open}
        >
          <User
            size={22}
            strokeWidth={open || pathname.startsWith('/perfil') ? 2.5 : 1.8}
            className={open || pathname.startsWith('/perfil') ? 'text-accent' : ''}
          />
          <span
            className={cn(
              'text-[10px] font-medium',
              open || pathname.startsWith('/perfil') ? 'text-accent' : ''
            )}
          >
            {t.profile}
          </span>
        </button>

        <button
          onClick={toggleLang}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          aria-label={lang === 'en' ? 'Switch to Portuguese' : 'Mudar para Ingles'}
        >
          <span className="text-base font-bold leading-none">
            {lang === 'en' ? '🇧🇷' : '🇺🇸'}
          </span>
          <span className="text-[10px] font-medium">{lang === 'en' ? 'PT' : 'EN'}</span>
        </button>
      </div>
    </nav>
  )
}
