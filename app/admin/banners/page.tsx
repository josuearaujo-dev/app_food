'use client'

import { StoreImage } from '@/components/storefront/store-image'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, ArrowUp, ArrowDown, ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AdminLoadingState } from '@/components/layout/admin-loading-state'
import { AdminPageContent } from '@/components/layout/admin-app-shell'
import { useLang } from '@/lib/lang-context'

const CARDAPIO_BUCKET = 'cardapio-imagens'

type Banner = {
  id: string
  titulo: string
  descricao: string | null
  descricao_en: string | null
  imagem_url: string
  imagem_url_en: string | null
  ordem: number
  ativo: boolean
  destino_tipo: 'produto' | 'combo' | 'url' | null
  destino_produto_id: string | null
  destino_combo_id: string | null
  destino_url: string | null
  preco: number | null
  preco_riscado: number | null
}

type MenuItem = { id: string; nome: string; preco: number }

function parseMoney(value: string): number | null {
  const raw = value.trim().replace(',', '.')
  if (!raw) return null
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Number(amount.toFixed(2))
}
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
  const { t } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputRefEn = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingEn, setUploadingEn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [reordering, setReordering] = useState(false)
  const reorderLock = useRef(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [orderMessage, setOrderMessage] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    descricao_en: '',
    imagem_url: '',
    imagem_url_en: '',
    ativo: true,
    destino_tipo: '' as '' | 'produto' | 'combo' | 'url',
    destino_produto_id: '',
    destino_combo_id: '',
    destino_url: '',
    preco: '',
    preco_riscado: '',
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
        supabase.from('itens_cardapio').select('id, nome, preco').eq('disponivel', true).order('nome'),
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

  async function reorderBanner(sourceId: string, targetId: string) {
    if (reorderLock.current || sourceId === targetId) return
    const from = banners.findIndex((banner) => banner.id === sourceId)
    const to = banners.findIndex((banner) => banner.id === targetId)
    if (from < 0 || to < 0) return
    const reordered = [...banners]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    reorderLock.current = true
    setReordering(true)
    setError(null)
    setOrderMessage('Salvando ordem…')
    setBanners(reordered)
    try {
      for (const [index, banner] of reordered.entries()) {
        const { data, error: updateError } = await supabase.from('banners_home')
          .update({ ordem: index + 1 }).eq('id', banner.id).select('id').single()
        if (updateError || !data) throw new Error(updateError?.message || 'Não foi possível salvar a ordem.')
      }
      const { data, error: readError } = await supabase.from('banners_home').select('*').order('ordem').order('criado_em', { ascending: false })
      if (readError) throw readError
      setBanners((data as Banner[]) ?? [])
      setOrderMessage('Ordem salva.')
    } catch (err) {
      await load()
      setError(err instanceof Error ? err.message : 'Falha ao salvar a ordem. Confira a lista e tente novamente.')
      setOrderMessage('Não foi possível concluir a reorganização.')
    } finally {
      reorderLock.current = false
      setReordering(false)
      setDraggedId(null)
      setDropId(null)
    }
  }

  function openNew() {
    setEditing(null)
    setForm({
      titulo: '',
      descricao: '',
      descricao_en: '',
      imagem_url: '',
      imagem_url_en: '',
        ativo: true,
      destino_tipo: '',
      destino_produto_id: '',
      destino_combo_id: '',
      destino_url: '',
      preco: '',
      preco_riscado: '',
    })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(b: Banner) {
    setEditing(b)
    setForm({
      titulo: b.titulo,
      descricao: b.descricao ?? '',
      descricao_en: b.descricao_en ?? '',
      imagem_url: b.imagem_url,
      imagem_url_en: b.imagem_url_en ?? '',
      ativo: b.ativo,
      destino_tipo: b.destino_tipo ?? '',
      destino_produto_id: b.destino_produto_id ?? '',
      destino_combo_id: b.destino_combo_id ?? '',
      destino_url: b.destino_url ?? '',
      preco: b.preco != null ? Number(b.preco).toFixed(2) : '',
      preco_riscado: b.preco_riscado != null ? Number(b.preco_riscado).toFixed(2) : '',
    })
    setError(null)
    setModalOpen(true)
  }

  function validate() {
    if (!form.titulo.trim()) return 'Informe o título do banner.'
    if (!form.imagem_url.trim()) return 'Envie a imagem do banner.'
    if (form.destino_tipo === 'produto' && !form.destino_produto_id) return 'Selecione um produto.'
    const sale = parseMoney(form.preco)
    const struck = parseMoney(form.preco_riscado)
    if (form.preco.trim() && sale === null) return 'Informe um preço válido. Ex.: 2.50'
    if (form.preco_riscado.trim() && struck === null) return 'Informe um preço riscado maior que zero. Ex.: 3.50'
    const current = sale ?? (form.destino_tipo === 'produto' ? Number(items.find((item) => item.id === form.destino_produto_id)?.preco) : null)
    if (struck !== null && current != null && Number.isFinite(current) && struck <= current) {
      return `O preço riscado precisa ser maior que o preço exibido ($${current.toFixed(2)}).`
    }
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
      descricao: form.descricao.trim() || null,
      descricao_en: form.descricao_en.trim() || null,
      imagem_url: form.imagem_url.trim(),
      imagem_url_en: form.imagem_url_en.trim() || null,
      ...(editing ? {} : { ordem: Math.max(0, ...banners.map((banner) => banner.ordem ?? 0)) + 1 }),
      ativo: form.ativo,
      destino_tipo: form.destino_tipo || null,
      destino_produto_id: form.destino_tipo === 'produto' ? form.destino_produto_id : null,
      destino_combo_id: form.destino_tipo === 'combo' ? form.destino_combo_id : null,
      destino_url: form.destino_tipo === 'url' ? form.destino_url.trim() : null,
      preco: parseMoney(form.preco),
      preco_riscado: parseMoney(form.preco_riscado),
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
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Use uma imagem JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 8 MB.')
      return
    }
    if (kind === 'pt') setUploading(true)
    else setUploadingEn(true)
    setError(null)
    try {
      const previewUrl = URL.createObjectURL(file)
      try {
        const preview = new window.Image()
        preview.src = previewUrl
        await preview.decode()
      } catch {
        throw new Error('Não foi possível abrir esta imagem. Exporte o arquivo novamente em JPG ou PNG.')
      } finally {
        URL.revokeObjectURL(previewUrl)
      }
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
    return <AdminLoadingState message={t.loadingAdmin} />
  }

  return (
    <AdminPageContent title={t.adminNavBanners} eyebrow={t.adminPanel} width="wide">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          disabled={reordering} onClick={openNew}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={15} className="mr-1 inline" />
          Novo banner
        </button>
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            Nenhum banner cadastrado.
          </div>
        ) : (
          <div>
          <p className="mb-3 text-sm text-muted-foreground">Arraste pela alça para reorganizar os banners ou use as setas. A ordem é salva automaticamente.</p>
          <p className="sr-only" role="status">{orderMessage}</p>
          <ul className="space-y-3" aria-busy={reordering}>
            {banners.map((b, index) => (
              <li key={b.id}
                onDragOver={(event) => { if (draggedId && !reordering) { event.preventDefault(); setDropId(b.id) } }}
                onDrop={(event) => { event.preventDefault(); if (draggedId) void reorderBanner(draggedId, b.id); setDraggedId(null); setDropId(null) }}
                className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${dropId === b.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'} ${draggedId === b.id ? 'opacity-50' : ''}`}>
                <button type="button" draggable={!reordering && banners.length > 1} disabled={reordering || banners.length < 2}
                  aria-label={`Arrastar ${b.titulo}`} title="Arraste para reorganizar"
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', b.id); event.dataTransfer.effectAllowed = 'move'; setDraggedId(b.id) }}
                  onDragEnd={() => { setDraggedId(null); setDropId(null) }}
                  className="cursor-grab rounded-lg p-2 text-muted-foreground active:cursor-grabbing disabled:opacity-40"><GripVertical size={20} /></button>
                <div className="flex flex-col">
                  <button type="button" aria-label={`Mover ${b.titulo} para cima`} disabled={reordering || index === 0} onClick={() => void reorderBanner(b.id, banners[index - 1].id)} className="p-1 disabled:opacity-25"><ArrowUp size={16} /></button>
                  <button type="button" aria-label={`Mover ${b.titulo} para baixo`} disabled={reordering || index === banners.length - 1} onClick={() => void reorderBanner(b.id, banners[index + 1].id)} className="p-1 disabled:opacity-25"><ArrowDown size={16} /></button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <StoreImage src={b.imagem_url} alt="" className="h-14 w-24 rounded-lg object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.ativo ? 'Ativo' : 'Inativo'} · Destino: {b.destino_tipo ?? 'nenhum'}
                    {b.preco != null ? ` · $${Number(b.preco).toFixed(2)}` : ''}
                    {b.preco_riscado != null ? ` · Riscado: $${Number(b.preco_riscado).toFixed(2)}` : ''}
                  </p>
                </div>
                <button type="button" disabled={reordering} onClick={() => openEdit(b)} className="rounded-lg border border-border px-2 py-1 text-xs">
                  <Pencil size={14} />
                </button>
                <button type="button" disabled={reordering} onClick={() => void removeBanner(b)} className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          </div>
        )}

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
                <label className="mb-1 block text-xs font-semibold">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  placeholder="Texto que aparece no cartão da oferta"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Se ficar vazio e o destino for um produto ou combo, o banner usa a descrição desse cadastro.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Descrição em inglês</label>
                <textarea
                  value={form.descricao_en}
                  onChange={(e) => setForm((f) => ({ ...f, descricao_en: e.target.value }))}
                  rows={3}
                  placeholder="Optional English text"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Opcional. Sem este texto, o site em inglês usa a descrição acima.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Preço</label>
                <input
                  value={form.preco}
                  onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                  inputMode="decimal"
                  placeholder="2.50"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Opcional. É o valor em verde no cartão. Se ficar vazio, o banner usa o preço do produto ou do combo.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Preço riscado</label>
                <input
                  value={form.preco_riscado}
                  onChange={(e) => setForm((f) => ({ ...f, preco_riscado: e.target.value }))}
                  inputMode="decimal"
                  placeholder="3.50"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Opcional. Aparece riscado ao lado do preço. Se ficar vazio e o destino for um produto, usa o preço riscado do cadastro do produto.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Imagem do banner</label>
                <p className="mb-3 text-xs text-muted-foreground">Recomendado: 1500 × 500 px. JPG, PNG, WebP ou GIF, até 8 MB. A imagem será exibida inteira.</p>
                {form.imagem_url ? (
                  <div className="relative h-36 overflow-hidden rounded-xl bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <StoreImage src={form.imagem_url} alt="" className="h-full w-full object-contain" />
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
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => void onPickFile('pt', e)} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Imagem do banner (inglês, opcional)</label>
                {form.imagem_url_en ? (
                  <div className="relative h-36 overflow-hidden rounded-xl bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <StoreImage src={form.imagem_url_en} alt="" className="h-full w-full object-contain" />
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
                <input ref={inputRefEn} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => void onPickFile('en', e)} />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
                Banner ativo
              </label>

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
    </AdminPageContent>
  )
}

