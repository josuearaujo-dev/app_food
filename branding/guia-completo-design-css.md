# Guia completo de design e CSS - Cadu Cakes & Lanches

Este documento consolida a identidade visual e os padroes de interface do sistema atual para reaplicar em outro projeto (com IA ou manualmente).

## 1) Essencia da marca

- **Personalidade visual:** acolhedora, artesanal, doce, caseira e amigavel.
- **Direcao estetica:** tons quentes, contraste suave, elementos arredondados e foco mobile-first.
- **Tom de interface:** simples, direto, facil de tocar e com destaque visual para preco e CTA.

## 2) Paleta de cores oficial

### Cores de marca (primarias)

- `brand-brown`: `#531B04` (principal para textos fortes e botoes)
- `brand-nude`: `#E1D3C7` (fundo base)
- `brand-pink`: `#FB5B77` (destaques e acentos)

### Cores de suporte usadas no app

- `brand-brown-soft`: `#7A4A35`
- `brand-surface`: `#F6EFEA`
- `border`: `#D5C0B3`
- `card`: `#FFFFFF`

### Mapeamento semantico (tokens de UI)

- `background` -> `brand-nude`
- `foreground` -> `brand-brown`
- `primary` -> `brand-brown`
- `primary-foreground` -> `#FFFFFF`
- `secondary` -> `brand-surface`
- `secondary-foreground` -> `brand-brown`
- `accent` -> `brand-pink`
- `accent-foreground` -> `#FFFFFF`
- `muted` -> `brand-surface`
- `muted-foreground` -> `brand-brown-soft`
- `input` -> `brand-surface`
- `ring` -> `brand-pink`

## 3) Tipografia

- **Display (titulos de marca):** `Ag Adumu Regular` (fallback: `Brush Script MT`, `cursive`)
- **Texto de interface:** `Proxima Nova` (fallback: `Montserrat`, `Avenir Next`, `Arial`, `sans-serif`)
- **Diretriz:** manter texto funcional em sans-serif; usar display apenas em titulos de impacto/branding.

## 4) Forma, profundidade e espacamento

### Bordas arredondadas

- Raio base do sistema: `20px`
- Equivalentes no tema:
  - `radius-sm`: `16px`
  - `radius-md`: `18px`
  - `radius-lg`: `20px`
  - `radius-xl`: `24px`

### Sombras

- Sombra predominante: leve e curta (`shadow-sm` / `shadow-md`) para manter leveza.
- Evitar sombras pesadas; preferir contraste por cor e borda.

### Espacamento

- Blocos verticais de conteudo: `space-y-3` ate `space-y-8`
- Padding de cards: `p-3` (compacto mobile)
- Header sticky: `px-4`, `pt` adaptado com `safe-area-inset-top`

## 5) Layout e comportamento responsivo

- **Mobile-first real** com area principal centralizada em `max-w-lg`.
- Estrutura de paginas:
  - topo sticky com blur e borda inferior;
  - conteudo scrollavel;
  - navegacao inferior fixa (`BottomNav`).
- Suporte a notch/safe area:
  - topo: `pt-[max(0.75rem,env(safe-area-inset-top))]`
  - base: `paddingBottom: env(safe-area-inset-bottom)`
- Scroll horizontal usado para categorias e destaques (com classe `scrollbar-hide`).

## 6) Componentes visuais principais

### Botoes

- **Primario:** fundo `primary`, texto branco, cantos arredondados, toque forte.
- **Secundario/suporte:** fundo `secondary` ou `card`, com borda.
- Estados:
  - hover: variacao suave de opacidade/cor;
  - active: `scale` leve (`active:scale-[0.98]`);
  - foco: `focus-visible:ring` com `ring` da marca.

### Cards de item

- Fundo claro (`card`), borda suave (`border`), raio grande (`rounded-2xl`).
- Hierarquia:
  1. categoria (microtexto em accent)
  2. nome (semibold)
  3. descricao curta
  4. preco em destaque (accent + bold)
  5. acao de adicionar/quantidade

### Chips de categoria

- Formato pill (`rounded-full`).
- Estado selecionado: `bg-primary text-primary-foreground shadow`.
- Estado neutro: `border + bg-card`.

### Bottom navigation

- Fixa na base, com icone + label pequenos.
- Item ativo em `accent`.
- Badge do carrinho em circulo vermelho/rosa com texto branco.

## 7) Iconografia e imagem

- Biblioteca de icones: `lucide-react`.
- Tamanho comum: `16`, `20`, `22` px.
- Uso de emojis como fallback de produto sem imagem (`🍽️`).
- Imagens de produto: proporcao estavel com `object-cover`.

## 8) Acessibilidade e UX

