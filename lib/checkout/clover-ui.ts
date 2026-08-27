import type { useCart } from '@/lib/cart-context'

export const CLOVER_FIELD_STYLES = {
  input: {
    fontSize: '15px',
    fontFamily: 'inherit',
    color: '#531B04',
    height: '42px',
    lineHeight: '42px',
    padding: '0 10px',
  },
  'input::placeholder': {
    color: '#7A4A35',
  },
}

export type CloverElementsApi = {
  create: (
    type: string,
    styles?: Record<string, Record<string, string>>
  ) => {
    mount: (selector: string) => void
    addEventListener: (event: string, handler: (event: unknown) => void) => void
  }
}

export type CloverSdk = {
  elements: () => CloverElementsApi
  createToken: () => Promise<{ token?: string; errors?: Record<string, string> }>
}

export function buildCartPayload(items: ReturnType<typeof useCart>['items']) {
  return items.map(({ item, quantity, observation, selectedOptions }) => ({
    id: item.id,
    quantity,
    observation,
    selectedOptions: selectedOptions.map((o) => ({
      optionId: o.optionId,
    })),
  }))
}

export function cloverMountIds(prefix: string) {
  return {
    number: `#${prefix}card-number`,
    date: `#${prefix}card-date`,
    cvv: `#${prefix}card-cvv`,
    postal: `#${prefix}card-postal-code`,
  }
}
