'use server'

import { revalidatePath } from 'next/cache'
import { isAdminAppUser } from '@/lib/admin-access'
import { createClient } from '@/lib/supabase/server'
import {
  marketingSettingsInputSchema,
  toPublicMarketingConfig,
} from './marketing.schema'

export type SaveMarketingResult = { ok: true } | { ok: false; message: string }

function blankToNull(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

export async function saveMarketingSettings(input: unknown): Promise<SaveMarketingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminAppUser(user)) {
    return { ok: false, message: 'Sem permissão para alterar o marketing.' }
  }

  const parsed = marketingSettingsInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Revise os IDs. Use o formato oficial de cada plataforma.' }
  }

  const publicConfig = toPublicMarketingConfig(parsed.data)
  if (parsed.data.gtmWebContainerId?.trim() && !publicConfig.gtmWebContainerId) {
    return { ok: false, message: 'GTM inválido. Use o formato GTM-XXXXXXX.' }
  }
  if (parsed.data.metaPixelId?.trim() && !publicConfig.metaPixelId) {
    return { ok: false, message: 'Meta Pixel ID inválido. Use só os números do pixel.' }
  }
  if (parsed.data.ga4MeasurementId?.trim() && !publicConfig.ga4MeasurementId) {
    return { ok: false, message: 'GA4 inválido. Use o formato G-XXXXXXXXXX.' }
  }
  if (parsed.data.googleAdsConversionId?.trim() && !publicConfig.googleAdsConversionId) {
    return { ok: false, message: 'Google Ads inválido. Use o formato AW-123456789.' }
  }
  if (parsed.data.tiktokPixelId?.trim() && !publicConfig.tiktokPixelId) {
    return { ok: false, message: 'TikTok Pixel ID inválido.' }
  }

  const { data: existing } = await supabase
    .from('store_marketing_settings')
    .select('id, meta_capi_token, tiktok_events_token')
    .limit(1)
    .maybeSingle()

  let metaCapiToken = existing?.meta_capi_token ?? null
  if (parsed.data.clearMetaCapiToken) metaCapiToken = null
  else if (blankToNull(parsed.data.metaCapiToken)) metaCapiToken = blankToNull(parsed.data.metaCapiToken)

  let tiktokEventsToken = existing?.tiktok_events_token ?? null
  if (parsed.data.clearTiktokEventsToken) tiktokEventsToken = null
  else if (blankToNull(parsed.data.tiktokEventsToken)) {
    tiktokEventsToken = blankToNull(parsed.data.tiktokEventsToken)
  }

  const row = {
    gtm_web_container_id: publicConfig.gtmWebContainerId,
    meta_pixel_id: publicConfig.metaPixelId,
    ga4_measurement_id: publicConfig.ga4MeasurementId,
    google_ads_conversion_id: publicConfig.googleAdsConversionId,
    google_ads_conversion_label: publicConfig.googleAdsConversionLabel,
    tiktok_pixel_id: publicConfig.tiktokPixelId,
    consent_version: publicConfig.consentVersion,
    enable_measurement: publicConfig.enableMeasurement,
    enable_marketing: publicConfig.enableMarketing,
    enable_advanced_matching: publicConfig.enableAdvancedMatching,
    enable_server_side: publicConfig.enableServerSide,
    require_storefront_consent: publicConfig.requireStorefrontConsent,
    meta_capi_token: metaCapiToken,
    tiktok_events_token: tiktokEventsToken,
    updated_at: new Date().toISOString(),
  }

  const { error } = existing?.id
    ? await supabase.from('store_marketing_settings').update(row).eq('id', existing.id)
    : await supabase.from('store_marketing_settings').insert(row)

  if (error) {
    return { ok: false, message: 'Não foi possível salvar o marketing. Tente de novo.' }
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/')
  return { ok: true }
}
