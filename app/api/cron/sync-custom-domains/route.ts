import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { inferDomainReady, vercelConfigured, vercelGetDomainConfig } from "@/lib/vercel-domains"

export const maxDuration = 120

/** Row shape until Supabase types are regenerated after migration 007. */
type CustomDomainRow = {
  id: string
  hostname: string
  status: string
  ssl_ready: boolean
  vercel_meta: Record<string, unknown> | null
}

async function probeHttpsHealth(hostname: string): Promise<boolean> {
  const url = `https://${hostname}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal })
    if (!res.ok && res.status === 405) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { range: "bytes=0-0" } })
    }
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 })
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user_custom_domains not in generated DB types yet
  const { data: rows, error } = await (supabase as any)
    .from("user_custom_domains")
    .select("*")
    .eq("is_active", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  let updated = 0

  for (const row of (rows || []) as CustomDomainRow[]) {
    let vercelPayload: unknown = null
    if (vercelConfigured() && row.hostname) {
      vercelPayload = await vercelGetDomainConfig(row.hostname)
    }
    const inferred = vercelPayload
      ? inferDomainReady(vercelPayload)
      : { verified: false, sslReady: row.ssl_ready }

    let status = row.status as string
    if (inferred.verified && inferred.sslReady) status = "active"
    else if (inferred.verified) status = "verified"
    else if (vercelPayload) status = "pending_vercel"
    else if (status === "active" || status === "verified") {
      /* keep */
    } else {
      status = row.status as string
    }

    const health_ok = row.hostname ? await probeHttpsHealth(row.hostname) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user_custom_domains not in generated DB types yet
    await (supabase as any)
      .from("user_custom_domains")
      .update({
        status,
        ssl_ready: inferred.sslReady,
        health_ok,
        last_health_check_at: now,
        last_sync_at: now,
        last_error: null,
        vercel_meta: {
          ...(typeof row.vercel_meta === "object" && row.vercel_meta ? row.vercel_meta : {}),
          last_cron_poll: vercelPayload,
        },
        updated_at: now,
      })
      .eq("id", row.id)

    updated++
  }

  return NextResponse.json({ ok: true, checked: rows?.length ?? 0, updated })
}
