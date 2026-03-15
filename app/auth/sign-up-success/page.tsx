import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Mail } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 justify-center">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-2xl font-display font-bold text-foreground">NexusAI</span>
          </div>
          
          <Card className="bg-card border-border text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl text-foreground">Check your email</CardTitle>
              <CardDescription className="text-muted-foreground">
                {"We've sent you a confirmation link. Click the link in your email to activate your account."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {"Didn't receive an email? Check your spam folder or "}
                <Link href="/auth/sign-up" className="text-primary hover:underline">
                  try signing up again
                </Link>
              </p>
              <Link 
                href="/auth/login" 
                className="inline-block text-sm text-primary hover:underline"
              >
                Back to login
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
