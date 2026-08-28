import { Suspense } from 'react'
import { CadastroForm } from './cadastro-form'
import { StorefrontLoadingState } from '@/components/layout/storefront-loading-state'

export default function ContaCadastroPage() {
  return (
    <Suspense fallback={<StorefrontLoadingState />}>
      <CadastroForm />
    </Suspense>
  )
}
