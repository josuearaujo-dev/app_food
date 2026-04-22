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
  imageUrl: string
  imageUrlEn?: string
  href: string | null
}

type OrderedSlide = BannerSlide & {
  sortOrder: number
  createdAt: string
}

function toHref(row: BannerRow): string | null {
  if (row.destino_tipo === 'produto' && row.destino_produto_id) {
    return `/produto/${row.destino_produto_id}`
  }
  if (row.destino_tipo === 'combo' && row.destino_combo_id) {
    return `/#combo-${row.destino_combo_id}`
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
          'id, titulo, imagem_url, imagem_url_en, ordem, ativo, criado_em, destino_tipo, destino_produto_id, destino_combo_id, destino_url'
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

    const customSlides: OrderedSlide[] = ((customRes.data as BannerRow[] | null) ?? [])
      .filter((b) => b.imagem_url?.trim())
      .map((b) => ({
        id: `custom-${b.id}`,
        title: b.titulo?.trim() || 'Banner',
        imageUrl: b.imagem_url.trim(),
        imageUrlEn: b.imagem_url_en?.trim() || undefined,
        href: toHref(b),
        sortOrder: Number.isFinite(Number(b.ordem)) ? Number(b.ordem) : 0,
        createdAt: b.criado_em,
      }))

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
        imageUrl: p.imagem_banner_url!.trim(),
        href: null,
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
    }).map(({ id, title, imageUrl, imageUrlEn, href }) => ({ id, title, imageUrl, imageUrlEn, href }))

    return NextResponse.json({ slides })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar banners.', slides: [] },
      { status: 500 }
    )
  }
}

