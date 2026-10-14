-- Cadastro de cliente: o navegador não consegue gravar cliente_perfis
-- quando ainda não existe sessão (erro de row-level security).
-- O servidor grava o perfil. Estas políticas permitem que o cliente
-- logado leia e atualize a própria linha.

ALTER TABLE public.cliente_perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente_perfis_select_own" ON public.cliente_perfis;
CREATE POLICY "cliente_perfis_select_own" ON public.cliente_perfis
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cliente_perfis_insert_own" ON public.cliente_perfis;
CREATE POLICY "cliente_perfis_insert_own" ON public.cliente_perfis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cliente_perfis_update_own" ON public.cliente_perfis;
CREATE POLICY "cliente_perfis_update_own" ON public.cliente_perfis
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
