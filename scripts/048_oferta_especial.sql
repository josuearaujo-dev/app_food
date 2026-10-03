-- Flag para produtos e combos que entram em "Ofertas especiais"
-- (separado dos banners da home / banners_home).

ALTER TABLE public.itens_cardapio
  ADD COLUMN IF NOT EXISTS oferta_especial BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.combos
  ADD COLUMN IF NOT EXISTS oferta_especial BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.itens_cardapio.oferta_especial IS
  'Quando true, o produto entra no popup e na seção Ofertas especiais.';

COMMENT ON COLUMN public.combos.oferta_especial IS
  'Quando true, o combo entra no popup e na seção Ofertas especiais.';

-- Migração: marca o que já está nos banners ativos, para a seção não ficar vazia.
UPDATE public.combos c
SET oferta_especial = true
WHERE EXISTS (
  SELECT 1
  FROM public.banners_home b
  WHERE b.ativo = true
    AND (
      b.destino_combo_id = c.id
      OR lower(trim(b.titulo)) = lower(trim(c.nome))
    )
);

UPDATE public.itens_cardapio i
SET oferta_especial = true
WHERE EXISTS (
  SELECT 1
  FROM public.banners_home b
  WHERE b.ativo = true
    AND b.destino_produto_id = i.id
);
