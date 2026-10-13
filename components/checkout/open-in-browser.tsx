'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { openPaymentInSystemBrowser } from '@/lib/in-app-browser'

export function OpenInBrowser() {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const [android, setAndroid] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setAndroid(/Android/i.test(navigator.userAgent || ''))
    setUrl(window.location.href)
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="cadu-checkout mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-[var(--cadu-ink)]">{t.paymentInAppTitle}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--cadu-muted)]">{t.paymentInAppBody}</p>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--cadu-ink)]">
        {t.paymentInAppSteps}
      </p>
      {url ? (
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-4 w-full rounded-xl border border-[var(--cadu-line)] bg-white px-3 py-3 text-sm text-[var(--cadu-ink)]"
          aria-label={t.paymentInAppCopy}
        />
      ) : null}
      <div className="mt-6 flex flex-col gap-3">
        {android ? (
          <button
            type="button"
            onClick={openPaymentInSystemBrowser}
            className="rounded-xl bg-[var(--cadu-brown)] px-4 py-3 text-sm font-bold text-white"
          >
            {t.paymentInAppOpen}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl border border-[var(--cadu-line)] bg-white px-4 py-3 text-sm font-bold text-[var(--cadu-ink)]"
        >
          {copied ? t.paymentInAppCopied : t.paymentInAppCopy}
        </button>
      </div>
    </main>
  )
}
