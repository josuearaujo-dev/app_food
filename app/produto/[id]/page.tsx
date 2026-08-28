'use client'

import { useEffect, useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio } from '@/lib/cart-context'
import { useParams, useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { StorefrontFixedFooter } from '@/components/layout/storefront-fixed-footer'
import { StorefrontHeader } from '@/components/layout/storefront-header'
import { StorefrontLoadingState } from '@/components/layout/storefront-loading-state'
import { StorefrontShell } from '@/components/layout/storefront-shell'

type ItemDetalhe = ItemCardapio & {
  disponivel: boolean
}

type OptionItem = {
  id: string
  label: string
  price_delta: number
  info: string | null
}

type ExtraGroupLoaded = {
  id: string
  nome: string
  min_escolhas: number | null
  max_escolhas: number | null
  options: OptionItem[]
}

function limitesGrupoExtra(g: ExtraGroupLoaded): { minEf: number; maxEf: number } {
  let minEf = g.min_escolhas == null ? 0 : Math.max(0, Math.floor(g.min_escolhas))
  let maxEf =
    g.max_escolhas == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(g.max_escolhas))
  if (Number.isNaN(minEf)) minEf = 0
  if (Number.isNaN(maxEf)) maxEf = Number.POSITIVE_INFINITY
  if (maxEf !== Number.POSITIVE_INFINITY && maxEf < minEf) maxEf = minEf
  return { minEf, maxEf }
}

function extraGroupSubtitle(g: ExtraGroupLoaded): string {
  const hasMin = g.min_escolhas != null
  const hasMax = g.max_escolhas != null
  if (!hasMin && !hasMax) return ' (opcional · escolha livre)'
  if (hasMin && hasMax && g.min_escolhas === g.max_escolhas) {
    const x = g.min_escolhas as number
    return ` (${x} escolha${x !== 1 ? 's' : ''})`
  }
  const parts: string[] = []
  if (hasMin) parts.push(`mín. ${g.min_escolhas}`)
  if (hasMax) parts.push(`máx. ${g.max_escolhas}`)
  return ` (${parts.join(' · ')})`
}

function defaultExtraSelection(
  min: number | null,
  max: number | null,
  optionIds: string[]
): string[] {
  if (optionIds.length === 0) return []
  let minR = min == null ? 0 : Math.max(0, Math.floor(min))
  let maxR =
    max == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(max))
  if (Number.isNaN(minR)) minR = 0
  if (Number.isNaN(maxR)) maxR = Number.POSITIVE_INFINITY
  if (maxR !== Number.POSITIVE_INFINITY && maxR < minR) maxR = minR
  if (maxR === 1) {
    return minR >= 1 ? [optionIds[0]] : []
  }
  const need = Math.min(Math.max(minR, 0), maxR)
  const base: string[] = []
  for (let i = 0; i < need; i++) {
    const idx = i < optionIds.length ? i : 0
    base.push(optionIds[idx])
  }
  return base
}

function BlocoInfoOpcao({ info }: { info: string | null | undefined }) {
  const texto = info?.trim()
  if (!texto) return null
  return (
    <p className="mt-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-xs leading-relaxed text-foreground">
      {texto}
    </p>
  )
}

