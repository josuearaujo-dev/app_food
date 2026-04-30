-- Biblioteca de grupos de extras para reutilização no admin

CREATE TABLE IF NOT EXISTS public.extra_grupos_predefinidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  min_escolhas INTEGER,
  max_escolhas INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extra_grupo_opcoes_predefinidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.extra_grupos_predefinidos(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0,
  detail_info TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extra_grupos_predefinidos_ativo_nome
  ON public.extra_grupos_predefinidos (ativo, nome);

CREATE INDEX IF NOT EXISTS idx_extra_grupo_opcoes_predefinidas_grupo
  ON public.extra_grupo_opcoes_predefinidas (grupo_id, ordem);

ALTER TABLE public.extra_grupos_predefinidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_grupo_opcoes_predefinidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extra_grupos_predefinidos_select_all" ON public.extra_grupos_predefinidos;
CREATE POLICY "extra_grupos_predefinidos_select_all" ON public.extra_grupos_predefinidos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "extra_grupo_opcoes_predefinidas_select_all" ON public.extra_grupo_opcoes_predefinidas;
CREATE POLICY "extra_grupo_opcoes_predefinidas_select_all" ON public.extra_grupo_opcoes_predefinidas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "extra_grupos_predefinidos_write_authenticated" ON public.extra_grupos_predefinidos;
CREATE POLICY "extra_grupos_predefinidos_write_authenticated" ON public.extra_grupos_predefinidos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "extra_grupo_opcoes_predefinidas_write_authenticated" ON public.extra_grupo_opcoes_predefinidas;
CREATE POLICY "extra_grupo_opcoes_predefinidas_write_authenticated" ON public.extra_grupo_opcoes_predefinidas
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS extra_grupos_predefinidos_atualizado ON public.extra_grupos_predefinidos;
CREATE TRIGGER extra_grupos_predefinidos_atualizado
  BEFORE UPDATE ON public.extra_grupos_predefinidos
  FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();
