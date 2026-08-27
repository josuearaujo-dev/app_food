'use client'

import { useLang } from '@/lib/lang-context'

type Props = {
  mountPrefix: string
  fieldErrors: Record<string, string>
  compact?: boolean
}

export function CloverCardFields({ mountPrefix, fieldErrors, compact = false }: Props) {
  const { t } = useLang()
  const labelClass = compact ? 'cadu-sidebar-field-label' : 'cadu-checkout-field-label'
  const fieldClass = compact ? 'cadu-sidebar-clover-field' : 'cadu-clover-field'
  const errorClass = compact ? 'cadu-sidebar-field-error' : 'cadu-checkout-field-error'

  return (
    <div className={compact ? 'cadu-sidebar-payment-fields' : 'space-y-3'}>
      <div>
        <label htmlFor={`${mountPrefix}card-number`} className={labelClass}>
          {t.paymentCardNumber}
        </label>
        <div id={`${mountPrefix}card-number`} className={fieldClass} />
        <p className={errorClass} role="alert">
          {fieldErrors['card-number']}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${mountPrefix}card-date`} className={labelClass}>
            {t.paymentCardExpiry}
          </label>
          <div id={`${mountPrefix}card-date`} className={fieldClass} />
          <p className={errorClass} role="alert">
            {fieldErrors['card-date']}
          </p>
        </div>
        <div>
          <label htmlFor={`${mountPrefix}card-cvv`} className={labelClass}>
            {t.paymentCardCvv}
          </label>
          <div id={`${mountPrefix}card-cvv`} className={fieldClass} />
          <p className={errorClass} role="alert">
            {fieldErrors['card-cvv']}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={`${mountPrefix}card-postal-code`} className={labelClass}>
          {t.paymentCardZip}
        </label>
        <div id={`${mountPrefix}card-postal-code`} className={fieldClass} />
        <p className="cadu-sidebar-zip-hint">{t.paymentZipHint}</p>
        <p className={errorClass} role="alert">
          {fieldErrors['card-postal-code']}
        </p>
      </div>
    </div>
  )
}
