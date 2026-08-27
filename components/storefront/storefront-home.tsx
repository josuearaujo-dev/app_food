'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BadgePercent,
  House,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  UserRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import logoPerfil from '@/logo/logo-perfil-1024.png'
import { ProductCustomizeModal } from '@/components/storefront/product-customize-modal'

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

export function StorefrontHome() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [itens, setItens] = useState<ItemComCategoria[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSplash, setIsSplash] = useState(true)
  const [customizeItemId, setCustomizeItemId] = useState<string | null>(null)
  const [splashLeaving, setSplashLeaving] = useState(false)
  const { items, totalItems, totalPrice, updateQuantity, removeItem } = useCart()
  const { t, lang, toggleLang } = useLang()

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

  useEffect(() => {
    const startExit = window.setTimeout(() => setSplashLeaving(true), 650)
    const finish = window.setTimeout(() => setIsSplash(false), 900)
    return () => {
      window.clearTimeout(startExit)
      window.clearTimeout(finish)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return itens.filter((item) => {
      const catOk = categoriaSelecionada === 'todas' || item.categoria_id === categoriaSelecionada
      if (!catOk) return false
      if (!q) return true
      const hay = `${item.nome} ${item.descricao ?? ''} ${item.categorias?.nome ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [itens, categoriaSelecionada, query])

  const sectionNames = useMemo(() => {
    if (categoriaSelecionada !== 'todas') {
      const cat = categorias.find((c) => c.id === categoriaSelecionada)
      return cat ? [cat.nome] : []
    }
    const names = categorias
      .map((c) => c.nome)
      .filter((name) => filtered.some((item) => item.categorias?.nome === name))
    const featured = filtered.filter((i) => i.destaque)
    return featured.length ? [t.featured, ...names] : names
  }, [categoriaSelecionada, categorias, filtered, t.featured])

  function scrollToCatalog() {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollToFeatured() {
    document.getElementById('destaques')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function productsInSection(section: string) {
    if (section === t.featured) return filtered.filter((i) => i.destaque)
    return filtered.filter((i) => i.categorias?.nome === section)
  }

  const cartSidebar = (
    <>
      {items.length === 0 ? (
        <div className="cadu-cart-empty">
          <ShoppingBag size={48} strokeWidth={1.3} />
          <strong>{t.emptyCart}</strong>
          <p>{t.emptyCartHint}</p>
        </div>
      ) : (
        <div className="cadu-cart-items">
          {items.map((line) => (
            <div key={line.cartItemId} className="cadu-cart-item">
              <strong>
                {line.quantity}x {line.item.nome}
              </strong>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-[var(--cadu-surface)] p-1">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white"
                    onClick={() =>
                      line.quantity <= 1
                        ? removeItem(line.cartItemId)
                        : updateQuantity(line.cartItemId, line.quantity - 1)
                    }
                    aria-label="Diminuir"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-5 text-center text-sm font-bold">{line.quantity}</span>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--cadu-brown)] text-white"
                    onClick={() => updateQuantity(line.cartItemId, line.quantity + 1)}
                    aria-label="Aumentar"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <strong className="text-[var(--cadu-pink)]">
                  {t.currency}
                  {line.totalPrice.toFixed(2)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="cadu-cart-footer">
        {items.length > 0 && (
          <div className="cadu-cart-total">
            <span>{t.total}</span>
            <span>
              {t.currency}
              {totalPrice.toFixed(2)}
            </span>
          </div>
        )}
        <Link
          href="/carrinho"
          className="cadu-cart-checkout"
          aria-disabled={items.length === 0}
          onClick={(e) => {
            if (items.length === 0) e.preventDefault()
          }}
        >
          {t.placeOrder}
          <ArrowRight size={18} />
        </Link>
      </div>
    </>
  )

  return (
    <main className="cadu-shop">
      <header className="cadu-mobile-header">
        <div className="cadu-mobile-header-logo">
          <Image src={logoPerfil} alt="" width={40} height={40} priority />
        </div>
        <div className="cadu-mobile-header-text">
          <strong>{t.storeName}</strong>
          <span>
            <b>{t.storeOpen}</b> · {t.storeHours}
          </span>
        </div>
        <Link href="/carrinho" className="cadu-mobile-header-cart" aria-label={t.cart}>
          <ShoppingBag size={20} />
          {totalItems > 0 && <span className="cadu-mobile-header-cart-count">{totalItems > 9 ? '9+' : totalItems}</span>}
        </Link>
      </header>

      <nav className="cadu-top-nav cadu-top-nav--desktop" aria-label="Navegação principal">
        <button type="button" className="cadu-nav-active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <House size={17} />
          {t.navHome}
        </button>
        <button type="button" onClick={scrollToFeatured}>
          <BadgePercent size={17} />
          {t.navFeatured}
        </button>
        <Link href="/carrinho">
          <ShoppingBag size={17} />
          {t.navCart}
          {totalItems > 0 && <span className="cadu-nav-count">{totalItems > 9 ? '9+' : totalItems}</span>}
        </Link>
        <Link href="/perfil">
          <UserRound size={17} />
          {t.profile}
        </Link>
        <button type="button" onClick={toggleLang} aria-label={lang === 'en' ? 'PT' : 'EN'}>
          {lang === 'en' ? '🇧🇷 PT' : '🇺🇸 EN'}
        </button>
      </nav>

      <section className="cadu-shop-hero">
        <div className="cadu-hero-content">
          <span className="cadu-hero-kicker">
            <Sparkles size={15} />
            {t.heroKicker}
          </span>
          <h1>{t.heroHeadline}</h1>
          <p className="cadu-hero-subtitle">{t.heroSubtitle}</p>
          <div className="cadu-hero-actions">
            <button type="button" className="cadu-hero-primary" onClick={scrollToCatalog}>
              {t.heroCta}
              <ArrowRight size={18} />
            </button>
            <button type="button" className="cadu-hero-secondary" onClick={scrollToFeatured}>
              {t.heroSpecials}
              <Star size={16} />
            </button>
          </div>
        </div>
        <div className="cadu-hero-proof" aria-hidden>
          <span>★</span>
          <p>
            <strong>{t.storeDelivery}</strong>
          </p>
        </div>
      </section>

      <section className="cadu-store-heading cadu-store-heading--desktop">
        <div className="cadu-store-logo">
          <Image src={logoPerfil} alt="" width={120} height={120} priority />
        </div>
        <div>
          <div className="cadu-store-title">
            <h2>{t.storeName}</h2>
            <span className="cadu-store-badge">
              <Store size={13} />
              {t.storeDelivery}
            </span>
          </div>
          <p className="cadu-store-meta">
            <b>{t.storeOpen}</b> · {t.storeHours} · <MapPin size={14} /> {t.storeTagline}
          </p>
        </div>
      </section>

      <div className="cadu-shop-layout" id="catalogo">
        <section className="cadu-catalog-column">
          <div className="cadu-catalog-sticky">
            <label className="cadu-catalog-search">
              <Search size={18} />
              <input
                aria-label={t.searchMenu}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchMenu}
              />
            </label>
            <div className="cadu-category-strip scrollbar-hide" role="tablist" aria-label="Categorias">
              <button
                type="button"
                className={categoriaSelecionada === 'todas' ? 'cadu-selected' : ''}
                onClick={() => setCategoriaSelecionada('todas')}
              >
                {t.all}
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={categoriaSelecionada === cat.id ? 'cadu-selected' : ''}
                  onClick={() => setCategoriaSelecionada(cat.id)}
                >
                  {cat.icone ? `${cat.icone} ` : ''}
                  {cat.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="cadu-catalog-toolbar cadu-catalog-toolbar--desktop">
            <div className="cadu-category-strip" role="tablist" aria-label="Categorias">
              <button
                type="button"
                className={categoriaSelecionada === 'todas' ? 'cadu-selected' : ''}
                onClick={() => setCategoriaSelecionada('todas')}
              >
                {t.all}
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={categoriaSelecionada === cat.id ? 'cadu-selected' : ''}
                  onClick={() => setCategoriaSelecionada(cat.id)}
                >
                  {cat.icone ? `${cat.icone} ` : ''}
                  {cat.nome}
                </button>
              ))}
            </div>
            <label className="cadu-catalog-search">
              <Search size={18} />
              <input
                aria-label={t.searchMenu}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchMenu}
              />
            </label>
          </div>

          <div className="cadu-catalog-body">
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-[var(--cadu-surface)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="cadu-catalog-empty">
              <PackageOpen size={44} />
              <h2>{t.noItemsFound}</h2>
              <p>{t.noItemsHint}</p>
              <button
                type="button"
                className="cadu-hero-primary"
                onClick={() => {
                  setQuery('')
                  setCategoriaSelecionada('todas')
                }}
              >
                {t.viewMenu}
              </button>
            </div>
          ) : (
            sectionNames.map((section) => {
              const sectionItems = productsInSection(section)
              if (!sectionItems.length) return null
              const sectionId = section === t.featured ? 'destaques' : undefined
              return (
                <section key={section} className="cadu-catalog-section" id={sectionId}>
                  <div className="cadu-section-heading">
                    <span>{section === t.featured ? t.featured.toUpperCase() : t.catalogLabel}</span>
                    <h2>{section}</h2>
                  </div>
                  <div className="cadu-product-grid">
                    {sectionItems.map((item) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        addLabel={t.addToCart}
                        onAdd={() => setCustomizeItemId(item.id)}
                      />
                    ))}
                  </div>
                </section>
              )
            })
          )}
          </div>
        </section>

        <aside className="cadu-desktop-cart desktop-cart">
          <header>
            <ShoppingBag size={20} />
            <h2>{t.yourBag}</h2>
          </header>
          {cartSidebar}
        </aside>
      </div>

      {isSplash && (
        <div
          className={`cadu-preloader ${splashLeaving ? 'cadu-preloader-leaving' : ''}`}
          role="status"
          aria-label={t.preloaderText}
        >
          <div className="cadu-preloader-logo">
            <Image src={logoPerfil} alt="" width={73} height={73} priority />
          </div>
          <strong className="brand-title">{t.storeName}</strong>
          <span>{t.preloaderText}</span>
          <div className="cadu-preloader-dots">
            <i />
            <i />
            <i />
          </div>
        </div>
      )}

      <ProductCustomizeModal itemId={customizeItemId} onClose={() => setCustomizeItemId(null)} />
    </main>
  )
}

function ProductCard({
  item,
  addLabel,
  onAdd,
}: {
  item: ItemComCategoria
  addLabel: string
  onAdd: () => void
}) {
  const { t } = useLang()
  return (
    <article className="cadu-product-card">
      <Link href={`/produto/${item.id}`} className="cadu-product-thumb block">
        {item.imagem_url ? (
          <img src={item.imagem_url} alt="" />
        ) : (
          <div className="flex h-full min-h-[124px] items-center justify-center text-3xl">🍽️</div>
        )}
      </Link>
      <Link href={`/produto/${item.id}`} className="cadu-product-copy block no-underline text-inherit">
        {item.categorias && <span>{item.categorias.nome}</span>}
        <h3>{item.nome}</h3>
        {item.descricao && <p>{item.descricao}</p>}
        <strong>
          {t.currency}
          {item.preco.toFixed(2)}
        </strong>
      </Link>
      <button type="button" className="cadu-product-add" onClick={onAdd}>
        {addLabel} <Plus size={16} />
      </button>
    </article>
  )
}
