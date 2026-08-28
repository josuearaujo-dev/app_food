'use client'

import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
  className?: string
  /** Quando false, rodapé fica colado na base (páginas sem bottom nav). */
  withBottomNav?: boolean
}

/** Rodapé fixo — carrinho, produto, combo. */
export function StorefrontFixedFooter({ children, className, withBottomNav = true }: Props) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg border-t border-border bg-card px-4 pt-4',
        className
      )}
      style={{
        paddingBottom: withBottomNav
          ? 'var(--storefront-bottom-inset)'
          : 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  )
}
