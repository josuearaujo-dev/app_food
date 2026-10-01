ALTER TABLE public.itens_cardapio
  ADD COLUMN IF NOT EXISTS mais_pedido BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.itens_cardapio.mais_pedido IS
  'Marcado pelo restaurante. O produto entra na seção Mais pedidos do cardápio.';

CREATE TABLE IF NOT EXISTS public.produto_recomendacoes (
  item_id UUID NOT NULL,
  recomendado_id UUID NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT produto_recomendacoes_pkey PRIMARY KEY (item_id, recomendado_id),
  CONSTRAINT produto_recomendacoes_item_fk
    FOREIGN KEY (item_id) REFERENCES public.itens_cardapio(id) ON DELETE CASCADE,
  CONSTRAINT produto_recomendacoes_recomendado_fk
    FOREIGN KEY (recomendado_id) REFERENCES public.itens_cardapio(id) ON DELETE CASCADE,
  CONSTRAINT produto_recomendacoes_distintos CHECK (item_id <> recomendado_id)
);

COMMENT ON TABLE public.produto_recomendacoes IS
  'Produtos sugeridos no carrinho quando o item de origem está no pedido.';

ALTER TABLE public.produto_recomendacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS produto_recomendacoes_select_all ON public.produto_recomendacoes;
CREATE POLICY produto_recomendacoes_select_all ON public.produto_recomendacoes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS produto_recomendacoes_insert_admin ON public.produto_recomendacoes;
CREATE POLICY produto_recomendacoes_insert_admin ON public.produto_recomendacoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS produto_recomendacoes_update_admin ON public.produto_recomendacoes;
CREATE POLICY produto_recomendacoes_update_admin ON public.produto_recomendacoes
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS produto_recomendacoes_delete_admin ON public.produto_recomendacoes;
CREATE POLICY produto_recomendacoes_delete_admin ON public.produto_recomendacoes
  FOR DELETE USING (auth.role() = 'authenticated');

GRANT SELECT ON public.produto_recomendacoes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.produto_recomendacoes TO authenticated, service_role;
