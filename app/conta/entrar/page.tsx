import { Suspense } from 'react'
import { EntrarForm } from './entrar-form'
import { StorefrontLoadingState } from '@/components/layout/storefront-loading-state'

export default function ContaEntrarPage() {
  return (
    <Suspense fallback={<StorefrontLoadingState />}>
      <EntrarForm />
    </Suspense>
  )
}
