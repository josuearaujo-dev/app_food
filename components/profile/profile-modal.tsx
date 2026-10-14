'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import type { AccountMode } from '@/lib/profile-modal-context'
import { AccountForm } from '@/components/profile/account-form'
import { ProfilePanel } from '@/components/profile/profile-panel'

type ProfileModalProps = {
  open: boolean
  mode: AccountMode
  onMode: (mode: AccountMode) => void
  onClose: () => void
}

export function ProfileModal({ open, mode, onMode, onClose }: ProfileModalProps) {
  const { t } = useLang()
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setClosing(false)
    document.body.dataset.caduModal = 'open'
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      delete document.body.dataset.caduModal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function requestClose() {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, 180)
  }

  if (!mounted || (!open && !closing)) return null

  return createPortal(
    <div
      className={`cadu-modal-backdrop ${closing ? 'cadu-modal-backdrop--closing' : ''}`}
      role="presentation"
      onClick={requestClose}
    >
      <div
        className="cadu-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.profileTitle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cadu-modal-handle" aria-hidden />
        <header className="cadu-profile-modal-header">
          <div>
            {mode === 'profile' ? (
              <p className="cadu-modal-kicker">{t.myAccount}</p>
            ) : (
              <button type="button" className="cadu-account-back" onClick={() => onMode('profile')}>
                <ArrowLeft size={14} />
                {t.back}
              </button>
            )}
            <h2>{mode === 'login' ? t.login : mode === 'signup' ? t.signup : t.profileTitle}</h2>
          </div>
          <button
            type="button"
            className="cadu-modal-close"
            onClick={requestClose}
            aria-label={t.back}
          >
            <X size={18} />
          </button>
        </header>
        <div className="cadu-profile-modal-body">
          {mode === 'profile' ? (
            <ProfilePanel
              key={sessionKey}
              compact
              onClose={requestClose}
              onSignIn={() => onMode('login')}
              onSignUp={() => onMode('signup')}
            />
          ) : (
            <AccountForm
              mode={mode === 'signup' ? 'signup' : 'login'}
              onMode={onMode}
              onDone={() => {
                onMode('profile')
                setSessionKey((value) => value + 1)
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
