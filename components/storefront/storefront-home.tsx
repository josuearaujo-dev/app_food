'use client'

import { StoreImage } from '@/components/storefront/store-image'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { HomeBannerCarousel, type BannerSlide } from '@/components/home-banner-carousel'
import { HomePromoCarousel, SpecialOfferGrid, type OfferSlide } from '@/components/home-promo-carousel'
import { buildMenuOrder, isMenuSection, type MenuOrderRow, type MenuSectionKey } from '@/lib/menu-layout'
import {
  BadgePercent,
  House,
  MapPin,
  PackageOpen,
  Plus,
  Search,
  ShoppingBag,
  Store,
  UserRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart, type ItemCardapio } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { localizedMenuCopy } from '@/lib/menu-i18n'
import logoPerfil from '@/logo/logo-perfil-1024.png'
import logoCover from '@/logo/logo-principal-transparent.png'
import { ProductCustomizeModal } from '@/components/storefront/product-customize-modal'
import { ComboCustomizeModal } from '@/components/storefront/combo-customize-modal'
import { DesktopCartCheckout } from '@/components/checkout/desktop-cart-checkout'
import { useProfileModal } from '@/lib/profile-modal-context'
import { useStoreStatus } from '@/lib/store-status-client'

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

interface MenuCombo {
  id: string
  nome: string
  descricao: string | null
  preco: number
  compareAt: number | null
  imagem_url: string | null
  needsSetup: boolean
}

