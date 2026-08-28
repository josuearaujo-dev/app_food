'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio, type SelectedOption } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { StorefrontFixedFooter } from '@/components/layout/storefront-fixed-footer'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontLoadingState } from '@/components/layout/storefront-loading-state'
import { StorefrontShell } from '@/components/layout/storefront-shell'

type OptionItem = {
  id: string
  label: string
  price_delta: number
  detail_info: string | null
}

type GroupItem = {
  id: string
  tipo: 'size' | 'quantity' | 'extra'
  nome: string
  min_escolhas: number | null
  max_escolhas: number | null
  ordem: number
  options: OptionItem[]
}

type ComboLine = {
  item_id: string
  quantidade: number
  ordem: number
  itens_cardapio: {
    id: string
    nome: string
    preco: number
    imagem_url: string | null
  } | null
}

type ComboData = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  imagem_url: string | null
  combo_itens: ComboLine[]
}

type SelectionState = {
  singleByGroup: Record<string, string>
  extrasByGroup: Record<string, string[]>
}

function clampMinMax(min: number | null, max: number | null) {
  const minEf = Math.max(0, Math.floor(min ?? 0))
  const rawMax = max == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(max))
  const maxEf = rawMax < minEf ? minEf : rawMax
  return { minEf, maxEf }
}

function formatComboSelectionError(template: string, item: string, group: string) {
  return template.replace('{item}', item).replace('{group}', group)
}

