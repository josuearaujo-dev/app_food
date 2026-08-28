'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail, ChefHat } from 'lucide-react'
import { AdminShell } from '@/components/layout/admin-shell'
import { useLang } from '@/lib/lang-context'

export default function AdminLoginPage() {
  const router = useRouter()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro(t.authInvalidCredentials)
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role as string | undefined
    if (role === 'customer') {
      await supabase.auth.signOut()
      setErro(t.authCustomerAccount)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <AdminShell centered tone="default">
      <div className="mb-10 flex w-full flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-accent/30">
          <ChefHat size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.adminLoginTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.adminLoginSubtitle}</p>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">
            {t.authEmail}
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@restaurante.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl bg-secondary py-3.5 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        <div>
          <label htmlFor="senha" className="mb-1.5 block text-sm font-semibold text-foreground">
            {t.authPassword}
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full rounded-2xl bg-secondary py-3.5 pl-10 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/40"
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

        {erro ? (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500" role="alert">
            {erro}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-opacity active:opacity-90 disabled:opacity-60"
        >
          {loading ? t.authSigningIn : t.authSignIn}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground">{t.adminLoginExclusive}</p>
    </AdminShell>
  )
}
