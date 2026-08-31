import type { CustomerPayload } from '@/lib/checkout-customer'

export type FulfillmentType = 'take_out' | 'delivery'

export type DeliveryLocation = {
  id: string
  nome: string
  taxaEntrega: number
}

export function resolveClientDeliveryFee(
  fulfillmentType: FulfillmentType,
  localidadeId: string | null,
  locations: DeliveryLocation[],
  defaultFee: number
): number {
  if (fulfillmentType !== 'delivery') return 0
  if (localidadeId) {
    const loc = locations.find((row) => row.id === localidadeId)
    if (loc) return loc.taxaEntrega
  }
  return defaultFee
}

export function buildOrderFingerprint(
  cartFingerprint: string,
  customer: Pick<CustomerPayload, 'fulfillmentType' | 'localidadeEntregaId' | 'enderecoEntrega'>
): string {
  const addr = (customer.enderecoEntrega ?? '').trim().toLowerCase()
  return `${cartFingerprint}|${customer.fulfillmentType}|${customer.localidadeEntregaId ?? ''}|${addr}`
}
