import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminAppUser } from '@/lib/admin-access'
import { reprintPedidoKitchen } from '@/lib/order-kitchen-print'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAdminAppUser(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const { orderId } = await params
    if (!orderId?.trim()) {
      return NextResponse.json({ error: 'ID do pedido ausente.' }, { status: 400 })
    }

    const { printJobId, orderNumber } = await reprintPedidoKitchen(orderId.trim())

    return NextResponse.json({
      ok: true,
      printJobId,
      orderNumber,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao reimprimir pedido.',
      },
      { status: 500 }
    )
  }
}
