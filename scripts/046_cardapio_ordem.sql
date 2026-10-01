CREATE TABLE IF NOT EXISTS public.cardapio_ordem (
  chave TEXT PRIMARY KEY,
  ordem INTEGER NOT NULL
);

COMMENT ON TABLE public.cardapio_ordem IS
  'Ordem única do cardápio. chave é o id da categoria ou most-ordered, combos, offers, featured.';

ALTER TABLE public.cardapio_ordem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cardapio_ordem_select_all ON public.cardapio_ordem;
CREATE POLICY cardapio_ordem_select_all ON public.cardapio_ordem
  FOR SELECT USING (true);

DROP POLICY IF EXISTS cardapio_ordem_insert_admin ON public.cardapio_ordem;
CREATE POLICY cardapio_ordem_insert_admin ON public.cardapio_ordem
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS cardapio_ordem_update_admin ON public.cardapio_ordem;
CREATE POLICY cardapio_ordem_update_admin ON public.cardapio_ordem
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS cardapio_ordem_delete_admin ON public.cardapio_ordem;
CREATE POLICY cardapio_ordem_delete_admin ON public.cardapio_ordem
  FOR DELETE USING (auth.role() = 'authenticated');

GRANT SELECT ON public.cardapio_ordem TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.cardapio_ordem TO authenticated, service_role;
