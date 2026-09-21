import type { CartItem } from '@/lib/cart-context'
import { dollarsToCents } from '@/lib/checkout/validation'
import {
  cartEvent,
  contentsFromCartItems,
  viewContentEvent,
  type StorefrontTrackEventName,
} from './marketing-events'
import { trackStorefrontEvent } from './storefront-tracker'

export function cartContentsFromItems(items: CartItem[]) {
  return contentsFromCartItems(
    items.map((ci) => ({
      productId: ci.item.id,
      name: ci.item.nome,
      quantity: ci.quantity,
      price: dollarsToCents(ci.unitPrice),
    }))
  )
}

export function trackViewContentProduct(product: {
  id: string
  name: string
  priceDollars: number
  variantId?: string
}) {
  trackStorefrontEvent(
    viewContentEvent({
      id: product.id,
      name: product.name,
      priceCents: dollarsToCents(product.priceDollars),
      variantId: product.variantId,
    })
  )
}

export function trackCartFunnel(
  name: Extract<
    StorefrontTrackEventName,
    'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase'
  >,
  items: CartItem[],
  valueDollars: number,
  orderId?: string
) {
  trackStorefrontEvent(
    cartEvent(name, cartContentsFromItems(items), dollarsToCents(valueDollars), orderId)
  )
}
