import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendMetaCapiEvent, sendTiktokEvent } from '@/lib/marketing/marketing-capi'
import { STOREFRONT_TRACK_EVENTS } from '@/lib/marketing/marketing-events'
import { getPublicMarketingConfig } from '@/lib/marketing/marketing.repository'
import { createAdminClient } from '@/lib/supabase/admin'

const eventSchema = z.object({
  name: z.enum(STOREFRONT_TRACK_EVENTS),
  eventId: z.string().trim().min(8).max(80),
  sourceUrl: z.string().url().max(2048).optional(),
  valueCents: z.number().int().min(0).max(50_000_000).optional(),
  currency: z.literal('USD').optional(),
  contents: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        name: z.string().trim().max(200).optional(),
        quantity: z.number().int().min(1).max(99),
        itemPriceCents: z.number().int().min(0).max(50_000_000),
        variantId: z.string().trim().max(80).optional(),
      })
    )
    .max(50)
    .optional(),
  orderId: z.string().trim().max(80).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().max(30).optional(),
  fbp: z.string().trim().max(200).optional(),
  fbc: z.string().trim().max(300).optional(),
})

function clientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 })

  try {
    const publicConfig = await getPublicMarketingConfig()
    if (!publicConfig.enableServerSide) return NextResponse.json({ ok: true })

    const supabase = createAdminClient()
    const { data: secrets } = await supabase
      .from('store_marketing_settings')
      .select('meta_capi_token, tiktok_events_token')
      .limit(1)
      .maybeSingle()

    const event = {
      name: parsed.data.name,
      eventId: parsed.data.eventId,
      currency: 'USD' as const,
      valueCents: parsed.data.valueCents,
      contents: parsed.data.contents,
      orderId: parsed.data.orderId,
    }
    const context = {
      event,
      sourceUrl: parsed.data.sourceUrl,
      email: parsed.data.email,
      phone: parsed.data.phone,
      clientIp: clientIp(request),
      userAgent: request.headers.get('user-agent'),
      fbp: parsed.data.fbp,
      fbc: parsed.data.fbc,
    }

    const jobs: Promise<boolean>[] = []
    if (publicConfig.metaPixelId && secrets?.meta_capi_token) {
      jobs.push(
        sendMetaCapiEvent({
          pixelId: publicConfig.metaPixelId,
          accessToken: secrets.meta_capi_token,
          ...context,
        })
      )
    }
    if (publicConfig.tiktokPixelId && secrets?.tiktok_events_token) {
      jobs.push(
        sendTiktokEvent({
          pixelId: publicConfig.tiktokPixelId,
          accessToken: secrets.tiktok_events_token,
          ...context,
        })
      )
    }
    await Promise.allSettled(jobs)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
