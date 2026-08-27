'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import {
  buildSelectedOptions,
  calculateOptionsDelta,
  extraGroupSubtitle,
  limitesGrupoExtra,
  loadProductOptions,
  validateExtraSelections,
  type ProductOptionsState,
} from '@/lib/product-options'

type Props = {
  itemId: string | null
  onClose: () => void
}

function BlocoInfoOpcao({ info }: { info: string | null | undefined }) {
  const texto = info?.trim()
  if (!texto) return null
  return (
    <p className="mt-2 rounded-xl border border-[var(--cadu-line)] bg-[var(--cadu-surface)] px-3 py-2.5 text-xs leading-relaxed text-[var(--cadu-ink)]">
      {texto}
    </p>
  )
}

export function ProductCustomizeModal({ itemId, onClose }: Props) {
  const supabase = createClient()
  const { addItem } = useCart()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<ProductOptionsState | null>(null)
  const [qtd, setQtd] = useState(1)
  const [observation, setObservation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!itemId) return
    let active = true
    setLoading(true)
    setQtd(1)
    setObservation('')
    setError(null)
    loadProductOptions(supabase, itemId).then((loaded) => {
      if (!active) return
      setState(loaded)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [itemId, supabase])

  useEffect(() => {
    document.body.style.overflow = itemId ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [itemId])

  if (!itemId) return null

  function closeModal() {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, 180)
  }

  function handleAdd() {
    if (!state) return
    const validationError = validateExtraSelections(state.extraGroups, state.selectedExtras)
    if (validationError) {
      setError(validationError)
      return
    }

    const selectedOptions = buildSelectedOptions(
      state.sizeOptions,
      state.quantityOptions,
      state.extraGroups,
      state.selectedSizeId,
      state.selectedQuantityId,
      state.selectedExtras
    )
    const unitPrice =
      state.item.preco + calculateOptionsDelta(
        state.sizeOptions,
        state.quantityOptions,
        state.extraGroups,
        state.selectedSizeId,
        state.selectedQuantityId,
        state.selectedExtras
      )

    addItem(state.item, qtd, {
      observation,
      selectedOptions,
      unitPrice,
    })
    closeModal()
  }

  const selectedDelta = state
    ? calculateOptionsDelta(
        state.sizeOptions,
        state.quantityOptions,
        state.extraGroups,
        state.selectedSizeId,
        state.selectedQuantityId,
        state.selectedExtras
      )
    : 0
  const unitPrice = state ? state.item.preco + selectedDelta : 0
  const selectedSize = state?.sizeOptions.find((o) => o.id === state.selectedSizeId) ?? null
  const selectedQuantity =
    state?.quantityOptions.find((o) => o.id === state.selectedQuantityId) ?? null

  return (
    <div
      className={`cadu-modal-backdrop ${closing ? 'cadu-modal-backdrop--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={state?.item.nome ?? t.customizeProduct}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal()
      }}
    >
      <div className="cadu-product-modal">
        <div className="cadu-modal-handle" aria-hidden />

        {loading || !state ? (
          <div className="p-8 text-center text-sm text-[var(--cadu-muted)]">{t.loadingProduct}</div>
        ) : (
          <>
            <div className="cadu-modal-header">
              <div className="min-w-0 flex-1">
                <span className="cadu-modal-kicker">{t.customizeProduct}</span>
                <h2>{state.item.nome}</h2>
                {state.item.descricao && <p>{state.item.descricao}</p>}
              </div>
              <button type="button" className="cadu-modal-close" onClick={closeModal} aria-label={t.back}>
                <X size={20} />
              </button>
            </div>

            {state.item.imagem_url ? (
              <img
                src={state.item.imagem_url}
                alt=""
                className="cadu-modal-image"
              />
            ) : (
              <div className="cadu-modal-image flex items-center justify-center text-5xl bg-[var(--cadu-surface)]">
                🍽️
              </div>
            )}

            <div className="cadu-modal-body">
              {state.sizeOptions.length > 0 && (
                <div>
                  <p className="cadu-option-label">{t.optionSize}</p>
                  <div className="flex flex-wrap gap-2">
                    {state.sizeOptions.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setState((s) => s && { ...s, selectedSizeId: op.id })}
                        className={`cadu-option-pill ${state.selectedSizeId === op.id ? 'cadu-option-pill--on' : ''}`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                  <BlocoInfoOpcao info={selectedSize?.info} />
                </div>
              )}

              {state.quantityOptions.length > 0 && (
                <div>
                  <p className="cadu-option-label">{t.optionQuantity}</p>
                  <div className="flex flex-wrap gap-2">
                    {state.quantityOptions.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setState((s) => s && { ...s, selectedQuantityId: op.id })}
                        className={`cadu-option-pill ${state.selectedQuantityId === op.id ? 'cadu-option-pill--on' : ''}`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                  <BlocoInfoOpcao info={selectedQuantity?.info} />
                </div>
              )}

              {state.extraGroups.map((g) => {
                const { minEf, maxEf } = limitesGrupoExtra(g)
                const escolhaUnica = maxEf === 1
                return (
                  <div key={g.id}>
                    <p className="cadu-option-label">
                      {g.nome}
                      <span className="font-normal normal-case text-[11px] text-[var(--cadu-muted)]">
                        {extraGroupSubtitle(g)}
                      </span>
                    </p>
                    {escolhaUnica ? (
                      <div className="flex flex-wrap gap-2">
                        {g.options.map((op) => {
                          const sel = state.selectedExtras[g.id] ?? []
                          const on = sel[0] === op.id
                          return (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() =>
                                setState((s) => {
                                  if (!s) return s
                                  const cur = s.selectedExtras[g.id] ?? []
                                  const next =
                                    cur[0] === op.id && minEf === 0 ? [] : [op.id]
                                  return {
                                    ...s,
                                    selectedExtras: { ...s.selectedExtras, [g.id]: next },
                                  }
                                })
                              }
                              className={`cadu-option-pill ${on ? 'cadu-option-pill--on' : ''}`}
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
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {g.options.map((op) => {
                          const sel = state.selectedExtras[g.id] ?? []
                          const count = sel.filter((id) => id === op.id).length
                          const on = count > 0
                          const totalSel = sel.length
                          return (
                            <div
                              key={op.id}
                              className="flex items-center gap-3 rounded-xl border border-[var(--cadu-line)] bg-white px-3 py-2.5"
                            >
                              <span className="min-w-0 flex-1 text-sm font-medium">{op.label}</span>
                              {Number(op.price_delta) !== 0 && (
                                <span className="text-sm font-semibold text-[var(--cadu-pink)]">
                                  {op.price_delta > 0 ? '+' : ''}
                                  {t.currency}
                                  {op.price_delta.toFixed(2)}
                                </span>
                              )}
                              <div className="flex items-center gap-1 rounded-full bg-[var(--cadu-surface)] px-1.5 py-1">
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-40"
                                  disabled={!on || totalSel <= minEf}
                                  onClick={() =>
                                    setState((s) => {
                                      if (!s) return s
                                      const current = [...(s.selectedExtras[g.id] ?? [])]
                                      if (!current.length || current.length <= minEf) return s
                                      const idx = current.lastIndexOf(op.id)
                                      if (idx === -1) return s
                                      current.splice(idx, 1)
                                      return {
                                        ...s,
                                        selectedExtras: { ...s.selectedExtras, [g.id]: current },
                                      }
                                    })
                                  }
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="w-5 text-center text-xs font-semibold">{count}</span>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cadu-brown)] text-white disabled:opacity-40"
                                  disabled={totalSel >= maxEf}
                                  onClick={() =>
                                    setState((s) => {
                                      if (!s) return s
                                      const current = [...(s.selectedExtras[g.id] ?? [])]
                                      if (current.length >= maxEf) return s
                                      current.push(op.id)
                                      return {
                                        ...s,
                                        selectedExtras: { ...s.selectedExtras, [g.id]: current },
                                      }
                                    })
                                  }
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              <div>
                <label className="cadu-option-label">{t.kitchenNote}</label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder={t.kitchenNotePlaceholder}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[var(--cadu-line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cadu-pink)]/30"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Link
                href={`/produto/${state.item.id}`}
                className="text-xs font-semibold text-[var(--cadu-pink)]"
                onClick={closeModal}
              >
                {t.viewFullDetails}
              </Link>
            </div>

            <div className="cadu-modal-footer">
              <div className="flex items-center gap-2 rounded-full bg-[var(--cadu-brown)] px-1.5 py-1 text-white">
                <button
                  type="button"
                  onClick={() => setQtd((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-6 text-center text-sm font-bold">{qtd}</span>
                <button
                  type="button"
                  onClick={() => setQtd((q) => q + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cadu-pink)]"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button type="button" className="cadu-modal-add" onClick={handleAdd}>
                {t.addToCart} · {t.currency}
                {(unitPrice * qtd).toFixed(2)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
