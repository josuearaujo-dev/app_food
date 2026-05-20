/** Largura em caracteres para bobina 80mm (Font A ESC/POS; RONGTA, Epson, etc.). */
export const KITCHEN_RECEIPT_CHARS_PER_LINE = (() => {
  const n = Number(process.env.PRINTNODE_RECEIPT_CHARS_PER_LINE ?? 48)
  if (!Number.isFinite(n)) return 48
  return Math.min(64, Math.max(32, Math.floor(n)))
})()

export function receiptSeparatorLine(): string {
  return '-'.repeat(KITCHEN_RECEIPT_CHARS_PER_LINE)
}

/** Quebra linha para caber na largura da bobina 80mm. */
export function wrapReceiptLine(text: string, width = KITCHEN_RECEIPT_CHARS_PER_LINE): string[] {
  const trimmed = text.trimEnd()
  if (!trimmed) return ['']
  if (trimmed.length <= width) return [trimmed]

  const out: string[] = []
  let rest = trimmed
  while (rest.length > width) {
    let breakAt = rest.lastIndexOf(' ', width)
    if (breakAt <= 0) breakAt = width
    out.push(rest.slice(0, breakAt).trimEnd())
    rest = rest.slice(breakAt).trimStart()
  }
  if (rest.length > 0) out.push(rest)
  return out
}

const ESC = '\x1B'
const GS = '\x1D'

/**
 * Converte texto do cupom em bytes ESC/POS: init, alinhamento, feed e corte.
 * Necessario para impressoras termicas (ex.: RONGTA 80mm) cortarem a bobina.
 */
export function encodeKitchenReceiptEscPos(plainText: string): Buffer {
  const width = KITCHEN_RECEIPT_CHARS_PER_LINE
  const lines = plainText.split(/\r?\n/)
  const parts: string[] = []

  parts.push(ESC + '@')

  lines.forEach((line, index) => {
    const isHeaderBlock = index < 3 && line.trim().length > 0
    if (isHeaderBlock) {
      parts.push(ESC + 'a' + '\x01')
    }

    const wrapped = line.trim() === '' ? [''] : wrapReceiptLine(line, width)
    for (const w of wrapped) {
      parts.push(w + '\n')
    }

    if (isHeaderBlock) {
      parts.push(ESC + 'a' + '\x00')
    }
  })

  parts.push(ESC + 'd' + '\x06')
  parts.push(GS + 'V' + '\x00')

  return Buffer.from(parts.join(''), 'latin1')
}
