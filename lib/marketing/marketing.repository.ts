import { createAdminClient } from '@/lib/supabase/admin'
import {
  emptyPublicMarketingConfig,
  normalizePublicId,
  type AdminMarketingSettings,
  type PublicMarketingConfig,
} from './marketing.schema'

type MarketingRow = {
  id?: string
  gtm_web_container_id: string | null
  meta_pixel_id: string | null
  ga4_measurement_id: string | null
  google_ads_conversion_id: string | null
  google_ads_conversion_label: string | null
  tiktok_pixel_id: string | null
  consent_version: string | null
  enable_measurement: boolean | null
  enable_marketing: boolean | null
  enable_advanced_matching: boolean | null
  enable_server_side: boolean | null
  require_storefront_consent: boolean | null
  meta_capi_token?: string | null
  tiktok_events_token?: string | null
}

const PUBLIC_COLUMNS = [
  'gtm_web_container_id',
  'meta_pixel_id',
  'ga4_measurement_id',
  'google_ads_conversion_id',
  'google_ads_conversion_label',
  'tiktok_pixel_id',
  'consent_version',
  'enable_measurement',
  'enable_marketing',
  'enable_advanced_matching',
  'enable_server_side',
  'require_storefront_consent',
].join(', ')

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

export function mapPublicMarketingRow(row: MarketingRow | null | undefined): PublicMarketingConfig {
  if (!row) return emptyPublicMarketingConfig
  return {
    gtmWebContainerId: normalizePublicId('gtm', row.gtm_web_container_id),
    metaPixelId: normalizePublicId('meta', row.meta_pixel_id),
    ga4MeasurementId: normalizePublicId('ga4', row.ga4_measurement_id),
    googleAdsConversionId: normalizePublicId('ads', row.google_ads_conversion_id),
    googleAdsConversionLabel: blankToNull(row.google_ads_conversion_label),
    tiktokPixelId: normalizePublicId('tiktok', row.tiktok_pixel_id),
    consentVersion: row.consent_version?.trim() || 'v1',
    enableMeasurement: row.enable_measurement ?? true,
    enableMarketing: row.enable_marketing ?? true,
    enableAdvancedMatching: row.enable_advanced_matching ?? true,
    enableServerSide: row.enable_server_side ?? true,
    requireStorefrontConsent: row.require_storefront_consent ?? false,
  }
}

export async function getPublicMarketingConfig(): Promise<PublicMarketingConfig> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('store_marketing_settings')
      .select(PUBLIC_COLUMNS)
      .limit(1)
      .maybeSingle()
    if (error) return emptyPublicMarketingConfig
    return mapPublicMarketingRow(data as MarketingRow | null)
  } catch {
    return emptyPublicMarketingConfig
  }
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (n: number) => {
        maybeSingle: () => Promise<{ data: MarketingRow | null; error: { message?: string } | null }>
      }
    }
  }
}

export async function getAdminMarketingSettings(
  supabase: SupabaseLike
): Promise<AdminMarketingSettings> {
  const { data, error } = await supabase
    .from('store_marketing_settings')
    .select(`${PUBLIC_COLUMNS}, meta_capi_token, tiktok_events_token`)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ...emptyPublicMarketingConfig, metaCapiConfigured: false, tiktokEventsConfigured: false }
  }
  const publicConfig = mapPublicMarketingRow(data)
  return {
    ...publicConfig,
    metaCapiConfigured: Boolean(data?.meta_capi_token?.trim()),
    tiktokEventsConfigured: Boolean(data?.tiktok_events_token?.trim()),
  }
}
