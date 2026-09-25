/** Regras centralizadas de chrome (bottom nav, floating cart) por rota. */

export function shouldHideBottomNav(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/produto/') ||
    pathname.startsWith('/combo/') ||
    pathname.startsWith('/checkout') ||
    pathname === '/pagamento' ||
    pathname.startsWith('/conta/')
  )
}

export function shouldHideFloatingCart(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/pagamento') ||
    pathname.startsWith('/checkout') ||
    pathname === '/carrinho' ||
    pathname.startsWith('/produto/') ||
    pathname.startsWith('/combo/')
  )
}

export type StorefrontBottomPadding = 'nav' | 'none' | 'footer' | 'cta' | 'cta-only'

export function storefrontBottomClass(padding: StorefrontBottomPadding): string {
  switch (padding) {
    case 'none':
      return 'pb-0'
    case 'footer':
      return 'pb-[var(--storefront-bottom-inset-with-footer)]'
    case 'cta':
      return 'pb-[var(--storefront-bottom-inset-with-cta)]'
    case 'cta-only':
      return 'pb-[var(--storefront-cta-inset)]'
    default:
      return 'pb-[var(--storefront-bottom-inset)]'
  }
}
