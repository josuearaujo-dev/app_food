import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { printPedidoKitchen } from '@/lib/order-kitchen-print'
import { getPrintNodeConfig, isPrintNodeRateLimit } from '@/lib/printnode'

const MAX_ATTEMPTS = 8
const PASS_BUDGET_MS = 12_000
const STUCK_MS = 2 * 60 * 1000

type QueuedJob = {
  id: string
  order_id: string
  attempts: number
}

let draining: Promise<void> | null = null

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Puts the order in the kitchen print queue.
 * Old rows stay as `pending` and are ignored, so tickets that already
 * printed are not sent again.
 */
export async function enqueueKitchenPrint(orderId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('print_jobs').upsert(
    {
      order_id: orderId,
      status: 'queued',
      attempts: 0,
      last_error: null,
    },
    { onConflict: 'order_id', ignoreDuplicates: true }
  )
  if (error) throw new Error(error.message)
}

export async function scheduleKitchenPrint(orderId: string) {
  const printCfg = await getPrintNodeConfig()
  if (!printCfg.enabled || !printCfg.printerId) return

  try {
    await enqueueKitchenPrint(orderId)
  } catch (error) {
    console.error('[PrintNode] Fila indisponivel, imprimindo direto', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    })
    try {
      await printPedidoKitchen(orderId)
    } catch (printError) {
      console.error('[PrintNode] Falha ao imprimir pedido', {
        orderId,
        error: printError instanceof Error ? printError.message : String(printError),
      })
    }
    return
  }

  startDrain()
}

function startDrain() {
  void kickDrain()
  try {
    after(() => kickDrain())
  } catch {
    // kickDrain above already started the worker in this process.
  }
}

export function kickDrain() {
  if (!draining) {
    draining = drainAll().finally(() => {
      draining = null
    })
  }
  return draining
}

async function drainAll() {
  const supabase = createAdminClient()
  const stuckBefore = new Date(Date.now() - STUCK_MS).toISOString()
  await supabase
    .from('print_jobs')
    .update({ status: 'queued' })
    .eq('status', 'printing')
    .lt('processed_at', stuckBefore)

  const started = Date.now()
  let handled = 0

  while (handled < 40 && Date.now() - started < PASS_BUDGET_MS) {
    const { data: next, error } = await supabase
      .from('print_jobs')
      .select('id, order_id, attempts')
      .eq('status', 'queued')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!next) return

    const job = next as QueuedJob
    const { data: claimed, error: claimError } = await supabase
      .from('print_jobs')
      .update({ status: 'printing', processed_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'queued')
      .select('id, order_id, attempts')
      .maybeSingle()

    if (claimError) throw new Error(claimError.message)
    if (!claimed) continue

    try {
      await printPedidoKitchen(job.order_id)
      await supabase
        .from('print_jobs')
        .update({
          status: 'printed',
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', job.id)
      handled += 1
    } catch (printError) {
      const message = printError instanceof Error ? printError.message : String(printError)
      console.error('[PrintNode] Falha ao imprimir pedido da fila', {
        orderId: job.order_id,
        error: message,
      })

      if (isPrintNodeRateLimit(printError)) {
        await supabase
          .from('print_jobs')
          .update({ status: 'queued', last_error: message })
          .eq('id', job.id)
        await sleep(2000)
        scheduleContinuation()
        return
      }

      const attempts = Number(job.attempts ?? 0) + 1
      await supabase
        .from('print_jobs')
        .update({
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
          attempts,
          last_error: message.slice(0, 500),
        })
        .eq('id', job.id)
    }
  }

  const { count } = await supabase
    .from('print_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)

  if ((count ?? 0) > 0) scheduleContinuation()
}

function scheduleContinuation() {
  setTimeout(() => {
    void kickDrain()
  }, 400)
  try {
    after(() => {
      void kickDrain()
    })
  } catch {
    // The timeout above keeps the queue moving on a long-running server.
  }
}
