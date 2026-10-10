import { createAdminClient } from '@/lib/supabase/admin'
import { calculateOrderTax } from '@/lib/order-tax'
import { scheduleKitchenPrint } from '@/lib/print-queue'

export type ManualOrderPaymentMethod = 'cash' | 'card_at_counter'

export type ManualOrderItemInput = {
  id: string
  combo_id?: string | null
  name: string
  quantity: number
  unitAmount: number
  categoria_id?: string | null
  observation?: string
  selectedOptions?: Array<{
    optionId: string
    groupType: 'size' | 'quantity' | 'extra'
    groupName?: string
    label: string
    priceDelta: number
    info?: string | null
  }>
}

export type CreateManualOrderInput = {
  customerName?: string
  paymentMethod?: ManualOrderPaymentMethod
  note?: string
  items: ManualOrderItemInput[]
}

export type CreateManualOrderResult = {
  orderId: string
  orderNumber: string
  total: number
}

function generateOrderNumber(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(-8).toUpperCase()
}

export async function createManualCounterOrder(
  input: CreateManualOrderInput
): Promise<CreateManualOrderResult> {
  const safeItems = (input.items ?? []).map((item) => ({
    id: item.id,
    combo_id: item.combo_id ?? null,
    name: item.name.trim(),
    quantity: Math.max(1, Number(item.quantity) || 1),
    unitAmount: Math.max(0, Number(item.unitAmount) || 0),
    categoria_id: item.categoria_id ?? null,
    observation: (item.observation ?? '').trim(),
    selectedOptions: (item.selectedOptions ?? []).map((opt) => ({
      optionId: String(opt.optionId),
      groupType: opt.groupType,
      groupName: opt.groupName,
      label: String(opt.label),
      priceDelta: Number(opt.priceDelta ?? 0),
      info: opt.info ?? null,
    })),
  }))

  const subtotal = safeItems.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0)
  if (subtotal <= 0 || safeItems.length === 0) {
    throw new Error('Adicione ao menos um item ao pedido.')
  }

  const taxAmount = calculateOrderTax(subtotal)
  const payable = Number((subtotal + taxAmount).toFixed(2))
  const paymentMethod: ManualOrderPaymentMethod =
    input.paymentMethod === 'card_at_counter' ? 'card_at_counter' : 'cash'
  const customerName = (input.customerName ?? '').trim() || 'Balcão'
  const orderNote = (input.note ?? '').trim()
  const numeroPedido = generateOrderNumber()
  const nowIso = new Date().toISOString()

  const supabase = createAdminClient()

  const { data: insertedOrder, error: insertOrderError } = await supabase
    .from('pedidos')
    .insert({
      numero_pedido: numeroPedido,
      paypal_order_id: null,
      paypal_capture_id: null,
      status_pagamento: 'paid',
      status_producao: 'new',
      valor_total: payable,
      moeda: 'USD',
      valor_pago: payable,
      valor_bruto: payable,
      valor_liquido: payable,
      taxa_entrega: 0,
      pago_em: nowIso,
      origem_pagamento: 'counter',
      tipo_atendimento: 'take_out',
      cliente_nome: customerName,
      cliente_email: null,
      cliente_telefone: null,
      cliente_user_id: null,
      payload_pagamento: {
        method: 'counter',
        paymentMethod,
        total: payable,
        currency: 'USD',
        note: orderNote || null,
      },
    })
    .select('id')
    .single()

  if (insertOrderError || !insertedOrder?.id) {
    throw new Error(insertOrderError?.message ?? 'Erro ao gravar pedido.')
  }

  const orderId = insertedOrder.id

  const { error: insertItemsError } = await supabase.from('pedido_itens').insert(
    safeItems.map((item) => ({
      pedido_id: orderId,
      item_id: item.combo_id ? null : item.id,
      combo_id: item.combo_id ?? null,
      nome_item: item.name,
      quantidade: item.quantity,
      preco_unitario: item.unitAmount,
      subtotal: Number((item.quantity * item.unitAmount).toFixed(2)),
      observacao: item.observation || orderNote || null,
      opcoes_selecionadas: item.selectedOptions.length ? item.selectedOptions : null,
    }))
  )

  if (insertItemsError) {
    await supabase.from('pedidos').delete().eq('id', orderId)
    throw new Error(insertItemsError.message)
  }

  try {
    await scheduleKitchenPrint(orderId)
  } catch (printError) {
    console.error('[PrintNode] Falha ao enfileirar pedido (balcão)', {
      orderId,
      error: printError instanceof Error ? printError.message : String(printError),
    })
  }

  return {
    orderId,
    orderNumber: numeroPedido,
    total: payable,
  }
}
