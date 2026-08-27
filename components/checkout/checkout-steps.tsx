'use client'

import { useLang } from '@/lib/lang-context'

type Step = 1 | 2

export function CheckoutSteps({ current }: { current: Step }) {
  const { t } = useLang()

  return (
    <div className="cadu-checkout-steps" aria-label="Checkout progress">
      <div className={`cadu-checkout-step ${current === 1 ? 'cadu-checkout-step--on' : 'cadu-checkout-step--done'}`}>
        <span>1</span>
        <p>{t.checkoutStepData}</p>
      </div>
      <i className="cadu-checkout-step-line" aria-hidden />
      <div className={`cadu-checkout-step ${current === 2 ? 'cadu-checkout-step--on' : ''}`}>
        <span>2</span>
        <p>{t.checkoutStepPayment}</p>
      </div>
    </div>
  )
}
