export type CloverChargeRequest = {
  amount: number
  currency: 'usd'
  source: string
  description?: string
  metadata?: Record<string, string>
  ecomind?: 'ecom' | 'moto'
}

export type CloverChargeResponse = {
  id: string
  amount: number
  currency: string
  status?: string
  paid?: boolean
  created?: number
  source?: {
    brand?: string
    last4?: string
    exp_month?: string
    exp_year?: string
  }
}

export type CloverApiError = {
  message?: string
  error?: {
    code?: string
    message?: string
    type?: string
  }
}

export type NormalizedCloverErrorCode =
  | 'card_declined'
  | 'invalid_card'
  | 'expired_card'
  | 'invalid_cvv'
  | 'insufficient_funds'
  | 'duplicate_payment'
  | 'network_error'
  | 'provider_unavailable'
  | 'configuration_error'
  | 'unknown_error'
