import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminAppUser } from '@/lib/admin-access'
import {
  createManualCounterOrder,
  type CreateManualOrderInput,
} from '@/lib/orders/create-manual-order'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAdminAppUser(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const body = (await request.json()) as CreateManualOrderInput
    const result = await createManualCounterOrder(body)

    return NextResponse.json({
      ok: true,
      local_order_id: result.orderId,
      order_number: result.orderNumber,
      total: result.total,
      status: 'created',
      payment_method: 'counter',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao criar pedido manual.',
      },
      { status: 400 }
    )
  }
}
