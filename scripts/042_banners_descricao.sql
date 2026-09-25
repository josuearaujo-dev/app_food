ALTER TABLE public.banners_home
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS descricao_en TEXT;

COMMENT ON COLUMN public.banners_home.descricao IS
  'Texto do cartão da oferta. Se vazio, o banner usa a descrição do produto ou do combo vinculado.';

COMMENT ON COLUMN public.banners_home.descricao_en IS
  'Texto do cartão da oferta em inglês. Se vazio, usa descricao.';
