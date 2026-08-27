'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Star, Plus, Minus, Inbox, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'
import logoPrincipal from '@/logo/logo-principal-transparent.png'

interface Categoria {
  id: string
  nome: string
  icone: string | null
  ordem: number
}

interface ItemComCategoria extends ItemCardapio {
  disponivel: boolean
  destaque: boolean
  categorias: Categoria | null
}

export default function MenuPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [itens, setItens] = useState<ItemComCategoria[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas')
  const [loading, setLoading] = useState(true)
  const { totalItems, items, addItem, updateQuantity } = useCart()
  const { t } = useLang()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('categorias').select('*').eq('ativo', true).order('ordem'),
      supabase
        .from('itens_cardapio')
        .select('*, categorias(id, nome, icone, ordem)')
        .eq('disponivel', true)
        .order('destaque', { ascending: false })
        .order('ordem'),
    ])
    setCategorias(cats ?? [])
    setItens(its ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const itensFiltrados = itens.filter((item) => {
    return categoriaSelecionada === 'todas' || item.categoria_id === categoriaSelecionada
  })

  const destaques = itensFiltrados.filter((i) => i.destaque)

  function getQtd(id: string) {
    return items.filter((ci) => ci.item.id === id).reduce((acc, ci) => acc + ci.quantity, 0)
  }

  function getFirstCartLineId(id: string) {
    return items.find((ci) => ci.item.id === id)?.cartItemId ?? null
  }

  return (
    <main className="min-h-screen bg-background pb-28 max-w-lg mx-auto">
      {/* Cabeçalho: sticky, hierarquia clara, área de toque confortável */}
      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 backdrop-blur-md">
        <div
          className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Image
              src={logoPrincipal}
              alt="Cadu Cakes & Lanches"
              className="h-auto w-[72px] shrink-0 sm:w-[80px]"
              priority
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t.menuLabel}
              </p>
              <h1 className="text-[17px] font-bold text-foreground leading-snug tracking-tight">
                {t.ourDishes}
              </h1>
            </div>
            <Link
              href="/carrinho"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm active:scale-[0.98] transition-transform"
              aria-label={`${t.cart} (${totalItems})`}
            >
              <ShoppingBag size={20} strokeWidth={2} />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-sm">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Categorias: chips com estado selecionado óbvio, scroll horizontal acessível */}
        {categorias.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3 pt-0.5 snap-x snap-mandatory"
            role="tablist"
            aria-label="Categorias"
          >
            <button
              type="button"
              role="tab"
              aria-selected={categoriaSelecionada === 'todas'}
              onClick={() => setCategoriaSelecionada('todas')}
              className={cn(
                'shrink-0 snap-start rounded-full px-4 py-2.5 text-sm font-semibold transition-all',
                categoriaSelecionada === 'todas'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'border border-border bg-card text-foreground active:bg-secondary'
              )}
            >
              {t.all}
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={categoriaSelecionada === cat.id}
                onClick={() => setCategoriaSelecionada(cat.id)}
                className={cn(
                  'flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-all',
                  categoriaSelecionada === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border bg-card text-foreground active:bg-secondary'
                )}
              >
                {cat.icone && <span className="text-base leading-none">{cat.icone}</span>}
                {cat.nome}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-primary/10 blur-xl"
            aria-hidden
          />
          <div className="relative flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Sparkles size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="brand-title text-xl font-semibold leading-tight text-foreground">
                {t.heroWelcome}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.heroSubtitle}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Carregando cardápio">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <Inbox size={26} className="text-muted-foreground" aria-hidden />
            </div>
            <p className="font-semibold text-foreground">{t.noItemsFound}</p>
            <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
              {t.noItemsHint}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {destaques.length > 0 && (
              <section aria-labelledby="sec-destaques">
                <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <Star size={16} className="fill-accent text-accent" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id="sec-destaques" className="text-base font-bold text-foreground">
                        {t.featured}
                      </h2>
                      <p className="text-[11px] text-muted-foreground">{t.featuredSubtitle}</p>
                    </div>
                  </div>
                </div>
                <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-hide pb-1 pl-1 pr-4 snap-x snap-mandatory">
                  {destaques.map((item) => {
                    const firstLineId = getFirstCartLineId(item.id)
                    return (
                      <DestaqueCard
                        key={item.id}
                        item={item}
                        qtd={getQtd(item.id)}
                        addLabel={t.addToCart}
                        currency={t.currency}
                        onAdd={() => addItem(item, 1)}
                        onInc={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) + 1)}
                        onDec={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) - 1)}
                      />
                    )
                  })}
                </div>
              </section>
            )}

            <section aria-labelledby="sec-cardapio">
              <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                <h2 id="sec-cardapio" className="text-base font-bold text-foreground">
                  {t.fullMenu}
                </h2>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {itensFiltrados.length} {itensFiltrados.length === 1 ? t.item : t.items}
                </span>
              </div>
              <ul className="space-y-3 list-none p-0 m-0">
                {itensFiltrados.map((item) => {
                  const firstLineId = getFirstCartLineId(item.id)
                  return (
                    <li key={item.id}>
                      <ItemCard
                        item={item}
                        qtd={getQtd(item.id)}
                        addLabel={t.addToCart}
                        currency={t.currency}
                        onAdd={() => addItem(item, 1)}
                        onInc={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) + 1)}
                        onDec={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) - 1)}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

