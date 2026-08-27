import { NextResponse } from 'next/server'

export async function GET() {
  const serverEnv = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox'

  return NextResponse.json({
    serverEnv,
    hasClientId: Boolean(String(process.env.PAYPAL_CLIENT_ID ?? '').trim()),
    hasClientSecret: Boolean(String(process.env.PAYPAL_CLIENT_SECRET ?? '').trim()),
    hasWebhookId: Boolean(String(process.env.PAYPAL_WEBHOOK_ID ?? '').trim()),
  })
}
