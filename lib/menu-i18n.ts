import type { Lang } from '@/lib/lang-context'

type LocalizedItemLike = {
  nome: string
  nome_en?: string | null
  descricao?: string | null
  descricao_en?: string | null
}

type LocalizedCategoryLike = {
  nome: string
  nome_en?: string | null
}

export function getItemNameByLang(item: LocalizedItemLike, lang: Lang) {
  if (lang === 'en') {
    const en = item.nome_en?.trim()
    if (en) return en
  }
  return item.nome
}

export function getItemDescriptionByLang(item: LocalizedItemLike, lang: Lang) {
  if (lang === 'en') {
    const en = item.descricao_en?.trim()
    if (en) return en
  }
  return item.descricao ?? null
}

export function getCategoryNameByLang(category: LocalizedCategoryLike, lang: Lang) {
  if (lang === 'en') {
    const en = category.nome_en?.trim()
    if (en) return en
  }
  return category.nome
}

