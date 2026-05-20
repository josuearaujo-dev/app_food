import { createAdminClient } from '@/lib/supabase/admin'
import { encodeKitchenReceiptEscPos, RECEIPT_MARKERS } from '@/lib/escpos-receipt'

const PRINTNODE_API_BASE = 'https://api.printnode.com'

const KITCHEN_TIMEZONE = 'America/Los_Angeles'

export type PrintNodeConfig = {
  enabled: boolean
  apiKey: string
  printerId: number | null
}

export async function getPrintNodeConfig(): Promise<PrintNodeConfig> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('configuracoes_loja')
    .select('printnode_ativo, printnode_api_key, printnode_printer_id')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle<{
      printnode_ativo?: boolean | null
      printnode_api_key?: string | null
      printnode_printer_id?: number | null
    }>()

  const envKey = String(process.env.PRINTNODE_API_KEY ?? '').trim()
  const dbKey = String(data?.printnode_api_key ?? '').trim()
  const apiKey = dbKey || envKey
  const printerRaw = Number(data?.printnode_printer_id ?? 0)
  const printerId = Number.isFinite(printerRaw) && printerRaw > 0 ? Math.floor(printerRaw) : null

  return {
    enabled: Boolean(data?.printnode_ativo) && Boolean(apiKey) && printerId != null,
    apiKey,
    printerId,
  }
}

function toBasicAuthHeader(apiKey: string) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

export async function fetchPrintNodePrinters(apiKey: string) {
  const response = await fetch(`${PRINTNODE_API_BASE}/printers`, {
    method: 'GET',
    headers: {
      Authorization: toBasicAuthHeader(apiKey),
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`PrintNode printers failed: ${response.status} ${body}`)
  }

  return (await response.json()) as Array<{
    id: number
    name?: string
    description?: string
    computer?: { id?: number; name?: string }
  }>
}

export async function createPrintNodeRawJob(input: {
  apiKey: string
  printerId: number
  title: string
  content: string
  source?: string
  idempotencyKey?: string
}) {
  const response = await fetch(`${PRINTNODE_API_BASE}/printjobs`, {
    method: 'POST',
    headers: {
      Authorization: toBasicAuthHeader(input.apiKey),
      'Content-Type': 'application/json',
      ...(input.idempotencyKey ? { 'X-Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      printerId: input.printerId,
      title: input.title,
      contentType: 'raw_base64',
      content: encodeKitchenReceiptEscPos(input.content).toString('base64'),
      source: input.source ?? 'Cadu Cakes & Lanches',
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`PrintNode printjobs failed: ${response.status} ${body}`)
  }

  const body = await response.text()
  const id = Number(body)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`PrintNode returned invalid print job id: ${body}`)
  }
  return id
}

function formatReceiptMoney(currency: string, amount: number, negative = false): string {
  const sym = currency.trim() || '$'
  const prefix = negative && amount > 0 ? '- ' : ''
  return `${prefix}${sym} ${amount.toFixed(2)}`
}

function formatReceiptDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: KITCHEN_TIMEZONE,
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(d)
  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: KITCHEN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .toLowerCase()
  return `${datePart} - ${timePart}`
}

function fulfillmentLabel(type: 'take_out' | 'delivery'): string {
  return type === 'delivery' ? 'Entrega normal' : 'Retirada na loja'
}

function markerLine(marker: string, payload: string) {
  return `${marker}${payload}`
}

export function buildKitchenReceiptText(input: {
  orderNumber: string
  createdAtISO: string
  customerName: string
  customerPhone: string
  fulfillmentType: 'take_out' | 'delivery'
  address?: string | null
  items: Array<{
    name: string
    quantity: number
    unitAmount: number
    subtotal: number
    observation?: string
    options?: Array<{ label: string; groupName?: string; groupType: 'size' | 'quantity' | 'extra' }>
  }>
  subtotal: number
  discount: number
  deliveryFee: number
  taxAmount?: number
  total: number
  currency: string
  paymentLine?: string
  reprint?: boolean
}) {
  const lines: string[] = []
  const cur = input.currency.trim() || '$'

  lines.push(markerLine(RECEIPT_MARKERS.TITLE, 'CADU CAKES E LANCHES'))
  if (input.reprint) {
    lines.push(markerLine(RECEIPT_MARKERS.REPRINT, 'REIMPRESSAO (2a VIA)'))
  }

  lines.push(markerLine(RECEIPT_MARKERS.SECTION, 'INFORMACOES DO PEDIDO'))
  lines.push(markerLine(RECEIPT_MARKERS.LABEL, `Codigo do pedido:|#${input.orderNumber}`))
  lines.push(markerLine(RECEIPT_MARKERS.LABEL_ONLY, 'Data do pedido:'))
  lines.push(formatReceiptDate(input.createdAtISO))
  lines.push(
    markerLine(
      RECEIPT_MARKERS.LABEL,
      `Forma de entrega:|${fulfillmentLabel(input.fulfillmentType)}`
    )
  )
  if (input.paymentLine?.trim()) {
    lines.push(markerLine(RECEIPT_MARKERS.LABEL, `Formas de pagamento:|${input.paymentLine.trim()}`))
  }

  lines.push(RECEIPT_MARKERS.SEP)
  lines.push(markerLine(RECEIPT_MARKERS.LABEL, `Cliente:|${input.customerName || '-'}`))
  lines.push(markerLine(RECEIPT_MARKERS.LABEL, `Telefone/WhatsApp:|${input.customerPhone || '-'}`))
  if (input.fulfillmentType === 'delivery' && input.address?.trim()) {
    lines.push(markerLine(RECEIPT_MARKERS.LABEL, `Endereco de entrega:|${input.address.trim()}`))
  }

  lines.push(RECEIPT_MARKERS.SEP)
  lines.push(markerLine(RECEIPT_MARKERS.SECTION, 'ITENS DO PEDIDO'))

  for (const item of input.items) {
    const itemName = item.name.trim().toUpperCase()
    const qtyLabel = `(${item.quantity}X)`
    lines.push(
      markerLine(
        RECEIPT_MARKERS.ITEM,
        `${qtyLabel} ${itemName}|${formatReceiptMoney(cur, item.subtotal)}`
      )
    )

    if (item.options?.length) {
      for (const op of item.options) {
        const label =
          op.groupType === 'extra' && op.groupName ? `${op.groupName}: ${op.label}` : op.label
        lines.push(`  - ${label}`)
      }
    }
    if (item.observation?.trim()) {
      lines.push(`  Obs: ${item.observation.trim()}`)
    }
  }

  lines.push(RECEIPT_MARKERS.SEP)
  lines.push(markerLine(RECEIPT_MARKERS.ROW, `Subtotal:|${formatReceiptMoney(cur, input.subtotal)}`))
  if (input.deliveryFee > 0) {
    lines.push(
      markerLine(RECEIPT_MARKERS.ROW, `Taxa de entrega:|${formatReceiptMoney(cur, input.deliveryFee)}`)
    )
  }
  if ((input.taxAmount ?? 0) > 0) {
    lines.push(
      markerLine(RECEIPT_MARKERS.ROW, `Imposto:|${formatReceiptMoney(cur, input.taxAmount ?? 0)}`)
    )
  }
  if (input.discount > 0) {
    lines.push(
      markerLine(RECEIPT_MARKERS.ROW, `Desconto:|${formatReceiptMoney(cur, input.discount, true)}`)
    )
  }
  lines.push(markerLine(RECEIPT_MARKERS.TOTAL, `Total:|${formatReceiptMoney(cur, input.total)}`))

  return lines.join('\n')
}
