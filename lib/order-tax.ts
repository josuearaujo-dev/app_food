export const ORDER_TAX_RATE = 0.0735

export function calculateOrderTax(amount: number) {
  const normalized = Number.isFinite(amount) ? Math.max(0, amount) : 0
  return Number((normalized * ORDER_TAX_RATE).toFixed(2))
}
