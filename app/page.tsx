'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ShoppingBag, Star, Plus, Minus, Inbox, UtensilsCrossed, SlidersHorizontal, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio } from '@/lib/cart-context'
import { useLang, type Lang } from '@/lib/lang-context'
import { getCategoryNameByLang, getItemDescriptionByLang, getItemNameByLang } from '@/lib/menu-i18n'
import { cn } from '@/lib/utils'
import logoPrincipal from '@/logo/logo-principal-transparent.png'
import { LogoLoadingScreen } from '@/components/logo-loading-screen'
import { HomePromoCarousel } from '@/components/home-promo-carousel'

interface Categoria {
  id: string
  nome: string
  nome_en: string | null
  icone: string | null
  ordem: number
}

interface ItemComCategoria extends ItemCardapio {
  ordem: number
  disponivel: boolean
  destaque: boolean
  categorias: Categoria | null
}

type ComboHome = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  imagem_url: string | null
  destaque: boolean
  ativo: boolean
  ordem: number
}

export default function MenuPage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [itens, setItens] = useState<ItemComCategoria[]>([])
  const [combos, setCombos] = useState<ComboHome[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas')
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [loading, setLoading] = useState(true)
  const { totalItems, items, addItem, updateQuantity } = useCart()
  const { t, lang } = useLang()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: cats }, { data: its }, { data: cbs }] = await Promise.all([
      supabase.from('categorias').select('*').eq('ativo', true).order('ordem'),
      supabase
        .from('itens_cardapio')
        .select('id, nome, nome_en, descricao, descricao_en, preco, imagem_url, categoria_id, disponivel, destaque, ordem, categorias(id, nome, nome_en, icone, ordem)')
        .eq('disponivel', true)
        .order('destaque', { ascending: false })
        .order('ordem'),
      supabase
        .from('combos')
        .select('id, nome, descricao, preco, imagem_url, destaque, ativo, ordem')
        .eq('ativo', true)
        .order('destaque', { ascending: false })
        .order('ordem'),
    ])
    setCategorias(cats ?? [])
    setItens(its ?? [])
    setCombos((cbs as ComboHome[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const itensFiltrados = itens.filter((item) => {
    return categoriaSelecionada === 'todas' || item.categoria_id === categoriaSelecionada
  })

  const sortItensCardapio = useCallback((arr: ItemComCategoria[]) => {
    return [...arr].sort((a, b) => {
      if (a.destaque !== b.destaque) return Number(b.destaque) - Number(a.destaque)
      return (a.ordem ?? 0) - (b.ordem ?? 0)
    })
  }, [])

  /** Em "Todas": secções na ordem das categorias; dentro de cada uma, destaque depois ordem. */
  const secoesPorCategoria = useMemo(() => {
    if (categoriaSelecionada !== 'todas') return null

    const byId = new Map<string, ItemComCategoria[]>()
    for (const item of itensFiltrados) {
      const key = item.categoria_id ?? '__sem_categoria__'
      const list = byId.get(key)
      if (list) list.push(item)
      else byId.set(key, [item])
    }

    type Secao = {
      id: string
      nome: string
      icone: string | null
      items: ItemComCategoria[]
    }
    const out: Secao[] = []

    for (const cat of categorias) {
      const list = byId.get(cat.id)
      if (list?.length) {
        out.push({
          id: cat.id,
          nome: getCategoryNameByLang(cat, lang),
          icone: cat.icone,
          items: sortItensCardapio(list),
        })
        byId.delete(cat.id)
      }
    }

    const restantes = [...byId.entries()].sort(([, listaA], [, listaB]) => {
      const nomeA = listaA[0]?.categorias ? getCategoryNameByLang(listaA[0].categorias, lang) : ''
      const nomeB = listaB[0]?.categorias ? getCategoryNameByLang(listaB[0].categorias, lang) : ''
      return nomeA.localeCompare(nomeB, undefined, { sensitivity: 'base' })
    })

    for (const [key, list] of restantes) {
      if (!list.length) continue
      const first = list[0]
      const nome =
        key === '__sem_categoria__'
          ? t.noCategory
          : first?.categorias ? getCategoryNameByLang(first.categorias, lang) : t.noCategory
      out.push({
        id: key === '__sem_categoria__' ? 'sem-categoria' : key,
        nome,
        icone: first?.categorias?.icone ?? null,
        items: sortItensCardapio(list),
      })
    }

    return out
  }, [categoriaSelecionada, itensFiltrados, categorias, sortItensCardapio, t.noCategory, lang])

  const itensListaOrdenados = useMemo(
    () => sortItensCardapio(itensFiltrados),
    [itensFiltrados, sortItensCardapio]
  )

  const destaques = itensFiltrados.filter((i) => i.destaque)
  const categoriaAtualNome =
    categoriaSelecionada === 'todas'
      ? t.all
      : (() => {
          const cat = categorias.find((c) => c.id === categoriaSelecionada)
          return cat ? getCategoryNameByLang(cat, lang) : t.all
        })()

  const destaquesOrdenados = useMemo(() => {
    const ordemCat = new Map(categorias.map((c) => [c.id, c.ordem]))
    return [...destaques].sort((a, b) => {
      const oa = a.categoria_id != null ? (ordemCat.get(a.categoria_id) ?? 999) : 9999
      const ob = b.categoria_id != null ? (ordemCat.get(b.categoria_id) ?? 999) : 9999
      if (oa !== ob) return oa - ob
      return (a.ordem ?? 0) - (b.ordem ?? 0)
    })
  }, [destaques, categorias])

  function getQtd(id: string) {
    return items.filter((ci) => ci.item.id === id).reduce((acc, ci) => acc + ci.quantity, 0)
  }

  function getFirstCartLineId(id: string) {
    return items.find((ci) => ci.item.id === id)?.cartItemId ?? null
  }

  if (loading) {
    return <LogoLoadingScreen message={t.loadingMenu} />
  }

  return (
    <main className="min-h-screen w-full bg-background pb-28 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/80 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="space-y-4 px-4 pb-4 pt-[max(0.875rem,env(safe-area-inset-top))] md:mx-auto md:max-w-[1120px] md:px-2">
          <div className="flex items-center gap-4">
            <Image
              src={logoPrincipal}
              alt="Cadu Cakes & Lanches"
              className="h-auto w-[76px] shrink-0 sm:w-[84px] md:w-[92px]"
              priority
            />
            <div className="min-w-0 flex-1 border-l border-border pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t.menuLabel}
              </p>
              <h1 className="brand-title text-[1.5rem] leading-tight">
                {t.ourDishes}
              </h1>
            </div>
            <Link
              href="/carrinho"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-(--shadow-card) transition-transform active:scale-[0.97]"
              aria-label={`${t.cart} (${totalItems})`}
            >
              <ShoppingBag size={20} strokeWidth={2} />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-card bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

      </header>

      <HomePromoCarousel />

      <div className="mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-6">
        <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:items-start md:gap-6">
          {categorias.length > 0 && (
            <aside className="hidden md:sticky md:top-28 md:block">
              <section className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {lang === 'pt' ? 'Categorias' : 'Categories'}
                </p>
                <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setCategoriaSelecionada('todas')}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                      categoriaSelecionada === 'todas'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{t.all}</span>
                    {categoriaSelecionada === 'todas' ? <Check size={16} /> : null}
                  </button>
                  {categorias.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaSelecionada(cat.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                        categoriaSelecionada === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <span className="truncate">
                        {cat.icone
                          ? `${cat.icone} ${getCategoryNameByLang(cat, lang)}`
                          : getCategoryNameByLang(cat, lang)}
                      </span>
                      {categoriaSelecionada === cat.id ? <Check size={16} /> : null}
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          )}

          {itensFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/80 px-6 py-16 text-center shadow-(--shadow-card)">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-secondary/80">
                <Inbox size={24} className="text-muted-foreground" aria-hidden />
              </div>
              <p className="font-serif text-lg font-semibold text-foreground">{t.noItemsFound}</p>
              <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
                {t.noItemsHint}
              </p>
            </div>
          ) : (
            <div className="space-y-10">
            {destaques.length > 0 && (
              <section aria-labelledby="sec-destaques">
                <div className="mb-4 flex items-center justify-between gap-2 px-0.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/8 text-primary">
                      <Star size={17} strokeWidth={1.5} className="text-primary" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id="sec-destaques" className="font-serif text-lg font-semibold tracking-tight text-foreground">
                        {t.featured}
                      </h2>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {t.featuredSubtitle}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-1 pl-1 pr-4 md:mx-0 md:pr-0">
                  {destaquesOrdenados.map((item) => {
                    const firstLineId = getFirstCartLineId(item.id)
                    return (
                      <DestaqueCard
                        key={item.id}
                        item={item}
                        lang={lang}
                        qtd={getQtd(item.id)}
                        addLabel={t.addToCart}
                        currency={t.currency}
                        onAdd={() => router.push(`/produto/${item.id}`)}
                        onInc={() => router.push(`/produto/${item.id}`)}
                        onDec={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) - 1)}
                      />
                    )
                  })}
                </div>
              </section>
            )}

            {combos.length > 0 && (
              <section aria-labelledby="sec-combos">
                <div className="mb-4 flex items-center justify-between gap-2 px-0.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/8 text-primary">
                      <UtensilsCrossed size={17} strokeWidth={1.5} className="text-primary" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 id="sec-combos" className="font-serif text-lg font-semibold tracking-tight text-foreground">
                        Combos
                      </h2>
                    </div>
                  </div>
                </div>
                <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-1 pl-1 pr-4 md:mx-0 md:pr-0">
                  {combos.map((combo) => {
                    const comboItem: ItemCardapio = {
                      id: combo.id,
                      nome: combo.nome,
                      descricao: combo.descricao,
                      preco: Number(combo.preco),
                      imagem_url: combo.imagem_url,
                      categoria_id: null,
                      comboId: combo.id,
                      isCombo: true,
                    }
                    const firstLineId = getFirstCartLineId(combo.id)
                    return (
                      <DestaqueCard
                        key={`combo-${combo.id}`}
                        item={{
                          ...comboItem,
                          ordem: combo.ordem ?? 0,
                          disponivel: true,
                          destaque: combo.destaque,
                          categorias: null,
                        }}
                        lang={lang}
                        qtd={getQtd(combo.id)}
                        addLabel={t.addToCart}
                        currency={t.currency}
                        onAdd={() => addItem(comboItem, 1)}
                        onInc={() => firstLineId && updateQuantity(firstLineId, getQtd(combo.id) + 1)}
                        onDec={() => firstLineId && updateQuantity(firstLineId, getQtd(combo.id) - 1)}
                        anchorId={`combo-${combo.id}`}
                        customHref={`/combo/${combo.id}`}
                      />
                    )
                  })}
                </div>
              </section>
            )}

            <section aria-labelledby="sec-cardapio">
              <div className="mb-4 flex items-end justify-between gap-2 border-b border-border/60 pb-3 px-0.5">
                <h2 id="sec-cardapio" className="font-serif text-lg font-semibold tracking-tight text-foreground">
                  {t.fullMenu}
                </h2>
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] tabular-nums text-muted-foreground">
                  {itensFiltrados.length} {itensFiltrados.length === 1 ? t.item : t.items}
                </span>
              </div>
              {categoriaSelecionada === 'todas' && secoesPorCategoria ? (
                <div className="space-y-10">
                  {secoesPorCategoria.map((secao) => (
                    <section
                      key={secao.id}
                      aria-labelledby={`sec-cat-${secao.id}`}
                      className="scroll-mt-4"
                    >
                      <h3
                        id={`sec-cat-${secao.id}`}
                        className="mb-3 flex items-center gap-2 border-b border-border/50 pb-2 font-serif text-base font-semibold tracking-tight text-foreground"
                      >
                        {secao.icone && (
                          <span className="text-lg leading-none opacity-85" aria-hidden>
                            {secao.icone}
                          </span>
                        )}
                        {secao.nome}
                      </h3>
                      <ul className="m-0 list-none space-y-3 p-0 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                        {secao.items.map((item) => {
                          const firstLineId = getFirstCartLineId(item.id)
                          return (
                            <li key={item.id}>
                              <ItemCard
                                item={item}
                                lang={lang}
                                qtd={getQtd(item.id)}
                                addLabel={t.addToCart}
                                currency={t.currency}
                                onAdd={() => router.push(`/produto/${item.id}`)}
                                onInc={() => router.push(`/produto/${item.id}`)}
                                onDec={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) - 1)}
                              />
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul className="m-0 list-none space-y-3 p-0 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                  {itensListaOrdenados.map((item) => {
                    const firstLineId = getFirstCartLineId(item.id)
                    return (
                      <li key={item.id}>
                        <ItemCard
                          item={item}
                          lang={lang}
                          qtd={getQtd(item.id)}
                          addLabel={t.addToCart}
                          currency={t.currency}
                          onAdd={() => router.push(`/produto/${item.id}`)}
                          onInc={() => router.push(`/produto/${item.id}`)}
                          onDec={() => firstLineId && updateQuantity(firstLineId, getQtd(item.id) - 1)}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
            </div>
          )}
        </div>
      </div>

      {categorias.length > 0 && (
        <>
          {filtroAberto && (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/20 md:hidden"
              aria-label="Fechar filtros"
              onClick={() => setFiltroAberto(false)}
            />
          )}

          <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 md:hidden">
            {filtroAberto && (
              <div className="max-h-[60vh] w-[240px] overflow-y-auto rounded-2xl border border-border/80 bg-card p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setCategoriaSelecionada('todas')
                    setFiltroAberto(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold',
                    categoriaSelecionada === 'todas'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span>{t.all}</span>
                  {categoriaSelecionada === 'todas' && <Check size={16} />}
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoriaSelecionada(cat.id)
                      setFiltroAberto(false)
                    }}
                    className={cn(
                      'mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold',
                      categoriaSelecionada === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span className="truncate">
                      {cat.icone
                        ? `${cat.icone} ${getCategoryNameByLang(cat, lang)}`
                        : getCategoryNameByLang(cat, lang)}
                    </span>
                    {categoriaSelecionada === cat.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setFiltroAberto((prev) => !prev)}
              className="flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-[0.98]"
              aria-expanded={filtroAberto}
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal size={17} />
              Filtros
            </button>
          </div>
        </>
      )}
    </main>
  )
}

function DestaqueCard({
  item,
  lang,
  qtd,
  addLabel,
  currency,
  onAdd,
  onInc,
  onDec,
  anchorId,
  customHref,
  disableLink = false,
}: {
  item: ItemComCategoria
  lang: Lang
  qtd: number
  addLabel: string
  currency: string
  onAdd: () => void
  onInc: () => void
  onDec: () => void
  anchorId?: string
  customHref?: string
  disableLink?: boolean
}) {
  const href = customHref ?? (disableLink ? `/#${anchorId ?? 'sec-combos'}` : `/produto/${item.id}`)
  return (
    <article id={anchorId} className="w-[168px] shrink-0 snap-start overflow-hidden rounded-xl border border-border/80 bg-card shadow-(--shadow-luxury) md:w-[240px]">
      <Link
        href={href}
        className="block rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {item.imagem_url ? (
          <div className="aspect-4/3 w-full overflow-hidden bg-muted md:aspect-16/10">
            <img src={item.imagem_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-4/3 w-full items-center justify-center bg-muted">
            <UtensilsCrossed size={28} strokeWidth={1.25} className="text-primary/50" aria-hidden />
          </div>
        )}
      </Link>
      <div className="p-3">
        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-snug text-foreground transition-colors hover:text-primary"
        >
          {getItemNameByLang(item, lang)}
        </Link>
        <p className="mt-2 text-base font-bold tabular-nums text-accent">
          {currency}
          {item.preco.toFixed(2)}
        </p>
        <div className="mt-3">
          {qtd === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
            >
              {addLabel}
            </button>
          ) : (
            <div className="flex h-10 items-center justify-between gap-1 rounded-xl border border-border/60 bg-secondary/80 px-1.5">
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
                className="flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm active:scale-[0.98]"
                aria-label={addLabel}
              >
                {addLabel}
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
  lang,
  qtd,
  addLabel,
  currency,
  onAdd,
  onInc,
  onDec,
}: {
  item: ItemComCategoria
  lang: Lang
  qtd: number
  addLabel: string
  currency: string
  onAdd: () => void
  onInc: () => void
  onDec: () => void
}) {
  return (
    <article className="flex gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-luxury) md:p-4">
      <Link
        href={`/produto/${item.id}`}
        className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        {item.imagem_url ? (
          <div className="h-[92px] w-[92px] overflow-hidden rounded-lg bg-muted md:h-[104px] md:w-[104px]">
            <img src={item.imagem_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-lg bg-muted md:h-[104px] md:w-[104px]">
            <UtensilsCrossed size={26} strokeWidth={1.25} className="text-primary/45" aria-hidden />
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-w-0 flex-1">
          {item.categorias && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              {getCategoryNameByLang(item.categorias, lang)}
            </p>
          )}
          <Link
            href={`/produto/${item.id}`}
            className="mt-1 block line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors hover:text-primary"
          >
            {getItemNameByLang(item, lang)}
          </Link>
          {getItemDescriptionByLang(item, lang) && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {getItemDescriptionByLang(item, lang)}
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-base font-bold tabular-nums text-accent">
            {currency}
            {item.preco.toFixed(2)}
          </p>
          <div className="flex shrink-0 items-center justify-end">
            {qtd === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
                aria-label={`${addLabel}: ${item.nome}`}
              >
                {addLabel}
              </button>
            ) : (
              <div className="flex h-10 items-center gap-1 rounded-xl border border-border/60 bg-secondary/80 px-1">
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
                  className="flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm"
                  aria-label={addLabel}
                >
                  {addLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
