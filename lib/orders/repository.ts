import { createAdminClient } from '@/lib/supabase/admin'
import type { CustomerPayload } from '@/lib/checkout-customer'
import type { CalculatedOrder } from '@/lib/checkout/calculate-order'
import { centsToDollars } from '@/lib/checkout/validation'

export type LocalOrderRow = {
  id: string
  numero_pedido: string | null
  status_pagamento: string
  total_cents: number | null
  valor_total: number
  moeda: string
  idempotency_key: string | null
  clover_charge_id: string | null
  cart_fingerprint: string | null
  cliente_user_id: string | null
  cliente_email: string | null
  origem_pagamento: string | null
}

function generateOrderNumber(): string {
  const part = crypto.randomUUID().replace(/-/g, '').slice(-8).toUpperCase()
  return part
}

export async function createPendingOrder(input: {
  customer: CustomerPayload
  calculated: CalculatedOrder
}): Promise<{ orderId: string; orderNumber: string; totalCents: number }> {
  const supabase = createAdminClient()
  const idempotencyKey = crypto.randomUUID()
  const numeroPedido = generateOrderNumber()
  const totalDollars = centsToDollars(input.calculated.totalCents)

  const { data: order, error } = await supabase
    .from('pedidos')
    .insert({
      numero_pedido: numeroPedido,
      idempotency_key: idempotencyKey,
      status_pagamento: 'payment_pending',
      status_producao: 'new',
      valor_total: totalDollars,
      subtotal_cents: input.calculated.subtotalCents,
      total_cents: input.calculated.totalCents,
      moeda: 'USD',
      origem_pagamento: 'clover',
      cart_fingerprint: input.calculated.fingerprint,
      cliente_nome: input.customer.nome,
      cliente_email: input.customer.email,
      cliente_telefone: input.customer.telefone,
      cliente_user_id: input.customer.userId,
      cliente_aceita_sms_atualizacoes: input.customer.aceitaSmsAtualizacoes,
      cliente_aceita_email_atualizacoes: input.customer.aceitaEmailAtualizacoes,
      cliente_consentiu_salvar_cartao: false,
    })
    .select('id, numero_pedido, total_cents')
    .single()

  if (error || !order) {
    throw new Error(error?.message ?? 'Falha ao criar pedido local.')
  }

  const { error: itemsError } = await supabase.from('pedido_itens').insert(
    input.calculated.items.map((item) => ({
      pedido_id: order.id,
      item_id: item.itemId,
      nome_item: item.productNameSnapshot,
      quantidade: item.quantity,
      preco_unitario: centsToDollars(item.unitPriceCents),
      subtotal: centsToDollars(item.totalPriceCents),
      observacao: item.observation,
      opcoes_selecionadas: item.selectedOptionsSnapshot.length
        ? item.selectedOptionsSnapshot.map((o) => ({
            optionId: o.optionId,
            groupType: o.groupType,
            groupName: o.groupName,
            label: o.label,
            priceDelta: centsToDollars(o.priceDeltaCents),
            info: o.info ?? null,
          }))
        : null,
    }))
  )

  if (itemsError) {
    await supabase.from('pedidos').delete().eq('id', order.id)
    throw new Error(itemsError.message)
  }

  return {
    orderId: order.id,
    orderNumber: order.numero_pedido ?? numeroPedido,
    totalCents: order.total_cents ?? input.calculated.totalCents,
  }
}

export async function findReusablePendingOrder(input: {
  fingerprint: string
  email: string
  userId: string | null
}): Promise<LocalOrderRow | null> {
  const supabase = createAdminClient()
  let query = supabase
    .from('pedidos')
    .select(
      'id, numero_pedido, status_pagamento, total_cents, valor_total, moeda, idempotency_key, clover_charge_id, cart_fingerprint, cliente_user_id, cliente_email, origem_pagamento'
    )
    .eq('origem_pagamento', 'clover')
    .eq('cart_fingerprint', input.fingerprint)
    .in('status_pagamento', ['payment_pending', 'payment_failed'])
    .order('criado_em', { ascending: false })
    .limit(1)

  if (input.userId) {
    query = query.eq('cliente_user_id', input.userId)
  } else {
    query = query.eq('cliente_email', input.email)
  }

  const { data } = await query.maybeSingle()
  return (data as LocalOrderRow | null) ?? null
}

export async function getOrderById(orderId: string): Promise<LocalOrderRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('pedidos')
    .select(
      'id, numero_pedido, status_pagamento, total_cents, valor_total, moeda, idempotency_key, clover_charge_id, cart_fingerprint, cliente_user_id, cliente_email, origem_pagamento'
    )
    .eq('id', orderId)
    .maybeSingle()
  return (data as LocalOrderRow | null) ?? null
}

export async function claimOrderForPayment(orderId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pedidos')
    .update({ status_pagamento: 'processing_payment' })
    .eq('id', orderId)
    .in('status_pagamento', ['payment_pending', 'payment_failed'])
    .select('id')
    .maybeSingle()

  if (error) throw error
  return !!data
}

export async function markOrderPaid(input: {
  orderId: string
  chargeId: string
  amountCents: number
  payload: Record<string, unknown>
}): Promise<void> {
  const supabase = createAdminClient()
  const dollars = centsToDollars(input.amountCents)
  const { error } = await supabase
    .from('pedidos')
    .update({
      status_pagamento: 'paid',
      clover_charge_id: input.chargeId,
      valor_pago: dollars,
      valor_bruto: dollars,
      valor_liquido: dollars,
      total_cents: input.amountCents,
      pago_em: new Date().toISOString(),
      falhou_em: null,
      falha_codigo: null,
      falha_mensagem: null,
      payload_pagamento: input.payload,
    })
    .eq('id', input.orderId)

  if (error) throw error
}

export async function markOrderPaymentFailed(input: {
  orderId: string
  code: string
  message: string
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('pedidos')
    .update({
      status_pagamento: 'payment_failed',
      falhou_em: new Date().toISOString(),
      falha_codigo: input.code,
      falha_mensagem: input.message,
    })
    .eq('id', input.orderId)
}

export async function markOrderReadyForPrint(orderId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('print_jobs').upsert(
    {
      order_id: orderId,
      status: 'pending',
      attempts: 0,
      last_error: null,
    },
    { onConflict: 'order_id', ignoreDuplicates: true }
  )
}
