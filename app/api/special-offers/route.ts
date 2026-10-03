import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isScheduledWeekday, storeWeekday } from '@/lib/store-weekdays'

type OfferSlide = {
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

type ComboRow = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  imagem_url: string | null
  ordem: number
  combo_itens?: Array<{ item_id: string; quantidade: number }> | null
}

type ProductRow = {
  id: string
  nome: string
  descricao: string | null
  descricao_en: string | null
  preco: number
  preco_riscado: number | null
  imagem_url: string | null
  ordem: number
}

function money(value: number | null | undefined): number | null {
  if (value == null) return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : null
}

function offerName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function missingColumn(message: string | undefined) {
  return /oferta_especial/i.test(message || '')
}

function toProductSlide(p: ProductRow): OfferSlide {
  const price = money(p.preco)
  const compare = money(p.preco_riscado)
  return {
    id: `product-${p.id}`,
    title: p.nome,
    description: p.descricao,
    descriptionEn: p.descricao_en,
    imageUrl: (p.imagem_url || '').trim() || '/images/product-placeholder.svg',
    href: `/produto/${p.id}`,
    price,
    compareAtPrice: compare !== null && price !== null && compare > price ? compare : null,
  }
}

function toComboSlide(c: ComboRow, priceById: Map<string, number | null>): OfferSlide {
  const price = money(c.preco)
  let compareAt = 0
  let hasCompare = false
  for (const line of c.combo_itens ?? []) {
    const unit = priceById.get(line.item_id)
    if (unit === null || unit === undefined) continue
    const qty = Number(line.quantidade) > 0 ? Number(line.quantidade) : 1
    compareAt += unit * qty
    hasCompare = true
  }
  const compare = hasCompare ? Number(compareAt.toFixed(2)) : null
  return {
    id: `combo-${c.id}`,
    title: c.nome,
    description: c.descricao,
    descriptionEn: null,
    imageUrl: (c.imagem_url || '').trim() || '/images/product-placeholder.svg',
    href: `/combo/${c.id}`,
    price,
    compareAtPrice: compare !== null && price !== null && compare > price ? compare : null,
  }
}

async function comboPriceMap(
  supabase: ReturnType<typeof createAdminClient>,
  combos: ComboRow[]
) {
  const comboItemIds = [...new Set(combos.flatMap((combo) => (combo.combo_itens ?? []).map((line) => line.item_id)))]
  if (!comboItemIds.length) return new Map<string, number | null>()
  const priceRes = await supabase.from('itens_cardapio').select('id, preco').in('id', comboItemIds)
  return new Map(
    ((priceRes.data ?? []) as Array<{ id: string; preco: number }>).map((row) => [row.id, money(row.preco)])
  )
}

/** Fallback enquanto o SQL 048 não rodou ou nada foi marcado: destinos dos banners ativos. */
async function offersFromBanners(supabase: ReturnType<typeof createAdminClient>): Promise<OfferSlide[]> {
  const weekday = storeWeekday()
  const { data: banners } = await supabase
    .from('banners_home')
    .select('id, titulo, imagem_url, imagem_url_en, ordem, ativo, destino_tipo, destino_produto_id, destino_combo_id, dias_semana')
    .eq('ativo', true)
    .order('ordem')

  const active = ((banners ?? []) as Array<{
    id: string
    titulo: string
    imagem_url: string
    imagem_url_en: string | null
    ordem: number
    destino_tipo: string | null
    destino_produto_id: string | null
    destino_combo_id: string | null
    dias_semana: number[] | null
  }>).filter((b) => isScheduledWeekday(b.dias_semana, weekday) && Boolean(b.imagem_url?.trim()))

  const { data: allCombos } = await supabase
    .from('combos')
    .select('id, nome, descricao, preco, imagem_url, ordem, combo_itens(item_id, quantidade)')
    .eq('ativo', true)
  const combos = (allCombos ?? []) as ComboRow[]
  const comboById = new Map(combos.map((c) => [c.id, c]))
  const comboByName = new Map(combos.map((c) => [offerName(c.nome), c]))

  const productIds = [
    ...new Set(
      active
        .filter((b) => b.destino_tipo === 'produto' && b.destino_produto_id)
        .map((b) => b.destino_produto_id as string)
    ),
  ]
  const { data: productsData } = productIds.length
    ? await supabase
        .from('itens_cardapio')
        .select('id, nome, descricao, descricao_en, preco, preco_riscado, imagem_url, ordem')
        .in('id', productIds)
        .eq('disponivel', true)
    : { data: [] as ProductRow[] }
  const products = new Map(((productsData ?? []) as ProductRow[]).map((p) => [p.id, p]))
  const priceById = await comboPriceMap(supabase, combos)

  const slides: OfferSlide[] = []
  const seen = new Set<string>()
  for (const banner of active) {
    if (banner.destino_tipo === 'produto' && banner.destino_produto_id) {
      const product = products.get(banner.destino_produto_id)
      if (!product || seen.has(`product-${product.id}`)) continue
      seen.add(`product-${product.id}`)
      slides.push(toProductSlide(product))
      continue
    }
    if (banner.destino_tipo === 'url') continue
    const combo =
      (banner.destino_combo_id && comboById.get(banner.destino_combo_id)) ||
      comboByName.get(offerName(banner.titulo || ''))
    if (!combo || seen.has(`combo-${combo.id}`)) continue
    seen.add(`combo-${combo.id}`)
    const slide = toComboSlide(combo, priceById)
    // Prefer banner art when the combo has no image.
    if (!combo.imagem_url?.trim() && banner.imagem_url?.trim()) {
      slide.imageUrl = banner.imagem_url.trim()
      if (banner.imagem_url_en?.trim()) slide.imageUrlEn = banner.imagem_url_en.trim()
    }
    slides.push(slide)
  }
  return slides
}

/**
 * Ofertas especiais = produtos/combos com oferta_especial = true.
 * Se a coluna ainda não existe ou nada foi marcado, usa destinos dos banners.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const [productsRes, combosRes] = await Promise.all([
      supabase
        .from('itens_cardapio')
        .select('id, nome, descricao, descricao_en, preco, preco_riscado, imagem_url, ordem')
        .eq('oferta_especial', true)
        .eq('disponivel', true)
        .order('ordem')
        .order('nome'),
      supabase
        .from('combos')
        .select('id, nome, descricao, preco, imagem_url, ordem, combo_itens(item_id, quantidade)')
        .eq('oferta_especial', true)
        .eq('ativo', true)
        .order('ordem')
        .order('nome'),
    ])

    const columnMissing =
      missingColumn(productsRes.error?.message) || missingColumn(combosRes.error?.message)

    if (!columnMissing && (productsRes.error || combosRes.error)) {
      return NextResponse.json(
        { error: productsRes.error?.message || combosRes.error?.message, slides: [] },
        { status: 500 }
      )
    }

    if (!columnMissing) {
      const products = (productsRes.data ?? []) as ProductRow[]
      const combos = (combosRes.data ?? []) as ComboRow[]
      const priceById = await comboPriceMap(supabase, combos)
      const slides = [...combos.map((c) => toComboSlide(c, priceById)), ...products.map(toProductSlide)]
      if (slides.length) return NextResponse.json({ slides, source: 'flags' })
    }

    const fallback = await offersFromBanners(supabase)
    return NextResponse.json({
      slides: fallback,
      source: columnMissing ? 'banners-fallback-missing-column' : 'banners-fallback-empty-flags',
      hint: columnMissing ? 'Run scripts/048_oferta_especial.sql' : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar ofertas especiais.', slides: [] },
      { status: 500 }
    )
  }
}
