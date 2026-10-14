'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'
import { notifyAuthChanged, registerCustomer } from '@/lib/auth/register-customer'

type AccountMode = 'login' | 'signup'

type AccountFormProps = {
  mode: AccountMode
  onMode: (mode: AccountMode) => void
  onDone: () => void
}

export function AccountForm({ mode, onMode, onDone }: AccountFormProps) {
  const { t } = useLang()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [aceitaSms, setAceitaSms] = useState(false)
  const [aceitaEmail, setAceitaEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function signupMessage(code: string) {
    if (code === 'email_taken') return t.authEmailTaken
    if (code === 'weak_password') return t.authWeakPassword
    if (code === 'invalid') return t.authSignupInvalid
    return t.authSignupFailed
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErro(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    if (error) {
      setErro(t.authInvalidCredentials)
      setLoading(false)
      return
    }
    const role = data.user?.user_metadata?.role as string | undefined
    if (role === 'admin') {
      await supabase.auth.signOut()
      setErro(t.authUseAdmin)
      setLoading(false)
      return
    }
    notifyAuthChanged()
    setLoading(false)
    onDone()
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErro(null)
    const result = await registerCustomer({
      nome,
      telefone,
      email,
      password: senha,
      aceitaSms,
      aceitaEmail,
    })
    if (!result.ok) {
      setErro(result.error === 'signin_failed' ? t.authAccountCreated : signupMessage(result.error))
      setLoading(false)
      if (result.error === 'signin_failed') onMode('login')
      return
    }
    setLoading(false)
    onDone()
  }

  return (
    <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="cadu-account-form">
      <p className="cadu-profile-empty">{mode === 'signup' ? t.authSignupHint : t.profileGuestHint}</p>

      {mode === 'signup' ? (
        <>
          <label className="cadu-account-field">
            <span>{t.authFullName}</span>
            <div>
              <User size={16} />
              <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required minLength={2} />
            </div>
          </label>
          <label className="cadu-account-field">
            <span>{t.authPhone}</span>
            <div>
              <Phone size={16} />
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} type="tel" autoComplete="tel" required />
            </div>
          </label>
        </>
      ) : null}

      <label className="cadu-account-field">
        <span>{t.checkoutEmail}</span>
        <div>
          <Mail size={16} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </div>
      </label>

      <label className="cadu-account-field">
        <span>{t.authPassword}</span>
        <div>
          <Lock size={16} />
          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'signup' ? 6 : undefined}
          />
          <button
            type="button"
            className="cadu-account-eye"
            onClick={() => setMostrarSenha((value) => !value)}
            aria-label={mostrarSenha ? t.authHidePassword : t.authShowPassword}
          >
            {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      {mode === 'signup' ? (
        <div className="cadu-account-checks">
          <label>
            <input type="checkbox" checked={aceitaSms} onChange={(e) => setAceitaSms(e.target.checked)} />
            <span>{t.checkoutSmsUpdates}</span>
          </label>
          <label>
            <input type="checkbox" checked={aceitaEmail} onChange={(e) => setAceitaEmail(e.target.checked)} />
            <span>{t.checkoutEmailUpdates}</span>
          </label>
        </div>
      ) : null}

      {erro ? <p className="cadu-profile-error">{erro}</p> : null}

      <button type="submit" className="cadu-profile-btn cadu-profile-btn--primary" disabled={loading}>
        {loading ? (mode === 'login' ? t.authSigningIn : t.authCreating) : mode === 'login' ? t.login : t.authRegister}
      </button>

      <p className="cadu-account-switch">
        {mode === 'login' ? t.authNoAccount : t.authHasAccount}{' '}
        <button
          type="button"
          onClick={() => {
            setErro(null)
            onMode(mode === 'login' ? 'signup' : 'login')
          }}
        >
          {mode === 'login' ? t.authSignUpLink : t.authSignInLink}
        </button>
      </p>
    </form>
  )
}
