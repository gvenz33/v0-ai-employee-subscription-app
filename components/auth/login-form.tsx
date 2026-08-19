"use client"

import { signInWithPasswordAction } from "@/app/auth/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import type { AuthBrandPresentation } from "@/lib/auth-branding"
import { AuthPageChrome } from "@/components/auth/auth-page-chrome"

type Props = {
  brand: AuthBrandPresentation
}

export function LoginForm({ brand }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set("email", email)
      formData.set("password", password)
      const result = await signInWithPasswordAction(formData)
      if ("error" in result) {
        setError(result.error)
        return
      }
      window.location.assign("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email")
      }
      setResetSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthPageChrome brand={brand}>
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">
            {isForgotPassword ? "Reset Password" : "Welcome back"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isForgotPassword ?
              "Enter your email to receive a reset link"
            : "Sign in to manage your AI employees"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetSent ?
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Check your email for a password reset link. It may take a few minutes to arrive.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsForgotPassword(false)
                  setResetSent(false)
                }}
                className="w-full"
              >
                Back to login
              </Button>
            </div>
          : isForgotPassword ?
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="reset-email" className="text-foreground">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsForgotPassword(false)} className="w-full">
                  Back to login
                </Button>
              </div>
            </form>
          : <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-primary hover:underline underline-offset-4"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {"Don't have an account? "}
                <Link href="/auth/sign-up" className="text-primary hover:underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </form>
          }
        </CardContent>
      </Card>
    </AuthPageChrome>
  )
}
