import { createClient } from '@/lib/supabase/client'

export const AUTH_CHANGED_EVENT = 'cadu-auth-changed'

export type SignupResult =
  | { ok: true }
  | { ok: false; error: 'email_taken' | 'weak_password' | 'invalid' | 'signup_failed' | 'signin_failed' }

export async function registerCustomer(input: {
  nome: string
  telefone: string
  email: string
  password: string
  aceitaSms: boolean
  aceitaEmail: boolean
}): Promise<SignupResult> {
  const response = await fetch('/api/conta/cadastro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: SignupResult['error'] }
  if (!response.ok) {
    const error = data.error
    if (error === 'email_taken' || error === 'weak_password' || error === 'invalid') {
      return { ok: false, error }
    }
    return { ok: false, error: 'signup_failed' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  })
  if (error) return { ok: false, error: 'signin_failed' }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
  return { ok: true }
}

export async function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export async function saveCustomerProfile(input: {
  nome: string
  telefone: string
  aceitaSms: boolean
  aceitaEmail: boolean
}) {
  const response = await fetch('/api/conta/perfil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.ok
}
