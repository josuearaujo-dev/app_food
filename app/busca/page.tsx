'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ArrowLeft, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'

interface ItemComCategoria extends ItemCardapio {
  disponivel: boolean
  destaque: boolean
  categorias: { id: string; nome: string; icone: string | null } | null
}

export default function BuscaPage() {
  const [query, setQuery] = useState('')
  const [itens, setItens] = useState<ItemComCategoria[]>([])
  const [loading, setLoading] = useState(false)
  const { addItem, updateQuantity, items } = useCart()
  const { t } = useLang()

  const buscar = useCallback(async (q: string) => {
    setLoading(true)
    const supabase = createClient()
    let req = supabase
      .from('itens_cardapio')
      .select('*, categorias(id, nome, icone)')
      .eq('disponivel', true)

    if (q.trim()) {
      req = req.ilike('nome', `%${q.trim()}%`)
    }

    const { data } = await req.order('nome').limit(50)
    setItens((data as ItemComCategoria[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void buscar(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, buscar])

  function getQtd(id: string) {
    return items.filter((ci) => ci.item.id === id).reduce((acc, ci) => acc + ci.quantity, 0)
  }

  function getFirstCartLineId(id: string) {
    return items.find((ci) => ci.item.id === id)?.cartItemId ?? null
  }

  return (
    <main className="min-h-screen bg-background max-w-lg mx-auto pb-28">
      <header className="sticky top-0 z-40 border-b border-border/90 bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-colors active:bg-secondary"
            aria-label={t.home}
          >
            <ArrowLeft size={20} />
          </Link>
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{t.searchPagePlaceholder}</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoFocus
              placeholder={t.searchPagePlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition-shadow focus:border-accent/40 focus:ring-2 focus:ring-accent/25"
            />
          </label>
        </div>
      </header>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <Search size={26} className="text-muted-foreground" aria-hidden />
            </div>
            <p className="font-semibold text-foreground">{t.noResults}</p>
            <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-muted-foreground">{t.noResultsHint}</p>
          </div>
        ) : (
          <>
            <p className="mb-3 px-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {query.trim()
                ? `${itens.length} ${t.results} "${query.trim()}"`
                : `${itens.length} ${t.items}`}
            </p>
            <ul className="m-0 list-none space-y-3 p-0">
              {itens.map((item) => {
                const qtd = getQtd(item.id)
                const firstLineId = getFirstCartLineId(item.id)
                return (
                  <li key={item.id}>
                    <article
                      className={cn(
                        'flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md'
                      )}
                    >
                      <Link
                        href={`/produto/${item.id}`}
                        className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
                        <Link href={`/produto/${item.id}`} className="min-w-0 flex-1 text-left">
                          {item.categorias && (
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                              {item.categorias.icone ? `${item.categorias.icone} ` : ''}
                              {item.categorias.nome}
                            </p>
                          )}
                          <h3 className="mt-0.5 line-clamp-2 text-left text-[15px] font-semibold leading-snug text-foreground">
                            {item.nome}
                          </h3>
                          {item.descricao && (
                            <p className="mt-1 line-clamp-2 text-left text-xs leading-relaxed text-muted-foreground">
                              {item.descricao}
                            </p>
                          )}
                        </Link>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[15px] font-bold tabular-nums text-accent">
                            {t.currency}
                            {item.preco.toFixed(2)}
                          </p>
                          <div className="flex shrink-0 items-center">
                            {qtd === 0 ? (
                              <button
                                type="button"
                                onClick={() => addItem(item, 1)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
                                aria-label={`${t.addToCart}: ${item.nome}`}
                              >
                                <Plus size={20} strokeWidth={2.5} />
                              </button>
                            ) : (
                              <div className="flex h-10 items-center gap-1 rounded-xl bg-secondary px-1">
                                <button
                                  type="button"
                                  onClick={() => firstLineId && updateQuantity(firstLineId, qtd - 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-sm"
                                  aria-label="Remover uma unidade"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="min-w-5 text-center text-sm font-bold tabular-nums">{qtd}</span>
                                <button
                                  type="button"
                                  onClick={() => firstLineId && updateQuantity(firstLineId, qtd + 1)}
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
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  )
}
