import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminAppUser } from '@/lib/admin-access'
import { buildKitchenReceiptText, createPrintNodeRawJob, getPrintNodeConfig } from '@/lib/printnode'

type TestBody = {
  printerId?: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAdminAppUser(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as TestBody
    const cfg = await getPrintNodeConfig()
    if (!cfg.apiKey) {
      return NextResponse.json({ error: 'API key do PrintNode nao configurada.' }, { status: 400 })
    }

    const printerIdRaw = Number(body.printerId ?? cfg.printerId ?? 0)
    if (!Number.isFinite(printerIdRaw) || printerIdRaw <= 0) {
      return NextResponse.json({ error: 'printerId invalido.' }, { status: 400 })
    }

    const text = buildKitchenReceiptText({
      orderNumber: 'TESTE01',
      createdAtISO: new Date().toISOString(),
      customerName: 'Teste Admin',
      customerPhone: '(000) 000-0000',
      fulfillmentType: 'delivery',
      address: '11 Abbott st - Danbury/CT',
      items: [
        {
          name: 'Bife a cavalo (prato do dia)',
          quantity: 1,
          unitAmount: 14.99,
          subtotal: 14.99,
        },
      ],
      subtotal: 14.99,
      discount: 0,
      deliveryFee: 5,
      taxAmount: 1.1,
      total: 21.09,
      currency: '$',
      paymentLine: 'Dinheiro',
    })

    const printJobId = await createPrintNodeRawJob({
      apiKey: cfg.apiKey,
      printerId: Math.floor(printerIdRaw),
      title: 'Teste PrintNode - Cadu Cakes & Lanches',
      content: text,
      source: 'Cadu Cakes & Lanches Admin',
      idempotencyKey: `printnode-test-${Date.now()}`,
    })

    return NextResponse.json({ ok: true, printJobId })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha no teste de impressao.' },
      { status: 500 }
    )
  }
}
