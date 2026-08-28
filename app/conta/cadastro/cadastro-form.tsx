'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontShell } from '@/components/layout/storefront-shell'

export function CadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/checkout/dados'
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
  const [info, setInfo] = useState<string | null>(null)

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    setInfo(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          role: 'customer',
          nome_completo: nome.trim(),
          telefone: telefone.trim(),
        },
      },
    })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    const user = data.user
    if (user) {
      const { error: perfilErr } = await supabase.from('cliente_perfis').upsert(
        {
          user_id: user.id,
          nome_completo: nome.trim(),
          telefone: telefone.trim(),
        },
        { onConflict: 'user_id' }
      )
      if (perfilErr) {
        setErro(perfilErr.message)
        setLoading(false)
        return
      }
    }

    if (data.session) {
      router.push(nextPath.startsWith('/') ? nextPath : '/checkout/dados')
      router.refresh()
    } else {
      setInfo(t.authAccountCreated)
    }
    setLoading(false)
  }

  return (
    <StorefrontShell
      fullHeight
      bottomPadding="none"
      header={<StorefrontHeader title={t.signup} backHref="/" backLabel={t.back} />}
      contentClassName="px-4 pt-6 pb-10"
    >
      <p className="mb-6 text-sm text-muted-foreground">{t.authSignupHint}</p>

      <form onSubmit={handleCadastro} className="space-y-4">
        <div>
          <label htmlFor="nome" className="mb-1 block text-xs font-semibold text-foreground">
            {t.authFullName}
          </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefone" className="mb-1 block text-xs font-semibold text-foreground">
              {t.authPhone}
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                autoComplete="tel"
                required
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-foreground">
              {t.checkoutEmail}
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-xs font-semibold text-foreground">
              {t.authPassword}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-12 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={mostrarSenha ? t.authHidePassword : t.authShowPassword}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-foreground">{t.checkoutCommunication}</p>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={aceitaSms}
                onChange={(e) => setAceitaSms(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>{t.checkoutSmsUpdates}</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={aceitaEmail}
                onChange={(e) => setAceitaEmail(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>{t.checkoutEmailUpdates}</span>
            </label>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl" role="alert">
              {erro}
            </p>
          )}
          {info && (
            <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? t.authCreating : t.authRegister}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.authHasAccount}{' '}
        <Link href={`/conta/entrar?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-accent">
          {t.authSignInLink}
        </Link>
      </p>
    </StorefrontShell>
  )
}
