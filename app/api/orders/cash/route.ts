import { NextResponse } from 'next/server'
import { parseCustomerPayload } from '@/lib/checkout-customer'
import { computePromotionForOrderCart } from '@/lib/order-promotions'
import { getDeliveryFeeAmount } from '@/lib/store-settings'
import { calculateOrderTax } from '@/lib/order-tax'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildKitchenReceiptText,
  createPrintNodeRawJob,
  getPrintNodeConfig,
} from '@/lib/printnode'

type CashOrderBody = {
  customer?: unknown
  promoCode?: string | null
  cart?: Array<{
    id: string
    combo_id?: string | null
    name: string
    quantity: number
    unitAmount: number
    categoria_id?: string | null
    observation?: string
    selectedOptions?: Array<{
      optionId: string
      groupType: 'size' | 'quantity' | 'extra'
      groupName?: string
      label: string
      priceDelta: number
      info?: string | null
      detailInfo?: string | null
    }>
  }>
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CashOrderBody
    const parsedCustomer = parseCustomerPayload(body.customer)
    if (!parsedCustomer.ok) {
      return NextResponse.json({ error: parsedCustomer.message }, { status: 400 })
    }
    const { customer } = parsedCustomer

    const safeItems = (body.cart ?? []).map((item) => ({
      id: item.id,
      combo_id: item.combo_id ?? null,
      name: item.name,
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitAmount: Math.max(0, Number(item.unitAmount) || 0),
      categoria_id: item.categoria_id ?? null,
      observation: (item.observation ?? '').trim(),
      selectedOptions: (item.selectedOptions ?? []).map((opt) => ({
        optionId: String(opt.optionId),
        groupType: opt.groupType,
        groupName: opt.groupName,
        label: String(opt.label),
        priceDelta: Number(opt.priceDelta ?? 0),
        info: opt.info ?? opt.detailInfo ?? null,
      })),
    }))

    const subtotalBruto = safeItems.reduce(
      (acc, item) => acc + item.quantity * item.unitAmount,
      0
    )

    if (subtotalBruto <= 0 || safeItems.length === 0) {
      return NextResponse.json({ error: 'Carrinho invalido para checkout.' }, { status: 400 })
    }

    const promo = await computePromotionForOrderCart(
      safeItems.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        unitAmount: i.unitAmount,
        categoria_id: i.categoria_id,
      })),
      body.promoCode ?? null
    )

    const rawDeliveryFee =
      customer.fulfillmentType === 'delivery'
        ? await getDeliveryFeeAmount(customer.localidadeEntregaId)
        : 0
    const deliveryFee =
      customer.fulfillmentType === 'delivery' && promo.deliveryFreeEligible ? 0 : rawDeliveryFee
    const subtotalWithDelivery = Number((promo.totalPayable + deliveryFee).toFixed(2))
    const taxAmount = calculateOrderTax(subtotalWithDelivery)
    const payable = Number((subtotalWithDelivery + taxAmount).toFixed(2))

    const maxBase = Number((subtotalBruto + rawDeliveryFee).toFixed(2))
    const maxPayable = Number((maxBase + calculateOrderTax(maxBase)).toFixed(2))
    if (payable <= 0 || payable > maxPayable + 0.01) {
      return NextResponse.json(
        { error: 'Valor do pedido invalido apos promocoes.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: insertedOrder, error: insertOrderError } = await supabase
      .from('pedidos')
      .insert({
        paypal_order_id: null,
        paypal_capture_id: null,
        status_pagamento: 'pay_on_delivery',
        status_producao: 'new',
        valor_total: payable,
        moeda: 'USD',
        valor_pago: null,
        valor_bruto: payable,
        taxa_paypal: null,
        valor_liquido: null,
        taxa_entrega: deliveryFee,
        origem_pagamento: 'cash_on_delivery',
        cliente_nome: customer.nome,
        cliente_email: customer.email,
        cliente_telefone: customer.telefone,
        cliente_user_id: customer.userId,
        tipo_atendimento: customer.fulfillmentType,
        localidade_entrega_id: customer.localidadeEntregaId,
        localidade_entrega_nome: customer.localidadeEntregaNome,
        endereco_entrega: customer.enderecoEntrega,
        cliente_aceita_sms_atualizacoes: customer.aceitaSmsAtualizacoes,
        cliente_aceita_email_atualizacoes: customer.aceitaEmailAtualizacoes,
        cliente_consentiu_salvar_cartao: customer.consentiuSalvarCartao,
        payload_pagamento: { method: 'cash_on_delivery', total: payable, currency: 'USD' },
      })
      .select('id')
      .single()

    if (insertOrderError || !insertedOrder?.id) {
      return NextResponse.json(
        { error: insertOrderError?.message ?? 'Erro ao gravar pedido.' },
        { status: 500 }
      )
    }

    const localOrderId = insertedOrder.id

    if (safeItems.length > 0) {
      const { error: insertItemsError } = await supabase.from('pedido_itens').insert(
        safeItems.map((item) => ({
          pedido_id: localOrderId,
          item_id: item.combo_id ? null : item.id,
          combo_id: item.combo_id ?? null,
          nome_item: item.name,
          quantidade: item.quantity,
          preco_unitario: item.unitAmount,
          subtotal: Number((item.quantity * item.unitAmount).toFixed(2)),
          observacao: item.observation || null,
          opcoes_selecionadas: item.selectedOptions?.length ? item.selectedOptions : null,
        }))
      )

      if (insertItemsError) {
        return NextResponse.json({ error: insertItemsError.message }, { status: 500 })
      }
    }

    const orderNumber = localOrderId.replace(/-/g, '').slice(-8).toUpperCase()

    try {
      const printCfg = await getPrintNodeConfig()
      if (printCfg.enabled && printCfg.printerId) {
        const subtotal = subtotalBeforePromo(safeItems)
        const discount = Number(Math.max(0, promo.discountAmount).toFixed(2))
        const receipt = buildKitchenReceiptText({
          orderNumber,
          createdAtISO: new Date().toISOString(),
          customerName: customer.nome,
          customerPhone: customer.telefone,
          fulfillmentType: customer.fulfillmentType,
          address: customer.enderecoEntrega,
          items: safeItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            subtotal: Number((item.quantity * item.unitAmount).toFixed(2)),
            observation: item.observation,
            options: item.selectedOptions.map((op) => ({
              label: op.label,
              groupName: op.groupName,
              groupType: op.groupType,
            })),
          })),
          subtotal,
          discount,
          deliveryFee,
          taxAmount,
          total: payable,
          currency: '$',
          paymentLine: 'Dinheiro na entrega',
        })
        await createPrintNodeRawJob({
          apiKey: printCfg.apiKey,
          printerId: printCfg.printerId,
          title: `Pedido #${orderNumber}`,
          content: receipt,
          source: 'Cadu Cakes & Lanches Checkout',
          idempotencyKey: `pedido-${localOrderId}`,
        })
      }
    } catch (printError) {
      console.error('[PrintNode] Falha ao imprimir pedido (dinheiro)', {
        localOrderId,
        error: printError instanceof Error ? printError.message : String(printError),
      })
    }

    return NextResponse.json({
      local_order_id: localOrderId,
      order_number: orderNumber,
      status: 'created',
      payment_method: 'cash_on_delivery',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao criar pedido.',
      },
      { status: 500 }
    )
  }
}

function subtotalBeforePromo(
  items: Array<{ quantity: number; unitAmount: number }>
) {
  return items.reduce((acc, item) => acc + item.quantity * item.unitAmount, 0)
}
