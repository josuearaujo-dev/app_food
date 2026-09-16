import { calculateOrderTax } from '@/lib/order-tax'
import { centsToDollars, dollarsToCents } from '@/lib/checkout/validation'

/** Totais do pedido: subtotal + entrega + imposto (7.35%). */
export function computePayableTotals(input: {
  subtotalCents: number
  deliveryFeeCents?: number
}): {
  subtotalCents: number
  deliveryFeeCents: number
  taxCents: number
  totalCents: number
  subtotal: number
  deliveryFee: number
  taxAmount: number
  total: number
} {
  const subtotalCents = Math.max(0, Math.round(input.subtotalCents))
  const deliveryFeeCents = Math.max(0, Math.round(input.deliveryFeeCents ?? 0))
  const preTaxCents = subtotalCents + deliveryFeeCents
  const taxCents = dollarsToCents(calculateOrderTax(centsToDollars(preTaxCents)))
  const totalCents = preTaxCents + taxCents

  return {
    subtotalCents,
    deliveryFeeCents,
    taxCents,
    totalCents,
    subtotal: centsToDollars(subtotalCents),
    deliveryFee: centsToDollars(deliveryFeeCents),
    taxAmount: centsToDollars(taxCents),
    total: centsToDollars(totalCents),
  }
}

/** Totais a partir de valores em dólares (UI / cash). */
export function computePayableTotalsFromDollars(input: {
  subtotal: number
  deliveryFee?: number
}) {
  return computePayableTotals({
    subtotalCents: dollarsToCents(input.subtotal),
    deliveryFeeCents: dollarsToCents(input.deliveryFee ?? 0),
  })
}
