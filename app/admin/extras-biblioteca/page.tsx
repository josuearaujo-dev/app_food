'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import { AdminLoadingState } from '@/components/layout/admin-loading-state'
import { AdminPageContent } from '@/components/layout/admin-app-shell'

type OptionLine = {
  label: string
  priceDelta: number
  info: string
  ordem: number
}

type ExtraTemplate = {
  id: string
  nome: string
  minEscolhas: number | null
  maxEscolhas: number | null
  options: OptionLine[]
}

function normalizeOptionLines(lines: OptionLine[]) {
  return lines
    .map((line, index) => ({
      label: line.label.trim(),
      priceDelta: Number(line.priceDelta) || 0,
      info: line.info.trim(),
      ordem: index,
    }))
    .filter((line) => line.label.length > 0)
}

export default function AdminExtrasBibliotecaPage() {
  const supabase = createClient()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ExtraTemplate[]>([])
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<{
    id: string
    nome: string
    minEscolhas: number | null
    maxEscolhas: number | null
    options: OptionLine[]
  } | null>(null)
  const [saving, setSaving] = useState(false)

  function showToast(kind: 'success' | 'error', text: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ kind, text })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 5000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    let list: ExtraTemplate[] = []
    try {
      const { data: tplGroups, error: errG } = await supabase
        .from('extra_grupos_predefinidos')
        .select('id, nome, min_escolhas, max_escolhas')
        .eq('ativo', true)
        .order('nome')
      const { data: tplOptions, error: errO } = await supabase
        .from('extra_grupo_opcoes_predefinidas')
        .select('grupo_id, label, price_delta, detail_info, ordem')
        .eq('ativo', true)
        .order('ordem')

      if (!errG && !errO && tplGroups) {
        const byGroup = new Map<string, OptionLine[]>()
        ;(tplOptions ?? []).forEach((op) => {
          const line: OptionLine = {
            label: String(op.label ?? ''),
            priceDelta: Number(op.price_delta ?? 0),
            info: String(op.detail_info ?? ''),
            ordem: Number(op.ordem ?? 0),
          }
          byGroup.set(op.grupo_id, [...(byGroup.get(op.grupo_id) ?? []), line])
        })
        list = tplGroups.map((g) => ({
          id: g.id,
          nome: g.nome,
          minEscolhas: g.min_escolhas == null ? null : Number(g.min_escolhas),
          maxEscolhas: g.max_escolhas == null ? null : Number(g.max_escolhas),
          options: byGroup.get(g.id) ?? [],
        }))
      }
    } catch {
      list = []
    }
    setTemplates(list)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function openEdit(tpl: ExtraTemplate) {
    setForm({
      id: tpl.id,
      nome: tpl.nome,
      minEscolhas: tpl.minEscolhas,
      maxEscolhas: tpl.maxEscolhas,
      options: tpl.options.map((o, idx) => ({
        label: o.label,
        priceDelta: o.priceDelta,
        info: o.info,
        ordem: idx,
      })),
    })
    setModalOpen(true)
  }

  function addOptionLine() {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        options: [
          ...prev.options,
          { label: '', priceDelta: 0, info: '', ordem: prev.options.length },
        ],
      }
    })
  }

  function updateOptionLine(index: number, patch: Partial<OptionLine>) {
    setForm((prev) => {
      if (!prev) return prev
      const options = prev.options.map((line, i) => (i === index ? { ...line, ...patch } : line))
      return { ...prev, options }
    })
  }

  function removeOptionLine(index: number) {
    setForm((prev) => {
      if (!prev) return prev
      return { ...prev, options: prev.options.filter((_, i) => i !== index) }
    })
  }

  async function salvar() {
    if (!form) return
    const nome = form.nome.trim()
    const lines = normalizeOptionLines(form.options)
    if (!nome || lines.length === 0) {
      showToast(
        'error',
        'Preencha o nome do grupo e pelo menos uma opção com nome antes de salvar.'
      )
      return
    }

    let min =
      form.minEscolhas == null ? null : Math.max(0, Math.floor(Number(form.minEscolhas)))
    let max =
      form.maxEscolhas == null ? null : Math.max(0, Math.floor(Number(form.maxEscolhas)))
    if (min !== null && Number.isNaN(min)) min = null
    if (max !== null && Number.isNaN(max)) max = null
    if (min !== null && max !== null && max < min) max = min

    setSaving(true)
    try {
      const { error: upErr } = await supabase
        .from('extra_grupos_predefinidos')
        .update({
          nome,
          min_escolhas: min,
          max_escolhas: max,
        })
        .eq('id', form.id)

      if (upErr) {
        showToast('error', upErr.message)
        return
      }

      await supabase.from('extra_grupo_opcoes_predefinidas').delete().eq('grupo_id', form.id)
      const { error: insErr } = await supabase.from('extra_grupo_opcoes_predefinidas').insert(
        lines.map((line) => ({
          grupo_id: form.id,
          label: line.label,
          price_delta: line.priceDelta,
          detail_info: line.info || null,
          ordem: line.ordem,
          ativo: true,
        }))
      )

      if (insErr) {
        showToast('error', insErr.message)
        return
      }

      await load()
      setModalOpen(false)
      setForm(null)
      showToast('success', `Grupo “${nome}” da biblioteca foi atualizado.`)
    } finally {
      setSaving(false)
    }
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir o grupo “${nome}” da biblioteca de pré-cadastro? Esta ação não pode ser desfeita.`)) {
      return
    }
    const { error } = await supabase.from('extra_grupos_predefinidos').delete().eq('id', id)
    if (error) {
      showToast('error', error.message)
      return
    }
    if (form?.id === id) {
      setModalOpen(false)
      setForm(null)
    }
    await load()
    showToast('success', `Grupo “${nome}” removido da biblioteca.`)
  }

  if (loading) {
    return <AdminLoadingState message="Carregando biblioteca de extras..." />
  }

  return (
    <AdminPageContent title={t.adminHubExtras} eyebrow={t.adminPanel} width="wide">
      <p className="mb-4 text-xs text-muted-foreground">
        Edite ou exclua grupos de pré-cadastro. Excluir não remove grupos já importados nos produtos.
      </p>
        {toast && (
          <p
            className={cn(
              'mb-4 rounded-lg px-3 py-2 text-sm font-medium',
              toast.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
            )}
            role="status"
          >
            {toast.text}
          </p>
        )}

        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            Nenhum grupo na biblioteca ainda. Salve um grupo como pré-cadastrado a partir do cadastro de um produto.
          </div>
        ) : (
          <ul className="space-y-3">
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-3"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{tpl.nome}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(tpl)}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluir(tpl.id, tpl.nome)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

      {modalOpen && form && (
        <Modal
          titulo="Editar grupo da biblioteca"
          titleId="library-extra-modal-title"
          labelSave={t.save}
          labelSaving={t.saving}
          onFechar={() => {
            setModalOpen(false)
            setForm(null)
          }}
          onSalvar={() => {
            salvar().catch(() => {
              showToast('error', 'Erro inesperado ao salvar a biblioteca.')
            })
          }}
          salvando={saving}
        >
          <CampoTexto
            label="Nome do grupo"
            value={form.nome}
            onChange={(v) => setForm((p) => (p ? { ...p, nome: v } : p))}
            placeholder="Ex: Cobertura, Sabor"
          />
          <div className="grid grid-cols-2 gap-2">
            <CampoTexto
              label="Mín. escolhas"
              value={form.minEscolhas == null ? '' : String(form.minEscolhas)}
              onChange={(v) => {
                const trimmed = v.trim()
                setForm((p) => {
                  if (!p) return p
                  if (trimmed === '') return { ...p, minEscolhas: null }
                  const n = parseInt(trimmed, 10)
                  return { ...p, minEscolhas: Number.isNaN(n) ? null : Math.max(0, n) }
                })
              }}
              inputMode="numeric"
              placeholder="vazio = sem mínimo"
            />
            <CampoTexto
              label="Máx. escolhas"
              value={form.maxEscolhas == null ? '' : String(form.maxEscolhas)}
              onChange={(v) => {
                const trimmed = v.trim()
                setForm((p) => {
                  if (!p) return p
                  if (trimmed === '') return { ...p, maxEscolhas: null }
                  const n = parseInt(trimmed, 10)
                  return { ...p, maxEscolhas: Number.isNaN(n) ? null : Math.max(0, n) }
                })
              }}
              inputMode="numeric"
              placeholder="vazio = sem máximo"
            />
          </div>
          <OptionEditor
            title="Opções do grupo"
            options={form.options}
            onAdd={addOptionLine}
            onUpdate={(index, patch) => updateOptionLine(index, patch)}
            onRemove={(index) => removeOptionLine(index)}
          />
        </Modal>
      )}
    </AdminPageContent>
  )
}

function Modal({
  titulo,
  children,
  onFechar,
  onSalvar,
  salvando,
  labelSave,
  labelSaving,
  titleId = 'admin-modal-title',
}: {
  titulo: string
  children: ReactNode
  onFechar: () => void
  onSalvar: () => void
  salvando: boolean
  labelSave: string
  labelSaving: string
  titleId?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden bg-background md:max-h-[min(90vh,920px)] md:max-w-2xl md:rounded-2xl md:border md:border-border md:shadow-2xl rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 pb-3 pt-5 md:px-6 md:pb-4 md:pt-5">
          <h2 id={titleId} className="text-base font-bold text-foreground md:text-lg">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-secondary/80"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {children}
        </div>
        <div className="sticky bottom-0 border-t border-border bg-background px-4 pb-6 pt-3 md:px-6 md:pb-5 md:pt-4">
          <button
            type="button"
            onClick={onSalvar}
            disabled={salvando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-60 md:py-3.5"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {salvando ? labelSaving : labelSave}
          </button>
        </div>
      </div>
    </div>
  )
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-xl bg-secondary px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30"
      />
    </div>
  )
}

function OptionEditor({
  title,
  options,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string
  options: { label: string; priceDelta: number; info: string; ordem: number }[]
  onAdd: () => void
  onUpdate: (index: number, patch: { label?: string; priceDelta?: number; info?: string }) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">{title}</label>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground"
        >
          + Adicionar
        </button>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma opcao cadastrada.</p>
      )}
      {options.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_88px_34px] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Nome</span>
          <span>Info</span>
          <span>Preço +</span>
          <span className="sr-only">Remover</span>
        </div>
      )}
      {options.map((opt, index) => (
        <div key={`${title}-${index}`} className="grid grid-cols-[1fr_1fr_88px_34px] items-center gap-2">
          <input
            type="text"
            value={opt.label}
            onChange={(e) => onUpdate(index, { label: e.target.value })}
            placeholder="Nome da opcao"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            type="text"
            value={opt.info}
            onChange={(e) => onUpdate(index, { info: e.target.value })}
            placeholder="Descricao, peso, etc."
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            type="number"
            step="0.01"
            value={String(opt.priceDelta)}
            onChange={(e) => onUpdate(index, { priceDelta: Number(e.target.value) || 0 })}
            placeholder="0.00"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="h-8 w-8 rounded-lg bg-red-50 text-sm font-bold text-red-500"
            aria-label="Remover opcao"
          >
            ×
          </button>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Em <strong className="text-foreground">Info</strong> use descricao, peso, complemento etc. Preco adicional pode
        ser negativo (desconto).
      </p>
    </div>
  )
}
