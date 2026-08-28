'use client'

import { cn } from '@/lib/utils'
import {
  storefrontBottomClass,
  type StorefrontBottomPadding,
} from '@/lib/layout/page-chrome'

type Props = {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  bottomPadding?: StorefrontBottomPadding
  className?: string
  contentClassName?: string
  fullHeight?: boolean
}

export function StorefrontShell({
  children,
  header,
  footer,
  bottomPadding = 'nav',
  className,
  contentClassName,
  fullHeight = false,
}: Props) {
  return (
    <main
      className={cn(
        'mx-auto max-w-lg bg-background',
        fullHeight ? 'flex min-h-screen flex-col' : 'min-h-screen',
        storefrontBottomClass(bottomPadding),
        className
      )}
    >
      {header}
      <div className={cn(fullHeight && 'flex flex-1 flex-col', contentClassName)}>{children}</div>
      {footer}
    </main>
  )
}
