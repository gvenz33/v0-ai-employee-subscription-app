"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"

export default function ContactPage() {
  const searchParams = useSearchParams()
  const foundersIntent = (searchParams.get("subject") || "").toLowerCase().includes("founders")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [budgetRange, setBudgetRange] = useState("")
  const [timeline, setTimeline] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          inquiryType: foundersIntent ? "founders" : "general",
          companyName,
          companySize,
          budgetRange,
          timeline,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Image
            src="/images/logo.png"
            alt="247 AI Employees"
            width={80}
            height={80}
            className="h-20 w-auto"
          />
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground flex items-center justify-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Contact Us
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Have a question? Send us a message and we&apos;ll get back to you shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="text-center space-y-4 py-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold text-foreground">Message Sent!</h3>
                <p className="text-sm text-muted-foreground">
                  Thank you for reaching out. We&apos;ll respond to your inquiry at {email} within 24-48 hours.
                </p>
                <Button onClick={() => { setIsSubmitted(false); setName(""); setEmail(""); setMessage(""); }} variant="outline">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="How can we help you?"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-background border-border text-foreground resize-none"
                  />
                </div>
                {foundersIntent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="company-name" className="text-foreground">Company Name</Label>
                      <Input
                        id="company-name"
                        type="text"
                        placeholder="Acme Inc."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-size" className="text-foreground">Company Size</Label>
                      <Input
                        id="company-size"
                        type="text"
                        placeholder="e.g. 1-10, 11-50, 51-200"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="budget-range" className="text-foreground">Budget Range</Label>
                        <Input
                          id="budget-range"
                          type="text"
                          placeholder="$500-$2k/mo"
                          value={budgetRange}
                          onChange={(e) => setBudgetRange(e.target.value)}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeline" className="text-foreground">Timeline</Label>
                        <Input
                          id="timeline"
                          type="text"
                          placeholder="This month / quarter"
                          value={timeline}
                          onChange={(e) => setTimeline(e.target.value)}
                          className="bg-background border-border text-foreground"
                        />
                      </div>
                    </div>
                  </>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          You can also email us directly at{" "}
          <a href="mailto:hello@247aiemployees.net" className="text-primary hover:underline">
            hello@247aiemployees.net
          </a>
        </p>
      </div>
    </div>
  )
}
