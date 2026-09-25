import { StoreMaintenance } from '@/components/storefront/store-maintenance'
import { StorefrontHome } from '@/components/storefront/storefront-home'
import { STOREFRONT_MAINTENANCE } from '@/lib/store-maintenance'

export default function MenuPage() {
  if (STOREFRONT_MAINTENANCE) return <StoreMaintenance />
  return <StorefrontHome />
}
