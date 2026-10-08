/** Browser cache for menu images. Filenames are unique, so a long max-age is safe. */
export const MENU_IMAGE_CACHE_CONTROL = '31536000'

const MAX_EDGE = 1400
const QUALITY = 0.82

export type PreparedMenuImage = {
  body: Blob
  contentType: string
  extension: string
}

function extensionOf(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  return 'jpg'
}

function canvasBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), type, QUALITY)
  })
}

/**
 * Shrinks a menu photo before it is stored.
 * The free Supabase plan bills every byte sent to visitors, and phone photos
 * are far larger than the card on screen.
 */
export async function prepareMenuImage(file: File): Promise<PreparedMenuImage> {
  if (file.type === 'image/gif' || typeof createImageBitmap !== 'function') {
    return { body: file, contentType: file.type || 'application/octet-stream', extension: extensionOf(file) }
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const webp = await canvasBlob(canvas, 'image/webp')
    if (webp && webp.size < file.size) {
      return { body: webp, contentType: 'image/webp', extension: 'webp' }
    }
    const jpeg = await canvasBlob(canvas, 'image/jpeg')
    if (jpeg && jpeg.size < file.size) {
      return { body: jpeg, contentType: 'image/jpeg', extension: 'jpg' }
    }
  } catch {
    // Keep the original file when the browser cannot decode it.
  } finally {
    bitmap?.close()
  }

  return { body: file, contentType: file.type || 'application/octet-stream', extension: extensionOf(file) }
}
