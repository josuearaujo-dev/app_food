import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildCartFingerprint,
  centsToDollars,
  dollarsToCents,
  type CartLineInput,
} from './validation'

export type CalculatedOrderItem = {
  itemId: string
  comboId: string | null
  productNameSnapshot: string
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
  observation: string | null
  selectedOptionsSnapshot: Array<{
    optionId: string
    groupId: string
    groupType: string
    groupName: string
    label: string
    priceDeltaCents: number
    info?: string | null
  }>
}

export type CalculatedOrder = {
  fingerprint: string
  subtotalCents: number
  totalCents: number
  currency: 'usd'
  items: CalculatedOrderItem[]
}

type DbItem = {
  id: string
  nome: string
  preco: number
  disponivel: boolean | null
}

type DbGroup = {
  id: string
  item_id: string
  tipo: string
  nome: string
  obrigatorio: boolean | null
  min_escolhas: number | null
  max_escolhas: number | null
}

type DbOption = {
  id: string
  grupo_id: string
  label: string
  price_delta: number
  ativo: boolean | null
  detail_info?: string | null
}

function groupSelectionLimits(group: DbGroup): { min: number; max: number } {
  let min =
    group.min_escolhas == null
      ? group.obrigatorio
        ? 1
        : 0
      : Math.max(0, Math.floor(group.min_escolhas))
  let max =
    group.max_escolhas == null
      ? group.tipo === 'extra'
        ? Number.POSITIVE_INFINITY
        : group.obrigatorio
          ? 1
          : 99
      : Math.max(0, Math.floor(group.max_escolhas))
  if (Number.isNaN(min)) min = 0
  if (Number.isNaN(max)) max = Number.POSITIVE_INFINITY
  if (max !== Number.POSITIVE_INFINITY && max < min) max = min
  return { min, max }
}

export class OrderCalculationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderCalculationError'
  }
}

