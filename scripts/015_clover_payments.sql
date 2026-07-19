-- Migração PayPal → Clover: campos de pagamento, idempotência e pedidos pendentes

-- PayPal order id deixa de ser obrigatório (pedidos Clover nascem antes da cobrança)
ALTER TABLE public.pedidos
  ALTER COLUMN paypal_order_id DROP NOT NULL;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero_pedido TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS clover_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER,
  ADD COLUMN IF NOT EXISTS total_cents INTEGER,
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS falhou_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS falha_codigo TEXT,
  ADD COLUMN IF NOT EXISTS falha_mensagem TEXT,
  ADD COLUMN IF NOT EXISTS cart_fingerprint TEXT;

-- Índices únicos para cobrança e retries seguros
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pedidos_idempotency_key
  ON public.pedidos (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pedidos_clover_charge_id
  ON public.pedidos (clover_charge_id)
  WHERE clover_charge_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pedidos_numero_pedido
  ON public.pedidos (numero_pedido)
  WHERE numero_pedido IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_status_pagamento
  ON public.pedidos (status_pagamento);

-- Eventos de webhook (Clover) — preparação para produção
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT,
  payload_hash TEXT,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Jobs de impressão (idempotente, pós-pagamento)
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (order_id)
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
