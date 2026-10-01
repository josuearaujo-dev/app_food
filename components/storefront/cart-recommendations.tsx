'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { StoreImage } from '@/components/storefront/store-image'

type Suggested = {
  id: string
  nome: string
  preco: number
  imagem_url: string | null
  ordem: number
}

export function CartRecommendations({ onAdd }: { onAdd: (itemId: string) => void }) {
  const { items } = useCart()
  const { t } = useLang()
  const [suggested, setSuggested] = useState<Suggested[]>([])
  const cartKey = items.map((line) => line.item.id).sort().join(',')

  useEffect(() => {
    const ids = cartKey ? [...new Set(cartKey.split(','))] : []
    if (!ids.length) {
      setSuggested([])
      return
    }
    const supabase = createClient()
    let cancelled = false
    void supabase
      .from('produto_recomendacoes')
      .select('ordem, recomendado:itens_cardapio!produto_recomendacoes_recomendado_fk(id, nome, preco, imagem_url, disponivel)')
      .in('item_id', ids)
      .order('ordem')
      .then(({ data }) => {
        if (cancelled) return
        const inCart = new Set(ids)
        const seen = new Set<string>()
        const next: Suggested[] = []
        for (const row of data ?? []) {
          const product = row.recomendado as
            | { id: string; nome: string; preco: number; imagem_url: string | null; disponivel: boolean }
            | { id: string; nome: string; preco: number; imagem_url: string | null; disponivel: boolean }[]
            | null
          const item = Array.isArray(product) ? product[0] : product
          if (!item || !item.disponivel || inCart.has(item.id) || seen.has(item.id)) continue
          seen.add(item.id)
          next.push({
            id: item.id,
            nome: item.nome,
            preco: Number(item.preco),
            imagem_url: item.imagem_url,
            ordem: Number(row.ordem) || 0,
          })
        }
        setSuggested(next)
      })
    return () => {
      cancelled = true
    }
  }, [cartKey])

  if (!suggested.length) return null

  return (
    <section className="cadu-cart-suggest" aria-label={t.recommendTitle}>
      <h3>{t.recommendTitle}</h3>
      <p>{t.recommendHint}</p>
      <ul className="cadu-cart-suggest-list">
        {suggested.map((item) => (
          <li key={item.id}>
            <div className="cadu-cart-suggest-thumb">
              {item.imagem_url ? <StoreImage src={item.imagem_url} alt="" /> : <span aria-hidden>🍽️</span>}
            </div>
            <div className="cadu-cart-suggest-copy">
              <strong>{item.nome}</strong>
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
