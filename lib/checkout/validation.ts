export type CartOptionRef = {
  groupId?: string
  optionId: string
}

export type CartLineInput = {
  id: string
  quantity: number
  observation?: string
  selectedOptions?: CartOptionRef[]
}

export type PrepareCheckoutInput = {
  customer: {
    nome: string
    email: string
    telefone: string
    userId: string | null
    aceitaSmsAtualizacoes: boolean
    aceitaEmailAtualizacoes: boolean
  }
  cart: CartLineInput[]
}

const MAX_QTY = 99
const MAX_LINES = 50

export function validatePrepareCheckoutPayload(
  body: unknown
): { ok: true; data: PrepareCheckoutInput } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Payload inválido.' }
  }

  const raw = body as Record<string, unknown>
  const cartRaw = raw.cart
  if (!Array.isArray(cartRaw) || cartRaw.length === 0) {
    return { ok: false, message: 'Carrinho vazio.' }
  }
  if (cartRaw.length > MAX_LINES) {
    return { ok: false, message: 'Carrinho excede o limite de itens.' }
  }

  const cart: CartLineInput[] = []
  for (const line of cartRaw) {
    if (!line || typeof line !== 'object') {
      return { ok: false, message: 'Item do carrinho inválido.' }
    }
    const l = line as Record<string, unknown>
    const id = String(l.id ?? '').trim()
    const quantity = Number(l.quantity)
    if (!id) return { ok: false, message: 'Produto sem ID.' }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, message: 'Quantidade inválida.' }
    }
    if (quantity > MAX_QTY) {
      return { ok: false, message: 'Quantidade acima do permitido.' }
    }

    const selectedOptions: CartOptionRef[] = []
    if (Array.isArray(l.selectedOptions)) {
      for (const opt of l.selectedOptions) {
        if (!opt || typeof opt !== 'object') continue
        const o = opt as Record<string, unknown>
        const optionId = String(o.optionId ?? '').trim()
        if (!optionId) {
          return { ok: false, message: 'Opção inválida no carrinho.' }
        }
        selectedOptions.push({
          optionId,
          groupId: o.groupId ? String(o.groupId) : undefined,
        })
      }
    }

    cart.push({
      id,
      quantity: Math.floor(quantity),
      observation: typeof l.observation === 'string' ? l.observation.trim().slice(0, 500) : '',
      selectedOptions,
    })
  }

  return {
    ok: true,
    data: {
      customer: {
        nome: '',
        email: '',
        telefone: '',
        userId: null,
        aceitaSmsAtualizacoes: false,
        aceitaEmailAtualizacoes: false,
      },
      cart,
    },
  }
}

export function buildCartFingerprint(cart: CartLineInput[]): string {
  const normalized = cart
    .map((line) => {
      const opts = (line.selectedOptions ?? [])
        .map((o) => o.optionId)
        .sort()
        .join(',')
      return `${line.id}:${line.quantity}:${(line.observation ?? '').trim().toLowerCase()}:${opts}`
    })
    .sort()
    .join('|')
  return normalized
}

export function dollarsToCents(value: number): number {
  return Math.round(Number(value) * 100)
}

export function centsToDollars(cents: number): number {
  return Number((cents / 100).toFixed(2))
}
