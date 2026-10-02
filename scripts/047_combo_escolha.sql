CREATE TABLE IF NOT EXISTS public.combo_escolha_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.combo_escolha_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.combo_escolha_grupos(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.itens_cardapio(id) ON DELETE RESTRICT,
  ordem INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT combo_escolha_opcoes_grupo_item_unique UNIQUE (grupo_id, item_id)
);

COMMENT ON TABLE public.combo_escolha_grupos IS
  'Seção do combo em que o cliente escolhe uma quantidade de produtos entre os tipos cadastrados.';

ALTER TABLE public.combo_escolha_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_escolha_opcoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS combo_escolha_grupos_select_all ON public.combo_escolha_grupos;
CREATE POLICY combo_escolha_grupos_select_all ON public.combo_escolha_grupos FOR SELECT USING (true);
DROP POLICY IF EXISTS combo_escolha_grupos_insert_admin ON public.combo_escolha_grupos;
CREATE POLICY combo_escolha_grupos_insert_admin ON public.combo_escolha_grupos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS combo_escolha_grupos_update_admin ON public.combo_escolha_grupos;
CREATE POLICY combo_escolha_grupos_update_admin ON public.combo_escolha_grupos FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS combo_escolha_grupos_delete_admin ON public.combo_escolha_grupos;
CREATE POLICY combo_escolha_grupos_delete_admin ON public.combo_escolha_grupos FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS combo_escolha_opcoes_select_all ON public.combo_escolha_opcoes;
CREATE POLICY combo_escolha_opcoes_select_all ON public.combo_escolha_opcoes FOR SELECT USING (true);
DROP POLICY IF EXISTS combo_escolha_opcoes_insert_admin ON public.combo_escolha_opcoes;
CREATE POLICY combo_escolha_opcoes_insert_admin ON public.combo_escolha_opcoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS combo_escolha_opcoes_update_admin ON public.combo_escolha_opcoes;
CREATE POLICY combo_escolha_opcoes_update_admin ON public.combo_escolha_opcoes FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS combo_escolha_opcoes_delete_admin ON public.combo_escolha_opcoes;
CREATE POLICY combo_escolha_opcoes_delete_admin ON public.combo_escolha_opcoes FOR DELETE USING (auth.role() = 'authenticated');

GRANT SELECT ON public.combo_escolha_grupos, public.combo_escolha_opcoes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.combo_escolha_grupos, public.combo_escolha_opcoes TO authenticated, service_role;
