'use client'

import { useState, type ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null
  fallbackSrc?: string
}

/** Keep failed remote images from leaving broken icons or collapsing the layout. */
export function StoreImage({ src, fallbackSrc = '/images/product-placeholder.svg', alt = '', onError, ...props }: Props) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const source = src?.trim() || ''
  const failed = !source || failedSources.includes(source)
  const displayedSource = !failed ? source : failedSources.includes(fallbackSrc) ? '/images/product-placeholder.svg' : fallbackSrc

  return (
    <img
      {...props}
      src={displayedSource}
      alt={alt}
      loading={props.loading ?? 'lazy'}
      decoding="async"
      data-fallback={failed || undefined}
      onError={(event) => {
        if (!failedSources.includes(displayedSource)) {
          setFailedSources((previous) => [...previous, displayedSource])
        }
        onError?.(event)
      }}
    />
  )
}
