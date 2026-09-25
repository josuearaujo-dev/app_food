ALTER TABLE public.banners_home
  ADD COLUMN IF NOT EXISTS preco_riscado NUMERIC(10, 2);

ALTER TABLE public.banners_home
  DROP CONSTRAINT IF EXISTS banners_home_preco_riscado_check;

ALTER TABLE public.banners_home
  ADD CONSTRAINT banners_home_preco_riscado_check
  CHECK (preco_riscado IS NULL OR preco_riscado > 0);

COMMENT ON COLUMN public.banners_home.preco_riscado IS
  'Preço original exibido riscado no banner quando o destino é um produto. O preço verde continua sendo o do item no cardápio.';
