-- Marketing: pixels públicos no cardápio + tokens CAPI/TikTok só no servidor.
-- Singleton (loja única). Sem SELECT para anon — o cardápio lê via service role.

CREATE TABLE IF NOT EXISTS public.store_marketing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtm_web_container_id text,
  meta_pixel_id text,
  ga4_measurement_id text,
  google_ads_conversion_id text,
  google_ads_conversion_label text,
  tiktok_pixel_id text,
  consent_version text NOT NULL DEFAULT 'v1',
  enable_measurement boolean NOT NULL DEFAULT true,
  enable_marketing boolean NOT NULL DEFAULT true,
  enable_advanced_matching boolean NOT NULL DEFAULT true,
  enable_server_side boolean NOT NULL DEFAULT true,
  require_storefront_consent boolean NOT NULL DEFAULT false,
  meta_capi_token text,
  tiktok_events_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_marketing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_marketing_settings_select_authenticated" ON public.store_marketing_settings;
CREATE POLICY "store_marketing_settings_select_authenticated"
ON public.store_marketing_settings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "store_marketing_settings_insert_authenticated" ON public.store_marketing_settings;
CREATE POLICY "store_marketing_settings_insert_authenticated"
ON public.store_marketing_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "store_marketing_settings_update_authenticated" ON public.store_marketing_settings;
CREATE POLICY "store_marketing_settings_update_authenticated"
ON public.store_marketing_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.store_marketing_settings (consent_version)
SELECT 'v1'
WHERE NOT EXISTS (SELECT 1 FROM public.store_marketing_settings);
