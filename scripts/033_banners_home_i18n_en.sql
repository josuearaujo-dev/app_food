ALTER TABLE public.banners_home
  ADD COLUMN IF NOT EXISTS imagem_url_en TEXT;

COMMENT ON COLUMN public.banners_home.imagem_url_en IS
  'Imagem do banner para inglês (opcional). Se vazio, usa imagem_url.';

