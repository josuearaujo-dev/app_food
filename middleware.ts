import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAdminAppUser } from '@/lib/admin-access'
import { APP_VERSION } from '@/lib/app-version'

const FRESH_CACHE = 'private, no-cache, no-store, max-age=0, must-revalidate'

function freshDocument(request: NextRequest) {
  const accept = request.headers.get('accept') || ''
  const isDocument =
    request.method === 'GET' &&
    request.headers.get('rsc') !== '1' &&
    !request.headers.get('next-router-prefetch') &&
    accept.includes('text/html') &&
    !accept.includes('text/x-component')

  if (isDocument && request.nextUrl.searchParams.get('v') !== APP_VERSION) {
    const url = request.nextUrl.clone()
    url.searchParams.set('v', APP_VERSION)
    const redirect = NextResponse.redirect(url, 307)
    redirect.headers.set('Cache-Control', FRESH_CACHE)
    return redirect
  }

  const response = NextResponse.next()
  if (isDocument) response.headers.set('Cache-Control', FRESH_CACHE)
  return response
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname
  if (!path.startsWith('/admin')) {
    return freshDocument(request)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdminLogin = path === '/admin/login'

  if (isAdminLogin) {
    if (user && isAdminAppUser(user)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    if (user && !isAdminAppUser(user)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return response
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (!isAdminAppUser(user)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)'],
}
