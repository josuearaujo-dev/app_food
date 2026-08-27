import { getCloverServerConfig } from './config'
import { normalizeCloverError } from './errors'
import type { CloverApiError, CloverChargeResponse } from './types'

const TIMEOUT_MS = 25_000

export class CloverChargeError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly retryable: boolean

  constructor(opts: {
    code: string
    message: string
    httpStatus: number
    retryable: boolean
  }) {
    super(opts.message)
    this.name = 'CloverChargeError'
    this.code = opts.code
    this.httpStatus = opts.httpStatus
    this.retryable = opts.retryable
  }
}

export async function createCloverCharge(input: {
  amount: number
  currency: 'usd'
  source: string
  idempotencyKey: string
  clientIp?: string
  description?: string
  receiptEmail?: string
  metadata?: Record<string, string>
}): Promise<CloverChargeResponse> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new CloverChargeError({
      code: 'invalid_amount',
      message: 'Valor de cobrança inválido.',
      httpStatus: 400,
      retryable: false,
    })
  }

  if (!input.source.startsWith('clv_')) {
    throw new CloverChargeError({
      code: 'invalid_source',
      message: 'Token de cartão inválido.',
      httpStatus: 400,
      retryable: false,
    })
  }

  const config = getCloverServerConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.privateToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    }
    if (input.clientIp) {
      headers['x-forwarded-for'] = input.clientIp
    }

    const response = await fetch(`${config.apiBase}/v1/charges`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        source: input.source,
        description: input.description,
        metadata: input.metadata,
        receipt_email: input.receiptEmail,
        ecomind: 'ecom',
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const raw = (await response.json().catch(() => ({}))) as CloverChargeResponse &
      CloverApiError

    if (!response.ok) {
      const normalized = normalizeCloverError({
        httpStatus: response.status,
        code: raw.error?.code,
        message: raw.error?.message ?? raw.message,
      })
      throw new CloverChargeError({
        code: normalized.code,
        message: normalized.message,
        httpStatus: response.status,
        retryable: normalized.retryable,
      })
    }

    if (!raw.id) {
      throw new CloverChargeError({
        code: 'unknown_error',
        message: 'Resposta inválida do provedor de pagamento.',
        httpStatus: 502,
        retryable: true,
      })
    }

    return {
      id: raw.id,
      amount: raw.amount,
      currency: raw.currency,
      status: raw.status,
      paid: raw.paid,
      created: raw.created,
      outcome: raw.outcome
        ? {
            network_status: raw.outcome.network_status,
            type: raw.outcome.type,
          }
        : undefined,
      source: raw.source
        ? {
            brand: raw.source.brand,
            last4: raw.source.last4,
            exp_month: raw.source.exp_month,
            exp_year: raw.source.exp_year,
          }
        : undefined,
    }
  } catch (error) {
    if (error instanceof CloverChargeError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CloverChargeError({
        code: 'network_error',
        message: 'Tempo esgotado ao contactar o provedor de pagamento.',
        httpStatus: 504,
        retryable: true,
      })
    }
    const normalized = normalizeCloverError({
      message: error instanceof Error ? error.message : 'network',
    })
    throw new CloverChargeError({
      code: normalized.code,
      message: normalized.message,
      httpStatus: 502,
      retryable: normalized.retryable,
    })
  } finally {
    clearTimeout(timer)
  }
}