export default function ProdutoDetalhePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { addItem } = useCart()
  const { t } = useLang()
  const [item, setItem] = useState<ItemDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [qtd, setQtd] = useState(1)
  const [observation, setObservation] = useState('')
  const [sizeOptions, setSizeOptions] = useState<OptionItem[]>([])
  const [quantityOptions, setQuantityOptions] = useState<OptionItem[]>([])
  const [extraGroups, setExtraGroups] = useState<ExtraGroupLoaded[]>([])
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
  const [selectedQuantityId, setSelectedQuantityId] = useState<string | null>(null)
  const [selectedExtras, setSelectedExtras] = useState<Record<string, string[]>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      const id = params?.id
      if (!id) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('itens_cardapio')
        .select('id, nome, descricao, preco, imagem_url, categoria_id, disponivel, quantidade_info, tamanhos_disponiveis, ingredientes_info, alergenicos_alerta')
        .eq('id', id)
        .maybeSingle()
      if (!active) return
      setItem((data as ItemDetalhe | null) ?? null)

      if (!id) {
        setLoading(false)
        return
      }
      const { data: groups } = await supabase
        .from('item_opcao_grupos')
        .select('id, tipo, nome, min_escolhas, max_escolhas, ordem')
        .eq('item_id', id)
        .order('ordem')

      const groupIds = (groups ?? []).map((g) => g.id)
      if (groupIds.length > 0) {
        const { data: options } = await supabase
          .from('item_opcoes')
          .select('id, grupo_id, label, price_delta, detail_info, ordem, ativo')
          .in('grupo_id', groupIds)
          .eq('ativo', true)
          .order('ordem')

        const sizeGroup = groups?.find((g) => g.tipo === 'size')
        const qtyGroup = groups?.find((g) => g.tipo === 'quantity')

        const sizeOps = (options ?? [])
          .filter((o) => o.grupo_id === sizeGroup?.id)
          .map((o) => ({
            id: o.id,
            label: o.label,
            price_delta: Number(o.price_delta ?? 0),
            info: o.detail_info ?? null,
          }))
        const qtyOps = (options ?? [])
          .filter((o) => o.grupo_id === qtyGroup?.id)
          .map((o) => ({
            id: o.id,
            label: o.label,
            price_delta: Number(o.price_delta ?? 0),
            info: o.detail_info ?? null,
          }))

        setSizeOptions(sizeOps)
        setQuantityOptions(qtyOps)
        setSelectedSizeId(sizeOps[0]?.id ?? null)
        setSelectedQuantityId(qtyOps[0]?.id ?? null)

        const extraGr = (groups ?? []).filter((g) => g.tipo === 'extra')
        const loaded: ExtraGroupLoaded[] = extraGr.map((g) => ({
          id: g.id,
          nome: (g as { nome?: string }).nome ?? 'Extra',
          min_escolhas:
            (g as { min_escolhas?: number | null }).min_escolhas == null
              ? null
              : Number((g as { min_escolhas?: number | null }).min_escolhas),
          max_escolhas:
            (g as { max_escolhas?: number | null }).max_escolhas == null
              ? null
              : Number((g as { max_escolhas?: number | null }).max_escolhas),
          options: (options ?? [])
            .filter((o) => o.grupo_id === g.id)
            .map((o) => ({
              id: o.id,
              label: o.label,
              price_delta: Number(o.price_delta ?? 0),
              info: o.detail_info ?? null,
            })),
        }))
        setExtraGroups(loaded)
        const initSel: Record<string, string[]> = {}
        for (const eg of loaded) {
          const ids = eg.options.map((o) => o.id)
          initSel[eg.id] = defaultExtraSelection(eg.min_escolhas, eg.max_escolhas, ids)
        }
        setSelectedExtras(initSel)
      } else {
        setSizeOptions([])
        setQuantityOptions([])
        setSelectedSizeId(null)
        setSelectedQuantityId(null)
        setExtraGroups([])
        setSelectedExtras({})
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [params?.id, supabase])

  function handleAdd() {
    if (!item) return
    for (const g of extraGroups) {
      const { minEf, maxEf } = limitesGrupoExtra(g)
      const sel = selectedExtras[g.id] ?? []
      if (sel.length < minEf || sel.length > maxEf) {
        const msg =
          minEf === maxEf
            ? `Em "${g.nome}", escolha exatamente ${minEf} opção(ões).`
            : `Em "${g.nome}", escolha entre ${minEf} e ${maxEf} opção(ões).`
        alert(msg)
        return
      }
    }

    const selectedOptions = [
      ...(sizeOptions
        .filter((o) => o.id === selectedSizeId)
        .map((o) => ({
          optionId: o.id,
          groupType: 'size' as const,
          label: o.label,
          priceDelta: o.price_delta,
          info: o.info,
        }))),
      ...(quantityOptions
        .filter((o) => o.id === selectedQuantityId)
        .map((o) => ({
          optionId: o.id,
          groupType: 'quantity' as const,
          label: o.label,
          priceDelta: o.price_delta,
          info: o.info,
        }))),
      ...extraGroups.flatMap((g) => {
        const sel = selectedExtras[g.id] ?? []
        return sel
          .map((id) => g.options.find((o) => o.id === id))
          .filter((o): o is OptionItem => !!o)
          .map((o) => ({
            optionId: o.id,
            groupType: 'extra' as const,
            groupName: g.nome,
            label: o.label,
            priceDelta: o.price_delta,
            info: o.info,
          }))
      }),
    ]
    const unitPrice =
      item.preco + selectedOptions.reduce((acc, op) => acc + op.priceDelta, 0)

    addItem(item, qtd, {
      observation,
      selectedOptions,
      unitPrice,
    })
    router.push('/carrinho')
  }

  const selectedDelta =
    [...sizeOptions, ...quantityOptions]
      .filter((o) => o.id === selectedSizeId || o.id === selectedQuantityId)
      .reduce((acc, o) => acc + Number(o.price_delta ?? 0), 0) +
    extraGroups.reduce((acc, g) => {
      const sel = selectedExtras[g.id] ?? []
      return (
        acc +
        sel.reduce((a, id) => {
          const o = g.options.find((x) => x.id === id)
          return a + (o ? Number(o.price_delta ?? 0) : 0)
        }, 0)
      )
    }, 0)

  if (loading) {
    return <StorefrontLoadingState message={t.loadingProduct} />
  }

  if (!item) {
    return (
      <StorefrontShell
        header={<StorefrontHeader title={t.productDetailTitle} backHref="/" backLabel={t.back} />}
      >
        <div className="px-4 pt-4">
          <p className="text-sm text-muted-foreground">{t.productNotFound}</p>
        </div>
      </StorefrontShell>
    )
  }

  const unitPrice = item.preco + selectedDelta
  const selectedSize = sizeOptions.find((o) => o.id === selectedSizeId) ?? null
  const selectedQuantity = quantityOptions.find((o) => o.id === selectedQuantityId) ?? null
  const dynamicQuantityInfo =
    selectedSize?.info || selectedQuantity?.info || item.quantidade_info

  return (
    <StorefrontShell
      bottomPadding="cta-only"
      header={
        <StorefrontHeader title={t.productDetailTitle} backHref="/" backLabel={t.back} />
      }
    >
      <section className="space-y-4 px-4 pt-4">
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.nome} className="w-full h-52 object-cover rounded-2xl" />
        ) : (
          <div className="flex h-52 w-full items-center justify-center rounded-2xl bg-accent/10 text-6xl">🍽️</div>
        )}
        <div>
          <h2 className="text-lg font-bold text-foreground">{item.nome}</h2>
          {item.descricao && (
            <p className="text-sm text-muted-foreground mt-1">{item.descricao}</p>
          )}
          <p className="mt-1.5 text-xl font-bold text-accent">
            {t.currency}
            {unitPrice.toFixed(2)}
          </p>
        </div>

        {sizeOptions.length > 0 && (
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.optionSize}
            </p>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setSelectedSizeId(op.id)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedSizeId === op.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-foreground'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <BlocoInfoOpcao info={selectedSize?.info} />
          </div>
        )}

        {quantityOptions.length > 0 && (
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.optionQuantity}
            </p>
            <div className="flex flex-wrap gap-2">
              {quantityOptions.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setSelectedQuantityId(op.id)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedQuantityId === op.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-foreground'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <BlocoInfoOpcao info={selectedQuantity?.info} />
          </div>
        )}

        {extraGroups.map((g) => {
          const { minEf, maxEf } = limitesGrupoExtra(g)
          const escolhaUnica = maxEf === 1
          return (
          <div key={g.id}>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {g.nome}
              <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground">
                {extraGroupSubtitle(g)}
              </span>
            </p>
            {escolhaUnica ? (
              <div className="flex flex-wrap gap-2">
                {g.options.map((op) => {
                  const sel = selectedExtras[g.id] ?? []
                  const on = sel[0] === op.id
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        setSelectedExtras((prev) => {
                          const cur = prev[g.id] ?? []
                          if (cur[0] === op.id && minEf === 0) {
                            return { ...prev, [g.id]: [] }
                          }
                          return { ...prev, [g.id]: [op.id] }
                        })
                      }}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary text-foreground'
                      }`}
                    >
                      {op.label}
                      {Number(op.price_delta) !== 0 && (
                        <span className="ml-1 opacity-90">
                          {op.price_delta > 0 ? '+' : ''}
                          {t.currency}
                          {op.price_delta.toFixed(2)}
                        </span>
                      )}
                    </button>
                  )
                })}
                <BlocoInfoOpcao
                  info={
                    g.options.find((o) => o.id === (selectedExtras[g.id] ?? [])[0])?.info
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                {g.options.map((op) => {
                  const sel = selectedExtras[g.id] ?? []
                  const count = sel.filter((id) => id === op.id).length
                  const on = count > 0
                  const totalSel = sel.length
                  return (
                    <div
                      key={op.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{op.label}</span>
                        {on && op.info?.trim() && (
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {op.info.trim()}
                          </span>
                        )}
                      </span>
                      {Number(op.price_delta) !== 0 && (
                        <span className="text-sm font-semibold text-accent mr-1.5">
                          {op.price_delta > 0 ? '+' : ''}
                          {t.currency}
                          {op.price_delta.toFixed(2)}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 rounded-full bg-secondary px-1.5 py-1">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/80 text-xs font-bold disabled:opacity-40"
                          disabled={!on || totalSel <= minEf}
                          onClick={() => {
                            setSelectedExtras((prev) => {
                              const current = [...(prev[g.id] ?? [])]
                              if (!current.length || current.length <= minEf) return prev
                              const idx = current.lastIndexOf(op.id)
                              if (idx === -1) return prev
                              current.splice(idx, 1)
                              return { ...prev, [g.id]: current }
                            })
                          }}
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-5 text-center text-xs font-semibold text-foreground">
                          {count}
                        </span>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground disabled:opacity-40"
                          disabled={totalSel >= maxEf}
                          onClick={() => {
                            setSelectedExtras((prev) => {
                              const current = [...(prev[g.id] ?? [])]
                              if (current.length >= maxEf) return prev
                              current.push(op.id)
                              return { ...prev, [g.id]: current }
                            })
                          }}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <p className="text-[11px] text-muted-foreground">
                  {(() => {
                    const sel = selectedExtras[g.id] ?? []
                    const total = sel.length
                    const maxLabel = Number.isFinite(maxEf) ? String(maxEf) : '∞'
                    const minLabel = minEf > 0 ? ` (mín. ${minEf})` : ''
                    return `Selecionados: ${total}/${maxLabel}${minLabel}`
                  })()}
                </p>
              </div>
            )}
          </div>
          )
        })}

        {(dynamicQuantityInfo || item.tamanhos_disponiveis) && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            {dynamicQuantityInfo && (
              <p className="text-sm text-foreground">
                <span className="font-semibold">{t.productQuantityInfo}:</span> {dynamicQuantityInfo}
              </p>
            )}
            {item.tamanhos_disponiveis && (
              <p className="text-sm text-foreground">
                <span className="font-semibold">{t.productSizes}:</span> {item.tamanhos_disponiveis}
              </p>
            )}
          </div>
        )}

        {item.ingredientes_info && (
          <div>
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.productIngredients}
            </p>
            <p className="text-sm text-foreground">{item.ingredientes_info}</p>
          </div>
        )}

        {item.alergenicos_alerta && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[12px] font-semibold text-amber-700">{t.productAllergens}</p>
            <p className="text-xs text-amber-700 mt-0.5">{item.alergenicos_alerta}</p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.kitchenNote}
          </label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder={t.kitchenNotePlaceholder}
            rows={3}
            className="w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </section>

      <StorefrontFixedFooter withBottomNav={false}>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.productPrice}</p>
            <p className="text-2xl font-bold leading-none text-foreground">
              {t.currency}
              {(unitPrice * qtd).toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary px-1.5 py-1 text-primary-foreground">
            <button
              type="button"
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15"
            >
              <Minus size={13} />
            </button>
            <span className="w-5 text-center text-sm font-bold">{qtd}</span>
            <button
              type="button"
              onClick={() => setQtd((q) => q + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          {t.productAddToCart}
        </button>
      </StorefrontFixedFooter>
    </StorefrontShell>
  )
}
