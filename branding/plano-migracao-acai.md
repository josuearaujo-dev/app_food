# Plano de migração — acai-delivery-2 → Cadu Lanches

**Regra absoluta:** pagamento **Clover** não muda. Square fica fora.

Referência: `acai-delivery-2-main/` (dentro deste repo)  
Projeto ativo: raiz do `siteKaduLanches`

---

## Fases

### Fase 0 — Padronização de páginas (concluída)
- [x] Tokens de layout (`--storefront-bottom-inset`, etc.)
- [x] Regras centralizadas de bottom nav / floating cart (`lib/layout/page-chrome.ts`)
- [x] `StorefrontShell`, `StorefrontHeader`, `StorefrontFixedFooter`
- [x] Migrar páginas cliente principais para o shell
- [x] `AdminShell` + `AdminHeader` em todas as rotas admin
- [x] Sweep i18n parcial (produto, combo, conta, admin/login, ordens)
- [x] Paridade produto/combo (nav + CTA fixo)

**Storefront:** `/busca`, `/perfil`, `/carrinho`, `/pedido/[id]`, `/conta/*`, `/produto/[id]`, `/combo/[id]`  
**Admin:** todas as rotas `/admin/*`

### Fase 1 — UX base (concluída)

**Não toca:** `app/pagamento`, `lib/clover/*`, APIs de pagamento

### Fase 2 — Cliente (concluída)
- [x] Histórico de pedidos no perfil
- [x] Detalhe do pedido / status (`/pedido/[id]`)
- [x] Melhor pós-pagamento (número + link acompanhar)
- [x] Guest order lookup (API + formulário no perfil)

### Fase 3 — Admin / operação (em andamento)
- [x] Realtime Supabase no admin (`/admin/ordens` — script `038_realtime_pedidos.sql`)
- [x] Pedido manual balcão (`/admin/pedido-manual`, API `/api/admin/orders/manual`)
- [x] Layout global admin + nav horizontal (`app/admin/layout.tsx`)
- [x] Dashboard Operações em `/admin` + cardápio em `/admin/cardapio`
- [ ] Painel de pedidos estilo `OrderOperationsBoard` (detalhe modal, mais estágios)
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
