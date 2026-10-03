import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TOP = 6
const PAGE = 1000

/** Soma a quantidade vendida de cada produto e devolve os 6 que mais saíram. */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const totals = new Map<string, number>()
    let from = 0

    for (;;) {
      const { data, error } = await supabase
        .from('pedido_itens')
        .select('item_id, quantidade')
        .not('item_id', 'is', null)
        .range(from, from + PAGE - 1)

      if (error) {
        return NextResponse.json({ error: error.message, ids: [] }, { status: 500 })
      }

      const rows = data ?? []
      for (const row of rows) {
        const id = typeof row.item_id === 'string' ? row.item_id : ''
        const qty = Number(row.quantidade)
        if (!id || !Number.isFinite(qty) || qty <= 0) continue
        totals.set(id, (totals.get(id) ?? 0) + qty)
      }
      if (rows.length < PAGE) break
      from += PAGE
    }

    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
    if (!ranked.length) return NextResponse.json({ ids: [] })

    const { data: available, error: availableError } = await supabase
      .from('itens_cardapio')
      .select('id')
      .in('id', ranked.map(([id]) => id))
      .eq('disponivel', true)

    if (availableError) {
      return NextResponse.json({ error: availableError.message, ids: [] }, { status: 500 })
    }

    const onMenu = new Set((available ?? []).map((item) => item.id as string))
    const ids = ranked.filter(([id]) => onMenu.has(id)).slice(0, TOP).map(([id]) => id)
    return NextResponse.json({ ids })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao calcular os mais pedidos.', ids: [] },
      { status: 500 }
    )
  }
}
