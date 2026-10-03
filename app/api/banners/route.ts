import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isScheduledWeekday, storeWeekday } from '@/lib/store-weekdays'

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
  dias_semana: number[] | null
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

/**
 * Carousel de banners da home (Admin → Banners).
 * Ofertas especiais (popup + seção do menu) vêm de /api/special-offers.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('banners_home')
      .select(
        'id, titulo, imagem_url, imagem_url_en, ordem, ativo, criado_em, destino_tipo, destino_produto_id, destino_combo_id, destino_url, dias_semana'
      )
      .eq('ativo', true)
      .order('ordem')
      .order('criado_em', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message, banners: [], slides: [] }, { status: 500 })
    }

    const weekday = storeWeekday()
    const banners = ((data as BannerRow[] | null) ?? []).filter(
      (b) => isScheduledWeekday(b.dias_semana, weekday) && Boolean(b.imagem_url?.trim())
    )

    const combosRes = await supabase.from('combos').select('id, nome').eq('ativo', true)
    const combos = new Map(
      ((combosRes.data as Array<{ id: string; nome: string }> | null) ?? []).map((item) => [item.id, item])
    )
    const comboByName = new Map([...combos.values()].map((combo) => [offerName(combo.nome), combo]))

    const slides = banners.map((b) => {
      let comboId: string | null = null
      if (b.destino_tipo !== 'produto' && b.destino_tipo !== 'url') {
        if (b.destino_combo_id && combos.has(b.destino_combo_id)) comboId = b.destino_combo_id
        else comboId = comboByName.get(offerName(b.titulo || ''))?.id ?? null
      }
      return {
        id: b.id,
        title: b.titulo?.trim() || 'Banner',
        imageUrl: b.imagem_url.trim(),
        imageUrlEn: b.imagem_url_en?.trim() || undefined,
        href: toHref(b, comboId),
      }
    })

    // `slides` mantido por compatibilidade com clientes antigos (agora = só banners).
    return NextResponse.json({ banners: slides, slides })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar banners.', banners: [], slides: [] },
      { status: 500 }
    )
  }
}
