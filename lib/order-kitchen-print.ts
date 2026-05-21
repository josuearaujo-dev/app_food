import { createAdminClient } from '@/lib/supabase/admin'
import { calculateOrderTax } from '@/lib/order-tax'
import {
  buildKitchenReceiptText,
  createPrintNodeRawJob,
  getPrintNodeConfig,
} from '@/lib/printnode'

type PedidoItemRow = {
  item_id: string | null
  nome_item: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  observacao: string | null
  opcoes_selecionadas: unknown
}

type PedidoRow = {
  id: string
  criado_em: string
  valor_total: number
  valor_pago: number | null
  taxa_entrega: number | null
  cliente_nome: string | null
  cliente_telefone: string | null
  tipo_atendimento: 'take_out' | 'delivery' | null
  endereco_entrega: string | null
  origem_pagamento: string | null
  status_pagamento: string | null
  pedido_itens: PedidoItemRow[] | null
}

function mapOptionsFromJson(
  opcoes: unknown
): Array<{ label: string; groupName?: string; groupType: 'size' | 'quantity' | 'extra' }> {
  if (!Array.isArray(opcoes)) return []
  return opcoes
    .map((op) => {
      if (!op || typeof op !== 'object') return null
      const row = op as Record<string, unknown>
      const label = String(row.label ?? '').trim()
      if (!label) return null
      const groupType = row.groupType
      const gt =
        groupType === 'size' || groupType === 'quantity' || groupType === 'extra'
          ? groupType
          : 'extra'
      return {
        label,
        groupName: row.groupName != null ? String(row.groupName) : undefined,
        groupType: gt,
      }
    })
    .filter((x): x is { label: string; groupName?: string; groupType: 'size' | 'quantity' | 'extra' } =>
      Boolean(x)
    )
}

function paymentLineForPedido(
  order: Pick<PedidoRow, 'origem_pagamento' | 'status_pagamento'>
): string {
  if (
    order.origem_pagamento === 'cash_on_delivery' ||
    order.status_pagamento === 'pay_on_delivery'
  ) {
    return 'Dinheiro na entrega'
  }
  return 'Pago via PayPal'
}

export function buildKitchenReceiptFromPedido(
  order: PedidoRow,
  options?: { reprint?: boolean; categoryNameByItemId?: Map<string, string> }
) {
  const items = order.pedido_itens ?? []
  const orderNumber = order.id.replace(/-/g, '').slice(-8).toUpperCase()
  const subtotal = items.reduce((acc, it) => acc + Number(it.subtotal ?? 0), 0)
  const deliveryFee = Number(order.taxa_entrega ?? 0)
  const total = Number(order.valor_pago ?? order.valor_total ?? 0)
  const taxAmount = calculateOrderTax(Math.max(0, subtotal + deliveryFee))
  const discount = Math.max(0, Number((subtotal + deliveryFee + taxAmount - total).toFixed(2)))

  const receipt = buildKitchenReceiptText({
    orderNumber,
    createdAtISO: order.criado_em,
    customerName: order.cliente_nome?.trim() || '-',
    customerPhone: order.cliente_telefone?.trim() || '-',
    fulfillmentType: order.tipo_atendimento === 'delivery' ? 'delivery' : 'take_out',
    address: order.endereco_entrega,
    items: items.map((it) => ({
      name: it.nome_item,
      categoryName: it.item_id ? options?.categoryNameByItemId?.get(it.item_id) : null,
      quantity: Number(it.quantidade) || 1,
      unitAmount: Number(it.preco_unitario) || 0,
      subtotal: Number(it.subtotal) || 0,
      observation: it.observacao ?? undefined,
      options: mapOptionsFromJson(it.opcoes_selecionadas),
    })),
    subtotal,
    discount,
    deliveryFee,
    taxAmount,
    total,
    currency: '$',
    paymentLine: paymentLineForPedido(order),
    reprint: options?.reprint,
  })

  return { orderNumber, receipt }
}

export async function reprintPedidoKitchen(orderId: string) {
  const printCfg = await getPrintNodeConfig()
  if (!printCfg.apiKey) {
    throw new Error('API key do PrintNode nao configurada.')
  }
  if (!printCfg.printerId) {
    throw new Error('Impressora do PrintNode nao configurada.')
  }

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('pedidos')
    .select(
      'id, criado_em, valor_total, valor_pago, taxa_entrega, cliente_nome, cliente_telefone, tipo_atendimento, endereco_entrega, origem_pagamento, status_pagamento, pedido_itens(item_id, nome_item, quantidade, preco_unitario, subtotal, observacao, opcoes_selecionadas)'
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!order) {
    throw new Error('Pedido nao encontrado.')
  }

  const typedOrder = order as PedidoRow
  const itemIds = [
    ...new Set((typedOrder.pedido_itens ?? []).map((item) => item.item_id).filter(Boolean)),
  ] as string[]
  const categoryNameByItemId = new Map<string, string>()

  if (itemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from('itens_cardapio')
      .select('id, categorias(nome)')
      .in('id', itemIds)

    for (const item of (menuItems ?? []) as Array<{
      id: string
      categorias?: { nome?: string | null } | null
    }>) {
      categoryNameByItemId.set(item.id, item.categorias?.nome?.trim() || 'SEM CATEGORIA')
    }
  }

  const { orderNumber, receipt } = buildKitchenReceiptFromPedido(typedOrder, {
    reprint: true,
    categoryNameByItemId,
  })

  const printJobId = await createPrintNodeRawJob({
    apiKey: printCfg.apiKey,
    printerId: printCfg.printerId,
    title: `Pedido #${orderNumber} (reimpressao)`,
    content: receipt,
    source: 'Cadu Cakes & Lanches Admin',
    idempotencyKey: `pedido-${orderId}-reprint-${Date.now()}`,
  })

  return { printJobId, orderNumber }
}
