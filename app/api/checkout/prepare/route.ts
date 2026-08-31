import { NextResponse } from 'next/server'
import { parseCustomerPayload } from '@/lib/checkout-customer'
import { buildOrderFingerprint } from '@/lib/checkout/fulfillment'
import { calculateOrderFromCart, OrderCalculationError } from '@/lib/checkout/calculate-order'
import { dollarsToCents } from '@/lib/checkout/validation'
import { validatePrepareCheckoutPayload } from '@/lib/checkout/validation'
import { createPendingOrder, findReusablePendingOrder } from '@/lib/orders/repository'
import { getPaymentProvider } from '@/lib/clover/config'
import { getDeliveryFeeAmount, listDeliveryLocations } from '@/lib/store-settings'

export async function POST(request: Request) {
  try {
    if (getPaymentProvider() !== 'clover') {
      return NextResponse.json(
        { error: 'Provedor de pagamento atual não é Clover.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsedCart = validatePrepareCheckoutPayload(body)
    if (!parsedCart.ok) {
      return NextResponse.json({ error: parsedCart.message }, { status: 400 })
    }

    const deliveryLocations = await listDeliveryLocations()
    const parsedCustomer = parseCustomerPayload(body.customer, {
      requireDeliveryLocation: deliveryLocations.length > 0,
    })
    if (!parsedCustomer.ok) {
      return NextResponse.json({ error: parsedCustomer.message }, { status: 400 })
    }

    const calculated = await calculateOrderFromCart(parsedCart.data.cart)
    const deliveryFeeDollars =
      parsedCustomer.customer.fulfillmentType === 'delivery'
        ? await getDeliveryFeeAmount(parsedCustomer.customer.localidadeEntregaId)
        : 0
    const deliveryFeeCents = dollarsToCents(deliveryFeeDollars)
    const totalCents = calculated.subtotalCents + deliveryFeeCents
    const orderFingerprint = buildOrderFingerprint(calculated.fingerprint, parsedCustomer.customer)

    const reusable = await findReusablePendingOrder({
      fingerprint: orderFingerprint,
      email: parsedCustomer.customer.email,
      userId: parsedCustomer.customer.userId,
    })

    if (reusable && reusable.total_cents === totalCents && reusable.numero_pedido) {
      return NextResponse.json({
        orderId: reusable.id,
        orderNumber: reusable.numero_pedido,
        totalCents: reusable.total_cents,
        deliveryFeeCents,
        currency: 'usd',
        reused: true,
      })
    }

    const created = await createPendingOrder({
      customer: parsedCustomer.customer,
      calculated,
      deliveryFeeCents,
      orderFingerprint,
    })

    return NextResponse.json({
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      totalCents: created.totalCents,
      deliveryFeeCents,
      currency: 'usd',
      reused: false,
    })
  } catch (error) {
    const message =
      error instanceof OrderCalculationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Falha ao preparar checkout.'
    const status = error instanceof OrderCalculationError ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
