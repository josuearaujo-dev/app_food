export type KitchenStatus = 'new' | 'preparing' | 'delivered'

export type CustomerOrderSummary = {
  id: string
  numero_pedido: string | null
  status_pagamento: string
  status_producao: KitchenStatus
  valor_total: number
  moeda: string
  criado_em: string
  pago_em: string | null
  cliente_nome: string | null
}

export type CustomerOrderItem = {
  id: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  observacao: string | null
  opcoes_selecionadas: Array<{ label: string; groupName?: string }> | null
}

export type CustomerOrderDetail = CustomerOrderSummary & {
  cliente_email: string | null
  pedido_itens: CustomerOrderItem[]
}

export function displayOrderNumber(order: { numero_pedido: string | null; id: string }): string {
  return order.numero_pedido ?? order.id.replace(/-/g, '').slice(-8).toUpperCase()
}

export function paymentStatusLabel(status: string, lang: 'en' | 'pt'): string {
  const map: Record<string, { en: string; pt: string }> = {
    paid: { en: 'Paid', pt: 'Pago' },
    payment_pending: { en: 'Pending payment', pt: 'Aguardando pagamento' },
    payment_failed: { en: 'Payment failed', pt: 'Pagamento falhou' },
    processing_payment: { en: 'Processing', pt: 'Processando' },
  }
  return map[status]?.[lang] ?? status
}

export function kitchenStatusLabel(status: KitchenStatus, lang: 'en' | 'pt'): string {
  const map: Record<KitchenStatus, { en: string; pt: string }> = {
    new: { en: 'Order received', pt: 'Pedido recebido' },
    preparing: { en: 'Preparing', pt: 'Em preparo' },
    delivered: { en: 'Ready / delivered', pt: 'Pronto / entregue' },
  }
  return map[status]?.[lang] ?? status
}

export function formatOrderDate(iso: string, lang: 'en' | 'pt'): string {
  try {
    return new Date(iso).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
