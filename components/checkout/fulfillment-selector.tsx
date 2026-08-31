'use client'

import { MapPin, Store, Truck } from 'lucide-react'
import type { FulfillmentType, DeliveryLocation } from '@/lib/checkout/fulfillment'
import { resolveClientDeliveryFee } from '@/lib/checkout/fulfillment'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'

type Props = {
  fulfillmentType: FulfillmentType
  onFulfillmentTypeChange: (value: FulfillmentType) => void
  localidadeId: string
  onLocalidadeIdChange: (value: string) => void
  localidadeNome: string
  onLocalidadeNomeChange: (value: string) => void
  endereco: string
  onEnderecoChange: (value: string) => void
  locations: DeliveryLocation[]
  defaultDeliveryFee: number
  loading?: boolean
}

export function FulfillmentSelector({
  fulfillmentType,
  onFulfillmentTypeChange,
  localidadeId,
  onLocalidadeIdChange,
  localidadeNome,
  onLocalidadeNomeChange,
  endereco,
  onEnderecoChange,
  locations,
  defaultDeliveryFee,
  loading,
}: Props) {
  const { t } = useLang()
  const deliveryFee = resolveClientDeliveryFee(
    fulfillmentType,
    localidadeId || null,
    locations,
    defaultDeliveryFee
  )

  function handleLocationChange(nextId: string) {
    onLocalidadeIdChange(nextId)
    const loc = locations.find((row) => row.id === nextId)
    onLocalidadeNomeChange(loc?.nome ?? '')
  }

  return (
    <div className="cadu-checkout-card space-y-4">
      <div>
        <p className="cadu-checkout-kicker">{t.checkoutFulfillmentTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--cadu-muted)]">
          {t.checkoutFulfillmentHint}
        </p>
      </div>

      <div className="cadu-checkout-fulfillment-options" role="radiogroup" aria-label={t.checkoutFulfillmentTitle}>
        <button
          type="button"
          role="radio"
          aria-checked={fulfillmentType === 'take_out'}
          className={cn(
            'cadu-checkout-fulfillment-option',
            fulfillmentType === 'take_out' && 'cadu-checkout-fulfillment-option--active'
          )}
          onClick={() => onFulfillmentTypeChange('take_out')}
        >
          <span className="cadu-checkout-fulfillment-icon" aria-hidden>
            <Store size={20} />
          </span>
          <span className="cadu-checkout-fulfillment-copy">
            <strong>{t.checkoutPickup}</strong>
            <small>{t.checkoutPickupHint}</small>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={fulfillmentType === 'delivery'}
          className={cn(
            'cadu-checkout-fulfillment-option',
            fulfillmentType === 'delivery' && 'cadu-checkout-fulfillment-option--active'
          )}
          onClick={() => onFulfillmentTypeChange('delivery')}
        >
          <span className="cadu-checkout-fulfillment-icon" aria-hidden>
            <Truck size={20} />
          </span>
          <span className="cadu-checkout-fulfillment-copy">
            <strong>{t.checkoutDelivery}</strong>
            <small>
              {loading
                ? t.checkoutLoading
                : deliveryFee > 0
                  ? `${t.checkoutDeliveryFee}: ${t.currency}${deliveryFee.toFixed(2)}`
                  : t.checkoutDeliveryFree}
            </small>
          </span>
        </button>
      </div>

      {fulfillmentType === 'delivery' ? (
        <div className="space-y-3 border-t border-[var(--cadu-line)] pt-3">
          {locations.length > 0 ? (
            <div>
              <label htmlFor="checkout-localidade" className="cadu-checkout-field-label">
                {t.checkoutDeliveryArea}
              </label>
              <select
                id="checkout-localidade"
                value={localidadeId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="cadu-checkout-input cadu-checkout-select"
                required
              >
                <option value="">{t.checkoutSelectArea}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nome} — {t.currency}
                    {loc.taxaEntrega.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label htmlFor="checkout-endereco" className="cadu-checkout-field-label">
              {t.checkoutDeliveryAddress}
            </label>
            <div className="cadu-checkout-input-wrap cadu-checkout-input-wrap--textarea">
              <MapPin size={16} />
              <textarea
                id="checkout-endereco"
                value={endereco}
                onChange={(e) => onEnderecoChange(e.target.value)}
                required
                rows={3}
                placeholder={t.checkoutDeliveryAddressPlaceholder}
                className="cadu-checkout-input cadu-checkout-textarea"
              />
            </div>
          </div>

          {localidadeNome ? (
            <p className="text-[11px] text-[var(--cadu-muted)]">
              {t.checkoutDeliveryArea}: <strong>{localidadeNome}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
