import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrderForEmail, getOrderForUser } from '@/lib/orders/customer-queries'
import { displayOrderNumber } from '@/lib/orders/order-presentation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
    }

    const url = new URL(request.url)
    const email = url.searchParams.get('email')?.trim()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let order = null
    if (user) {
      order = await getOrderForUser(id, user.id)
    }
    if (!order && email) {
      order = await getOrderForEmail(id, email)
    }

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
      { error: error instanceof Error ? error.message : 'Falha ao carregar pedido.' },
      { status: 500 }
    )
  }
}
