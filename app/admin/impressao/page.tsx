'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer, RefreshCw, Send } from 'lucide-react'
import { LogoLoadingScreen } from '@/components/logo-loading-screen'
import { useLang } from '@/lib/lang-context'

const PREVIEW_MARKERS = [
  '@@TITLE@@',
  '@@REPRINT@@',
  '@@SECTION@@',
  '@@LBL@@',
  '@@LBLONLY@@',
  '@@ITEM@@',
  '@@ROW@@',
  '@@TOTAL@@',
]

function receiptPreviewLine(line: string) {
  if (line === '@@SEP@@') return '-'.repeat(48)

  let clean = line
  for (const marker of PREVIEW_MARKERS) {
    if (clean.startsWith(marker)) {
      clean = clean.slice(marker.length)
      break
    }
  }

  const pipeIndex = clean.indexOf('|')
  if (pipeIndex === -1) return clean

  const left = clean.slice(0, pipeIndex)
  const right = clean.slice(pipeIndex + 1)
  const spaces = Math.max(1, 48 - left.length - right.length)
  return `${left}${' '.repeat(spaces)}${right}`
}

export default function AdminImpressaoPage() {
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [receiptText, setReceiptText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewText = useMemo(
    () => receiptText.split(/\r?\n/).map(receiptPreviewLine).join('\n'),
    [receiptText]
  )

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/printnode/preview', { cache: 'no-store' })
      const data = (await response.json()) as { text?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Falha ao carregar exemplo de impressao.')
      setReceiptText(data.text ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar exemplo de impressao.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  async function handleSendTest() {
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/printnode/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await response.json()) as { printJobId?: number; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Falha ao enviar teste de impressao.')
      setMessage(`Teste enviado para a impressora. Print Job ID: ${data.printJobId ?? '-'}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar teste de impressao.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <LogoLoadingScreen variant="fullscreen" message={t.loadingAdmin} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F6F7FA]">
      <header className="sticky top-0 z-40 border-b border-border bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-secondary/80"
              aria-label="Voltar ao admin"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">{t.adminPanel}</p>
              <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Printer size={20} className="text-primary" />
                Área de impressão
              </h1>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">Exemplo do cupom térmico</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Esta prévia usa o mesmo modelo enviado para a impressora da cozinha.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPreview()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-2xl bg-neutral-200 p-4">
            <pre className="mx-auto min-h-[520px] w-[320px] whitespace-pre-wrap rounded-sm bg-white px-4 py-5 font-mono text-[11px] leading-[1.45] text-black shadow-md">
              {previewText}
            </pre>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-foreground">Teste real</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Envie este mesmo exemplo para a impressora configurada no PrintNode.
            </p>
            <button
              type="button"
              onClick={() => void handleSendTest()}
              disabled={sending}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Enviando...' : 'Enviar teste para impressora'}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-bold text-foreground">Observação</p>
            <p className="mt-1">
              A tela mostra a estrutura e textos do cupom. Negrito, corte e comandos ESC/POS só aparecem
              no teste físico da impressora.
            </p>
            <Link href="/admin" className="mt-3 inline-block font-bold text-primary underline underline-offset-2">
              Configurar PrintNode
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}
