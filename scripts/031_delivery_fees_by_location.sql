CREATE TABLE IF NOT EXISTS public.localidades_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  taxa_entrega NUMERIC(10, 2) NOT NULL CHECK (taxa_entrega >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.localidades_entrega ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "localidades_entrega_select_public" ON public.localidades_entrega;
CREATE POLICY "localidades_entrega_select_public"
  ON public.localidades_entrega
  FOR SELECT
  USING (ativo = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "localidades_entrega_insert_authenticated" ON public.localidades_entrega;
CREATE POLICY "localidades_entrega_insert_authenticated"
  ON public.localidades_entrega
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "localidades_entrega_update_authenticated" ON public.localidades_entrega;
CREATE POLICY "localidades_entrega_update_authenticated"
  ON public.localidades_entrega
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "localidades_entrega_delete_authenticated" ON public.localidades_entrega;
CREATE POLICY "localidades_entrega_delete_authenticated"
  ON public.localidades_entrega
  FOR DELETE
  USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS localidades_entrega_atualizado_em ON public.localidades_entrega;
CREATE TRIGGER localidades_entrega_atualizado_em
  BEFORE UPDATE ON public.localidades_entrega
  FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS localidade_entrega_id UUID REFERENCES public.localidades_entrega(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS localidade_entrega_nome TEXT;
