ALTER TABLE public.configuracoes_loja
  ADD COLUMN IF NOT EXISTS printnode_extra_via_categoria_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS printnode_delivery_extra_vias INTEGER NOT NULL DEFAULT 2
    CHECK (printnode_delivery_extra_vias >= 0 AND printnode_delivery_extra_vias <= 10);

COMMENT ON COLUMN public.configuracoes_loja.printnode_extra_via_categoria_ids IS
  'Categorias que adicionam 1 via extra de impressao quando aparecem no pedido.';

COMMENT ON COLUMN public.configuracoes_loja.printnode_delivery_extra_vias IS
  'Quantidade de vias extras de impressao adicionadas para pedidos delivery.';
