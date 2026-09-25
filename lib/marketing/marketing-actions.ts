'use server'

import { revalidatePath } from 'next/cache'
import { isAdminAppUser } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
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

function saveErrorMessage(error: { code?: string; message?: string } | null) {
  const code = error?.code ?? ''
  const msg = (error?.message ?? '').toLowerCase()
  if (code === '42P01' || msg.includes('does not exist') || msg.includes('não existe')) {
    return 'Tabela de marketing não encontrada. Rode o SQL scripts/039_store_marketing_settings.sql no Supabase.'
  }
  if (code === '42501' || msg.includes('permission denied') || msg.includes('row-level security')) {
    return 'Sem permissão no banco para salvar marketing. Confira as policies RLS do SQL 039.'
  }
  if (msg.includes('jwt') || msg.includes('auth')) {
    return 'Sessão expirada. Entre de novo no admin e tente salvar.'
  }
  if (error?.message?.trim()) {
    return `Não foi possível salvar: ${error.message}`
  }
  return 'Não foi possível salvar o marketing. Tente de novo.'
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
    const tokenIssue = parsed.error.issues.some(
      (issue) =>
        issue.path.includes('metaCapiToken') || issue.path.includes('tiktokEventsToken')
    )
    if (tokenIssue) {
      return { ok: false, message: 'Token inválido ou longo demais. Cole o access token completo.' }
    }
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

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return {
      ok: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Sem ela o marketing não salva.',
    }
  }

  const { data: existing, error: readError } = await admin
    .from('store_marketing_settings')
    .select('id, meta_capi_token, tiktok_events_token')
    .limit(1)
    .maybeSingle()

  if (readError) {
    return { ok: false, message: saveErrorMessage(readError) }
  }

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
    ? await admin.from('store_marketing_settings').update(row).eq('id', existing.id)
    : await admin.from('store_marketing_settings').insert(row)

  if (error) {
    return { ok: false, message: saveErrorMessage(error) }
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/')
  return { ok: true }
}
