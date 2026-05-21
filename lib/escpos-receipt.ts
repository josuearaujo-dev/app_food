/** Largura em caracteres para bobina 80mm (Font A ESC/POS). */
export const KITCHEN_RECEIPT_CHARS_PER_LINE = (() => {
  const n = Number(process.env.PRINTNODE_RECEIPT_CHARS_PER_LINE ?? 48)
  if (!Number.isFinite(n)) return 48
  return Math.min(64, Math.max(32, Math.floor(n)))
})()

/** Com fonte 2x largura, uma bobina 80mm comporta metade dos caracteres. */
export const KITCHEN_RECEIPT_PRINT_CHARS_PER_LINE = Math.max(
  16,
  Math.floor(KITCHEN_RECEIPT_CHARS_PER_LINE / 2)
)

/** Separador solido para bobina termica. */
export function receiptSeparatorLine(): string {
  return '_'.repeat(KITCHEN_RECEIPT_PRINT_CHARS_PER_LINE)
}

export const RECEIPT_MARKERS = {
  TITLE: '@@TITLE@@',
  REPRINT: '@@REPRINT@@',
  SECTION: '@@SECTION@@',
  LABEL: '@@LBL@@',
  LABEL_ONLY: '@@LBLONLY@@',
  SEP: '@@SEP@@',
  ITEM: '@@ITEM@@',
  ROW: '@@ROW@@',
  TOTAL: '@@TOTAL@@',
} as const

/** @deprecated use RECEIPT_MARKERS.ITEM */
export const RECEIPT_ITEM_LINE_PREFIX = RECEIPT_MARKERS.ITEM

const ESC = '\x1B'
const GS = '\x1D'
const ESC_MODE_NORMAL = 0
const ESC_MODE_LARGE_TEXT = 0x30

function escSelectPrintMode(mode: number): string {
  return ESC + '!' + String.fromCharCode(mode)
}

function escFontA(): string {
  return ESC + 'M' + '\x00'
}

function escBoldOn(): string {
  return ESC + 'E' + '\x01'
}

function escBoldOff(): string {
  return ESC + 'E' + '\x00'
}

function escUnderlineOn(): string {
  return ESC + '-' + '\x01'
}

function escUnderlineOff(): string {
  return ESC + '-' + '\x00'
}

function appendSeparatorLine(parts: string[], width: number) {
  parts.push(escSelectPrintMode(ESC_MODE_NORMAL))
  parts.push(escBoldOn())
  appendPlainLines(parts, receiptSeparatorLine(), width)
  parts.push(escBoldOff())
  parts.push(escSelectPrintMode(ESC_MODE_LARGE_TEXT))
}

function escAlignCenter(): string {
  return ESC + 'a' + '\x01'
}

