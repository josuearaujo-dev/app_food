-- Rode na conta nova do Supabase.
-- As fotos antigas foram enviadas com cache de 1 hora. Este script
-- pede 1 ano de cache para quem ainda abrir o arquivo direto no Storage.
-- O cardapio publico nao depende disso: ele guarda uma copia menor no site.

UPDATE storage.objects
SET metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{cacheControl}',
  '"31536000"'::jsonb,
  true
)
WHERE bucket_id = 'cardapio-imagens';
