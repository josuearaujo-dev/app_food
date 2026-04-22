CREATE TABLE IF NOT EXISTS public.banners_home (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  destino_tipo TEXT
    CHECK (destino_tipo IN ('produto', 'combo', 'url') OR destino_tipo IS NULL),
  destino_produto_id UUID REFERENCES public.itens_cardapio(id) ON DELETE SET NULL,
  destino_combo_id UUID REFERENCES public.combos(id) ON DELETE SET NULL,
  destino_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banners_home ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_home_select_all" ON public.banners_home;
CREATE POLICY "banners_home_select_all"
  ON public.banners_home
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "banners_home_insert_admin" ON public.banners_home;
CREATE POLICY "banners_home_insert_admin"
  ON public.banners_home
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "banners_home_update_admin" ON public.banners_home;
CREATE POLICY "banners_home_update_admin"
  ON public.banners_home
  FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "banners_home_delete_admin" ON public.banners_home;
CREATE POLICY "banners_home_delete_admin"
  ON public.banners_home
  FOR DELETE
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS banners_home_atualizado ON public.banners_home;
CREATE TRIGGER banners_home_atualizado
  BEFORE UPDATE ON public.banners_home
  FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();