- Alvos de toque confortaveis (`h-10`, `h-11`, `w-11`).
- `aria-label` em botoes iconicos e controle de quantidade.
- `aria-current` na navegacao ativa.
- Contraste preservado entre `primary/accent` e texto branco.
- Feedback de loading com skeleton (`animate-pulse`).

## 9) Modo escuro

- Existe tema escuro definido por tokens (`.dark`), mas o produto e concebido para identidade clara.
- Em clonagem para outro projeto:
  - manter claro como default;
  - dark opcional, sem descaracterizar a marca.

## 10) Regras CSS prontas (base)

Use esta base quando for aplicar a identidade em outro projeto:

```css
:root {
  --brand-brown: #531B04;
  --brand-nude: #E1D3C7;
  --brand-pink: #FB5B77;
  --brand-brown-soft: #7A4A35;
  --brand-surface: #F6EFEA;

  --background: var(--brand-nude);
  --foreground: var(--brand-brown);
  --card: #FFFFFF;
  --card-foreground: var(--brand-brown);
  --primary: var(--brand-brown);
  --primary-foreground: #FFFFFF;
  --secondary: var(--brand-surface);
  --secondary-foreground: var(--brand-brown);
  --muted: var(--brand-surface);
  --muted-foreground: var(--brand-brown-soft);
  --accent: var(--brand-pink);
  --accent-foreground: #FFFFFF;
  --border: #D5C0B3;
  --input: var(--brand-surface);
  --ring: var(--brand-pink);

  --radius: 20px;
  --font-display: "Ag Adumu Regular", "Brush Script MT", cursive;
  --font-body: "Proxima Nova", "Montserrat", "Avenir Next", Arial, sans-serif;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
}
```

## 11) Biblioteca de componentes recomendada

- Base: Tailwind CSS v4 + utilitarios.
- UI primitives: Radix UI (buttons, dialog, select, tabs, etc.).
- Convencao de classes: utilitarias com foco em semantica de token (`bg-primary`, `text-muted-foreground`, `border-border`).

## 12) Diretrizes de branding (logo e aplicacoes)

Com os arquivos em `logo/`:

- `logo-principal-transparent.png`: uso preferencial em header e secoes claras.
- `logo-principal-bg-nude.png`: uso institucional quando precisar fundo definido.
- `logo-perfil-1024.png`: avatar/perfil.
- `favicon-192.png` e `favicon-512.png`: web app/favicon.

Regras:

- manter area de respiro ao redor do logo;
- nao distorcer proporcao;
- evitar aplicar sobre fundos poluidos;
- priorizar fundos claros para preservar leitura.

## 13) Prompt pronto para usar com outra IA

Copie e use este prompt:

```text
Quero que voce aplique o design system "Cadu Cakes & Lanches" neste projeto.

Objetivo visual:
- Estilo acolhedor, artesanal, mobile-first, com bordas arredondadas e tons quentes.

Tokens obrigatorios:
- brand-brown: #531B04
- brand-nude: #E1D3C7
- brand-pink: #FB5B77
- brand-brown-soft: #7A4A35
- brand-surface: #F6EFEA
- border: #D5C0B3

Semantica:
- background=brand-nude
- foreground=brand-brown
- primary=brand-brown
- accent=brand-pink
- secondary=brand-surface
- card=#FFFFFF
- ring=brand-pink
- radius base=20px

Tipografia:
- display: "Ag Adumu Regular", fallback cursive
- body: "Proxima Nova", fallback sans-serif

Regras de interface:
- mobile-first com container max-w-lg centralizado
- header sticky com backdrop blur e safe-area-inset-top
- bottom nav fixa com safe-area-inset-bottom
- cards com rounded-2xl, border suave e sombra leve
- CTA principal em marrom com texto branco
- preco e destaques em rosa
- chips de categoria em formato pill com estado selecionado claro
- foco acessivel com ring, botoes com alvos minimos de toque (40px+)

Entregue:
1) tokens globais CSS
2) atualizacao de componentes base (Button, Card, Input, Badge, Nav)
3) ajustes das telas para manter hierarquia visual e consistencia
4) sem quebrar funcionalidade existente
```

## 14) Checklist de QA visual

- [ ] Todas as telas usam os tokens semanticos (sem hex solto desnecessario)
- [ ] CTA principal visualmente consistente em todas as paginas
- [ ] Preco sempre em destaque com `accent`
- [ ] Bordas, radius e sombras consistentes entre componentes
- [ ] Navegacao inferior fixa e funcional em mobile
- [ ] Header e areas fixas respeitam safe-area
- [ ] Tipografia coerente (display so onde faz sentido)
- [ ] Contraste e foco de teclado validos

