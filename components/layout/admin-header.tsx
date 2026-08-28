'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminContentWidthClass, type AdminShellWidth } from '@/components/layout/admin-shell'

type Props = {
  title: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  width?: AdminShellWidth
  trailing?: React.ReactNode
  className?: string
}

export function AdminHeader({
  title,
  eyebrow,
  backHref = '/admin',
  backLabel = 'Back',
  width = 'wide',
  trailing,
  className,
}: Props) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center gap-3',
          adminContentWidthClass(width),
          trailing && 'justify-between'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary"
            aria-label={backLabel}
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs text-muted-foreground">{eyebrow}</p> : null}
            <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
          </div>
        </div>
        {trailing}
      </div>
    </header>
  )
}
