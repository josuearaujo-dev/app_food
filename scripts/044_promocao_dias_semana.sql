ALTER TABLE public.promocoes
  ADD COLUMN IF NOT EXISTS dias_semana SMALLINT[];

ALTER TABLE public.banners_home
  ADD COLUMN IF NOT EXISTS dias_semana SMALLINT[];

ALTER TABLE public.promocoes
  DROP CONSTRAINT IF EXISTS promocoes_dias_semana_check;

ALTER TABLE public.banners_home
  DROP CONSTRAINT IF EXISTS banners_home_dias_semana_check;

ALTER TABLE public.promocoes
  ADD CONSTRAINT promocoes_dias_semana_check
  CHECK (dias_semana IS NULL OR dias_semana <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]);

ALTER TABLE public.banners_home
  ADD CONSTRAINT banners_home_dias_semana_check
  CHECK (dias_semana IS NULL OR dias_semana <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]);

COMMENT ON COLUMN public.promocoes.dias_semana IS
  'Dias em que a promoção vale e aparece. 0=domingo … 6=sábado. Vazio ou NULL = todos os dias.';

COMMENT ON COLUMN public.banners_home.dias_semana IS
  'Dias em que o banner aparece. 0=domingo … 6=sábado. Vazio ou NULL = todos os dias.';
