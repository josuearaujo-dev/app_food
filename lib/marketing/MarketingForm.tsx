'use client'

import { Megaphone, Radar, Server, ShieldCheck } from 'lucide-react'
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { saveMarketingSettings } from './marketing-actions'
import {
  pixelsToInstall,
  toPublicMarketingConfig,
  trackingHasPixels,
  type AdminMarketingSettings,
} from './marketing.schema'

type Draft = {
  gtmWebContainerId: string
  metaPixelId: string
  ga4MeasurementId: string
  googleAdsConversionId: string
  googleAdsConversionLabel: string
  tiktokPixelId: string
  consentVersion: string
  enableMeasurement: boolean
  enableMarketing: boolean
  enableAdvancedMatching: boolean
  enableServerSide: boolean
  requireStorefrontConsent: boolean
  metaCapiToken: string
  tiktokEventsToken: string
  clearMetaCapiToken: boolean
  clearTiktokEventsToken: boolean
}

function settingsToDraft(settings: AdminMarketingSettings): Draft {
  return {
    gtmWebContainerId: settings.gtmWebContainerId ?? '',
    metaPixelId: settings.metaPixelId ?? '',
    ga4MeasurementId: settings.ga4MeasurementId ?? '',
    googleAdsConversionId: settings.googleAdsConversionId ?? '',
    googleAdsConversionLabel: settings.googleAdsConversionLabel ?? '',
    tiktokPixelId: settings.tiktokPixelId ?? '',
    consentVersion: settings.consentVersion || 'v1',
    enableMeasurement: settings.enableMeasurement,
    enableMarketing: settings.enableMarketing,
    enableAdvancedMatching: settings.enableAdvancedMatching,
    enableServerSide: settings.enableServerSide,
    requireStorefrontConsent: settings.requireStorefrontConsent,
    metaCapiToken: '',
    tiktokEventsToken: '',
    clearMetaCapiToken: false,
    clearTiktokEventsToken: false,
  }
}

function Field({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-foreground">{label}</span>
      {children}
      {help ? <span className="block text-[11px] text-muted-foreground">{help}</span> : null}
    </label>
  )
}

function inputClassName() {
  return 'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
}

