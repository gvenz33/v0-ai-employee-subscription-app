import { NextResponse } from "next/server"

const BLOCKED_HEADERS = [
  "x-impersonate-user",
  "x-impersonate-user-id",
  "x-on-behalf-of",
  "x-act-as-user",
]

/** True if the request carries unsupported “act as another user” headers. */
export function hasForbiddenImpersonationHeaders(request: Request): boolean {
  const h = request.headers
  for (const key of BLOCKED_HEADERS) {
    if (h.get(key) || h.get(key.toLowerCase())) return true
  }
  return false
}

/**
 * Defense in depth: never accept ad-hoc “act as user” headers. Real impersonation
 * must be implemented with an auditable session and explicit admin UI.
 */
export function rejectImpersonationHeaders(request: Request): NextResponse | null {
  if (!hasForbiddenImpersonationHeaders(request)) return null
  return NextResponse.json(
    { error: "Impersonation headers are not accepted on this API." },
    { status: 403 },
  )
}
