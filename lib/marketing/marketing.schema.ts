import { z } from "zod";

const optionalText = z.string().trim().max(80).optional();
/** Meta/TikTok access tokens costumam passar de 512 caracteres. */
const optionalToken = z.string().trim().max(4096).optional();

export const marketingSettingsInputSchema = z.object({
  gtmWebContainerId: optionalText,
  metaPixelId: optionalText,
  ga4MeasurementId: optionalText,
  googleAdsConversionId: optionalText,
  googleAdsConversionLabel: optionalText,
  tiktokPixelId: optionalText,
  consentVersion: z.string().trim().min(1).max(20).default("v1"),
  enableMeasurement: z.boolean(),
  enableMarketing: z.boolean(),
  enableAdvancedMatching: z.boolean(),
  enableServerSide: z.boolean(),
  requireStorefrontConsent: z.boolean(),
  metaCapiToken: optionalToken,
  tiktokEventsToken: optionalToken,
  clearMetaCapiToken: z.boolean().optional(),
  clearTiktokEventsToken: z.boolean().optional(),
});

export type MarketingSettingsInput = z.infer<typeof marketingSettingsInputSchema>;

export type PublicMarketingConfig = {
  gtmWebContainerId: string | null;
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
  googleAdsConversionId: string | null;
  googleAdsConversionLabel: string | null;
  tiktokPixelId: string | null;
  consentVersion: string;
  enableMeasurement: boolean;
  enableMarketing: boolean;
  enableAdvancedMatching: boolean;
  enableServerSide: boolean;
  requireStorefrontConsent: boolean;
};

export type AdminMarketingSettings = PublicMarketingConfig & {
  metaCapiConfigured: boolean;
  tiktokEventsConfigured: boolean;
};

export const emptyPublicMarketingConfig: PublicMarketingConfig = {
  gtmWebContainerId: null,
  metaPixelId: null,
  ga4MeasurementId: null,
  googleAdsConversionId: null,
  googleAdsConversionLabel: null,
  tiktokPixelId: null,
  consentVersion: "v1",
  enableMeasurement: true,
  enableMarketing: true,
  enableAdvancedMatching: true,
  enableServerSide: true,
  requireStorefrontConsent: false,
};

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function normalizePublicId(kind: "gtm" | "meta" | "ga4" | "ads" | "tiktok", value: string | null | undefined) {
  const trimmed = blankToNull(value);
  if (!trimmed) return null;
  if (kind === "gtm" && !/^GTM-[A-Z0-9]+$/i.test(trimmed)) return null;
  if (kind === "meta" && !/^\d{5,20}$/.test(trimmed)) return null;
  if (kind === "ga4" && !/^G-[A-Z0-9]+$/i.test(trimmed)) return null;
  if (kind === "ads" && !/^AW-\d+$/i.test(trimmed)) return null;
  if (kind === "tiktok" && !/^[A-Z0-9]{6,40}$/i.test(trimmed)) return null;
  return trimmed;
}

export function toPublicMarketingConfig(input: Pick<
  MarketingSettingsInput,
  | "gtmWebContainerId"
  | "metaPixelId"
  | "ga4MeasurementId"
  | "googleAdsConversionId"
  | "googleAdsConversionLabel"
  | "tiktokPixelId"
  | "consentVersion"
  | "enableMeasurement"
  | "enableMarketing"
  | "enableAdvancedMatching"
  | "enableServerSide"
  | "requireStorefrontConsent"
>): PublicMarketingConfig {
  return {
    gtmWebContainerId: normalizePublicId("gtm", input.gtmWebContainerId),
    metaPixelId: normalizePublicId("meta", input.metaPixelId),
    ga4MeasurementId: normalizePublicId("ga4", input.ga4MeasurementId),
    googleAdsConversionId: normalizePublicId("ads", input.googleAdsConversionId),
    googleAdsConversionLabel: blankToNull(input.googleAdsConversionLabel),
    tiktokPixelId: normalizePublicId("tiktok", input.tiktokPixelId),
    consentVersion: input.consentVersion.trim() || "v1",
    enableMeasurement: input.enableMeasurement,
    enableMarketing: input.enableMarketing,
    enableAdvancedMatching: input.enableAdvancedMatching,
    enableServerSide: input.enableServerSide,
    requireStorefrontConsent: input.requireStorefrontConsent,
  };
}

export type PixelInstallPlan = {
  gtm: string | null;
  meta: string | null;
  ga4: string | null;
  ads: string | null;
  adsLabel: string | null;
  tiktok: string | null;
};

export function pixelsToInstall(
  config: PublicMarketingConfig | null | undefined,
  consent: "unknown" | "granted" | "denied" = "granted",
): PixelInstallPlan {
  const empty: PixelInstallPlan = { gtm: null, meta: null, ga4: null, ads: null, adsLabel: null, tiktok: null };
  if (!config) return empty;
  const allowed = !config.requireStorefrontConsent || consent === "granted";
  if (!allowed) return empty;
  const marketingOn = config.enableMarketing;
  const measurementOn = config.enableMeasurement;
  if (!marketingOn && !measurementOn) return empty;
  return {
    gtm: config.gtmWebContainerId,
    meta: marketingOn ? config.metaPixelId : null,
    ga4: measurementOn ? config.ga4MeasurementId : null,
    ads: marketingOn ? config.googleAdsConversionId : null,
    adsLabel: marketingOn ? config.googleAdsConversionLabel : null,
    tiktok: marketingOn ? config.tiktokPixelId : null,
  };
}

export function trackingHasPixels(plan: PixelInstallPlan) {
  return Boolean(plan.gtm || plan.meta || plan.ga4 || plan.ads || plan.tiktok);
}
