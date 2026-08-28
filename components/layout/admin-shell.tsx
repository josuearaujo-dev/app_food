'use client'

import { cn } from '@/lib/utils'

export type AdminShellWidth = 'narrow' | 'wide' | 'board' | 'print'

const widthClass: Record<AdminShellWidth, string> = {
  narrow: 'max-w-lg',
  wide: 'max-w-4xl',
  board: 'max-w-7xl',
  print: 'max-w-5xl',
}

type Props = {
  children: React.ReactNode
  header?: React.ReactNode
  width?: AdminShellWidth
  /** Fundo cinza claro usado nas telas operacionais do admin. */
  tone?: 'default' | 'canvas'
  /** Centraliza conteúdo (login). */
  centered?: boolean
  className?: string
  contentClassName?: string
  /** Quando true, não aplica padding no wrapper interno (header já define layout). */
  flush?: boolean
}

export function AdminShell({
  children,
  header,
  width = 'wide',
  tone = 'canvas',
  centered = false,
  className,
  contentClassName,
  flush = false,
}: Props) {
  if (centered) {
    return (
      <main
        className={cn(
          'mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-background px-6',
          className
        )}
      >
        {children}
      </main>
    )
  }

  return (
    <main className={cn('min-h-screen', tone === 'canvas' ? 'bg-[#F6F7FA]' : 'bg-background', className)}>
      {header}
      {flush ? (
        children
      ) : (
        <div className={cn('mx-auto px-4 py-6', widthClass[width], contentClassName)}>{children}</div>
      )}
    </main>
  )
}

export function adminContentWidthClass(width: AdminShellWidth = 'wide') {
  return widthClass[width]
}
