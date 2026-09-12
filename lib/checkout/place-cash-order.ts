import type { useCart } from '@/lib/cart-context'
import { customerToPayload, type CheckoutCustomer } from '@/lib/checkout-customer'

export type CustomerPaymentMethod = 'card' | 'cash'

export function buildCashCartPayload(items: ReturnType<typeof useCart>['items']) {
  return items.map(({ item, quantity, observation, selectedOptions, unitPrice }) => ({
    id: item.id,
    name: item.nome,
    quantity,
    unitAmount: unitPrice,
    categoria_id: item.categoria_id,
    observation,
    selectedOptions: selectedOptions.map((o) => ({
      optionId: o.optionId,
      groupType: o.groupType,
      groupName: o.groupName,
      label: o.label,
      priceDelta: o.priceDelta,
      info: o.info ?? null,
    })),
  }))
}

export async function placeCashOrder(opts: {
  customer: CheckoutCustomer
  items: ReturnType<typeof useCart>['items']
  promoCode?: string | null
}): Promise<{ orderId: string; orderNumber: string }> {
  const response = await fetch('/api/orders/cash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: customerToPayload(opts.customer),
      cart: buildCashCartPayload(opts.items),
      promoCode: opts.promoCode ?? null,
    }),
  })
  const data = await response.json()
  if (!response.ok || !data?.local_order_id) {
    throw new Error(data?.error ?? 'Falha ao criar pedido em dinheiro.')
  }
  return {
    orderId: String(data.local_order_id),
    orderNumber: String(data.order_number),
  }
}
