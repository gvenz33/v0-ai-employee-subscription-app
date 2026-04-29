import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPlatformHost, normalizeHost } from '@/lib/tenancy'
import { supabaseCookieOptions } from '@/lib/supabase/cookie-options'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — check Vercel Environment Variables for Production.',
    )
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    })

    const host = normalizeHost(request.headers.get('x-forwarded-host') || request.headers.get('host'))
    let resolvedTenant: { user_id: string; slug: string; host: string } | null = null

    if (host && !isPlatformHost(host)) {
      const { data: tenantRows, error: resolveError } = await supabase.rpc('resolve_tenant_by_host', {
        p_host: host,
      })

      if (resolveError) {
        console.error('[middleware] resolve_tenant_by_host failed:', resolveError.message)
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      const tenant = Array.isArray(tenantRows) ? tenantRows[0] : null
      if (!tenant) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      resolvedTenant = {
        user_id: tenant.user_id,
        slug: tenant.tenant_slug,
        host: tenant.resolved_host,
      }
    }

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: If you remove getUser() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (resolvedTenant) {
      const headers = new Headers(request.headers)
      headers.set('x-tenant-id', resolvedTenant.user_id)
      headers.set('x-tenant-slug', resolvedTenant.slug)
      headers.set('x-tenant-host', resolvedTenant.host)
      supabaseResponse = NextResponse.next({
        request: { headers },
      })
    }

    if (
      (request.nextUrl.pathname.startsWith('/protected') ||
        request.nextUrl.pathname.startsWith('/dashboard')) &&
      !user
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    const guardedTenantPath =
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/api')
    if (resolvedTenant && guardedTenantPath && user && user.id !== resolvedTenant.user_id) {
      if (request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Tenant isolation check failed' }, { status: 403 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (err) {
    console.error('[middleware] updateSession failed:', err)
    // Fail open so the site does not return 500 if Supabase is unreachable or misconfigured.
    return NextResponse.next({ request })
  }
}
