import { NextResponse } from 'next/server'
import { parseCustomerPayload } from '@/lib/checkout-customer'
import { calculateOrderFromCart, OrderCalculationError } from '@/lib/checkout/calculate-order'
import {
  validatePrepareCheckoutPayload,
} from '@/lib/checkout/validation'
import {
  createPendingOrder,
  findReusablePendingOrder,
} from '@/lib/orders/repository'
import { getPaymentProvider } from '@/lib/clover/config'

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

    const parsedCustomer = parseCustomerPayload(body.customer)
    if (!parsedCustomer.ok) {
      return NextResponse.json({ error: parsedCustomer.message }, { status: 400 })
    }

    const calculated = await calculateOrderFromCart(parsedCart.data.cart)

    const reusable = await findReusablePendingOrder({
      fingerprint: calculated.fingerprint,
      email: parsedCustomer.customer.email,
      userId: parsedCustomer.customer.userId,
    })

    if (
      reusable &&
      reusable.total_cents === calculated.totalCents &&
      reusable.numero_pedido
    ) {
      return NextResponse.json({
        orderId: reusable.id,
        orderNumber: reusable.numero_pedido,
        totalCents: reusable.total_cents,
        currency: 'usd',
        reused: true,
      })
    }

    const created = await createPendingOrder({
      customer: parsedCustomer.customer,
      calculated,
    })

    return NextResponse.json({
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      totalCents: created.totalCents,
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
