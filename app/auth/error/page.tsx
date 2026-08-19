import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost } from "@/lib/branded-public"
import { getAuthBrandForRequest } from "@/lib/auth-branding"
import { AuthPageChrome } from "@/components/auth/auth-page-chrome"

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  if (ctx?.branded_auth_enabled && ctx.brand_name) {
    return { title: `Authentication error · ${ctx.brand_name}` }
  }
  return { title: "Authentication error · 247 AI Employees" }
}

function friendlyErrorMessage(error?: string, description?: string): string {
  if (description && description !== error) {
    return description
  }

  const code = (error || "").toLowerCase()
  if (code.includes("expired") || code.includes("otp_expired")) {
    return "This link has expired. Please request a new confirmation or reset email."
  }
  if (code.includes("invalid") || code.includes("access_denied")) {
    return "This link is invalid or has already been used. Please try again."
  }
  if (error) {
    return error
  }
  return "Something went wrong during authentication. Please try again."
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const brand = await getAuthBrandForRequest()
  const params = await searchParams
  const message = friendlyErrorMessage(params.error, params.error_description)

  return (
    <AuthPageChrome brand={brand}>
      <Card className="bg-card border-border text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-foreground">Authentication Error</CardTitle>
          <CardDescription className="text-muted-foreground">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/sign-up">Create a new account</Link>
          </Button>
          <Link href="/" className="inline-block text-sm text-muted-foreground hover:text-foreground">
            Go to homepage
          </Link>
        </CardContent>
      </Card>
    </AuthPageChrome>
  )
}