export async function calculateOrderFromCart(
  cart: CartLineInput[]
): Promise<CalculatedOrder> {
  if (!cart.length) {
    throw new OrderCalculationError('Carrinho vazio.')
  }

  const supabase = createAdminClient()
  const productIds = [...new Set(cart.map((c) => c.id))]

  const { data: products, error: productsError } = await supabase
    .from('itens_cardapio')
    .select('id, nome, preco, disponivel')
    .in('id', productIds)

  if (productsError) {
    throw new OrderCalculationError('Falha ao validar produtos.')
  }

  const productMap = new Map<string, DbItem>((products ?? []).map((p) => [p.id, p as DbItem]))
  const missingIds = productIds.filter((id) => !productMap.has(id))

  type DbCombo = { id: string; nome: string; preco: number; ativo: boolean | null }
  const comboMap = new Map<string, DbCombo>()
  const comboQtyByItem = new Map<string, Map<string, number>>()
  if (missingIds.length > 0) {
    const { data: combos, error: combosError } = await supabase
      .from('combos')
      .select('id, nome, preco, ativo')
      .in('id', missingIds)
    if (combosError) throw new OrderCalculationError('Falha ao validar combos.')
    for (const combo of (combos ?? []) as DbCombo[]) comboMap.set(combo.id, combo)

    const foundComboIds = [...comboMap.keys()]
    if (foundComboIds.length > 0) {
      const { data: comboLines, error: comboLinesError } = await supabase
        .from('combo_itens')
        .select('combo_id, item_id, quantidade')
        .in('combo_id', foundComboIds)
      if (comboLinesError) throw new OrderCalculationError('Falha ao validar combos.')
      for (const line of comboLines ?? []) {
        const qtyByItem = comboQtyByItem.get(line.combo_id) ?? new Map<string, number>()
        qtyByItem.set(line.item_id, Math.max(1, Number(line.quantidade) || 1))
        comboQtyByItem.set(line.combo_id, qtyByItem)
      }
    }
  }

  const groupItemIds = [
    ...new Set([
      ...productIds.filter((id) => productMap.has(id)),
      ...[...comboQtyByItem.values()].flatMap((qtyByItem) => [...qtyByItem.keys()]),
    ]),
  ]

  const { data: groups, error: groupsError } = groupItemIds.length
    ? await supabase
        .from('item_opcao_grupos')
        .select('id, item_id, tipo, nome, obrigatorio, min_escolhas, max_escolhas')
        .in('item_id', groupItemIds)
    : { data: [], error: null }

  if (groupsError) {
    throw new OrderCalculationError('Falha ao validar opções do produto.')
  }

  const groupsByItem = new Map<string, DbGroup[]>()
  for (const g of (groups ?? []) as DbGroup[]) {
    const list = groupsByItem.get(g.item_id) ?? []
    list.push(g)
    groupsByItem.set(g.item_id, list)
  }

  const groupIds = ((groups ?? []) as DbGroup[]).map((g) => g.id)
  let options: DbOption[] = []
  if (groupIds.length > 0) {
    const { data: opts, error: optsError } = await supabase
      .from('item_opcoes')
      .select('id, grupo_id, label, price_delta, ativo, detail_info')
      .in('grupo_id', groupIds)

    if (optsError) {
      throw new OrderCalculationError('Falha ao validar opções do produto.')
    }
    options = (opts ?? []) as DbOption[]
  }

  const optionMap = new Map(options.map((o) => [o.id, o]))
  const groupMap = new Map(((groups ?? []) as DbGroup[]).map((g) => [g.id, g]))

  const choiceIds = [
    ...new Set(
      cart.flatMap((line) =>
        comboMap.has(line.id)
          ? (line.selectedOptions ?? [])
              .map((option) => option.optionId.split(':'))
              .filter((parts) => parts.length === 2)
              .map((parts) => parts[1])
          : []
      )
    ),
  ]
  const choiceNames = new Map<string, string>()
  if (choiceIds.length > 0) {
    const { data: choiceRows } = await supabase.from('itens_cardapio').select('id, nome').in('id', choiceIds)
    for (const row of choiceRows ?? []) choiceNames.set(row.id, row.nome)
  }

  const items: CalculatedOrderItem[] = []
  let subtotalCents = 0

  for (const line of cart) {
    const combo = comboMap.get(line.id)
    if (combo) {
      if (combo.ativo === false) {
        throw new OrderCalculationError(`Produto indisponível: ${combo.nome}.`)
      }
      if (line.quantity <= 0) throw new OrderCalculationError('Quantidade inválida.')

      const qtyByItem = comboQtyByItem.get(combo.id) ?? new Map<string, number>()
      let optionsCents = 0
      const selectedOptionsSnapshot: CalculatedOrderItem['selectedOptionsSnapshot'] = []

      for (const ref of line.selectedOptions ?? []) {
        const parts = ref.optionId.split(':')
        if (parts.length === 2) {
          selectedOptionsSnapshot.push({
            optionId: ref.optionId,
            groupId: parts[0],
            groupType: 'extra',
            groupName: 'Escolha',
            label: choiceNames.get(parts[1]) ?? 'Escolha',
            priceDeltaCents: 0,
          })
          continue
        }
        if (parts.length !== 3) {
          throw new OrderCalculationError('Opção inválida no combo.')
        }
        const [componentId, groupId, optionUuid] = parts
        const option = optionMap.get(optionUuid)
        if (!option || option.ativo === false) {
          throw new OrderCalculationError('Opção inválida ou inativa.')
        }
        const group = groupMap.get(option.grupo_id)
        if (!group || group.id !== groupId || group.item_id !== componentId || !qtyByItem.has(componentId)) {
          throw new OrderCalculationError('Opção não pertence ao combo.')
        }
        const deltaCents = dollarsToCents(Number(option.price_delta)) * (qtyByItem.get(componentId) ?? 1)
        optionsCents += deltaCents
        selectedOptionsSnapshot.push({
          optionId: ref.optionId,
          groupId: group.id,
          groupType: group.tipo,
          groupName: group.nome,
          label: option.label,
          priceDeltaCents: deltaCents,
          info: option.detail_info ?? null,
        })
      }

      const unitPriceCents = dollarsToCents(Number(combo.preco)) + optionsCents
      const totalPriceCents = unitPriceCents * line.quantity
      if (unitPriceCents < 0 || totalPriceCents <= 0) {
        throw new OrderCalculationError('Total do item inválido.')
      }
      subtotalCents += totalPriceCents
      items.push({
        itemId: combo.id,
        comboId: combo.id,
        productNameSnapshot: combo.nome,
        quantity: line.quantity,
        unitPriceCents,
        totalPriceCents,
        observation: line.observation?.trim() ? line.observation.trim() : null,
        selectedOptionsSnapshot,
      })
      continue
    }

    const product = productMap.get(line.id)
    if (!product) {
      throw new OrderCalculationError('Produto inexistente no cardápio.')
    }
    if (product.disponivel === false) {
      throw new OrderCalculationError(`Produto indisponível: ${product.nome}.`)
    }
    if (line.quantity <= 0) {
      throw new OrderCalculationError('Quantidade inválida.')
    }

    const itemGroups = groupsByItem.get(product.id) ?? []
    const selected = line.selectedOptions ?? []
    const selectedByGroup = new Map<string, string[]>()

    const selectedOptionsSnapshot: CalculatedOrderItem['selectedOptionsSnapshot'] = []
    let optionsCents = 0

    for (const ref of selected) {
      const option = optionMap.get(ref.optionId)
      if (!option || option.ativo === false) {
        throw new OrderCalculationError('Opção inválida ou inativa.')
      }
      const group = groupMap.get(option.grupo_id)
      if (!group || group.item_id !== product.id) {
        throw new OrderCalculationError('Opção não pertence ao produto.')
      }
      if (ref.groupId && ref.groupId !== group.id) {
        throw new OrderCalculationError('Grupo de opção inconsistente.')
      }

      const deltaCents = dollarsToCents(Number(option.price_delta))
      optionsCents += deltaCents
      selectedOptionsSnapshot.push({
        optionId: option.id,
        groupId: group.id,
        groupType: group.tipo,
        groupName: group.nome,
        label: option.label,
        priceDeltaCents: deltaCents,
        info: option.detail_info ?? null,
      })

      const ids = selectedByGroup.get(group.id) ?? []
      ids.push(option.id)
      selectedByGroup.set(group.id, ids)
    }

    for (const group of itemGroups) {
      const count = (selectedByGroup.get(group.id) ?? []).length
      const { min, max } = groupSelectionLimits(group)
      if (count < min || count > max) {
        throw new OrderCalculationError(
          `Seleção inválida para "${group.nome}" em ${product.nome}.`
        )
      }
    }

    const baseCents = dollarsToCents(Number(product.preco))
    const unitPriceCents = baseCents + optionsCents
    const totalPriceCents = unitPriceCents * line.quantity
    if (unitPriceCents < 0 || totalPriceCents <= 0) {
      throw new OrderCalculationError('Total do item inválido.')
    }

    subtotalCents += totalPriceCents
    items.push({
      itemId: product.id,
      comboId: null,
      productNameSnapshot: product.nome,
      quantity: line.quantity,
      unitPriceCents,
      totalPriceCents,
      observation: line.observation?.trim() ? line.observation.trim() : null,
      selectedOptionsSnapshot,
    })
  }

  if (subtotalCents <= 0) {
    throw new OrderCalculationError('Total do pedido inválido.')
  }

  return {
    fingerprint: buildCartFingerprint(cart),
    subtotalCents,
    totalCents: subtotalCents,
    currency: 'usd',
    items,
  }
}

export function calculatedTotalDollars(order: CalculatedOrder): number {
  return centsToDollars(order.totalCents)
}
