-- Permite pedidos sem PayPal (pagamento em dinheiro ao receber)

ALTER TABLE public.pedidos
  ALTER COLUMN paypal_order_id DROP NOT NULL;

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_paypal_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_paypal_order_id_uidx_not_null
  ON public.pedidos (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;
