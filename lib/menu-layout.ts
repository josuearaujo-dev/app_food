export const MENU_SECTION_KEYS = ['most-ordered', 'combos', 'offers', 'featured'] as const

export type MenuSectionKey = (typeof MENU_SECTION_KEYS)[number]

export type MenuOrderRow = {
  chave: string
  ordem: number
}

export type MenuBlock = {
  key: string
  kind: 'category' | 'section'
}

const DEFAULT_SECTION_ORDER: Record<MenuSectionKey, number> = {
  'most-ordered': 1,
  combos: 2,
  offers: 3,
  featured: 4,
}

export function isMenuSection(key: string): key is MenuSectionKey {
  return (MENU_SECTION_KEYS as readonly string[]).includes(key)
}

/** Categories and fixed sections share one order. Unsaved sections stay before the categories. */
export function buildMenuOrder(categoryIds: string[], saved: MenuOrderRow[]): MenuBlock[] {
  const rank = new Map(saved.map((row) => [row.chave, Number(row.ordem)]))
  const hasSaved = saved.length > 0
  const blocks: Array<MenuBlock & { ordem: number }> = categoryIds.map((id, index) => ({
    key: id,
    kind: 'category',
    ordem: rank.get(id) ?? (hasSaved ? 10000 + index : 100 + index),
  }))
  for (const key of MENU_SECTION_KEYS) {
    blocks.push({
      key,
      kind: 'section',
      ordem: rank.get(key) ?? (hasSaved ? 10000 + DEFAULT_SECTION_ORDER[key] : DEFAULT_SECTION_ORDER[key]),
    })
  }
  blocks.sort((a, b) => a.ordem - b.ordem || a.key.localeCompare(b.key))
  return blocks.map(({ key, kind }) => ({ key, kind }))
}
