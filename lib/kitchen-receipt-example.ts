import { buildKitchenReceiptText } from '@/lib/printnode'

export function buildKitchenReceiptExampleText() {
  return buildKitchenReceiptText({
    orderNumber: 'TESTE01',
    createdAtISO: new Date().toISOString(),
    customerName: 'Teste Admin',
    customerPhone: '(203) 000-0000',
    fulfillmentType: 'delivery',
    address: '11 Abbott St - Danbury, CT',
    items: [
      {
        name: 'Bife a cavalo (prato do dia)',
        categoryName: 'Pratos',
        quantity: 1,
        unitAmount: 14.99,
        subtotal: 14.99,
        options: [
          { label: 'Arroz, feijão e batata frita', groupType: 'quantity' },
          { label: 'Cebola extra', groupName: 'Adicionais', groupType: 'extra' },
        ],
        observation: 'sem tomate',
      },
      {
        name: 'Coxinha de frango com catupiry',
        categoryName: 'Salgados',
        quantity: 2,
        unitAmount: 4.5,
        subtotal: 9,
      },
    ],
    subtotal: 23.99,
    discount: 2,
    deliveryFee: 5,
    taxAmount: 1.97,
    total: 28.96,
    currency: '$',
    paymentLine: 'Dinheiro',
  })
}