function DestaqueCard({
  item,
  qtd,
  addLabel,
  currency,
  onAdd,
  onInc,
  onDec,
}: {
  item: ItemComCategoria
  qtd: number
  addLabel: string
  currency: string
  onAdd: () => void
  onInc: () => void
  onDec: () => void
}) {
  return (
    <article className="w-[156px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Link href={`/produto/${item.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-2xl">
        {item.imagem_url ? (
          <div className="aspect-4/3 w-full overflow-hidden bg-secondary">
            <img src={item.imagem_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-4/3 w-full items-center justify-center bg-accent/10">
            <span className="text-3xl" aria-hidden>
              🍽️
            </span>
          </div>
        )}
      </Link>
      <div className="p-3 pt-2.5">
        <Link
          href={`/produto/${item.id}`}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight text-foreground hover:text-primary"
        >
          {item.nome}
        </Link>
        <p className="mt-1.5 text-sm font-bold tabular-nums text-accent">{currency}{item.preco.toFixed(2)}</p>
        <div className="mt-2.5">
          {qtd === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              {addLabel}
            </button>
          ) : (
            <div className="flex h-10 items-center justify-between gap-1 rounded-xl bg-secondary px-1.5">
              <button
                type="button"
                onClick={onDec}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-sm active:bg-background"
                aria-label="Remover uma unidade"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-5 text-center text-sm font-bold tabular-nums">{qtd}</span>
              <button
                type="button"
                onClick={onInc}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm active:scale-[0.98]"
                aria-label="Adicionar uma unidade"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function ItemCard({
  item,
  qtd,
  addLabel,
  currency,
  onAdd,
  onInc,
  onDec,
}: {
  item: ItemComCategoria
  qtd: number
  addLabel: string
  currency: string
  onAdd: () => void
  onInc: () => void
  onDec: () => void
}) {
  return (
    <article className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/produto/${item.id}`}
        className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-xl"
      >
        {item.imagem_url ? (
          <div className="h-[88px] w-[88px] overflow-hidden rounded-xl bg-secondary">
            <img src={item.imagem_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-xl bg-accent/10">
            <span className="text-3xl" aria-hidden>
              🍽️
            </span>
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-w-0 flex-1">
          {item.categorias && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">{item.categorias.nome}</p>
          )}
          <Link
            href={`/produto/${item.id}`}
            className="mt-0.5 block font-semibold text-[15px] leading-snug text-foreground hover:text-primary line-clamp-2"
          >
            {item.nome}
          </Link>
          {item.descricao && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.descricao}</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold tabular-nums text-accent">
            {currency}
            {item.preco.toFixed(2)}
          </p>
          <div className="flex shrink-0 items-center justify-end">
            {qtd === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm active:scale-[0.98] transition-transform"
                aria-label={`${addLabel}: ${item.nome}`}
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex h-10 items-center gap-1 rounded-xl bg-secondary px-1">
                <button
                  type="button"
                  onClick={onDec}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-sm"
                  aria-label="Remover uma unidade"
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-5 text-center text-sm font-bold tabular-nums">{qtd}</span>
                <button
                  type="button"
                  onClick={onInc}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                  aria-label="Adicionar uma unidade"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
