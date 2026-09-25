ALTER TABLE public.configuracoes_loja
  ADD COLUMN IF NOT EXISTS aceitando_pedidos BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.configuracoes_loja.aceitando_pedidos IS
  'Quando false, o cardápio continua visível, mas o checkout não aceita novos pedidos.';

UPDATE public.configuracoes_loja
SET aceitando_pedidos = false
WHERE aceitando_pedidos IS DISTINCT FROM false;