export function StorefrontHome() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [itens, setItens] = useState<ItemComCategoria[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [menuOrder, setMenuOrder] = useState<MenuOrderRow[]>([])
  const [offers, setOffers] = useState<OfferSlide[]>([])
  const [offersReady, setOffersReady] = useState(false)
  const [banners, setBanners] = useState<BannerSlide[]>([])
  const [bannersReady, setBannersReady] = useState(false)
  const [bannersOpen, setBannersOpen] = useState(false)
  const [promotionsOpen, setPromotionsOpen] = useState(false)
  const [comboModalId, setComboModalId] = useState<string | null>(null)
  const [isSplash, setIsSplash] = useState(true)
  const [customizeItemId, setCustomizeItemId] = useState<string | null>(null)
  const [mostOrderedIds, setMostOrderedIds] = useState<string[]>([])
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [splashLeaving, setSplashLeaving] = useState(false)
  const { items, totalItems, addItem } = useCart()
  const { t, lang, toggleLang } = useLang()
  const { openProfile } = useProfileModal()
  const { acceptingOrders, loading: storeStatusLoading } = useStoreStatus()
  const storeIsClosed = !storeStatusLoading && !acceptingOrders

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: cats }, { data: its }, orderRes] = await Promise.all([
      supabase.from('categorias').select('*').eq('ativo', true).order('ordem'),
      supabase
        .from('itens_cardapio')
        .select('*, categorias(id, nome, icone, ordem)')
        .eq('disponivel', true)
        .order('destaque', { ascending: false })
        .order('ordem'),
      supabase.from('cardapio_ordem').select('chave, ordem').order('ordem'),
    ])
    setMenuOrder(orderRes.error ? [] : ((orderRes.data ?? []) as MenuOrderRow[]))
    setCategorias(cats ?? [])
    setItens(its ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const normalize = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    void Promise.all([
      supabase.from('combos').select('id, nome, descricao, preco, imagem_url, ordem, combo_itens(item_id), combo_escolha_grupos(id)').eq('ativo', true).order('ordem').order('nome'),
      fetch('/api/banners', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : { banners: [], slides: [] })).catch(() => ({ banners: [], slides: [] })),
      fetch('/api/special-offers', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : { slides: [] })).catch(() => ({ slides: [] })),
    ]).then(async ([comboRes, bannerData, offersData]) => {
      if (cancelled) return
      const bannerSlides = ((bannerData.banners ?? bannerData.slides ?? []) as BannerSlide[])
      const offerSlides = (offersData.slides ?? []) as OfferSlide[]
      console.info('[cadu:combo-add] banners + offers loaded', {
        banners: bannerSlides.length,
        offers: offerSlides.length,
        offerSlides: offerSlides.map((slide) => ({ id: slide.id, title: slide.title, href: slide.href, price: slide.price })),
        comboQueryError: comboRes.error?.message ?? null,
        comboQueryCount: comboRes.data?.length ?? 0,
      })
      setBanners(bannerSlides)
      setOffers(offerSlides)
      setBannersReady(true)
      setOffersReady(true)
      // Sequência: popup de banners → ao fechar, popup de ofertas especiais.
      if (bannerSlides.length) {
        setBannersOpen(true)
        setPromotionsOpen(false)
      } else if (offerSlides.length) {
        setBannersOpen(false)
        setPromotionsOpen(true)
      } else {
        setBannersOpen(false)
        setPromotionsOpen(false)
      }
      let rows = (comboRes.data ?? []) as Array<{ id: string; nome: string; descricao: string | null; preco: number; imagem_url: string | null; combo_itens?: Array<{ item_id: string }> | null; combo_escolha_grupos?: Array<{ id: string }> | null }>
      if (comboRes.error || !comboRes.data) {
        console.warn('[cadu:combo-add] combo query failed, using fallback without escolha groups', comboRes.error)
        const fallback = await supabase
          .from('combos')
          .select('id, nome, descricao, preco, imagem_url, ordem, combo_itens(item_id)')
          .eq('ativo', true)
          .order('ordem')
          .order('nome')
        console.info('[cadu:combo-add] combo fallback', {
          error: fallback.error?.message ?? null,
          count: fallback.data?.length ?? 0,
        })
        rows = (fallback.data ?? []) as typeof rows
      }
      const itemIds = [...new Set(rows.flatMap((combo) => (combo.combo_itens ?? []).map((line) => line.item_id)))]
      const optionRes = itemIds.length
        ? await supabase.from('item_opcao_grupos').select('item_id').in('item_id', itemIds)
        : { data: [] as Array<{ item_id: string }> }
      const itemsWithOptions = new Set(((optionRes.data ?? []) as Array<{ item_id: string }>).map((row) => row.item_id))
      if (cancelled) return
      const mapped = rows.map((combo) => {
        const offer =
          offerSlides.find((slide) => slide.href === `/combo/${combo.id}`) ??
          offerSlides.find((slide) => normalize(slide.title) === normalize(combo.nome))
        const offerPrice = typeof offer?.price === 'number' ? offer.price : null
        const storedPrice = Number(combo.preco)
        const price = storedPrice > 0 ? storedPrice : (offerPrice !== null && offerPrice > 0 ? offerPrice : storedPrice)
        const compareAt = typeof offer?.compareAtPrice === 'number' && offer.compareAtPrice > price ? offer.compareAtPrice : null
        return {
          id: combo.id,
          nome: combo.nome,
          descricao: combo.descricao,
          preco: price,
          compareAt,
          imagem_url: combo.imagem_url || offer?.imageUrl || null,
          needsSetup: (combo.combo_escolha_grupos ?? []).length > 0 || (combo.combo_itens ?? []).some((line) => itemsWithOptions.has(line.item_id)),
        }
      })
      console.info('[cadu:combo-add] combos ready', mapped.map((combo) => ({ id: combo.id, nome: combo.nome, needsSetup: combo.needsSetup, preco: combo.preco })))
      setCombos(mapped)
    }).catch((error) => {
      console.error('[cadu:combo-add] failed to load combos/banners', error)
      if (!cancelled) setCombos([])
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/most-ordered', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { ids: [] }))
      .then((data: { ids?: string[] }) => {
        if (!cancelled && Array.isArray(data.ids)) setMostOrderedIds(data.ids)
      })
      .catch(() => {
        if (!cancelled) setMostOrderedIds([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const startExit = window.setTimeout(() => setSplashLeaving(true), 650)
    const finish = window.setTimeout(() => setIsSplash(false), 900)
    return () => {
      window.clearTimeout(startExit)
      window.clearTimeout(finish)
    }
  }, [])

  const searchedItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return itens
    return itens.filter((item) =>
      `${item.nome} ${item.nome_en ?? ''} ${item.descricao ?? ''} ${item.descricao_en ?? ''} ${item.categorias?.nome ?? ''}`.toLowerCase().includes(q)
    )
  }, [itens, query])

  const searchedOffers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return offers
    return offers.filter((offer) => `${offer.title} ${offer.description ?? ''} ${offer.descriptionEn ?? ''}`.toLowerCase().includes(q))
  }, [offers, query])

  const menuBlocks = useMemo(() => {
    const ids = [...categorias].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id)).map((cat) => cat.id)
    return buildMenuOrder(ids, menuOrder)
  }, [categorias, menuOrder])

  function sectionTitle(key: MenuSectionKey) {
    if (key === 'most-ordered') return t.mostOrdered
    if (key === 'offers') return t.specialOffers
    return t.featured
  }

  function blockHasContent(key: string) {
    if (key === 'most-ordered') return searchedItems.some((item) => mostOrderedIds.includes(item.id))
    if (key === 'offers') return searchedOffers.length > 0
    if (key === 'featured') return searchedItems.some((item) => item.destaque)
    return searchedItems.some((item) => item.categoria_id === key)
  }

  const chips = menuBlocks.filter((block) => blockHasContent(block.key))
  const visibleBlocks = chips.filter((block) => categoriaSelecionada === 'todas' || block.key === categoriaSelecionada)

  function openCombo(comboId: string) {
    console.info('[cadu:combo-add] openCombo', { comboId })
    setPromotionsOpen(false)
    window.setTimeout(() => setComboModalId(comboId), 180)
  }

  async function addOffer(slide: OfferSlide) {
    const normalize = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    console.info('[cadu:combo-add] Add clicked', {
      slide: { id: slide.id, title: slide.title, href: slide.href, price: slide.price },
      combosLoaded: combos.length,
      comboNames: combos.map((item) => item.nome),
    })
    let href = slide.href ?? ''
    let matched = combos.find((item) => normalize(item.nome) === normalize(slide.title)) ?? null
    if (!href.startsWith('/combo/') && !href.startsWith('/produto/')) {
      if (matched) {
        href = `/combo/${matched.id}`
        console.info('[cadu:combo-add] resolved href from loaded combos', { href, matched: matched.nome })
      } else {
        console.warn('[cadu:combo-add] no href and no local match, querying supabase by title')
        const supabase = createClient()
        const { data, error } = await supabase.from('combos').select('id, nome, descricao, preco, imagem_url').eq('ativo', true)
        console.info('[cadu:combo-add] supabase combos lookup', {
          error: error?.message ?? null,
          count: data?.length ?? 0,
          names: (data ?? []).map((row) => row.nome),
        })
        const row = ((data ?? []) as Array<{ id: string; nome: string; descricao: string | null; preco: number; imagem_url: string | null }>).find(
          (item) => normalize(item.nome) === normalize(slide.title)
        )
        if (row) {
          href = `/combo/${row.id}`
          matched = {
            id: row.id,
            nome: row.nome,
            descricao: row.descricao,
            preco: Number(row.preco),
            compareAt: null,
            imagem_url: row.imagem_url,
            needsSetup: true,
          }
          console.info('[cadu:combo-add] resolved href from supabase', { href })
        }
      }
    }
    if (href.startsWith('/produto/')) {
      console.info('[cadu:combo-add] opening product modal', href)
      setPromotionsOpen(false)
      setCustomizeItemId(href.slice('/produto/'.length))
      return
    }
    if (!href.startsWith('/combo/')) {
      console.error('[cadu:combo-add] abort: could not resolve combo href', {
        title: slide.title,
        href: slide.href,
        combosLoaded: combos.length,
      })
      return
    }
    const comboId = href.slice('/combo/'.length)
    const combo = combos.find((item) => item.id === comboId) ?? matched
    const price =
      combo && combo.preco > 0
        ? combo.preco
        : typeof slide.price === 'number' && slide.price > 0
          ? slide.price
          : combo?.preco ?? 0
    console.info('[cadu:combo-add] resolved combo', {
      comboId,
      found: Boolean(combo),
      needsSetup: combo?.needsSetup ?? null,
      price,
    })
    if (!combo || combo.needsSetup || price <= 0) {
      openCombo(comboId)
      return
    }
    setPromotionsOpen(false)
    addItem({
      id: combo.id,
      nome: combo.nome,
      descricao: combo.descricao,
      preco: price,
      imagem_url: combo.imagem_url,
      categoria_id: null,
    }, 1, { unitPrice: price })
    console.info('[cadu:combo-add] added directly to cart', { comboId, price })
  }

  function productsFor(key: string) {
    if (key === 'most-ordered') {
      const rank = new Map(mostOrderedIds.map((id, index) => [id, index]))
      return searchedItems
        .filter((item) => rank.has(item.id))
        .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    }
    if (key === 'featured') return searchedItems.filter((item) => item.destaque)
    return searchedItems.filter((item) => item.categoria_id === key)
  }

  const cartSidebar = <DesktopCartCheckout />

  return (
    <main className="cadu-shop">
      <header className="cadu-mobile-header">
        <div className="cadu-mobile-header-logo">
          <Image src={logoPerfil} alt="" width={40} height={40} priority />
        </div>
        <div className="cadu-mobile-header-text">
          <strong>{t.storeName}</strong>
          <span>
            <b>{storeIsClosed ? t.storeClosed : t.storeOpen}</b> · {t.storeHours}
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
        <button type="button" onClick={() => { setCategoriaSelecionada('offers'); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
          <BadgePercent size={17} />
          {t.specialOffers}
        </button>
        <Link href="/carrinho">
          <ShoppingBag size={17} />
          {t.navCart}
          {totalItems > 0 && <span className="cadu-nav-count">{totalItems > 9 ? '9+' : totalItems}</span>}
        </Link>
        <button type="button" onClick={openProfile}>
          <UserRound size={17} />
          {t.profile}
        </button>
        <button type="button" onClick={toggleLang} aria-label={lang === 'en' ? 'PT' : 'EN'}>
          {lang === 'en' ? '🇧🇷 PT' : '🇺🇸 EN'}
        </button>
      </nav>

      <section className="cadu-store-cover" aria-label={t.storeName}>
        <div className="cadu-cover-brand">
          <Image src={logoCover} alt={t.storeName} priority sizes="(max-width: 980px) 240px, 400px" />
        </div>
        <div className="cadu-cover-message"><span>{t.heroKicker}</span><p>{t.heroHeadline}</p></div>
      </section>
      <section className="cadu-store-heading">
        <div className="cadu-store-logo">
          <Image src={logoPerfil} alt="" width={120} height={120} priority />
        </div>
        <div>
          <div className="cadu-store-title">
            <h1>{t.storeName}</h1>
            <span className="cadu-store-badge">
              <Store size={13} />
              {t.storeDelivery}
            </span>
          </div>
          <p className="cadu-store-meta">
            <b>{storeIsClosed ? t.storeClosed : t.storeOpen}</b> · {t.storeHours} · <MapPin size={14} /> {t.storeTagline}
          </p>
        </div>
      </section>

      {storeIsClosed ? (
        <p className="cadu-store-closed-banner" role="status">
          {t.storeClosedNotice}
        </p>
      ) : null}

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
              {chips.map((block) => {
                const category = categorias.find((cat) => cat.id === block.key)
                const label = isMenuSection(block.key) ? sectionTitle(block.key) : category?.nome ?? ''
                return (
                  <button
                    key={block.key}
                    type="button"
                    className={categoriaSelecionada === block.key ? 'cadu-selected' : ''}
                    onClick={() => setCategoriaSelecionada(block.key)}
                  >
                    {category?.icone ? `${category.icone} ` : ''}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="cadu-catalog-toolbar cadu-catalog-toolbar--desktop">
            <label className="cadu-category-select">
              <span className="sr-only">{lang === 'en' ? 'Categories' : 'Categorias'}</span>
              <select value={categoriaSelecionada} onChange={(event) => setCategoriaSelecionada(event.target.value)}>
                <option value="todas">{lang === 'en' ? 'All categories' : 'Lista de categorias'}</option>
                {chips.map((block) => {
                  const category = categorias.find((cat) => cat.id === block.key)
                  const label = isMenuSection(block.key) ? sectionTitle(block.key) : category?.nome ?? ''
                  return <option key={block.key} value={block.key}>{label}</option>
                })}
              </select>
            </label>
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

          <HomeBannerCarousel
            open={bannersReady && bannersOpen}
            onOpenChange={(open) => {
              setBannersOpen(open)
              if (!open && offers.length > 0) {
                // Fecha banner → abre ofertas especiais.
                window.setTimeout(() => setPromotionsOpen(true), 180)
              }
            }}
            slides={banners}
          />
          <HomePromoCarousel
            open={offersReady && promotionsOpen && !bannersOpen}
            onOpenChange={setPromotionsOpen}
            showLauncher={false}
            onAdd={addOffer}
            slides={offersReady ? offers : undefined}
          />
          <div className="cadu-catalog-body">
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-[var(--cadu-surface)]" />
              ))}
            </div>
          ) : visibleBlocks.length === 0 ? (
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
            visibleBlocks.map((block) => {
              if (block.key === 'offers') {
                return (
                  <section key={block.key} className="cadu-catalog-section" id="combos">
                    <div className="cadu-section-heading">
                      <span>{t.specialOffers.toUpperCase()}</span>
                      <h2>{t.specialOffers}</h2>
                    </div>
                    <SpecialOfferGrid slides={searchedOffers} addLabel={t.addToCart} onAdd={addOffer} />
                  </section>
                )
              }
              const sectionItems = productsFor(block.key)
              if (!sectionItems.length) return null
              const title = isMenuSection(block.key) ? sectionTitle(block.key) : (categorias.find((cat) => cat.id === block.key)?.nome ?? '')
              const sectionId = block.key === 'featured' ? 'destaques' : block.key === 'most-ordered' ? 'mais-pedidos' : undefined
              const featuredLayout = block.key === 'featured' || block.key === 'most-ordered'
              return (
                <section key={block.key} className="cadu-catalog-section" id={sectionId}>
                  <div className="cadu-section-heading">
                    <span>{isMenuSection(block.key) ? title.toUpperCase() : t.catalogLabel}</span>
                    <h2>{title}</h2>
                  </div>
                  <div className={`cadu-product-grid ${featuredLayout ? 'cadu-product-grid--featured' : ''}`}>
                    {sectionItems.map((item) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        popular={mostOrderedIds.includes(item.id)}
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
      <ComboCustomizeModal comboId={comboModalId} onClose={() => setComboModalId(null)} />
    </main>
  )
}

function ProductCard({
  item,
  popular,
  addLabel,
  onAdd,
}: {
  item: ItemComCategoria
  popular: boolean
  addLabel: string
  onAdd: () => void
}) {
  const { t, lang } = useLang()
  const nome = localizedMenuCopy(lang, item.nome, item.nome_en)
  const descricao = localizedMenuCopy(lang, item.descricao, item.descricao_en)
  return (
    <article className="cadu-product-card">
      <button type="button" className="cadu-product-thumb" onClick={onAdd} aria-label={nome}>
        {item.imagem_url ? (
          <StoreImage src={item.imagem_url} alt="" />
        ) : (
          <div className="flex h-full min-h-[124px] items-center justify-center text-3xl">🍽️</div>
        )}
      </button>
      <div
        className="cadu-product-copy"
        role="button"
        tabIndex={0}
        onClick={onAdd}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onAdd()
          }
        }}
      >
        {item.categorias && <span>{item.categorias.nome}</span>}
        {popular ? <em className="cadu-most-ordered">{t.mostOrdered}</em> : null}
        <h3>{nome}</h3>
        {descricao ? <p>{descricao}</p> : null}
        <strong className="cadu-product-price">
          <b>
            {t.currency}
            {item.preco.toFixed(2)}
          </b>
          {item.preco_riscado != null && item.preco_riscado > item.preco ? (
            <>
              <s>{t.currency}{Number(item.preco_riscado).toFixed(2)}</s>
              <span>-{Math.round(((item.preco_riscado - item.preco) / item.preco_riscado) * 100)}%</span>
            </>
          ) : null}
        </strong>
      </div>
      <button type="button" className="cadu-product-add" onClick={onAdd}>
        {addLabel} <Plus size={16} />
      </button>
    </article>
  )
}
