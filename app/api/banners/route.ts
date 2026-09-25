import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type BannerRow = {
  id: string
  titulo: string
  imagem_url: string
  imagem_url_en: string | null
  ordem: number
  ativo: boolean
  criado_em: string
  destino_tipo: 'produto' | 'combo' | 'url' | null
  destino_produto_id: string | null
  destino_combo_id: string | null
  destino_url: string | null
  preco_riscado: number | null
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
  criado_em: string
}

type BannerSlide = {
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

type OrderedSlide = BannerSlide & {
  sortOrder: number
  createdAt: string
}

function money(value: number | null | undefined): number | null {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : null
}

function toHref(row: BannerRow): string | null {
  if (row.destino_tipo === 'produto' && row.destino_produto_id) {
    return `/produto/${row.destino_produto_id}`
  }
  if (row.destino_tipo === 'combo' && row.destino_combo_id) {
    return `/combo/${row.destino_combo_id}`
  }
  if (row.destino_tipo === 'url' && row.destino_url?.trim()) {
    return row.destino_url.trim()
  }
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

export async function GET() {
  try {
    const supabase = createAdminClient()
    const [customRes, promoRes] = await Promise.all([
      supabase
        .from('banners_home')
        .select(
          'id, titulo, imagem_url, imagem_url_en, ordem, ativo, criado_em, destino_tipo, destino_produto_id, destino_combo_id, destino_url, preco_riscado'
        )
        .eq('ativo', true)
        .order('ordem')
        .order('criado_em', { ascending: false }),
      supabase
        .from('promocoes')
        .select('id, nome, nome_exibicao, imagem_banner_url, banner_ordem, ativo, validade_inicio, validade_fim, criado_em')
        .order('banner_ordem')
        .order('criado_em', { ascending: false }),
    ])

    const banners = ((customRes.data as BannerRow[] | null) ?? []).filter((b) => b.imagem_url?.trim())
    const productIds = [...new Set(banners.map((b) => b.destino_produto_id).filter(Boolean))] as string[]
    const comboIds = [...new Set(banners.map((b) => b.destino_combo_id).filter(Boolean))] as string[]
    const comboItemsRes = comboIds.length
      ? await supabase.from('combo_itens').select('combo_id, item_id, quantidade').in('combo_id', comboIds)
      : { data: [] }
    const comboLines = (comboItemsRes.data as Array<{ combo_id: string; item_id: string; quantidade: number }> | null) ?? []
    const priceIds = [...new Set([...productIds, ...comboLines.map((line) => line.item_id)])]
    const [productsRes, combosRes] = await Promise.all([
      priceIds.length
        ? supabase.from('itens_cardapio').select('id, descricao, descricao_en, preco').in('id', priceIds)
        : Promise.resolve({ data: [] }),
      comboIds.length
        ? supabase.from('combos').select('id, descricao, preco').in('id', comboIds)
        : Promise.resolve({ data: [] }),
    ])
    const products = new Map(
      ((productsRes.data as Array<{ id: string; descricao: string | null; descricao_en: string | null; preco: number }> | null) ?? []).map((item) => [item.id, item])
    )
    const combos = new Map(
      ((combosRes.data as Array<{ id: string; descricao: string | null; preco: number }> | null) ?? []).map((item) => [item.id, item])
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
      const combo = b.destino_tipo === 'combo' && b.destino_combo_id ? combos.get(b.destino_combo_id) : undefined
      const price = money(product?.preco ?? combo?.preco)
      const regular = product
        ? money(b.preco_riscado)
        : combo && b.destino_combo_id
          ? money(comboCompareAt.get(b.destino_combo_id))
          : null
      return {
        id: `custom-${b.id}`,
        title: b.titulo?.trim() || 'Banner',
        description: (product?.descricao ?? combo?.descricao)?.trim() || null,
        descriptionEn: product?.descricao_en?.trim() || null,
        imageUrl: b.imagem_url.trim(),
        imageUrlEn: b.imagem_url_en?.trim() || undefined,
        href: toHref(b),
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
    const slides = ordered.filter((s) => {
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

    return NextResponse.json({ slides })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar banners.', slides: [] },
      { status: 500 }
    )
  }
}

