import type { NormalizedCloverErrorCode } from './types'

const FRIENDLY: Record<NormalizedCloverErrorCode, string> = {
  card_declined: 'Não foi possível aprovar o cartão. Confira os dados ou tente outro cartão.',
  invalid_card: 'Os dados do cartão parecem inválidos. Verifique o número e tente de novo.',
  expired_card: 'Este cartão está vencido. Use outro cartão.',
  invalid_cvv: 'O código de segurança (CVV) está incorreto.',
  insufficient_funds: 'Pagamento recusado por saldo insuficiente. Tente outro cartão.',
  duplicate_payment: 'Este pagamento já foi processado.',
  network_error: 'Falha de conexão com o provedor de pagamento. Tente novamente.',
  provider_unavailable: 'O provedor de pagamento está temporariamente indisponível.',
  configuration_error: 'Pagamento indisponível no momento. Tente mais tarde.',
  unknown_error: 'Não foi possível concluir o pagamento. Tente novamente.',
}

export function friendlyCloverMessage(code: NormalizedCloverErrorCode): string {
  return FRIENDLY[code]
}

const CLOVER_ERROR_CODE_MAP: Record<string, NormalizedCloverErrorCode> = {
  card_declined: 'card_declined',
  card_on_file_missing: 'invalid_card',
  expired_card: 'expired_card',
  incorrect_cvc: 'invalid_cvv',
  incorrect_number: 'invalid_card',
  invalid_card_type: 'invalid_card',
  invalid_request: 'invalid_card',
  insufficient_funds: 'insufficient_funds',
  token_already_used: 'duplicate_payment',
  duplicate_payment: 'duplicate_payment',
  processing_error: 'provider_unavailable',
  rate_limit: 'provider_unavailable',
}

export function normalizeCloverError(input: {
  httpStatus?: number
  code?: string
  message?: string
}): { code: NormalizedCloverErrorCode; message: string; retryable: boolean } {
  const raw = `${input.code ?? ''} ${input.message ?? ''}`.toLowerCase()
  const status = input.httpStatus ?? 0

  let code: NormalizedCloverErrorCode = 'unknown_error'
  const mappedCode = input.code ? CLOVER_ERROR_CODE_MAP[input.code.toLowerCase()] : undefined

  if (mappedCode) code = mappedCode
  else if (status === 401 || status === 403) code = 'configuration_error'
  else if (status === 409) code = 'duplicate_payment'
  else if (status === 408 || status === 504 || status === 0) code = 'network_error'
  else if (status >= 500) code = 'provider_unavailable'
  else if (/insufficient|funds|balance/.test(raw)) code = 'insufficient_funds'
  else if (/expir/.test(raw)) code = 'expired_card'
  else if (/cvv|cvc|security code|incorrect_cvc/.test(raw)) code = 'invalid_cvv'
  else if (/declin|do_not_honor|refused/.test(raw)) code = 'card_declined'
  else if (/invalid.*card|card.*invalid|incorrect_number/.test(raw)) code = 'invalid_card'
  else if (/duplicate|idempoten|token_already_used/.test(raw)) code = 'duplicate_payment'
  else if (/network|timeout|fetch/.test(raw)) code = 'network_error'

  const retryable =
    code === 'network_error' ||
    code === 'provider_unavailable' ||
    code === 'unknown_error' ||
    code === 'duplicate_payment'

  return { code, message: friendlyCloverMessage(code), retryable }
}
