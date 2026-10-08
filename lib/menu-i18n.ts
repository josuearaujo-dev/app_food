/** Texto do cardápio no idioma atual. Em inglês, usa o campo EN se estiver preenchido. */
export function localizedMenuCopy(
  lang: string,
  text: string | null | undefined,
  textEn: string | null | undefined,
) {
  if (lang === 'en' && textEn?.trim()) return textEn.trim()
  return text?.trim() || ''
}