export function MarketingForm({ settings }: { settings: AdminMarketingSettings }) {
  const [baseline, setBaseline] = useState(() => settingsToDraft(settings))
  const [draft, setDraft] = useState(() => settingsToDraft(settings))
  const [metaConfigured, setMetaConfigured] = useState(settings.metaCapiConfigured)
  const [tiktokConfigured, setTiktokConfigured] = useState(settings.tiktokEventsConfigured)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline])
  const livePlan = pixelsToInstall(toPublicMarketingConfig(draft))

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await saveMarketingSettings(draft)
      if (!result.ok) {
        setError(result.message)
        return
      }
      const saved = {
        ...draft,
        metaCapiToken: '',
        tiktokEventsToken: '',
        clearMetaCapiToken: false,
        clearTiktokEventsToken: false,
      }
      setDraft(saved)
      setBaseline(saved)
      if (draft.clearMetaCapiToken) setMetaConfigured(false)
      else if (draft.metaCapiToken.trim()) setMetaConfigured(true)
      if (draft.clearTiktokEventsToken) setTiktokConfigured(false)
      else if (draft.tiktokEventsToken.trim()) setTiktokConfigured(true)
      setSuccess('Marketing salvo. Os códigos passam a valer no cardápio na próxima visita.')
    })
  }

  function discardChanges() {
    setDraft(baseline)
    setError(null)
    setSuccess(null)
  }

  const stats = [
    {
      icon: Megaphone,
      label: 'Pixels da loja',
      meta: 'IDs públicos no cardápio',
      value: trackingHasPixels(livePlan) ? 'Prontos para disparar' : 'Aguardando códigos',
    },
    {
      icon: Radar,
      label: 'Funil',
      meta: 'Página → compra',
      value: '6 eventos',
    },
    {
      icon: Server,
      label: 'Server-side',
      meta: 'Meta CAPI e TikTok',
      value:
        draft.enableServerSide && (metaConfigured || tiktokConfigured)
          ? 'Configurado'
          : 'Somente navegador',
    },
    {
      icon: ShieldCheck,
      label: 'Consentimento',
      meta: 'Rastreio no cardápio',
      value: draft.requireStorefrontConsent ? 'Pede permissão' : 'Ativo ao abrir a loja',
    },
  ]

  return (
    <div className="space-y-5 pb-24">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={16} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.meta}</p>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-foreground">Códigos públicos</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cole só o ID de cada plataforma. Se o GTM já dispara o mesmo Meta Pixel, deixe o ID
            nativo vazio para não duplicar.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Google Tag Manager" help="Ex.: GTM-XXXXXXX">
              <input
                className={inputClassName()}
                autoComplete="off"
                placeholder="GTM-XXXXXXX"
                value={draft.gtmWebContainerId}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, gtmWebContainerId: e.target.value }))
                }
              />
            </Field>
            <Field label="Meta Pixel ID" help="Somente números">
              <input
                className={inputClassName()}
                autoComplete="off"
                inputMode="numeric"
                placeholder="123456789012345"
                value={draft.metaPixelId}
                onChange={(e) => setDraft((c) => ({ ...c, metaPixelId: e.target.value }))}
              />
            </Field>
            <Field label="GA4 Measurement ID" help="Ex.: G-XXXXXXXXXX">
              <input
                className={inputClassName()}
                autoComplete="off"
                placeholder="G-XXXXXXXXXX"
                value={draft.ga4MeasurementId}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, ga4MeasurementId: e.target.value }))
                }
              />
            </Field>
            <Field label="Google Ads Conversion ID" help="Ex.: AW-123456789">
              <input
                className={inputClassName()}
                autoComplete="off"
                placeholder="AW-123456789"
                value={draft.googleAdsConversionId}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, googleAdsConversionId: e.target.value }))
                }
              />
            </Field>
            <Field label="Google Ads Conversion Label">
              <input
                className={inputClassName()}
                autoComplete="off"
                placeholder="AbCDeFghIjkLmNoP"
                value={draft.googleAdsConversionLabel}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, googleAdsConversionLabel: e.target.value }))
                }
              />
            </Field>
            <Field label="TikTok Pixel ID">
              <input
                className={inputClassName()}
                autoComplete="off"
                placeholder="CXXXXXXXXXXXXXXX"
                value={draft.tiktokPixelId}
                onChange={(e) => setDraft((c) => ({ ...c, tiktokPixelId: e.target.value }))}
              />
            </Field>
            <Field
              label="Versão do consentimento"
              help="Se mudar, o banner reaparece."
            >
              <input
                className={inputClassName()}
                value={draft.consentVersion}
                onChange={(e) => setDraft((c) => ({ ...c, consentVersion: e.target.value }))}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-foreground">Ativação</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Com consentimento desligado, os pixels entram assim que o cardápio abre.
          </p>
          <div className="marketing-toggles mt-4">
            {(
              [
                [
                  'enableMeasurement',
                  'Medição',
                  'GA4 e estatísticas de página, produto e compra.',
                ],
                [
                  'enableMarketing',
                  'Marketing',
                  'Meta Pixel, Google Ads e TikTok no funil completo.',
                ],
                [
                  'enableAdvancedMatching',
                  'Advanced Matching',
                  'Envia e-mail e telefone com hash para melhorar a atribuição.',
                ],
                [
                  'enableServerSide',
                  'Conversões server-side',
                  'Repete os eventos no Meta CAPI e no TikTok Events API.',
                ],
                [
                  'requireStorefrontConsent',
                  'Pedir consentimento no cardápio',
                  'Deixe desmarcado para o pixel instalar na hora.',
                ],
              ] as const
            ).map(([key, title, hint]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => setDraft((c) => ({ ...c, [key]: e.target.checked }))}
                />
                <span>
                  <strong>{title}</strong>
                  <small>{hint}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-foreground">Tokens privados</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tokens nunca vão para o navegador. Deixe em branco para manter o atual.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Meta CAPI token"
              help={
                metaConfigured
                  ? 'Token da Meta CAPI já configurado.'
                  : 'Access token da API de Conversões da Meta.'
              }
            >
              <input
                className={inputClassName()}
                autoComplete="new-password"
                type="password"
                placeholder={metaConfigured ? '••••••••  token salvo' : 'Cole o token da Meta'}
                value={draft.metaCapiToken}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    metaCapiToken: e.target.value,
                    clearMetaCapiToken: false,
                  }))
                }
              />
            </Field>
            <Field
              label="TikTok Events API token"
              help={
                tiktokConfigured
                  ? 'Token do TikTok já configurado.'
                  : 'Access token da Events API do TikTok.'
              }
            >
              <input
                className={inputClassName()}
                autoComplete="new-password"
                type="password"
                placeholder={
                  tiktokConfigured ? '••••••••  token salvo' : 'Cole o token do TikTok'
                }
                value={draft.tiktokEventsToken}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    tiktokEventsToken: e.target.value,
                    clearTiktokEventsToken: false,
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={draft.clearMetaCapiToken}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    clearMetaCapiToken: e.target.checked,
                    metaCapiToken: e.target.checked ? '' : c.metaCapiToken,
                  }))
                }
              />
              Remover token da Meta
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={draft.clearTiktokEventsToken}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    clearTiktokEventsToken: e.target.checked,
                    tiktokEventsToken: e.target.checked ? '' : c.tiktokEventsToken,
                  }))
                }
              />
              Remover token do TikTok
            </label>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-muted-foreground">
              {error ? (
                <p className="font-semibold text-red-600" role="alert">
                  {error}
                </p>
              ) : success ? (
                <p className="font-semibold text-emerald-700" role="status">
                  {success}
                </p>
              ) : isDirty ? (
                <p>Você tem alterações não salvas.</p>
              ) : (
                <p>Cole os IDs e salve para o rastreio entrar no cardápio.</p>
              )}
            </div>
            <div className="flex gap-2">
              {isDirty ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={discardChanges}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-foreground"
                >
                  Descartar
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!isDirty || isPending}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {isPending ? 'Salvando…' : 'Salvar marketing'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
