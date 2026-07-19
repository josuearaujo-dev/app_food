import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Stub de webhook Clover.
 * MVP: registra o evento de forma idempotente.
 * Produção: validar assinatura/origem conforme documentação oficial antes de atualizar pedidos.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}

    const externalEventId = String(
      payload.id ?? payload.eventId ?? payload.event_id ?? crypto.randomUUID()
    )
    const eventType = String(payload.type ?? payload.eventType ?? 'unknown')

    const supabase = createAdminClient()
    const { error } = await supabase.from('payment_webhook_events').upsert(
      {
        provider: 'clover',
        external_event_id: externalEventId,
        event_type: eventType,
        payload_hash: Buffer.from(rawBody).toString('base64').slice(0, 128),
        status: 'received',
        processed_at: null,
      },
      { onConflict: 'provider,external_event_id', ignoreDuplicates: true }
    )

    if (error) {
      console.error('clover_webhook_store_failed', { eventType })
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
