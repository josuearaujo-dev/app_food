import { Suspense } from 'react'
import PedidoDetailPage from './page.client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-lg bg-background px-4 pt-10">
          <p className="text-sm text-muted-foreground">Carregando pedido...</p>
        </main>
      }
    >
      <PedidoDetailPage orderId={id} />
    </Suspense>
  )
}
