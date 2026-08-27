# Plano de migração — acai-delivery-2 → Cadu Lanches

**Regra absoluta:** pagamento **Clover** não muda. Square fica fora.

Referência: `acai-delivery-2-main/` (dentro deste repo)  
Projeto ativo: raiz do `siteKaduLanches`

---

## Fases

### Fase 1 — UX base (em andamento)
- [x] Plano documentado
- [x] Carrinho persistente (`localStorage`)
- [x] Barra flutuante “Ver carrinho” no mobile
- [x] Hero de boas-vindas na home (identidade Cadu)
- [x] Perfil com estado de login (Supabase)
- [x] Layout storefront premium (referência + cores Cadu) — v1.3.0

**Não toca:** `app/pagamento`, `lib/clover/*`, APIs de pagamento

### Fase 2 — Cliente
- [x] Histórico de pedidos no perfil
- [x] Detalhe do pedido / status (`/pedido/[id]`)
- [x] Melhor pós-pagamento (número + link acompanhar)
- [x] Guest order lookup (API + formulário no perfil)

### Fase 3 — Admin / operação
- [ ] Painel de pedidos estilo `OrderOperationsBoard`
- [ ] Realtime Supabase no admin
- [ ] Pedido manual (balcão — sem pagamento online)
- [ ] Worker de impressão (`print_jobs`)

### Fase 4 — Crescimento (opcional)
- [ ] Cupons (`CouponManager` + migrations adaptadas)
- [ ] Fidelidade (`LoyaltyCard` + schema)
- [ ] Entrega (zonas, taxa, endereço) — se fizer delivery
- [ ] Gorjetas

---

## O que NÃO migrar

| Origem (açaí) | Motivo |
|---|---|
| `lib/square/*` | Cadu usa Clover |
| `api/checkout/pay` | Square-specific |
| `api/webhooks/square` | Square-specific |
| Migrations/RPCs Square | Schema diferente (`orders` vs `pedidos`) |
| Visual roxo/amarelo | Manter tokens Cadu |

---

## Arquivos Clover — zona protegida

```
app/pagamento/page.tsx
lib/clover/
app/api/checkout/prepare/route.ts
app/api/payments/clover/route.ts
app/api/webhooks/clover/route.ts
lib/checkout/calculate-order.ts
lib/orders/repository.ts
scripts/015_clover_payments.sql
```

---

## Critérios de aceite por fase

**Fase 1:** carrinho sobrevive ao refresh; hero Cadu na home; perfil mostra login ou convidado; Clover checkout intacto.

**Fase 2:** cliente vê pedidos pagos no perfil.

**Fase 3:** admin atualiza pedidos em tempo real; pedido manual funciona.

**Fase 4:** cupom/fidelidade validados em sandbox Clover.
