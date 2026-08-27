import { createAdminClient } from '@/lib/supabase/admin'
import type { CustomerOrderDetail, CustomerOrderSummary } from './order-presentation'

const ORDER_SELECT =
  'id, numero_pedido, status_pagamento, status_producao, valor_total, moeda, criado_em, pago_em, cliente_nome, cliente_email'

export async function listOrdersForUser(userId: string): Promise<CustomerOrderSummary[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pedidos')
    .select(ORDER_SELECT)
    .eq('cliente_user_id', userId)
    .eq('status_pagamento', 'paid')
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) throw error
  return (data ?? []) as CustomerOrderSummary[]
}

export async function listOrdersForEmail(email: string): Promise<CustomerOrderSummary[]> {
  const normalized = email.trim().toLowerCase()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pedidos')
    .select(ORDER_SELECT)
    .eq('cliente_email', normalized)
    .eq('status_pagamento', 'paid')
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) throw error
  return (data ?? []) as CustomerOrderSummary[]
}

export async function lookupOrderByNumberAndEmail(
  orderNumber: string,
  email: string
): Promise<CustomerOrderDetail | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedNumber = orderNumber.trim().toUpperCase().replace(/^#/, '')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('pedidos')
    .select(
      `${ORDER_SELECT}, pedido_itens(id, nome_item, quantidade, preco_unitario, subtotal, observacao, opcoes_selecionadas)`
    )
    .eq('cliente_email', normalizedEmail)
    .eq('status_pagamento', 'paid')
    .eq('numero_pedido', normalizedNumber)
    .maybeSingle()

  if (error) throw error
  return (data as CustomerOrderDetail | null) ?? null
}

export async function getOrderForUser(orderId: string, userId: string): Promise<CustomerOrderDetail | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      `${ORDER_SELECT}, pedido_itens(id, nome_item, quantidade, preco_unitario, subtotal, observacao, opcoes_selecionadas)`
    )
    .eq('id', orderId)
    .eq('cliente_user_id', userId)
    .eq('status_pagamento', 'paid')
    .maybeSingle()

  if (error) throw error
  return (data as CustomerOrderDetail | null) ?? null
}

export async function getOrderForEmail(
  orderId: string,
  email: string
): Promise<CustomerOrderDetail | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      `${ORDER_SELECT}, pedido_itens(id, nome_item, quantidade, preco_unitario, subtotal, observacao, opcoes_selecionadas)`
    )
    .eq('id', orderId)
    .eq('cliente_email', email.trim().toLowerCase())
    .eq('status_pagamento', 'paid')
    .maybeSingle()

  if (error) throw error
  return (data as CustomerOrderDetail | null) ?? null
}
