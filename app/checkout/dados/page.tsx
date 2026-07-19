'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Phone, User, Mail, LogOut } from 'lucide-react'
import {
  isValidCheckoutCustomer,
  loadCheckoutCustomer,
  saveCheckoutCustomer,
  type CheckoutCustomer,
} from '@/lib/checkout-customer'

export default function CheckoutDadosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [aceitaSms, setAceitaSms] = useState(false)
  const [aceitaEmail, setAceitaEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const loadSession = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUserId(null)
      const saved = loadCheckoutCustomer()
      if (saved) {
        setNome(saved.nome)
        setEmail(saved.email)
        setTelefone(saved.telefone)
        setAceitaSms(saved.aceitaSmsAtualizacoes)
        setAceitaEmail(saved.aceitaEmailAtualizacoes)
      }
      setLoading(false)
      return
    }

    setUserId(user.id)
    setEmail(user.email ?? '')

    const meta = user.user_metadata as { nome_completo?: string; telefone?: string }
    const { data: perfil } = await supabase
      .from('cliente_perfis')
      .select(
        'nome_completo, telefone, aceita_sms_atualizacoes_pedido, aceita_email_atualizacoes_pedido'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    setNome(perfil?.nome_completo ?? meta.nome_completo ?? '')
    setTelefone(perfil?.telefone ?? meta.telefone ?? '')
    setAceitaSms(!!perfil?.aceita_sms_atualizacoes_pedido)
    setAceitaEmail(!!perfil?.aceita_email_atualizacoes_pedido)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  async function handleSair() {
    await supabase.auth.signOut()
    setUserId(null)
    setEmail('')
    setNome('')
    setTelefone('')
    setAceitaSms(false)
    setAceitaEmail(false)
  }

  async function handleContinuar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const c: CheckoutCustomer = {
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      userId,
      aceitaSmsAtualizacoes: aceitaSms,
      aceitaEmailAtualizacoes: aceitaEmail,
      prefereSalvarCartao: false,
    }

    if (!isValidCheckoutCustomer(c)) {
      setErro('Preencha nome (2+ letras), e-mail válido e telefone (8+ dígitos).')
      return
    }

    setSaving(true)

    if (userId) {
      const { error: upErr } = await supabase.from('cliente_perfis').upsert(
        {
          user_id: userId,
          nome_completo: c.nome,
          telefone: c.telefone,
          aceita_sms_atualizacoes_pedido: aceitaSms,
          aceita_email_atualizacoes_pedido: aceitaEmail,
          // Cartão salvo fica para fase 2 (Clover stored credentials).
          prefere_salvar_cartao_futuro: false,
        },
        { onConflict: 'user_id' }
      )
      if (upErr) {
        setErro(upErr.message)
        setSaving(false)
        return
      }
    }

    saveCheckoutCustomer(c)
    setSaving(false)
    router.push('/pagamento')
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-background px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 px-4 pb-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link
            href="/carrinho"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-base font-bold text-foreground">Seus dados</h1>
        </div>
      </header>

      <section className="px-4 pt-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Precisamos dessas informações para o pedido. Se você criar uma conta, guardamos para a próxima vez.
        </p>

        {userId ? (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Conta conectada</p>
            <button
              type="button"
              onClick={handleSair}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3 text-sm">
            <p className="text-xs text-muted-foreground">Quer salvar seus dados para próximos pedidos?</p>
            <div className="flex gap-2">
              <Link
                href="/conta/cadastro?next=%2Fcheckout%2Fdados"
                className="flex-1 rounded-xl bg-primary py-2.5 text-center text-xs font-semibold text-primary-foreground"
              >
                Criar conta
              </Link>
              <Link
                href="/conta/entrar?next=%2Fcheckout%2Fdados"
                className="flex-1 rounded-xl border border-border py-2.5 text-center text-xs font-semibold"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleContinuar} className="space-y-3">
          <div>
            <label htmlFor="nome" className="text-xs font-semibold block mb-1">
              Nome completo
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                minLength={2}
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefone" className="text-xs font-semibold block mb-1">
              Telefone
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-xs font-semibold block mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!userId}
                className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-70"
              />
            </div>
            {userId && <p className="text-[10px] text-muted-foreground mt-1">E-mail vinculado à sua conta.</p>}
          </div>

          <div className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-foreground">Comunicação</p>
            <label className="flex gap-2.5 items-start text-[11px] text-muted-foreground cursor-pointer leading-snug">
              <input
                type="checkbox"
                checked={aceitaSms}
                onChange={(e) => setAceitaSms(e.target.checked)}
                className="mt-0.5 rounded border-border shrink-0"
              />
              <span>Receber SMS com atualizações do pedido.</span>
            </label>
            <label className="flex gap-2.5 items-start text-[11px] text-muted-foreground cursor-pointer leading-snug">
              <input
                type="checkbox"
                checked={aceitaEmail}
                onChange={(e) => setAceitaEmail(e.target.checked)}
                className="mt-0.5 rounded border-border shrink-0"
              />
              <span>Receber e-mails com atualizações do pedido.</span>
            </label>
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl" role="alert">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Continuar para pagamento'}
          </button>
        </form>
      </section>
    </main>
  )
}
