export type CloverEnv = 'sandbox' | 'production'

export type CloverServerConfig = {
  env: CloverEnv
  privateToken: string
  merchantId: string
  apiBase: string
}

export type CloverPublicConfig = {
  env: CloverEnv
  publicToken: string
  merchantId: string
  sdkSrc: string
}

function resolveEnv(raw: string | undefined): CloverEnv {
  return raw === 'production' || raw === 'live' ? 'production' : 'sandbox'
}

export function getPaymentProvider(): 'clover' | 'paypal' {
  const value = (process.env.PAYMENT_PROVIDER ?? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'clover')
    .trim()
    .toLowerCase()
  return value === 'paypal' ? 'paypal' : 'clover'
}

export function getCloverServerConfig(): CloverServerConfig {
  const env = resolveEnv(process.env.CLOVER_ENV ?? process.env.NEXT_PUBLIC_CLOVER_ENV)
  const publicEnv = resolveEnv(process.env.NEXT_PUBLIC_CLOVER_ENV)
  if (env !== publicEnv) {
    console.warn('clover_env_mismatch', { server: env, public: publicEnv })
  }
  const privateToken = process.env.CLOVER_PRIVATE_TOKEN?.trim()
  const merchantId = process.env.CLOVER_MERCHANT_ID?.trim()

  if (!privateToken) {
    throw new Error('CLOVER_PRIVATE_TOKEN não configurado.')
  }
  if (!merchantId) {
    throw new Error('CLOVER_MERCHANT_ID não configurado.')
  }

  return {
    env,
    privateToken,
    merchantId,
    // NA (US/CA). Confirmar URL regional na conta antes de produção.
    apiBase:
      env === 'production'
        ? 'https://scl.clover.com'
        : 'https://scl-sandbox.dev.clover.com',
  }
}

export function getCloverPublicConfig(): CloverPublicConfig {
  const env = resolveEnv(process.env.NEXT_PUBLIC_CLOVER_ENV)
  const publicToken = process.env.NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN?.trim()
  const merchantId = process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID?.trim()

  if (!publicToken) {
    throw new Error('NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN não configurado.')
  }
  if (!merchantId) {
    throw new Error('NEXT_PUBLIC_CLOVER_MERCHANT_ID não configurado.')
  }

  return {
    env,
    publicToken,
    merchantId,
    sdkSrc:
      env === 'production'
        ? 'https://checkout.clover.com/sdk.js'
        : 'https://checkout.sandbox.dev.clover.com/sdk.js',
  }
}

export function tryGetCloverPublicConfig(): CloverPublicConfig | null {
  try {
    return getCloverPublicConfig()
  } catch {
    return null
  }
}
