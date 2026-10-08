import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { isMenuStorageUrl } from '@/lib/menu-image-src'

export const runtime = 'nodejs'

const CACHE_DIR = path.join(process.cwd(), '.cache', 'menu-images')
const MAX_BYTES = 12 * 1024 * 1024
const inflight = new Map<string, Promise<{ body: Buffer; type: string }>>()

const HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
}

async function shrink(input: Buffer, fallbackType: string) {
  try {
    const sharp = (await import('sharp')).default
    const body = await sharp(input)
      .rotate()
      .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer()
    return { body, type: 'image/webp' }
  } catch {
    return { body: input, type: fallbackType || 'application/octet-stream' }
  }
}

async function loadImage(src: string) {
  const key = createHash('sha256').update(src).digest('hex')
  const filePath = path.join(CACHE_DIR, `${key}.img`)
  const metaPath = path.join(CACHE_DIR, `${key}.type`)

  try {
    const [body, type] = await Promise.all([readFile(filePath), readFile(metaPath, 'utf8')])
    return { body, type: type.trim() || 'image/webp' }
  } catch {
    // Cache miss. Fetch from Storage once, then keep the smaller file locally.
  }

  const pending = inflight.get(key)
  if (pending) return pending

  const job = (async () => {
    const upstream = await fetch(src)
    if (!upstream.ok) throw new Error(String(upstream.status))
    const length = Number(upstream.headers.get('content-length') || 0)
    if (length > MAX_BYTES) throw new Error('too-large')
    const input = Buffer.from(await upstream.arrayBuffer())
    if (input.byteLength > MAX_BYTES) throw new Error('too-large')
    const prepared = await shrink(input, upstream.headers.get('content-type') || '')
    await mkdir(CACHE_DIR, { recursive: true })
    await Promise.all([
      writeFile(filePath, prepared.body),
      writeFile(metaPath, prepared.type),
    ])
    return prepared
  })()

  inflight.set(key, job)
  try {
    return await job
  } finally {
    inflight.delete(key)
  }
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src')?.trim() || ''
  if (!isMenuStorageUrl(src)) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const image = await loadImage(src)
    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        ...HEADERS,
        'Content-Type': image.type,
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
