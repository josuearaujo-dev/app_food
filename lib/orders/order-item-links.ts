import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export type OrderItemLink = {
  item_id: string | null
  combo_id: string | null
}

export const ORDER_ITEM_MISSING =
  'Um item do carrinho não está mais no cardápio. Atualize o carrinho e tente de novo.'

export async function linksForOrderItems(
  supabase: AdminClient,
  rows: Array<{ id: string; comboId?: string | null }>
): Promise<OrderItemLink[]> {
  const ids = [
    ...new Set(
      rows.flatMap((row) => [row.comboId, row.id].filter((value): value is string => Boolean(value)))
    ),
  ]

  const itemIds = new Set<string>()
  const comboIds = new Set<string>()

  if (ids.length > 0) {
    const [itemsRes, combosRes] = await Promise.all([
      supabase.from('itens_cardapio').select('id').in('id', ids),
      supabase.from('combos').select('id').in('id', ids),
    ])
    if (itemsRes.error) throw new Error(itemsRes.error.message)
    if (combosRes.error) throw new Error(combosRes.error.message)
    for (const row of itemsRes.data ?? []) itemIds.add(row.id)
    for (const row of combosRes.data ?? []) comboIds.add(row.id)
  }

  return rows.map((row) => {
    const explicitCombo = row.comboId?.trim() || null
    if (explicitCombo) {
      if (!comboIds.has(explicitCombo)) throw new Error(ORDER_ITEM_MISSING)
      return { item_id: null, combo_id: explicitCombo }
    }
    if (comboIds.has(row.id)) return { item_id: null, combo_id: row.id }
    if (itemIds.has(row.id)) return { item_id: row.id, combo_id: null }
    throw new Error(ORDER_ITEM_MISSING)
  })
}
