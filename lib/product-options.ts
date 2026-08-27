import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemCardapio, SelectedOption } from '@/lib/cart-context'

export type OptionItem = {
  id: string
  label: string
  price_delta: number
  info: string | null
}

export type ExtraGroupLoaded = {
  id: string
  nome: string
  min_escolhas: number | null
  max_escolhas: number | null
  options: OptionItem[]
}

export type ItemDetalhe = ItemCardapio & {
  disponivel: boolean
}

export type ProductOptionsState = {
  item: ItemDetalhe
  sizeOptions: OptionItem[]
  quantityOptions: OptionItem[]
  extraGroups: ExtraGroupLoaded[]
  selectedSizeId: string | null
  selectedQuantityId: string | null
  selectedExtras: Record<string, string[]>
}

export function limitesGrupoExtra(g: ExtraGroupLoaded): { minEf: number; maxEf: number } {
  let minEf = g.min_escolhas == null ? 0 : Math.max(0, Math.floor(g.min_escolhas))
  let maxEf =
    g.max_escolhas == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(g.max_escolhas))
  if (Number.isNaN(minEf)) minEf = 0
  if (Number.isNaN(maxEf)) maxEf = Number.POSITIVE_INFINITY
  if (maxEf !== Number.POSITIVE_INFINITY && maxEf < minEf) maxEf = minEf
  return { minEf, maxEf }
}

export function extraGroupSubtitle(g: ExtraGroupLoaded): string {
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

export function defaultExtraSelection(
  min: number | null,
  max: number | null,
  optionIds: string[]
): string[] {
  if (optionIds.length === 0) return []
  let minR = min == null ? 0 : Math.max(0, Math.floor(min))
  let maxR = max == null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(max))
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

export function calculateOptionsDelta(
  sizeOptions: OptionItem[],
  quantityOptions: OptionItem[],
  extraGroups: ExtraGroupLoaded[],
  selectedSizeId: string | null,
  selectedQuantityId: string | null,
  selectedExtras: Record<string, string[]>
): number {
  return (
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
  )
}

export function buildSelectedOptions(
  sizeOptions: OptionItem[],
  quantityOptions: OptionItem[],
  extraGroups: ExtraGroupLoaded[],
  selectedSizeId: string | null,
  selectedQuantityId: string | null,
  selectedExtras: Record<string, string[]>
): SelectedOption[] {
  return [
    ...sizeOptions
      .filter((o) => o.id === selectedSizeId)
      .map((o) => ({
        optionId: o.id,
        groupType: 'size' as const,
        label: o.label,
        priceDelta: o.price_delta,
        info: o.info,
      })),
    ...quantityOptions
      .filter((o) => o.id === selectedQuantityId)
      .map((o) => ({
        optionId: o.id,
        groupType: 'quantity' as const,
        label: o.label,
        priceDelta: o.price_delta,
        info: o.info,
      })),
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
}

export function validateExtraSelections(
  extraGroups: ExtraGroupLoaded[],
  selectedExtras: Record<string, string[]>
): string | null {
  for (const g of extraGroups) {
    const { minEf, maxEf } = limitesGrupoExtra(g)
    const sel = selectedExtras[g.id] ?? []
    if (sel.length < minEf || sel.length > maxEf) {
      return minEf === maxEf
        ? `Em "${g.nome}", escolha exatamente ${minEf} opção(ões).`
        : `Em "${g.nome}", escolha entre ${minEf} e ${maxEf} opção(ões).`
    }
  }
  return null
}

export async function loadProductOptions(
  supabase: SupabaseClient,
  itemId: string
): Promise<ProductOptionsState | null> {
  const { data } = await supabase
    .from('itens_cardapio')
    .select(
      'id, nome, descricao, preco, imagem_url, categoria_id, disponivel, quantidade_info, tamanhos_disponiveis, ingredientes_info, alergenicos_alerta'
    )
    .eq('id', itemId)
    .maybeSingle()

  const item = (data as ItemDetalhe | null) ?? null
  if (!item) return null

  const { data: groups } = await supabase
    .from('item_opcao_grupos')
    .select('id, tipo, nome, min_escolhas, max_escolhas, ordem')
    .eq('item_id', itemId)
    .order('ordem')

  const groupIds = (groups ?? []).map((g) => g.id)
  if (groupIds.length === 0) {
    return {
      item,
      sizeOptions: [],
      quantityOptions: [],
      extraGroups: [],
      selectedSizeId: null,
      selectedQuantityId: null,
      selectedExtras: {},
    }
  }

  const { data: options } = await supabase
    .from('item_opcoes')
    .select('id, grupo_id, label, price_delta, detail_info, ordem, ativo')
    .in('grupo_id', groupIds)
    .eq('ativo', true)
    .order('ordem')

  const sizeGroup = groups?.find((g) => g.tipo === 'size')
  const qtyGroup = groups?.find((g) => g.tipo === 'quantity')

  const sizeOptions = (options ?? [])
    .filter((o) => o.grupo_id === sizeGroup?.id)
    .map((o) => ({
      id: o.id,
      label: o.label,
      price_delta: Number(o.price_delta ?? 0),
      info: o.detail_info ?? null,
    }))

  const quantityOptions = (options ?? [])
    .filter((o) => o.grupo_id === qtyGroup?.id)
    .map((o) => ({
      id: o.id,
      label: o.label,
      price_delta: Number(o.price_delta ?? 0),
      info: o.detail_info ?? null,
    }))

  const extraGr = (groups ?? []).filter((g) => g.tipo === 'extra')
  const extraGroups: ExtraGroupLoaded[] = extraGr.map((g) => ({
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

  const selectedExtras: Record<string, string[]> = {}
  for (const eg of extraGroups) {
    const ids = eg.options.map((o) => o.id)
    selectedExtras[eg.id] = defaultExtraSelection(eg.min_escolhas, eg.max_escolhas, ids)
  }

  return {
    item,
    sizeOptions,
    quantityOptions,
    extraGroups,
    selectedSizeId: sizeOptions[0]?.id ?? null,
    selectedQuantityId: quantityOptions[0]?.id ?? null,
    selectedExtras,
  }
}

export function productHasOptions(state: ProductOptionsState): boolean {
  return (
    state.sizeOptions.length > 0 ||
    state.quantityOptions.length > 0 ||
    state.extraGroups.length > 0
  )
}
