import { NextResponse } from 'next/server'
import { lookupOrderByNumberAndEmail } from '@/lib/orders/customer-queries'
import { displayOrderNumber } from '@/lib/orders/order-presentation'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orderNumber?: string; email?: string }
    const orderNumber = String(body.orderNumber ?? '').trim()
    const email = String(body.email ?? '').trim()

    if (!orderNumber || orderNumber.length < 4) {
      return NextResponse.json({ error: 'Número do pedido inválido.' }, { status: 400 })
    }
    if (!email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }

    const order = await lookupOrderByNumberAndEmail(orderNumber, email)
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        ...order,
        displayNumber: displayOrderNumber(order),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na consulta.' },
      { status: 500 }
    )
  }
}
