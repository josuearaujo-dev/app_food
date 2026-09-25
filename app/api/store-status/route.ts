import { NextResponse } from 'next/server'
import { isStoreAcceptingOrders } from '@/lib/store-settings'

export async function GET() {
  const acceptingOrders = await isStoreAcceptingOrders()
  return NextResponse.json({ acceptingOrders })
}