function escAlignLeft(): string {
  return ESC + 'a' + '\x00'
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

function splitMarker(line: string, marker: string): string | null {
  if (!line.startsWith(marker)) return null
  return line.slice(marker.length)
}

function splitPipePair(payload: string): { left: string; right: string } | null {
  const idx = payload.indexOf('|')
  if (idx === -1) return null
  return {
    left: payload.slice(0, idx),
    right: payload.slice(idx + 1),
  }
}

/** Label a esquerda, valor a direita (mesma linha; continuação só do lado esquerdo). */
function formatLeftRightLines(left: string, right: string, width: number): string[] {
  const rightPart = right.trim()
  const rightLen = rightPart.length
  const maxLeft = Math.max(8, width - rightLen - 1)

  if (left.length <= maxLeft && rightLen > 0) {
    const gap = width - left.length - rightLen
    return [left + (gap > 0 ? ' '.repeat(gap) : ' ') + rightPart]
  }

  const wrapped = wrapReceiptLine(left, maxLeft)
  if (wrapped.length === 0) return rightPart ? [rightPart.padStart(width)] : ['']

  const lines = [...wrapped]
  if (rightLen > 0) {
    const first = lines[0]
    const gap = width - first.length - rightLen
    lines[0] = first + (gap > 0 ? ' '.repeat(gap) : ' ') + rightPart
  }
  return lines
}

function appendPlainLines(parts: string[], text: string, width: number) {
  const wrapped = text.trim() === '' ? [''] : wrapReceiptLine(text, width)
  for (const w of wrapped) {
    appendLargeBoldLine(parts, w)
  }
}

function appendLargeBoldLine(parts: string[], line: string) {
  parts.push(escSelectPrintMode(ESC_MODE_LARGE_TEXT))
  parts.push(escBoldOn())
  parts.push(line + '\n')
  parts.push(escBoldOff())
  parts.push(escSelectPrintMode(ESC_MODE_NORMAL))
}

function appendBoldLabelValue(parts: string[], label: string, value: string, width: number) {
  const wrapped = formatLeftRightLines(label, value, width)
  for (const line of wrapped) {
    appendLargeBoldLine(parts, line)
  }
}

function appendSectionTitle(parts: string[], title: string, width: number) {
  const wrapped = wrapReceiptLine(title, width)
  for (const line of wrapped) {
    parts.push(escSelectPrintMode(ESC_MODE_LARGE_TEXT))
    parts.push(escUnderlineOn())
    parts.push(escBoldOn())
    parts.push(line + '\n')
    parts.push(escBoldOff())
    parts.push(escUnderlineOff())
    parts.push(escSelectPrintMode(ESC_MODE_NORMAL))
  }
}

function appendItemLines(parts: string[], left: string, right: string, width: number) {
  const physical = formatLeftRightLines(left, right, width)
  for (const line of physical) {
    appendLargeBoldLine(parts, line)
  }
}

function appendRowLines(parts: string[], left: string, right: string, width: number, bold: boolean) {
  const physical = formatLeftRightLines(left, right, width)
  for (const line of physical) {
    if (bold) {
      appendLargeBoldLine(parts, line)
    } else {
      appendPlainLines(parts, line, width)
    }
  }
}

function encodeReceiptLine(parts: string[], line: string, width: number) {
  const trimmed = line.trimEnd()

  const title = splitMarker(trimmed, RECEIPT_MARKERS.TITLE)
  if (title != null) {
    parts.push(escAlignCenter())
    parts.push(escBoldOn())
    appendPlainLines(parts, title, width)
    parts.push(escBoldOff())
    parts.push(escAlignLeft())
    return
  }

  const reprint = splitMarker(trimmed, RECEIPT_MARKERS.REPRINT)
  if (reprint != null) {
    parts.push(escAlignCenter())
    appendPlainLines(parts, reprint, width)
    parts.push(escAlignLeft())
    return
  }

  const section = splitMarker(trimmed, RECEIPT_MARKERS.SECTION)
  if (section != null) {
    appendSectionTitle(parts, section, width)
    return
  }

  const labelOnly = splitMarker(trimmed, RECEIPT_MARKERS.LABEL_ONLY)
  if (labelOnly != null) {
    parts.push(escBoldOn())
    appendPlainLines(parts, labelOnly, width)
    parts.push(escBoldOff())
    return
  }

  const label = splitMarker(trimmed, RECEIPT_MARKERS.LABEL)
  if (label != null) {
    const pair = splitPipePair(label)
    if (pair) {
      appendBoldLabelValue(parts, pair.left, pair.right, width)
      return
    }
    parts.push(escBoldOn())
    appendPlainLines(parts, label, width)
    parts.push(escBoldOff())
    return
  }

  if (trimmed === RECEIPT_MARKERS.SEP || trimmed.startsWith(RECEIPT_MARKERS.SEP)) {
    appendSeparatorLine(parts, width)
    return
  }

  const item = splitMarker(trimmed, RECEIPT_MARKERS.ITEM)
  if (item != null) {
    const pair = splitPipePair(item)
    if (pair) {
      appendItemLines(parts, pair.left.trim(), pair.right.trim(), width)
      return
    }
    appendItemLines(parts, item.trim(), '', width)
    return
  }

  const total = splitMarker(trimmed, RECEIPT_MARKERS.TOTAL)
  if (total != null) {
    const pair = splitPipePair(total)
    if (pair) {
      appendRowLines(parts, pair.left, pair.right, width, true)
      return
    }
    parts.push(escBoldOn())
    appendPlainLines(parts, total, width)
    parts.push(escBoldOff())
    return
  }

  const row = splitMarker(trimmed, RECEIPT_MARKERS.ROW)
  if (row != null) {
    const pair = splitPipePair(row)
    if (pair) {
      appendRowLines(parts, pair.left, pair.right, width, false)
      return
    }
    appendPlainLines(parts, row, width)
    return
  }

  appendPlainLines(parts, trimmed, width)
}

/**
 * Converte texto do cupom (com marcadores) em bytes ESC/POS.
 */
export function encodeKitchenReceiptEscPos(plainText: string): Buffer {
  const width = KITCHEN_RECEIPT_PRINT_CHARS_PER_LINE
  const lines = plainText.split(/\r?\n/)
  const parts: string[] = []

  parts.push(ESC + '@')
  parts.push(escSelectPrintMode(ESC_MODE_LARGE_TEXT))
  parts.push(escFontA())

  for (const line of lines) {
    encodeReceiptLine(parts, line, width)
  }

  parts.push(ESC + 'd' + '\x06')
  parts.push(GS + 'V' + '\x00')

  return Buffer.from(parts.join(''), 'latin1')
}
