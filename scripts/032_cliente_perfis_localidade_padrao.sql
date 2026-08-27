ALTER TABLE public.cliente_perfis
  ADD COLUMN IF NOT EXISTS localidade_entrega_id UUID REFERENCES public.localidades_entrega(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS localidade_entrega_nome TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user_cliente_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  nome text;
  tel text;
  endereco text;
  localidade_id uuid;
  localidade_nome text;
  sms_ok boolean;
  email_ok boolean;
  cartao_ok boolean;
BEGIN
  IF COALESCE(meta->>'role', 'customer') = 'admin' THEN
    RETURN NEW;
  END IF;

  nome := NULLIF(trim(COALESCE(meta->>'nome_completo', '')), '');
  tel := NULLIF(trim(COALESCE(meta->>'telefone', '')), '');
  endereco := NULLIF(trim(COALESCE(meta->>'endereco_entrega', '')), '');
  localidade_nome := NULLIF(trim(COALESCE(meta->>'localidade_entrega_nome', '')), '');

  BEGIN
    localidade_id := NULLIF(trim(COALESCE(meta->>'localidade_entrega_id', '')), '')::uuid;
  EXCEPTION
    WHEN others THEN
      localidade_id := NULL;
  END;

  IF nome IS NULL THEN
    nome := '';
  END IF;
  IF tel IS NULL THEN
    tel := '';
  END IF;

  sms_ok := lower(COALESCE(meta->>'aceita_sms_atualizacoes_pedido', '')) IN ('true', 't', '1');
  email_ok := lower(COALESCE(meta->>'aceita_email_atualizacoes_pedido', '')) IN ('true', 't', '1');
  cartao_ok := lower(COALESCE(meta->>'prefere_salvar_cartao_futuro', '')) IN ('true', 't', '1');

  INSERT INTO public.cliente_perfis (
    user_id,
    nome_completo,
    telefone,
    endereco_entrega,
    localidade_entrega_id,
    localidade_entrega_nome,
    aceita_sms_atualizacoes_pedido,
    aceita_email_atualizacoes_pedido,
    prefere_salvar_cartao_futuro
  )
  VALUES (
    NEW.id,
    nome,
    tel,
    endereco,
    localidade_id,
    localidade_nome,
    sms_ok,
    email_ok,
    cartao_ok
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    telefone = EXCLUDED.telefone,
    endereco_entrega = EXCLUDED.endereco_entrega,
    localidade_entrega_id = EXCLUDED.localidade_entrega_id,
    localidade_entrega_nome = EXCLUDED.localidade_entrega_nome,
    aceita_sms_atualizacoes_pedido = EXCLUDED.aceita_sms_atualizacoes_pedido,
    aceita_email_atualizacoes_pedido = EXCLUDED.aceita_email_atualizacoes_pedido,
    prefere_salvar_cartao_futuro = EXCLUDED.prefere_salvar_cartao_futuro,
    atualizado_em = now();

  RETURN NEW;
END;
$$;
