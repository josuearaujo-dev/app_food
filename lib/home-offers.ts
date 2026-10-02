import { createAdminClient } from '@/lib/supabase/admin'
import { isScheduledWeekday, storeWeekday } from '@/lib/store-weekdays'

export type HomeOfferSlide = {
  id: string
  title: string
  description: string | null
  descriptionEn?: string | null
  imageUrl: string
  imageUrlEn?: string
  href: string | null
  price: number | null
  compareAtPrice: number | null
}

type BannerRow = {
  id: string
  titulo: string
  descricao: string | null
  descricao_en: string | null
  imagem_url: string
  imagem_url_en: string | null
  ordem: number
  ativo: boolean
  criado_em: string
  destino_tipo: 'produto' | 'combo' | 'url' | null
  destino_produto_id: string | null
  destino_combo_id: string | null
  destino_url: string | null
  preco: number | null
  preco_riscado: number | null
  dias_semana: number[] | null
}

type PromoRow = {
  id: string
  nome: string
  nome_exibicao: string | null
  imagem_banner_url: string | null
  banner_ordem: number | null
  ativo: boolean
  validade_inicio: string | null
  validade_fim: string | null
  dias_semana: number[] | null
  criado_em: string
}

type OrderedSlide = HomeOfferSlide & {
  sortOrder: number
  createdAt: string
}

function money(value: number | null | undefined): number | null {
  if (value == null) return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : null
}

function offerName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function toHref(row: BannerRow, comboId: string | null): string | null {
  if (row.destino_tipo === 'produto' && row.destino_produto_id) {
    return `/produto/${row.destino_produto_id}`
  }
  if (row.destino_tipo === 'url' && row.destino_url?.trim()) {
    return row.destino_url.trim()
  }
  if (comboId) return `/combo/${comboId}`
  return null
}

function isPromoActiveRow(p: PromoRow, now: Date): boolean {
  if (!p.ativo) return false
  const t = now.getTime()
  if (p.validade_inicio) {
    const s = new Date(p.validade_inicio).getTime()
    if (!Number.isNaN(s) && t < s) return false
  }
  if (p.validade_fim) {
    const e = new Date(p.validade_fim).getTime()
    if (!Number.isNaN(e) && t > e) return false
  }
  return true
}

