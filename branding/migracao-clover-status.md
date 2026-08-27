# Migração Clover — status da implementação

## O que foi feito

- Feature flag `PAYMENT_PROVIDER` / `NEXT_PUBLIC_PAYMENT_PROVIDER` (`clover` | `paypal`)
- Libs: `lib/clover/*`, `lib/checkout/*`, `lib/orders/repository.ts`
- APIs: `POST /api/checkout/prepare`, `POST /api/payments/clover`, `POST /api/webhooks/clover` (stub)
- UI: `app/pagamento/page.tsx` com Hosted iFrame Clover (PayPal atrás da flag)
- Checkout: removido checkbox de salvar cartão (fase 1)
- SQL: `scripts/015_clover_payments.sql`
- Placeholders: `.env.example` e chaves Clover no `.env`

## Passos manuais restantes

1. Rodar no Supabase o SQL `scripts/015_clover_payments.sql`
2. Preencher no `.env` / hospedagem:
   - `NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN`
   - `NEXT_PUBLIC_CLOVER_MERCHANT_ID`
   - `CLOVER_PRIVATE_TOKEN`
   - `CLOVER_MERCHANT_ID`
   - `NEXT_PUBLIC_CLOVER_ENV=sandbox` / `CLOVER_ENV=sandbox`
3. Manter `NEXT_PUBLIC_PAYMENT_PROVIDER=clover` e `PAYMENT_PROVIDER=clover`
4. Testar cartão sandbox no checkout
5. Em produção: trocar env para `production` + tokens live + configurar webhook Clover apontando para `/api/webhooks/clover`

## Rollback

```env
NEXT_PUBLIC_PAYMENT_PROVIDER=paypal
PAYMENT_PROVIDER=paypal
```

## Build

`next build` compilou com sucesso após as alterações.
