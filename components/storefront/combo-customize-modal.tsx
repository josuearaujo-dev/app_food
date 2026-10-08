'use client'

import { useEffect } from 'react'
import { ComboCustomize } from '@/app/combo/[id]/page'

export function ComboCustomizeModal({
  comboId,
  onClose,
}: {
  comboId: string | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!comboId) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [comboId])

  if (!comboId) return null

  console.info('[cadu:combo-add] ComboCustomizeModal open', { comboId })

  return (
    <div
      className="cadu-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="cadu-product-modal" role="dialog" aria-modal="true">
        <ComboCustomize key={comboId} comboId={comboId} layout="modal" onClose={onClose} onAdded={onClose} />
      </div>
    </div>
  )
}
