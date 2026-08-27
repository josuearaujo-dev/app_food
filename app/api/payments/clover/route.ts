import { NextResponse } from 'next/server'
import { createCloverCharge, CloverChargeError } from '@/lib/clover/client'
import { getPaymentProvider } from '@/lib/clover/config'
import {
  claimOrderForPayment,
  getOrderById,
  markOrderPaid,
  markOrderPaymentFailed,
  markOrderReadyForPrint,
  rotateOrderIdempotencyKey,
} from '@/lib/orders/repository'

function chargeLooksPaid(charge: {
  paid?: boolean
  status?: string
  outcome?: { network_status?: string; type?: string }
}): boolean {
  const status = String(charge.status ?? '').toLowerCase()
  const networkStatus = String(charge.outcome?.network_status ?? '').toLowerCase()
  return (
    charge.paid === true ||
    status === 'succeeded' ||
    status === 'paid' ||
    networkStatus === 'approved_by_network'
  )
}

function chargeLooksDeclined(charge: { status?: string }): boolean {
  const status = String(charge.status ?? '').toLowerCase()
  return ['failed', 'declined', 'canceled', 'cancelled'].includes(status)
}

function clientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim()
  return undefined
}

export async function POST(request: Request) {
  try {
    if (getPaymentProvider() !== 'clover') {
      return NextResponse.json(
        { success: false, code: 'configuration_error', error: 'Provedor inválido.', retryable: false },
        { status: 400 }
      )
    }

    const body = (await request.json()) as { orderId?: string; source?: string }
    const orderId = String(body.orderId ?? '').trim()
    const source = String(body.source ?? '').trim()

    if (!orderId) {
      return NextResponse.json(
        { success: false, code: 'invalid_order', error: 'Pedido inválido.', retryable: false },
        { status: 400 }
      )
    }
    if (!source.startsWith('clv_')) {
      return NextResponse.json(
        { success: false, code: 'invalid_card', error: 'Token de cartão inválido.', retryable: false },
        { status: 400 }
      )
    }

    const order = await getOrderById(orderId)
    if (!order || order.origem_pagamento !== 'clover') {
      return NextResponse.json(
        { success: false, code: 'invalid_order', error: 'Pedido não encontrado.', retryable: false },
        { status: 404 }
      )
    }

    if (order.status_pagamento === 'paid') {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.numero_pedido ?? order.id.replace(/-/g, '').slice(-8).toUpperCase(),
        paymentStatus: 'paid',
        chargeId: order.clover_charge_id ?? '',
        amountCents: order.total_cents ?? Math.round(Number(order.valor_total) * 100),
      })
    }

    if (!['payment_pending', 'payment_failed', 'processing_payment'].includes(order.status_pagamento)) {
      return NextResponse.json(
        {
          success: false,
          code: 'invalid_order_status',
          error: 'Pedido não pode ser cobrado neste estado.',
          retryable: false,
        },
        { status: 409 }
      )
    }

    const totalCents = order.total_cents
    let idempotencyKey = order.idempotency_key
    if (!totalCents || totalCents <= 0 || !idempotencyKey) {
      return NextResponse.json(
        {
          success: false,
          code: 'configuration_error',
          error: 'Pedido incompleto para cobrança.',
          retryable: false,
        },
        { status: 400 }
      )
    }

    if (
      order.status_pagamento === 'payment_failed' ||
      (order.status_pagamento === 'processing_payment' && !order.clover_charge_id)
    ) {
      idempotencyKey = await rotateOrderIdempotencyKey(order.id)
    }

    if (order.status_pagamento !== 'processing_payment') {
      const claimed = await claimOrderForPayment(order.id)
      if (!claimed) {
        const latest = await getOrderById(order.id)
        if (latest?.status_pagamento === 'paid') {
          return NextResponse.json({
            success: true,
            orderId: latest.id,
            orderNumber: latest.numero_pedido ?? '',
            paymentStatus: 'paid',
            chargeId: latest.clover_charge_id ?? '',
            amountCents: latest.total_cents ?? totalCents,
          })
        }
        return NextResponse.json(
          {
            success: false,
            code: 'duplicate_payment',
            error: 'Pagamento já em processamento.',
            retryable: true,
          },
          { status: 409 }
        )
      }
    }

    try {
      const charge = await createCloverCharge({
        amount: totalCents,
        currency: 'usd',
        source,
        idempotencyKey,
        clientIp: clientIpFromRequest(request),
        description: `Pedido ${order.numero_pedido ?? order.id}`,
        receiptEmail: order.cliente_email ?? undefined,
        metadata: {
          orderId: order.id,
          orderNumber: order.numero_pedido ?? '',
        },
      })

      const paid = chargeLooksPaid(charge)

      if (!paid && charge.id && chargeLooksDeclined(charge)) {
        await markOrderPaymentFailed({
          orderId: order.id,
          code: 'card_declined',
          message: 'Pagamento recusado.',
        })
        console.error('clover_payment_failed', {
          orderId: order.id,
          orderNumber: order.numero_pedido,
          errorCode: 'card_declined',
          chargeStatus: charge.status,
          chargeOutcome: charge.outcome,
        })
        return NextResponse.json(
          {
            success: false,
            code: 'card_declined',
            error: 'Não foi possível aprovar o cartão. Confira os dados ou tente outro cartão.',
            retryable: true,
          },
          { status: 402 }
        )
      }

      if (!paid && charge.id) {
        await markOrderPaymentFailed({
          orderId: order.id,
          code: 'unknown_error',
          message: `Status inesperado: ${charge.status ?? 'sem status'}`,
        })
        console.error('clover_payment_failed', {
          orderId: order.id,
          orderNumber: order.numero_pedido,
          errorCode: 'unknown_status',
          chargeStatus: charge.status,
          chargeOutcome: charge.outcome,
          chargePaid: charge.paid,
        })
        return NextResponse.json(
          {
            success: false,
            code: 'unknown_error',
            error: 'Não foi possível confirmar o pagamento. Tente novamente.',
            retryable: true,
          },
          { status: 502 }
        )
      }

      await markOrderPaid({
        orderId: order.id,
        chargeId: charge.id,
        amountCents: charge.amount ?? totalCents,
        payload: {
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          paid: charge.paid,
          source: charge.source
            ? {
                brand: charge.source.brand,
                last4: charge.source.last4,
              }
            : undefined,
        },
      })

      await markOrderReadyForPrint(order.id)

      console.info('clover_payment_success', {
        orderId: order.id,
        orderNumber: order.numero_pedido,
        chargeId: charge.id,
        amountCents: charge.amount ?? totalCents,
      })

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.numero_pedido ?? '',
        paymentStatus: 'paid',
        chargeId: charge.id,
        amountCents: charge.amount ?? totalCents,
      })
    } catch (error) {
      if (error instanceof CloverChargeError) {
        await markOrderPaymentFailed({
          orderId: order.id,
          code: error.code,
          message: error.message,
        })
        console.error('clover_payment_failed', {
          orderId: order.id,
          orderNumber: order.numero_pedido,
          errorCode: error.code,
          httpStatus: error.httpStatus,
          providerMessage: error.message,
        })
        return NextResponse.json(
          {
            success: false,
            code: error.code,
            error: error.message,
            retryable: error.retryable,
          },
          { status: error.httpStatus >= 400 && error.httpStatus < 600 ? error.httpStatus : 502 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('clover_payment_failed', {
      errorCode: 'unknown_error',
      message: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json(
      {
        success: false,
        code: 'unknown_error',
        error: 'Não foi possível concluir o pagamento. Tente novamente.',
        retryable: true,
      },
      { status: 500 }
    )
  }
}