/** Active special-offer cards. Safe to call while rendering the home page. */
export async function loadHomeOfferSlides(): Promise<HomeOfferSlide[]> {
  const supabase = createAdminClient()
  const [customRes, promoRes] = await Promise.all([
    supabase
      .from('banners_home')
      .select(
        'id, titulo, descricao, descricao_en, imagem_url, imagem_url_en, ordem, ativo, criado_em, destino_tipo, destino_produto_id, destino_combo_id, destino_url, preco, preco_riscado, dias_semana'
      )
      .eq('ativo', true)
      .order('ordem')
      .order('criado_em', { ascending: false }),
    supabase
      .from('promocoes')
      .select('id, nome, nome_exibicao, imagem_banner_url, banner_ordem, ativo, validade_inicio, validade_fim, dias_semana, criado_em')
      .order('banner_ordem')
      .order('criado_em', { ascending: false }),
  ])

  const weekday = storeWeekday()
  const banners = ((customRes.data as BannerRow[] | null) ?? []).filter(
    (b) => isScheduledWeekday(b.dias_semana, weekday) && Boolean(b.imagem_url?.trim())
  )
  const combosRes = await supabase.from('combos').select('id, nome, descricao, preco').eq('ativo', true)
  const combos = new Map(
    ((combosRes.data as Array<{ id: string; nome: string; descricao: string | null; preco: number }> | null) ?? []).map((item) => [item.id, item])
  )
  const comboByName = new Map([...combos.values()].map((combo) => [offerName(combo.nome), combo]))
  const comboForBanner = (banner: BannerRow) => {
    if (banner.destino_tipo === 'produto' || banner.destino_tipo === 'url') return undefined
    if (banner.destino_combo_id && combos.has(banner.destino_combo_id)) return combos.get(banner.destino_combo_id)
    return comboByName.get(offerName(banner.titulo || ''))
  }
  const comboIds = [...new Set(banners.map((banner) => comboForBanner(banner)?.id).filter(Boolean))] as string[]
  const productIds = [...new Set(banners.map((b) => b.destino_produto_id).filter(Boolean))] as string[]
  const comboItemsRes = comboIds.length
    ? await supabase.from('combo_itens').select('combo_id, item_id, quantidade').in('combo_id', comboIds)
    : { data: [] }
  const comboLines = (comboItemsRes.data as Array<{ combo_id: string; item_id: string; quantidade: number }> | null) ?? []
  const priceIds = [...new Set([...productIds, ...comboLines.map((line) => line.item_id)])]
  const productsRes = priceIds.length
    ? await supabase.from('itens_cardapio').select('id, descricao, descricao_en, preco, preco_riscado').in('id', priceIds)
    : { data: [] }
  const products = new Map(
    ((productsRes.data as Array<{ id: string; descricao: string | null; descricao_en: string | null; preco: number; preco_riscado: number | null }> | null) ?? []).map((item) => [item.id, item])
  )
  const comboCompareAt = new Map<string, number>()
  for (const line of comboLines) {
    const unit = money(products.get(line.item_id)?.preco)
    if (unit === null) continue
    const qty = Number(line.quantidade) > 0 ? Number(line.quantidade) : 1
    comboCompareAt.set(line.combo_id, (comboCompareAt.get(line.combo_id) ?? 0) + unit * qty)
  }

  const customSlides: OrderedSlide[] = banners.map((b) => {
    const product = b.destino_tipo === 'produto' && b.destino_produto_id ? products.get(b.destino_produto_id) : undefined
    const combo = comboForBanner(b)
    const comboPrice = combo ? money(combo.preco) : null
    const productPrice = product ? money(product.preco) : null
    const bannerPrice = money(b.preco)
    const price =
      comboPrice !== null && comboPrice > 0
        ? comboPrice
        : bannerPrice ?? productPrice ?? comboPrice
    const listed = money(b.preco_riscado)
    const fromProduct = product ? money(product.preco_riscado) : null
    const fromCombo = combo ? money(comboCompareAt.get(combo.id)) : null
    const regular = listed ?? fromProduct ?? fromCombo
    return {
      id: `custom-${b.id}`,
      title: b.titulo?.trim() || 'Banner',
      description: b.descricao?.trim() || product?.descricao?.trim() || combo?.descricao?.trim() || null,
      descriptionEn: b.descricao_en?.trim() || product?.descricao_en?.trim() || null,
      imageUrl: b.imagem_url.trim(),
      imageUrlEn: b.imagem_url_en?.trim() || undefined,
      href: toHref(b, combo?.id ?? null),
      price,
      compareAtPrice: regular !== null && price !== null && regular > price ? regular : null,
      sortOrder: Number.isFinite(Number(b.ordem)) ? Number(b.ordem) : 0,
      createdAt: b.criado_em,
    }
  })

  const now = new Date()
  const promoSlides: OrderedSlide[] = ((promoRes.data as PromoRow[] | null) ?? [])
    .filter(
      (p) =>
        isPromoActiveRow(p, now) &&
        isScheduledWeekday(p.dias_semana, weekday) &&
        typeof p.imagem_banner_url === 'string' &&
        p.imagem_banner_url.trim().length > 0
    )
    .map((p) => ({
      id: `promo-${p.id}`,
      title: (p.nome_exibicao?.trim() || p.nome || 'Promoção').trim(),
      description: null,
      imageUrl: p.imagem_banner_url!.trim(),
      href: null,
      price: null,
      compareAtPrice: null,
      sortOrder: Number.isFinite(Number(p.banner_ordem)) ? Number(p.banner_ordem) : 0,
      createdAt: p.criado_em,
    }))

  const seen = new Set<string>()
  const ordered = [...customSlides, ...promoSlides].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return ordered.filter((s) => {
    const key = `${s.imageUrl}::${s.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map(({ id, title, description, descriptionEn, imageUrl, imageUrlEn, href, price, compareAtPrice }) => ({
    id,
    title,
    description,
    descriptionEn,
    imageUrl,
    imageUrlEn,
    href,
    price,
    compareAtPrice,
  }))
}
