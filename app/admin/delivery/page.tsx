'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'
import { LogoLoadingScreen } from '@/components/logo-loading-screen'
import { cn } from '@/lib/utils'

type DeliveryLocationRow = {
  id: string
  nome: string
  taxa_entrega: number
  ativo: boolean
  ordem: number
}

export default function AdminDeliveryPage() {
  const supabase = createClient()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<DeliveryLocationRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [taxa, setTaxa] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErro(null)
    const { data, error } = await supabase
      .from('localidades_entrega')
      .select('id, nome, taxa_entrega, ativo, ordem')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })
    if (error) setErro(error.message)
    else setLocations((data as DeliveryLocationRow[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd() {
    const nomeTrim = nome.trim()
    const fee = Number(taxa)
    if (!nomeTrim) {
      setErro('Informe o nome da localidade.')
      return
    }
    if (!Number.isFinite(fee) || fee < 0) {
      setErro('Informe uma taxa válida (>= 0).')
      return
    }
    setSaving(true)
    setErro(null)
    const maxOrder = locations.length > 0 ? Math.max(...locations.map((loc) => Number(loc.ordem ?? 0))) : 0
    const { error } = await supabase.from('localidades_entrega').insert({
      nome: nomeTrim,
      taxa_entrega: Number(fee.toFixed(2)),
      ativo: true,
      ordem: maxOrder + 1,
    })
    if (error) {
      setErro(error.message)
      setSaving(false)
      return
    }
    setNome('')
    setTaxa('')
    setSaving(false)
    await load()
  }

  async function handleToggleActive(loc: DeliveryLocationRow) {
    setErro(null)
    const { error } = await supabase
      .from('localidades_entrega')
      .update({ ativo: !loc.ativo })
      .eq('id', loc.id)
    if (error) {
      setErro(error.message)
      return
    }
    await load()
  }

  async function handleDelete(loc: DeliveryLocationRow) {
    if (!confirm(`Remover localidade "${loc.nome}"?`)) return
    setErro(null)
    const { error } = await supabase.from('localidades_entrega').delete().eq('id', loc.id)
    if (error) {
      setErro(error.message)
      return
    }
    await load()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <LogoLoadingScreen variant="fullscreen" message={t.loadingAdmin} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F6F7FA]">
      <header className="sticky top-0 z-40 border-b border-border bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-secondary/80"
              aria-label="Voltar ao admin"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">{t.adminPanel}</p>
              <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <MapPin size={20} className="text-primary" />
                Gerenciar entregas
              </h1>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Taxas de entrega por localidade</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre a localidade (cidade/bairro) e a taxa usada no checkout.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold">Localidade</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ex.: Centro, Cidade A"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Taxa</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Adicionar
            </button>
          </div>
        </div>

        {erro ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
        ) : null}

        <div className="mt-4 space-y-2">
          {locations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma localidade cadastrada.
            </div>
          ) : (
            locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{loc.nome}</p>
                  <p className="text-xs text-muted-foreground">${Number(loc.taxa_entrega ?? 0).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(loc)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-semibold',
                      loc.ativo ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {loc.ativo ? 'Ativa' : 'Inativa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(loc)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
