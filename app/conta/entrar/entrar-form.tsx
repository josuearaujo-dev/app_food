'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontShell } from '@/components/layout/storefront-shell'

export function EntrarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/checkout/dados'
  const { t } = useLang()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
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

    const safeNext = nextPath.startsWith('/') ? nextPath : '/checkout/dados'
    router.push(safeNext)
    router.refresh()
    setLoading(false)
  }

  return (
    <StorefrontShell
      fullHeight
      bottomPadding="none"
      header={
        <StorefrontHeader title={t.login} backHref="/checkout/dados" backLabel={t.back} />
      }
      contentClassName="px-4 pt-6 pb-10"
    >
      <form onSubmit={handleEntrar} className="space-y-4">
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
              autoComplete="current-password"
              required
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

        {erro && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {loading ? t.authSigningIn : t.login}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.authNoAccount}{' '}
        <Link
          href={`/conta/cadastro?next=${encodeURIComponent(nextPath)}`}
          className="font-semibold text-accent"
        >
          {t.authSignUpLink}
        </Link>
      </p>
    </StorefrontShell>
  )
}
