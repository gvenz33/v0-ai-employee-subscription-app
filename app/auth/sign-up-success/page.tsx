import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost } from "@/lib/branded-public"
import { getAuthBrandForRequest } from "@/lib/auth-branding"
import { AuthPageChrome } from "@/components/auth/auth-page-chrome"

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  if (ctx?.branded_auth_enabled && ctx.brand_name) {
    return { title: `Check your email · ${ctx.brand_name}` }
  }
  return { title: "Check your email · 247 AI Employees" }
}

export default async function SignUpSuccessPage() {
  const brand = await getAuthBrandForRequest()

  return (
    <AuthPageChrome brand={brand}>
      <Card className="bg-card border-border text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">Check your email</CardTitle>
          <CardDescription className="text-muted-foreground">
            {`We've sent you a confirmation link. Click the link in your email to activate your account.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {`Didn't receive an email? Check your spam folder or `}
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              try signing up again
            </Link>
          </p>
          <Link href="/auth/login" className="inline-block text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </AuthPageChrome>
  )
}
