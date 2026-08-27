import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listOrdersForUser } from '@/lib/orders/customer-queries'
import { displayOrderNumber } from '@/lib/orders/order-presentation'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const orders = await listOrdersForUser(user.id)
    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        displayNumber: displayOrderNumber(o),
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao carregar pedidos.' },
      { status: 500 }
    )
  }
}
