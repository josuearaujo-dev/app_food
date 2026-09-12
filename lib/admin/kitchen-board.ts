import { STORE_TIMEZONE } from '@/lib/kitchen-timezone'

/** Início do dia no fuso da loja, em ISO UTC (para filtrar o quadro da cozinha). */
export function storeDayStartISO(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!year || !month || !day) return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Noon UTC probe → read offset for that calendar day in store TZ
  const probe = new Date(`${year}-${month}-${day}T12:00:00.000Z`)
  const offsetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(probe)

  const tzName = offsetParts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const match = tzName.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/)
  const hours = match ? Number(match[1]) : 0
  const minutes = match?.[2] ? Number(match[2]) : 0
  const offsetMinutes = hours * 60 + Math.sign(hours || 1) * minutes

  const utcMs =
    Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0) -
    offsetMinutes * 60_000
  return new Date(utcMs).toISOString()
}

export async function reprintOrder(orderId: string): Promise<{ orderNumber: string }> {
  const res = await fetch(`/api/admin/orders/${orderId}/reprint`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error ?? 'Falha ao reimprimir.')
  }
  return { orderNumber: String(data.orderNumber ?? '') }
}
