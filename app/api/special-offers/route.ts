import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

function money(value: number | null | undefined): number | null {
  if (value == null) return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Number(amount.toFixed(2)) : null
}

/**
 * Ofertas especiais = produtos e combos com oferta_especial = true.
 * Separado dos banners da home (/api/banners).
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

    if (productsRes.error) {
      return NextResponse.json({ error: productsRes.error.message, slides: [] }, { status: 500 })
    }
    if (combosRes.error) {
      // Coluna ainda não existe no banco → seção vazia até rodar o SQL 048.
      const msg = combosRes.error.message || ''
      if (/oferta_especial/i.test(msg)) {
        return NextResponse.json({ slides: [], error: 'Run scripts/048_oferta_especial.sql' })
      }
      return NextResponse.json({ error: combosRes.error.message, slides: [] }, { status: 500 })
    }

    const products = (productsRes.data ?? []) as Array<{
      id: string
      nome: string
      descricao: string | null
      descricao_en: string | null
      preco: number
      preco_riscado: number | null
      imagem_url: string | null
      ordem: number
    }>

    const combos = (combosRes.data ?? []) as Array<{
      id: string
      nome: string
      descricao: string | null
      preco: number
      imagem_url: string | null
      ordem: number
      combo_itens?: Array<{ item_id: string; quantidade: number }> | null
    }>

    const comboItemIds = [
      ...new Set(combos.flatMap((combo) => (combo.combo_itens ?? []).map((line) => line.item_id))),
    ]
    const priceRes = comboItemIds.length
      ? await supabase.from('itens_cardapio').select('id, preco').in('id', comboItemIds)
      : { data: [] as Array<{ id: string; preco: number }> }
    const priceById = new Map(
      ((priceRes.data ?? []) as Array<{ id: string; preco: number }>).map((row) => [row.id, money(row.preco)])
    )

    const productSlides: OfferSlide[] = products.map((p) => {
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
    })

    const comboSlides: OfferSlide[] = combos.map((c) => {
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
    })

    // Combos primeiro (ofertas montadas), depois produtos; ordem do cadastro.
    const slides = [...comboSlides, ...productSlides]
    return NextResponse.json({ slides })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao carregar ofertas especiais.', slides: [] },
      { status: 500 }
    )
  }
}
