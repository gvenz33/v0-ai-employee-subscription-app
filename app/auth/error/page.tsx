import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
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
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-foreground">Authentication Error</CardTitle>
              <CardDescription className="text-muted-foreground">
                Something went wrong during authentication. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/auth/login">Back to Login</Link>
              </Button>
              <Link 
                href="/" 
                className="inline-block text-sm text-muted-foreground hover:text-foreground"
              >
                Go to homepage
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
