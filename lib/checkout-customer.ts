export const CHECKOUT_STORAGE_KEY = 'nmfc-checkout-v1'

export type FulfillmentType = 'take_out' | 'delivery'

export type CheckoutCustomer = {
  nome: string
  email: string
  telefone: string
  userId: string | null
  aceitaSmsAtualizacoes: boolean
  aceitaEmailAtualizacoes: boolean
  prefereSalvarCartao: boolean
  fulfillmentType: FulfillmentType
  localidadeEntregaId: string | null
  localidadeEntregaNome: string | null
  enderecoEntrega: string | null
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

function readBool(v: unknown, fallback = false): boolean {
  if (v === true || v === 'true') return true
  if (v === false || v === 'false') return false
  return fallback
}

function readFulfillmentType(v: unknown): FulfillmentType {
  return v === 'delivery' ? 'delivery' : 'take_out'
}

export function isValidCheckoutCustomer(
  c: CheckoutCustomer | null,
  options?: { deliveryLocationsCount?: number }
): boolean {
  if (!c) return false
  const nome = c.nome.trim()
  const email = c.email.trim()
  const tel = normalizePhone(c.telefone)
  if (nome.length < 2) return false
  if (!email.includes('@') || email.length < 5) return false
  if (tel.length < 8) return false

  if (c.fulfillmentType === 'delivery') {
    const endereco = (c.enderecoEntrega ?? '').trim()
    if (endereco.length < 10) return false
    const locationCount = options?.deliveryLocationsCount ?? 0
    if (locationCount > 0 && !c.localidadeEntregaId) return false
  }

  return true
}

export function loadCheckoutCustomer(): CheckoutCustomer | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<CheckoutCustomer>
    if (typeof p.nome !== 'string' || typeof p.email !== 'string' || typeof p.telefone !== 'string') {
      return null
    }
    return {
      nome: p.nome,
      email: p.email,
      telefone: p.telefone,
      userId: typeof p.userId === 'string' ? p.userId : null,
      aceitaSmsAtualizacoes: readBool(p.aceitaSmsAtualizacoes),
      aceitaEmailAtualizacoes: readBool(p.aceitaEmailAtualizacoes),
      prefereSalvarCartao: readBool(p.prefereSalvarCartao),
      fulfillmentType: readFulfillmentType(p.fulfillmentType),
      localidadeEntregaId:
        typeof p.localidadeEntregaId === 'string' ? p.localidadeEntregaId : null,
      localidadeEntregaNome:
        typeof p.localidadeEntregaNome === 'string' ? p.localidadeEntregaNome : null,
      enderecoEntrega: typeof p.enderecoEntrega === 'string' ? p.enderecoEntrega : null,
    }
  } catch {
    return null
  }
}

export function saveCheckoutCustomer(c: CheckoutCustomer): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(c))
}

export function clearCheckoutCustomer(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
}

export type CustomerPayload = {
  nome: string
  email: string
  telefone: string
  userId: string | null
  aceitaSmsAtualizacoes: boolean
  aceitaEmailAtualizacoes: boolean
  consentiuSalvarCartao: boolean
  fulfillmentType: FulfillmentType
  localidadeEntregaId: string | null
  localidadeEntregaNome: string | null
  enderecoEntrega: string | null
}

export function customerToPayload(c: CheckoutCustomer): CustomerPayload {
  const fulfillmentType = readFulfillmentType(c.fulfillmentType)
  const endereco =
    fulfillmentType === 'delivery' ? (c.enderecoEntrega ?? '').trim() || null : null
  return {
    nome: c.nome.trim(),
    email: c.email.trim(),
    telefone: c.telefone.trim(),
    userId: c.userId,
    aceitaSmsAtualizacoes: c.aceitaSmsAtualizacoes,
    aceitaEmailAtualizacoes: c.aceitaEmailAtualizacoes,
    consentiuSalvarCartao: c.prefereSalvarCartao,
    fulfillmentType,
    localidadeEntregaId:
      fulfillmentType === 'delivery' ? c.localidadeEntregaId?.trim() || null : null,
    localidadeEntregaNome:
      fulfillmentType === 'delivery' ? c.localidadeEntregaNome?.trim() || null : null,
    enderecoEntrega: endereco,
  }
}

/** Validação compartilhada (API + cliente). */
export function parseCustomerPayload(
  input: unknown,
  options?: { requireDeliveryLocation?: boolean }
): { ok: true; customer: CustomerPayload } | { ok: false; message: string } {
  const c = input as Record<string, unknown> | null
  if (!c) return { ok: false, message: 'Dados do cliente obrigatórios.' }

  const nome = String(c.nome ?? '').trim()
  const email = String(c.email ?? '').trim().toLowerCase()
  const telefone = normalizePhone(String(c.telefone ?? ''))
  const rawUid = c.userId
  const userId =
    rawUid === null || rawUid === undefined || rawUid === ''
      ? null
      : String(rawUid)

  const aceitaSmsAtualizacoes = readBool(c.aceitaSmsAtualizacoes)
  const aceitaEmailAtualizacoes = readBool(c.aceitaEmailAtualizacoes)
  const consentiuSalvarCartao = readBool(c.consentiuSalvarCartao)
  const fulfillmentType = readFulfillmentType(c.fulfillmentType)
  const localidadeEntregaIdRaw = String(c.localidadeEntregaId ?? '').trim()
  const localidadeEntregaNomeRaw = String(c.localidadeEntregaNome ?? '').trim()
  const enderecoEntregaRaw = String(c.enderecoEntrega ?? '').trim()

  if (nome.length < 2) return { ok: false, message: 'Nome inválido.' }
  if (!email.includes('@') || email.length < 5) return { ok: false, message: 'E-mail inválido.' }
  if (telefone.length < 8) return { ok: false, message: 'Telefone inválido.' }

  if (fulfillmentType === 'delivery') {
    if (enderecoEntregaRaw.length < 10) {
      return { ok: false, message: 'Informe o endereço completo para entrega.' }
    }
    if (options?.requireDeliveryLocation && !localidadeEntregaIdRaw) {
      return { ok: false, message: 'Selecione a localidade de entrega.' }
    }
  }

  return {
    ok: true,
    customer: {
      nome,
      email,
      telefone,
      userId,
      aceitaSmsAtualizacoes,
      aceitaEmailAtualizacoes,
      consentiuSalvarCartao,
      fulfillmentType,
      localidadeEntregaId:
        fulfillmentType === 'delivery' ? localidadeEntregaIdRaw || null : null,
      localidadeEntregaNome:
        fulfillmentType === 'delivery' ? localidadeEntregaNomeRaw || null : null,
      enderecoEntrega: fulfillmentType === 'delivery' ? enderecoEntregaRaw : null,
    },
  }
}
