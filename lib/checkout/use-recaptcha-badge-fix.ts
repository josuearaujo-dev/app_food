'use client'

import { useEffect } from 'react'

const BADGE_COLLAPSED_WIDTH = '70px'

/** Mantém o badge reCAPTCHA (Clover) compacto no canto; evita ficar expandido no mobile. */
export function useRecaptchaBadgeFix(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    function collapseBadge() {
      document.querySelectorAll('.grecaptcha-badge').forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty('width', BADGE_COLLAPSED_WIDTH, 'important')
        el.style.setProperty('overflow', 'hidden', 'important')
      })
    }

    function onPointerOutside(event: Event) {
      const target = event.target
      if (target instanceof Element && target.closest('.grecaptcha-badge')) return
      collapseBadge()
    }

    collapseBadge()

    document.addEventListener('touchstart', onPointerOutside, { passive: true })
    document.addEventListener('click', onPointerOutside, { passive: true })
    window.addEventListener('blur', collapseBadge)

    const observer = new MutationObserver(() => {
      collapseBadge()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('touchstart', onPointerOutside)
      document.removeEventListener('click', onPointerOutside)
      window.removeEventListener('blur', collapseBadge)
      observer.disconnect()
    }
  }, [enabled])
}
