'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/lang-context'

export function StoreOrdersSwitch() {
  const { t } = useLang()
  const [id, setId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('configuracoes_loja')
      .select('id, aceitando_pedidos')
      .limit(1)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError) {
          setError(loadError.message)
          setAccepting(false)
          return
        }
        setId(data?.id ?? null)
        setAccepting(data?.aceitando_pedidos === true)
      })
  }, [])

  async function toggle() {
    if (!id || accepting === null || saving) return
    const next = !accepting
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: saveError } = await supabase
      .from('configuracoes_loja')
      .update({ aceitando_pedidos: next })
      .eq('id', id)
    if (saveError) setError(saveError.message)
    else setAccepting(next)
    setSaving(false)
  }

  const closed = accepting !== true

  return (
    <section className="mb-5 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{t.adminStoreStatus}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.adminStoreStatusHint}</p>
          {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={accepting === null || saving || !id}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
            closed ? 'bg-red-700' : 'bg-emerald-700'
          }`}
        >
          {saving ? '...' : closed ? t.adminStoreClosed : t.adminStoreAccepting}
        </button>
      </div>
    </section>
  )
}
