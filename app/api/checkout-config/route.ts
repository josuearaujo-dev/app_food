import { NextResponse } from 'next/server'
import { getDeliveryFeeAmount, listDeliveryLocations } from '@/lib/store-settings'

export async function GET() {
  try {
    const deliveryFee = await getDeliveryFeeAmount()
    const locations = await listDeliveryLocations()
    return NextResponse.json({ deliveryFee, locations })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao carregar configuração do checkout.',
      },
      { status: 500 }
    )
  }
}
