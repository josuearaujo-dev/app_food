'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogoLoadingScreen } from '@/components/logo-loading-screen'

const CARDAPIO_BUCKET = 'cardapio-imagens'

type Banner = {
  id: string
  titulo: string
  imagem_url: string
  imagem_url_en: string | null
  ordem: number
  ativo: boolean
  destino_tipo: 'produto' | 'combo' | 'url' | null
  destino_produto_id: string | null
  destino_combo_id: string | null
  destino_url: string | null
}

type MenuItem = { id: string; nome: string }
type Combo = { id: string; nome: string }

function pathFromPublicStorageUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${CARDAPIO_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const raw = url.slice(idx + marker.length).split('?')[0]
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export default function AdminBannersPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputRefEn = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingEn, setUploadingEn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState({
    titulo: '',
    imagem_url: '',
    imagem_url_en: '',
    ordem: '0',
    ativo: true,
    destino_tipo: '' as '' | 'produto' | 'combo' | 'url',
    destino_produto_id: '',
    destino_combo_id: '',
    destino_url: '',
  })

  const destinoPreview = useMemo(() => {
    if (form.destino_tipo === 'produto' && form.destino_produto_id) return `/produto/${form.destino_produto_id}`
    if (form.destino_tipo === 'combo' && form.destino_combo_id) return `/#combo-${form.destino_combo_id}`
    if (form.destino_tipo === 'url' && form.destino_url.trim()) return form.destino_url.trim()
    return 'Sem link'
  }, [form])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [{ data: rows, error: e1 }, { data: menuRows, error: e2 }, { data: comboRows, error: e3 }] =
      await Promise.all([
        supabase.from('banners_home').select('*').order('ordem').order('criado_em', { ascending: false }),
        supabase.from('itens_cardapio').select('id, nome').eq('disponivel', true).order('nome'),
        supabase.from('combos').select('id, nome').eq('ativo', true).order('nome'),
      ])
    if (e1 || e2 || e3) setError(e1?.message || e2?.message || e3?.message || 'Erro ao carregar banners.')
    setBanners((rows as Banner[]) ?? [])
    setItems((menuRows as MenuItem[]) ?? [])
    setCombos((comboRows as Combo[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({
      titulo: '',
      imagem_url: '',
      imagem_url_en: '',
      ordem: '0',
      ativo: true,
      destino_tipo: '',
      destino_produto_id: '',
      destino_combo_id: '',
      destino_url: '',
    })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(b: Banner) {
    setEditing(b)
    setForm({
      titulo: b.titulo,
      imagem_url: b.imagem_url,
      imagem_url_en: b.imagem_url_en ?? '',
      ordem: String(b.ordem ?? 0),
      ativo: b.ativo,
      destino_tipo: b.destino_tipo ?? '',
      destino_produto_id: b.destino_produto_id ?? '',
      destino_combo_id: b.destino_combo_id ?? '',
      destino_url: b.destino_url ?? '',
    })
    setError(null)
    setModalOpen(true)
  }

  function validate() {
    if (!form.titulo.trim()) return 'Informe o título do banner.'
    if (!form.imagem_url.trim()) return 'Envie a imagem do banner.'
    if (form.destino_tipo === 'produto' && !form.destino_produto_id) return 'Selecione um produto.'
    if (form.destino_tipo === 'combo' && !form.destino_combo_id) return 'Selecione um combo.'
    if (form.destino_tipo === 'url' && !form.destino_url.trim()) return 'Informe a URL de destino.'
    return null
  }

  async function save() {
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      titulo: form.titulo.trim(),
      imagem_url: form.imagem_url.trim(),
      imagem_url_en: form.imagem_url_en.trim() || null,
      ordem: Math.max(0, Math.floor(Number(form.ordem)) || 0),
      ativo: form.ativo,
      destino_tipo: form.destino_tipo || null,
      destino_produto_id: form.destino_tipo === 'produto' ? form.destino_produto_id : null,
      destino_combo_id: form.destino_tipo === 'combo' ? form.destino_combo_id : null,
      destino_url: form.destino_tipo === 'url' ? form.destino_url.trim() : null,
    }
    const { error: saveError } = editing
      ? await supabase.from('banners_home').update(payload).eq('id', editing.id)
      : await supabase.from('banners_home').insert(payload)
    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setModalOpen(false)
    await load()
  }

  async function removeBanner(b: Banner) {
    if (!confirm('Excluir este banner?')) return
    const path = pathFromPublicStorageUrl(b.imagem_url)
    if (path) {
      await supabase.storage.from(CARDAPIO_BUCKET).remove([path])
    }
    if (b.imagem_url_en) {
      const pathEn = pathFromPublicStorageUrl(b.imagem_url_en)
      if (pathEn) {
        await supabase.storage.from(CARDAPIO_BUCKET).remove([pathEn])
      }
    }
    const { error: delError } = await supabase.from('banners_home').delete().eq('id', b.id)
    if (delError) {
      setError(delError.message)
      return
    }
    await load()
  }

  async function onPickFile(kind: 'pt' | 'en', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido.')
      return
    }
    if (kind === 'pt') setUploading(true)
    else setUploadingEn(true)
    setError(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from(CARDAPIO_BUCKET).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from(CARDAPIO_BUCKET).getPublicUrl(fileName)
      if (kind === 'pt') {
        setForm((f) => ({ ...f, imagem_url: data.publicUrl }))
      } else {
        setForm((f) => ({ ...f, imagem_url_en: data.publicUrl }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload da imagem.')
    } finally {
      if (kind === 'pt') {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      } else {
        setUploadingEn(false)
        if (inputRefEn.current) inputRefEn.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <LogoLoadingScreen variant="fullscreen" message="Carregando banners..." />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F6F7FA]">
      <header className="sticky top-0 z-40 border-b border-border bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary" aria-label="Voltar">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">Painel</p>
              <h1 className="text-lg font-bold text-foreground">Banners</h1>
            </div>
          </div>
          <button type="button" onClick={openNew} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus size={15} className="mr-1 inline" />
            Novo banner
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            Nenhum banner cadastrado.
          </div>
        ) : (
          <ul className="space-y-3">
            {banners.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imagem_url} alt="" className="h-14 w-24 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    Ordem {b.ordem} · {b.ativo ? 'Ativo' : 'Inativo'} · Destino: {b.destino_tipo ?? 'nenhum'}
                  </p>
                </div>
                <button type="button" onClick={() => openEdit(b)} className="rounded-lg border border-border px-2 py-1 text-xs">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => void removeBanner(b)} className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <h2 className="text-base font-bold">{editing ? 'Editar banner' : 'Novo banner'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Título</label>
                <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Imagem do banner</label>
                {form.imagem_url ? (
                  <div className="relative h-36 overflow-hidden rounded-xl bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imagem_url} alt="" className="h-full w-full object-cover" />
                    <div className="absolute right-2 top-2 flex gap-2">
                      <button type="button" onClick={() => inputRef.current?.click()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      </button>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, imagem_url: '' }))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => inputRef.current?.click()} className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary">
                    <ImageIcon size={20} className="text-muted-foreground" />
                    <span className="text-sm">Enviar imagem</span>
                  </button>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPickFile('pt', e)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Imagem do banner (inglês, opcional)</label>
                {form.imagem_url_en ? (
                  <div className="relative h-36 overflow-hidden rounded-xl bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imagem_url_en} alt="" className="h-full w-full object-cover" />
                    <div className="absolute right-2 top-2 flex gap-2">
                      <button type="button" onClick={() => inputRefEn.current?.click()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90">
                        {uploadingEn ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      </button>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, imagem_url_en: '' }))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => inputRefEn.current?.click()} className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary">
                    <ImageIcon size={20} className="text-muted-foreground" />
                    <span className="text-sm">Enviar imagem em inglês</span>
                  </button>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Se não enviar, o sistema usa a imagem principal também no inglês.
                </p>
                <input ref={inputRefEn} type="file" accept="image/*" className="hidden" onChange={(e) => void onPickFile('en', e)} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Ordem</label>
                  <input type="number" min={0} value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
                  Banner ativo
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Tipo de destino</label>
                <select
                  value={form.destino_tipo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      destino_tipo: e.target.value as '' | 'produto' | 'combo' | 'url',
                      destino_produto_id: '',
                      destino_combo_id: '',
                      destino_url: '',
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Sem link</option>
                  <option value="produto">Produto</option>
                  <option value="combo">Combo</option>
                  <option value="url">URL externa</option>
                </select>
              </div>

              {form.destino_tipo === 'produto' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold">Produto</label>
                  <select value={form.destino_produto_id} onChange={(e) => setForm((f) => ({ ...f, destino_produto_id: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                    <option value="">Selecione</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>{it.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.destino_tipo === 'combo' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold">Combo</label>
                  <select value={form.destino_combo_id} onChange={(e) => setForm((f) => ({ ...f, destino_combo_id: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                    <option value="">Selecione</option>
                    {combos.map((co) => (
                      <option key={co.id} value={co.id}>{co.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.destino_tipo === 'url' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold">URL</label>
                  <input value={form.destino_url} onChange={(e) => setForm((f) => ({ ...f, destino_url: e.target.value }))} placeholder="https://..." className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                </div>
              )}

              <p className="text-xs text-muted-foreground">Destino atual: {destinoPreview}</p>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold">
                  Cancelar
                </button>
                <button type="button" disabled={saving} onClick={() => void save()} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {saving ? 'Salvando...' : 'Salvar banner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

