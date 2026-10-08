'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart, type CartItem } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { localizedMenuCopy } from '@/lib/menu-i18n'
import { StoreImage } from '@/components/storefront/store-image'

type Suggested = {
  id: string
  nome: string
  nome_en: string | null
  preco: number
  imagem_url: string | null
  ordem: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function choiceProductIdsFromCart(items: CartItem[]) {
  const ids: string[] = []
  for (const line of items) {
    for (const option of line.selectedOptions) {
      const parts = option.optionId.split(':')
      // Combo choice groups are stored as `${groupId}:${itemId}`
      if (parts.length === 2 && UUID_RE.test(parts[1])) ids.push(parts[1])
    }
  }
  return ids
}

export function CartRecommendations({ onAdd }: { onAdd: (itemId: string) => void }) {
  const { items } = useCart()
  const { t, lang } = useLang()
  const [suggested, setSuggested] = useState<Suggested[]>([])
  const cartKey = items
    .map((line) => `${line.item.id}:${line.selectedOptions.map((option) => option.optionId).join('|')}`)
    .sort()
    .join(',')

  useEffect(() => {
    const cartIds = [...new Set(items.map((line) => line.item.id))]
    if (!cartIds.length) {
      setSuggested([])
      return
    }

    const supabase = createClient()
    let cancelled = false

    void (async () => {
      const choiceIds = choiceProductIdsFromCart(items)
      const { data: comboLines } = await supabase
        .from('combo_itens')
        .select('combo_id, item_id')
        .in('combo_id', cartIds)

      if (cancelled) return

      const comboProductIds = [...new Set((comboLines ?? []).map((line) => line.item_id).filter(Boolean))]
      const triggerIds = [...new Set([...cartIds, ...comboProductIds, ...choiceIds])]
      const alreadyInOrder = new Set([...cartIds, ...comboProductIds, ...choiceIds])

      const { data } = await supabase
        .from('produto_recomendacoes')
        .select('ordem, recomendado:itens_cardapio!produto_recomendacoes_recomendado_fk(id, nome, nome_en, preco, imagem_url, disponivel)')
        .in('item_id', triggerIds)
        .order('ordem')

      if (cancelled) return

      const seen = new Set<string>()
      const next: Suggested[] = []
      for (const row of data ?? []) {
        const product = row.recomendado as
          | { id: string; nome: string; nome_en: string | null; preco: number; imagem_url: string | null; disponivel: boolean }
          | { id: string; nome: string; nome_en: string | null; preco: number; imagem_url: string | null; disponivel: boolean }[]
          | null
        const item = Array.isArray(product) ? product[0] : product
        if (!item || !item.disponivel || alreadyInOrder.has(item.id) || seen.has(item.id)) continue
        seen.add(item.id)
        next.push({
          id: item.id,
          nome: item.nome,
          nome_en: item.nome_en,
          preco: Number(item.preco),
          imagem_url: item.imagem_url,
          ordem: Number(row.ordem) || 0,
        })
      }
      setSuggested(next)
    })()

    return () => {
      cancelled = true
    }
  }, [cartKey, items])

  if (!suggested.length) return null

  return (
    <section className="cadu-cart-suggest" aria-label={t.recommendTitle}>
      <h3>{t.recommendTitle}</h3>
      <p>{t.recommendHint}</p>
      <ul className={`cadu-cart-suggest-list${suggested.length > 2 ? ' cadu-cart-suggest-list--scroll' : ''}`}>
        {suggested.map((item) => (
          <li key={item.id}>
            <div className="cadu-cart-suggest-thumb">
              {item.imagem_url ? <StoreImage src={item.imagem_url} alt="" /> : <span aria-hidden>🍽️</span>}
            </div>
            <div className="cadu-cart-suggest-copy">
              <strong>{localizedMenuCopy(lang, item.nome, item.nome_en)}</strong>
              <span>
                {t.currency}
                {item.preco.toFixed(2)}
              </span>
            </div>
            <button type="button" onClick={() => onAdd(item.id)}>
              <Plus size={14} />
              {t.addToCart}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