export default function ComboDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { addItem } = useCart()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [combo, setCombo] = useState<ComboData | null>(null)
  const [groupsByItem, setGroupsByItem] = useState<Record<string, GroupItem[]>>({})
  const [selections, setSelections] = useState<Record<string, SelectionState>>({})
  const [observation, setObservation] = useState('')
  const [qtd, setQtd] = useState(1)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const id = params?.id
      if (!id) return
      setLoading(true)
      setErro(null)

      const { data: comboData, error: comboErr } = await supabase
        .from('combos')
        .select('id, nome, descricao, preco, imagem_url, combo_itens(item_id, quantidade, ordem, itens_cardapio(id, nome, preco, imagem_url))')
        .eq('id', id)
        .eq('ativo', true)
        .maybeSingle()

      if (!active) return
      if (comboErr || !comboData) {
        setErro(comboErr?.message ?? t.comboNotFound)
        setLoading(false)
        return
      }

      const comboTyped = comboData as ComboData
      setCombo(comboTyped)

      const itemIds = (comboTyped.combo_itens ?? []).map((ci) => ci.item_id)
      if (itemIds.length === 0) {
        setGroupsByItem({})
        setSelections({})
        setLoading(false)
        return
      }

      const { data: groupsData } = await supabase
        .from('item_opcao_grupos')
        .select('id, item_id, tipo, nome, min_escolhas, max_escolhas, ordem')
        .in('item_id', itemIds)
        .order('ordem')

      const groupIds = (groupsData ?? []).map((g) => g.id)
      const { data: optionsData } = groupIds.length
        ? await supabase
            .from('item_opcoes')
            .select('id, grupo_id, label, price_delta, detail_info, ordem, ativo')
            .in('grupo_id', groupIds)
            .eq('ativo', true)
            .order('ordem')
        : { data: [] as Array<{ id: string; grupo_id: string; label: string; price_delta: number; detail_info: string | null; ordem: number; ativo: boolean }> }

      const map: Record<string, GroupItem[]> = {}
      const sel: Record<string, SelectionState> = {}
      for (const row of (groupsData ?? []) as Array<{
        id: string
        item_id: string
        tipo: 'size' | 'quantity' | 'extra'
        nome: string
        min_escolhas: number | null
        max_escolhas: number | null
        ordem: number
      }>) {
        const options = (optionsData ?? [])
          .filter((o) => o.grupo_id === row.id)
          .map((o) => ({
            id: o.id,
            label: o.label,
            price_delta: Number(o.price_delta ?? 0),
            detail_info: o.detail_info ?? null,
          }))

        if (!map[row.item_id]) map[row.item_id] = []
        map[row.item_id].push({
          id: row.id,
          tipo: row.tipo,
          nome: row.nome,
          min_escolhas: row.min_escolhas,
          max_escolhas: row.max_escolhas,
          ordem: row.ordem,
          options,
        })
      }

      for (const itemId of itemIds) {
        const groups = map[itemId] ?? []
        const singleByGroup: Record<string, string> = {}
        const extrasByGroup: Record<string, string[]> = {}
        for (const g of groups) {
          if (g.tipo === 'extra') {
            const { minEf } = clampMinMax(g.min_escolhas, g.max_escolhas)
            extrasByGroup[g.id] = g.options.slice(0, minEf).map((o) => o.id)
          } else {
            if (g.options[0]) singleByGroup[g.id] = g.options[0].id
          }
        }
        sel[itemId] = { singleByGroup, extrasByGroup }
      }

      if (!active) return
      setGroupsByItem(map)
      setSelections(sel)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [params?.id, supabase, t.comboNotFound])

  const extraDelta = useMemo(() => {
    if (!combo) return 0
    let delta = 0
    for (const line of combo.combo_itens ?? []) {
      const groups = groupsByItem[line.item_id] ?? []
      const sel = selections[line.item_id]
      if (!sel) continue

      for (const g of groups) {
        if (g.tipo === 'extra') {
          const chosen = sel.extrasByGroup[g.id] ?? []
          for (const optionId of chosen) {
            const opt = g.options.find((o) => o.id === optionId)
            if (opt) delta += opt.price_delta * Math.max(1, Number(line.quantidade) || 1)
          }
        } else {
          const optionId = sel.singleByGroup[g.id]
          const opt = g.options.find((o) => o.id === optionId)
          if (opt) delta += opt.price_delta * Math.max(1, Number(line.quantidade) || 1)
        }
      }
    }
    return delta
  }, [combo, groupsByItem, selections])

  const unitPrice = useMemo(() => {
    if (!combo) return 0
    return Number((Number(combo.preco ?? 0) + extraDelta).toFixed(2))
  }, [combo, extraDelta])

  function toggleExtra(itemId: string, group: GroupItem, optionId: string) {
    setSelections((prev) => {
      const current = prev[itemId] ?? { singleByGroup: {}, extrasByGroup: {} }
      const selected = [...(current.extrasByGroup[group.id] ?? [])]
      const idx = selected.lastIndexOf(optionId)
      const { minEf, maxEf } = clampMinMax(group.min_escolhas, group.max_escolhas)
      if (idx >= 0) {
        if (selected.length <= minEf) return prev
        selected.splice(idx, 1)
      } else {
        if (maxEf === 1) {
          selected.splice(0, selected.length, optionId)
        } else {
          if (selected.length >= maxEf) return prev
          selected.push(optionId)
        }
      }
      return {
        ...prev,
        [itemId]: {
          ...current,
          extrasByGroup: { ...current.extrasByGroup, [group.id]: selected },
        },
      }
    })
  }

  function selectSingle(itemId: string, groupId: string, optionId: string) {
    setSelections((prev) => {
      const current = prev[itemId] ?? { singleByGroup: {}, extrasByGroup: {} }
      return {
        ...prev,
        [itemId]: {
          ...current,
          singleByGroup: { ...current.singleByGroup, [groupId]: optionId },
        },
      }
    })
  }

  function handleAddCombo() {
    if (!combo) return
    for (const line of combo.combo_itens ?? []) {
      const groups = groupsByItem[line.item_id] ?? []
      const sel = selections[line.item_id]
      if (!sel) continue
      for (const g of groups) {
        if (g.tipo !== 'extra') continue
        const chosen = sel.extrasByGroup[g.id] ?? []
        const { minEf, maxEf } = clampMinMax(g.min_escolhas, g.max_escolhas)
        if (chosen.length < minEf || chosen.length > maxEf) {
          const itemName = line.itens_cardapio?.nome ?? t.comboItemDefault
          setErro(formatComboSelectionError(t.comboSelectionError, itemName, g.nome))
          return
        }
      }
    }

    const selectedOptions: SelectedOption[] = []
    for (const line of combo.combo_itens ?? []) {
      const itemName = line.itens_cardapio?.nome ?? t.comboItemDefault
      const qty = Math.max(1, Number(line.quantidade) || 1)
      const groups = groupsByItem[line.item_id] ?? []
      const sel = selections[line.item_id]
      if (!sel) continue
      for (const g of groups) {
        if (g.tipo === 'extra') {
          const chosen = sel.extrasByGroup[g.id] ?? []
          for (const optionId of chosen) {
            const opt = g.options.find((o) => o.id === optionId)
            if (!opt) continue
            selectedOptions.push({
              optionId: `${line.item_id}:${g.id}:${opt.id}`,
              groupType: 'extra',
              groupName: `${itemName} • ${g.nome}`,
              label: opt.label,
              priceDelta: Number((opt.price_delta * qty).toFixed(2)),
              info: opt.detail_info,
            })
          }
        } else {
          const optionId = sel.singleByGroup[g.id]
          const opt = g.options.find((o) => o.id === optionId)
          if (!opt) continue
          selectedOptions.push({
            optionId: `${line.item_id}:${g.id}:${opt.id}`,
            groupType: g.tipo,
            groupName: `${itemName} • ${g.nome}`,
            label: opt.label,
            priceDelta: Number((opt.price_delta * qty).toFixed(2)),
            info: opt.detail_info,
          })
        }
      }
    }

    const comboItem: ItemCardapio = {
      id: combo.id,
      nome: combo.nome,
      descricao: combo.descricao,
      preco: Number(combo.preco),
      imagem_url: combo.imagem_url,
      categoria_id: null,
      comboId: combo.id,
      isCombo: true,
    }

    addItem(comboItem, Math.max(1, qtd), {
      observation: observation.trim(),
      selectedOptions,
      unitPrice,
    })
    router.push('/carrinho')
  }

  if (loading) {
    return <StorefrontLoadingState message={t.comboLoading} />
  }

  if (!combo) {
    return (
      <StorefrontShell
        header={<StorefrontHeader title={t.comboNotFound} backHref="/" backLabel={t.back} />}
      >
        <div className="px-4 pt-4">
          <p className="text-sm text-muted-foreground">{erro ?? t.comboNotFound}</p>
        </div>
      </StorefrontShell>
    )
  }

  return (
    <StorefrontShell
      bottomPadding="cta-only"
      header={<StorefrontHeader title={combo.nome} backHref="/" backLabel={t.back} />}
    >
      <section className="space-y-4 px-4 pt-4">
        {combo.imagem_url ? (
          <img
            src={combo.imagem_url}
            alt={combo.nome}
            className="h-48 w-full rounded-2xl object-cover shadow-(--shadow-card)"
          />
        ) : null}
        {combo.descricao ? <p className="text-sm text-muted-foreground">{combo.descricao}</p> : null}
        {(combo.combo_itens ?? []).map((line) => {
          const groups = groupsByItem[line.item_id] ?? []
          const sel = selections[line.item_id]
          const itemName = line.itens_cardapio?.nome ?? t.comboItemDefault
          return (
            <article key={line.item_id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-3">
                {line.itens_cardapio?.imagem_url ? (
                  <img
                    src={line.itens_cardapio.imagem_url}
                    alt={itemName}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : null}
                <p className="text-sm font-semibold text-foreground">
                  {itemName} {line.quantidade > 1 ? `x${line.quantidade}` : ''}
                </p>
              </div>
              {groups.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">{t.comboNoVariations}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {groups.map((g) => (
                    <div key={g.id} className="rounded-xl border border-border/70 bg-background p-2.5">
                      <p className="mb-1 text-xs font-semibold text-foreground">{g.nome}</p>
                      <div className="flex flex-wrap gap-2">
                        {g.options.map((op) => {
                          const singleSelected = sel?.singleByGroup[g.id] === op.id
                          const extraSelected = (sel?.extrasByGroup[g.id] ?? []).includes(op.id)
                          const active = g.tipo === 'extra' ? extraSelected : singleSelected
                          return (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() =>
                                g.tipo === 'extra'
                                  ? toggleExtra(line.item_id, g, op.id)
                                  : selectSingle(line.item_id, g.id, op.id)
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                                active
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-card text-foreground'
                              }`}
                            >
                              {op.label}
                              {op.price_delta !== 0
                                ? ` (${op.price_delta > 0 ? '+' : ''}${t.currency}${op.price_delta.toFixed(2)})`
                                : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )
        })}

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <label className="mb-1 block text-xs font-semibold text-foreground">{t.comboObservation}</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder={t.comboObservationPlaceholder}
          />
        </div>

        {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p> : null}
      </section>

      <StorefrontFixedFooter withBottomNav={false}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{t.total}</p>
            <p className="text-xl font-bold text-accent">
              {t.currency}
              {(unitPrice * qtd).toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary px-1 py-1">
            <button
              type="button"
              onClick={() => setQtd((v) => Math.max(1, v - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm font-bold">{qtd}</span>
            <button
              type="button"
              onClick={() => setQtd((v) => v + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddCombo}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          {t.comboAddToCart}
        </button>
      </StorefrontFixedFooter>
    </StorefrontShell>
  )
}
