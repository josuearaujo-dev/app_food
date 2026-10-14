'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ProfileModal } from '@/components/profile/profile-modal'

export type AccountMode = 'profile' | 'login' | 'signup'

type ProfileModalContextValue = {
  open: boolean
  mode: AccountMode
  openProfile: () => void
  openAccount: (mode: 'login' | 'signup') => void
  closeProfile: () => void
  setMode: (mode: AccountMode) => void
}

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null)

export function ProfileModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AccountMode>('profile')

  const openProfile = useCallback(() => {
    setMode('profile')
    setOpen(true)
  }, [])
  const openAccount = useCallback((next: 'login' | 'signup') => {
    setMode(next)
    setOpen(true)
  }, [])
  const closeProfile = useCallback(() => {
    setOpen(false)
    setMode('profile')
  }, [])

  const value = useMemo(
    () => ({ open, mode, openProfile, openAccount, closeProfile, setMode }),
    [open, mode, openProfile, openAccount, closeProfile]
  )

  return (
    <ProfileModalContext.Provider value={value}>
      {children}
      <ProfileModal open={open} mode={mode} onMode={setMode} onClose={closeProfile} />
    </ProfileModalContext.Provider>
  )
}

export function useProfileModal() {
  const ctx = useContext(ProfileModalContext)
  if (!ctx) {
    throw new Error('useProfileModal must be used within ProfileModalProvider')
  }
  return ctx
}
