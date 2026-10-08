const STORAGE_IMAGE =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/cardapio-imagens\/[^?#\s]+$/i

/** Public menu photos are served from our cache instead of Supabase Storage. */
export function cachedMenuImageSrc(src: string | null | undefined) {
  const clean = src?.trim().split('#')[0]?.split('?')[0] ?? ''
  if (!STORAGE_IMAGE.test(clean)) return src?.trim() || ''
  return `/api/menu-image?src=${encodeURIComponent(clean)}`
}

export function isMenuStorageUrl(src: string) {
  return STORAGE_IMAGE.test(src.trim().split('#')[0]?.split('?')[0] ?? '')
}
