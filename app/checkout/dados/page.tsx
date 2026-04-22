'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'
import { ArrowLeft, Phone, User, Mail, LogOut, MapPin, Bike, Store, CheckCircle2 } from 'lucide-react'
import {
  isValidCheckoutCustomer,
  loadCheckoutCustomer,
  loadFulfillmentPreference,
  normalizePhone,
  saveCheckoutCustomer,
  type FulfillmentType,
  type CheckoutCustomer,
} from '@/lib/checkout-customer'
import { LogoLoadingScreen } from '@/components/logo-loading-screen'

export default function CheckoutDadosPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { t, lang } = useLang()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('take_out')
  const [localidadesEntrega, setLocalidadesEntrega] = useState<Array<{ id: string; nome: string; taxaEntrega: number }>>([])
  const [localidadeEntregaId, setLocalidadeEntregaId] = useState('')
  const [localidadeEntregaNome, setLocalidadeEntregaNome] = useState('')
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [aceitaSms, setAceitaSms] = useState(false)
  const [aceitaEmail, setAceitaEmail] = useState(false)
  const [prefereSalvarCartao, setPrefereSalvarCartao] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [deliveryEditOpen, setDeliveryEditOpen] = useState(false)
  const [deliveryEditSnapshot, setDeliveryEditSnapshot] = useState<{
    localidadeEntregaId: string
    localidadeEntregaNome: string
    enderecoEntrega: string
  } | null>(null)

  const loadSession = useCallback(async () => {
    setErro(null)
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const preferredFulfillment = loadFulfillmentPreference()
    const saved = loadCheckoutCustomer()

    if (!user) {
      setUserId(null)
      setAceitaEmail(false)
      setPrefereSalvarCartao(false)
      if (saved) {
        setNome(saved.nome)
        setEmail(saved.email)
        setTelefone(saved.telefone)
        setFulfillmentType(preferredFulfillment ?? saved.fulfillmentType)
        setLocalidadeEntregaId(saved.localidadeEntregaId)
        setLocalidadeEntregaNome(saved.localidadeEntregaNome)
        setEnderecoEntrega(saved.enderecoEntrega)
        setAceitaSms(saved.aceitaSmsAtualizacoes)
      } else {
        setAceitaSms(false)
        setFulfillmentType(preferredFulfillment ?? 'take_out')
        setLocalidadeEntregaId('')
        setLocalidadeEntregaNome('')
        setEnderecoEntrega('')
      }
      setLoading(false)
      return
    }

    setUserId(user.id)
    const emailVal = user.email ?? ''
    setEmail(emailVal)

    const meta = user.user_metadata as { nome_completo?: string; telefone?: string }
    const { data: perfil } = await supabase
      .from('cliente_perfis')
      .select(
        'nome_completo, telefone, aceita_sms_atualizacoes_pedido, aceita_email_atualizacoes_pedido, prefere_salvar_cartao_futuro, endereco_entrega, localidade_entrega_id, localidade_entrega_nome'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    const nomeVal = perfil?.nome_completo ?? meta.nome_completo ?? ''
    const telefoneVal = perfil?.telefone ?? meta.telefone ?? ''
    const aceitaSmsVal = !!perfil?.aceita_sms_atualizacoes_pedido
    const aceitaEmailVal = !!perfil?.aceita_email_atualizacoes_pedido
    const prefereVal = !!perfil?.prefere_salvar_cartao_futuro
    const enderecoEntregaVal = String(perfil?.endereco_entrega ?? '').trim()
    const localidadePerfilId = String(perfil?.localidade_entrega_id ?? '').trim()
    const localidadePerfilNome = String(perfil?.localidade_entrega_nome ?? '').trim()
    const fulfillmentVal: FulfillmentType =
      preferredFulfillment ?? (enderecoEntregaVal ? 'delivery' : 'take_out')

    setNome(nomeVal)
    setTelefone(telefoneVal)
    setAceitaSms(aceitaSmsVal)
    setAceitaEmail(aceitaEmailVal)
    setPrefereSalvarCartao(prefereVal)
    setLocalidadeEntregaId(localidadePerfilId || saved?.localidadeEntregaId || '')
    setLocalidadeEntregaNome(localidadePerfilNome || saved?.localidadeEntregaNome || '')
    setEnderecoEntrega(enderecoEntregaVal)
    setFulfillmentType(fulfillmentVal)

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    let active = true
    fetch('/api/checkout-config')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !active) return
        const rows = Array.isArray(data?.locations) ? data.locations : []
        const parsed = rows
          .map((row: unknown) => {
            const r = row as { id?: unknown; nome?: unknown; taxaEntrega?: unknown }
            const id = String(r.id ?? '')
            const nome = String(r.nome ?? '')
            const taxa = Number(r.taxaEntrega ?? 0)
            if (!id || !nome || !Number.isFinite(taxa) || taxa < 0) return null
            return { id, nome, taxaEntrega: Number(taxa.toFixed(2)) }
          })
          .filter((r: { id: string; nome: string; taxaEntrega: number } | null): r is { id: string; nome: string; taxaEntrega: number } => r != null)
        setLocalidadesEntrega(parsed)
      })
      .catch(() => {
        /* no-op */
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSair() {
    await supabase.auth.signOut()
    setUserId(null)
    setEmail('')
    setNome('')
    setTelefone('')
    setFulfillmentType('take_out')
    setLocalidadeEntregaId('')
    setLocalidadeEntregaNome('')
    setEnderecoEntrega('')
    setAceitaSms(false)
    setAceitaEmail(false)
    setPrefereSalvarCartao(false)
    setDeliveryEditOpen(false)
    setDeliveryEditSnapshot(null)
  }

  function openDeliveryEdit() {
    setDeliveryEditSnapshot({
      localidadeEntregaId,
      localidadeEntregaNome,
      enderecoEntrega,
    })
    setDeliveryEditOpen(true)
  }

  function cancelDeliveryEdit() {
    if (deliveryEditSnapshot) {
      setLocalidadeEntregaId(deliveryEditSnapshot.localidadeEntregaId)
      setLocalidadeEntregaNome(deliveryEditSnapshot.localidadeEntregaNome)
      setEnderecoEntrega(deliveryEditSnapshot.enderecoEntrega)
    }
    setDeliveryEditOpen(false)
    setDeliveryEditSnapshot(null)
  }

  async function handleContinuar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const n = nome.trim()
    const em = email.trim()
    const telRaw = telefone.trim()
    const telDigits = normalizePhone(telRaw)

    if (!userId) {
      if (n.length < 2) {
        setErro(t.checkoutErrNome)
        return
      }
      if (telDigits.length < 8) {
        setErro(t.checkoutErrPhone)
        return
      }
      if (!em.includes('@') || em.length < 5) {
        setErro(t.checkoutErrEmail)
        return
      }
    } else {
      if (n.length < 2 || telDigits.length < 8 || !em.includes('@') || em.length < 5) {
        setErro(
          lang === 'pt'
            ? 'Seu cadastro está incompleto. Atualize seus dados da conta para continuar.'
            : 'Your account profile is incomplete. Update your account data to continue.'
        )
        return
      }
    }
    if (fulfillmentType === 'delivery') {
      if (userId && (!localidadeEntregaId.trim() || enderecoEntrega.trim().length < 6)) {
        setErro(
          lang === 'pt'
            ? 'Selecione a localidade e informe o endereço de entrega (mín. 6 caracteres).'
            : 'Select a delivery location and enter the delivery address (at least 6 characters).'
        )
        return
      }
      if (!localidadeEntregaId.trim()) {
        setErro(
          lang === 'pt'
            ? 'Selecione a localidade/cidade para entrega.'
            : 'Select delivery city/location.'
        )
        return
      }
      if (enderecoEntrega.trim().length < 6) {
        setErro(t.checkoutErrAddress)
        return
      }
    }

    const localidadeSelecionada =
      fulfillmentType === 'delivery'
        ? localidadesEntrega.find((loc) => loc.id === localidadeEntregaId) ?? null
        : null

    const c: CheckoutCustomer = {
      nome: n,
      email: em,
      telefone: telRaw,
      userId,
      fulfillmentType,
      localidadeEntregaId: localidadeSelecionada?.id ?? '',
      localidadeEntregaNome: localidadeSelecionada?.nome ?? localidadeEntregaNome.trim(),
      enderecoEntrega: fulfillmentType === 'delivery' ? enderecoEntrega.trim() : '',
      aceitaSmsAtualizacoes: aceitaSms,
      aceitaEmailAtualizacoes: userId ? aceitaEmail : false,
      prefereSalvarCartao: userId ? prefereSalvarCartao : false,
    }

    if (!isValidCheckoutCustomer(c)) {
      setErro(t.checkoutErrNome)
      return
    }

    setSaving(true)

    if (userId) {
      const { error: upErr } = await supabase.from('cliente_perfis').upsert(
        {
          user_id: userId,
          nome_completo: c.nome,
          telefone: c.telefone,
          endereco_entrega: c.enderecoEntrega || null,
          localidade_entrega_id: c.localidadeEntregaId || null,
          localidade_entrega_nome: c.localidadeEntregaNome || null,
          aceita_sms_atualizacoes_pedido: aceitaSms,
          aceita_email_atualizacoes_pedido: aceitaEmail,
          prefere_salvar_cartao_futuro: prefereSalvarCartao,
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
    setDeliveryEditOpen(false)
    setDeliveryEditSnapshot(null)
    setSaving(false)
    router.push('/pagamento')
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1180px] bg-background md:px-6">
        <LogoLoadingScreen variant="fullscreen" message={t.checkoutLoading} />
      </main>
    )
  }

  const isGuest = !userId
  const selectedLocation =
    localidadeEntregaId.trim().length > 0
      ? localidadesEntrega.find((loc) => loc.id === localidadeEntregaId) ?? null
      : null

  const incompleteLoggedInDelivery =
    !!userId &&
    (!localidadeEntregaId.trim() ||
      enderecoEntrega.trim().length < 6 ||
      !selectedLocation)
  const showLoggedInDeliveryForm =
    !!userId && fulfillmentType === 'delivery' && (incompleteLoggedInDelivery || deliveryEditOpen)

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] bg-background pb-28 md:px-6 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md md:px-0">
        <div className="flex items-center gap-3">
          <Link
            href="/carrinho"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
            aria-label={t.checkoutBackAria}
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-base font-bold text-foreground">{t.checkoutTitle}</h1>
        </div>
      </header>

      <section className="space-y-4 px-4 pt-5 md:px-0">
        <div className="md:mx-auto md:max-w-[860px]">
        {userId ? (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">{t.checkoutConnected}</p>
            <button
              type="button"
              onClick={() => void handleSair()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <LogOut size={14} />
              {t.logout}
            </button>
          </div>
        ) : null}

        <form onSubmit={handleContinuar} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {isGuest ? t.checkoutGuestContactTitle : (lang === 'pt' ? 'Dados de contato' : 'Contact details')}
            </p>
            <span className="text-[11px] text-muted-foreground">
              {lang === 'pt' ? 'Etapa 1 de 2' : 'Step 1 of 2'}
            </span>
          </div>
          {isGuest ? (
            <>
              <div>
                <label htmlFor="nome" className="mb-1 block text-xs font-semibold">
                  {t.profileFullName}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    minLength={2}
                    autoComplete="name"
                    className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="telefone" className="mb-1 block text-xs font-semibold">
                  {t.profilePhone}
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    id="telefone"
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                    autoComplete="tel"
                    className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold">
                  {t.profileEmail}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{t.checkoutEmailHelp}</p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card px-3 py-3 text-sm">
              <p className="font-semibold text-foreground">{nome}</p>
              <p className="mt-0.5 text-muted-foreground">{telefone}</p>
              <p className="mt-0.5 text-muted-foreground">{email}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {lang === 'pt'
                  ? 'Se quiser alterar seus dados, atualize seu perfil depois do pedido.'
                  : 'To update personal data, edit your profile after checkout.'}
              </p>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-foreground">{t.checkoutFulfillmentTitle}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFulfillmentType('take_out')
                  setDeliveryEditOpen(false)
                  setDeliveryEditSnapshot(null)
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  fulfillmentType === 'take_out'
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-foreground'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Store size={13} />
                  {t.checkoutTakeOut}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFulfillmentType('delivery')
                  setDeliveryEditOpen(false)
                  setDeliveryEditSnapshot(null)
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  fulfillmentType === 'delivery'
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-foreground'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Bike size={13} />
                  {t.checkoutDelivery}
                </span>
              </button>
            </div>
            {fulfillmentType === 'delivery' ? (
              <div className="space-y-3">
                {isGuest || showLoggedInDeliveryForm ? (
                  <>
                    <div>
                      <label htmlFor="localidade-entrega" className="mb-1 block text-xs font-semibold">
                        {t.checkoutDeliveryLocationLabel}
                      </label>
                      <select
                        id="localidade-entrega"
                        value={localidadeEntregaId}
                        onChange={(e) => {
                          const id = e.target.value
                          setLocalidadeEntregaId(id)
                          const nome = localidadesEntrega.find((loc) => loc.id === id)?.nome ?? ''
                          setLocalidadeEntregaNome(nome)
                        }}
                        required
                        className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">
                          {lang === 'pt' ? 'Selecione a cidade/localidade' : 'Select city / location'}
                        </option>
                        {localidadesEntrega.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.nome} - ${loc.taxaEntrega.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="endereco-entrega" className="mb-1 block text-xs font-semibold">
                        {t.checkoutDeliveryAddressLabel}
                      </label>
                      <textarea
                        id="endereco-entrega"
                        value={enderecoEntrega}
                        onChange={(e) => setEnderecoEntrega(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="street-address"
                        rows={3}
                        className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder={t.checkoutDeliveryAddressPlaceholder}
                      />
                    </div>
                    {selectedLocation ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                          <CheckCircle2 size={12} className="shrink-0 text-primary" />
                          {lang === 'pt'
                            ? `Taxa de entrega: $${selectedLocation.taxaEntrega.toFixed(2)}`
                            : `Delivery fee: $${selectedLocation.taxaEntrega.toFixed(2)}`}
                        </p>
                        {!isGuest && deliveryEditOpen && deliveryEditSnapshot ? (
                          <button
                            type="button"
                            onClick={cancelDeliveryEdit}
                            className="shrink-0 rounded-xl border-2 border-primary bg-primary/10 px-4 py-2 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-primary/15 active:bg-primary/20"
                          >
                            {t.checkoutCancelDeliveryEdit}
                          </button>
                        ) : null}
                      </div>
                    ) : !isGuest && deliveryEditOpen && deliveryEditSnapshot ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={cancelDeliveryEdit}
                          className="rounded-xl border-2 border-primary bg-primary/10 px-4 py-2 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-primary/15 active:bg-primary/20"
                        >
                          {t.checkoutCancelDeliveryEdit}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          {selectedLocation?.nome || localidadeEntregaNome || '—'}
                        </p>
                        <p className="mt-1 text-muted-foreground">{enderecoEntrega || '—'}</p>
                      </div>
                      {localidadesEntrega.length > 0 ? (
                        <button
                          type="button"
                          onClick={openDeliveryEdit}
                          className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                        >
                          {t.checkoutEditDelivery}
                        </button>
                      ) : null}
                    </div>
                    {(!selectedLocation || !enderecoEntrega.trim()) ? (
                      <p className="mt-2 text-[11px] text-amber-700">
                        {lang === 'pt'
                          ? 'Preencha localidade e endereço padrão no cadastro para usar delivery.'
                          : 'Set default location and address in your profile to use delivery.'}
                      </p>
                    ) : null}
                  </div>
                )}
                {selectedLocation && !isGuest && !showLoggedInDeliveryForm ? (
                  <p className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                    <CheckCircle2 size={12} className="text-primary" />
                    {lang === 'pt'
                      ? `Taxa de entrega: $${selectedLocation.taxaEntrega.toFixed(2)}`
                      : `Delivery fee: $${selectedLocation.taxaEntrega.toFixed(2)}`}
                  </p>
                ) : null}
                {!selectedLocation && localidadesEntrega.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
                    {lang === 'pt'
                      ? 'Nenhuma localidade de entrega foi cadastrada no painel administrativo.'
                      : 'No delivery locations were configured in admin yet.'}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin size={12} />
                {t.checkoutTakeOutHint}
              </p>
            )}
          </div>

          {isGuest ? (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground">{t.checkoutOrderPrefsTitle}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{t.checkoutPrefsAllOptional}</p>

              <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[11px] leading-snug text-muted-foreground">
                <input
                  type="checkbox"
                  checked={aceitaSms}
                  onChange={(e) => setAceitaSms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                />
                <span className="space-y-1.5 text-foreground">
                  <span className="block">{t.registerSmsConsentLine1}</span>
                  <span className="block text-muted-foreground">{t.registerSmsConsentLine2}</span>
                  <span className="block text-muted-foreground">{t.registerSmsConsentLine3}</span>
                </span>
              </label>
            </div>
          ) : null}

          {erro && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
              {erro}
            </p>
          )}

          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+66px)] z-20 rounded-2xl border border-border/80 bg-background/95 p-2 backdrop-blur-sm md:static md:border-0 md:bg-transparent md:p-0">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
            >
              {saving ? t.checkoutSaving : t.checkoutContinue}
            </button>
          </div>
        </form>
        </div>
      </section>
    </main>
  )
}
