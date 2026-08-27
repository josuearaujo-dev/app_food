const RECENT_ORDERS_KEY = 'cadu-recent-orders-v1'
const MAX_RECENT = 5

export type RecentOrderRef = {
  orderId: string
  orderNumber: string
  email: string
  savedAt: string
}

export function saveRecentOrder(ref: Omit<RecentOrderRef, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const existing = loadRecentOrders()
    const next: RecentOrderRef[] = [
      { ...ref, savedAt: new Date().toISOString() },
      ...existing.filter((o) => o.orderId !== ref.orderId),
    ].slice(0, MAX_RECENT)
    window.sessionStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function loadRecentOrders(): RecentOrderRef[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(RECENT_ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (o): o is RecentOrderRef =>
        !!o &&
        typeof o === 'object' &&
        typeof (o as RecentOrderRef).orderId === 'string' &&
        typeof (o as RecentOrderRef).orderNumber === 'string' &&
        typeof (o as RecentOrderRef).email === 'string'
    )
  } catch {
    return []
  }
}
