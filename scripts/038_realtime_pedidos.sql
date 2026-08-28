-- Habilita Supabase Realtime no painel de cozinha (/admin/ordens).
-- Rode no SQL Editor se novos pedidos não aparecerem em tempo real.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pedidos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
  END IF;
END $$;
