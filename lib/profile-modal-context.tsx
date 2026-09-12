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

type ProfileModalContextValue = {
  open: boolean
  openProfile: () => void
  closeProfile: () => void
}

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null)

export function ProfileModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openProfile = useCallback(() => setOpen(true), [])
  const closeProfile = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ open, openProfile, closeProfile }),
    [open, openProfile, closeProfile]
  )

  return (
    <ProfileModalContext.Provider value={value}>
      {children}
      <ProfileModal open={open} onClose={closeProfile} />
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
