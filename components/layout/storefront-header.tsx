'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  title?: string
  backHref?: string
  backLabel?: string
  sticky?: boolean
  className?: string
  children?: React.ReactNode
  trailing?: React.ReactNode
}

export function StorefrontHeader({
  title,
  backHref,
  backLabel = 'Back',
  sticky = true,
  className,
  children,
  trailing,
}: Props) {
  return (
    <header
      className={cn(
        'border-b border-border/90 bg-background/90 backdrop-blur-md',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
            aria-label={backLabel}
          >
            <ArrowLeft size={20} />
          </Link>
        ) : null}

        {children ? (
          <div className="min-w-0 flex-1">{children}</div>
        ) : title ? (
          <h1 className="min-w-0 flex-1 text-lg font-bold text-foreground">{title}</h1>
        ) : (
          <div className="flex-1" />
        )}

        {trailing}
      </div>
    </header>
  )
}
