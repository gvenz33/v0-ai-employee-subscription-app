import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, Link as LinkIcon, TrendingUp, Copy, Share2 } from "lucide-react"
import { CopyButton } from "@/components/dashboard/copy-button"

export default async function AffiliatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user's profile and affiliate info
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, affiliate_enabled")
    .eq("id", user.id)
    .single()

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single()

  // Get referrals
  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("affiliate_id", affiliate?.id)
    .order("created_at", { ascending: false })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://247aiemployees.net"
  const referralLink = `${baseUrl}?ref=${affiliate?.referral_code}`

  if (!profile?.affiliate_enabled) {
    return (
      <div className="p-8">
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Affiliate Program Not Available</h2>
            <p className="text-muted-foreground">
              The affiliate program is not enabled for your account. Please contact support for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Affiliate Program</h1>
        <p className="text-muted-foreground mt-1">Earn commissions by referring new users to 247 AI Employees</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commission Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{affiliate?.commission_rate || 10}%</div>
            <p className="text-xs text-muted-foreground mt-1">Based on {profile?.subscription_tier} tier</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{affiliate?.total_referrals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Users signed up</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${((affiliate?.total_earnings_cents || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              ${((affiliate?.pending_earnings_cents || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Min $50 to withdraw</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share this link to earn commissions on every signup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg p-3 text-sm text-foreground font-mono break-all">
              {referralLink}
            </div>
            <CopyButton text={referralLink} />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Your referral code:</p>
              <code className="text-lg font-bold text-primary">{affiliate?.referral_code}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Tiers */}
      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <CardTitle>Commission Structure</CardTitle>
          <CardDescription>Your commission rate is based on your subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg ${profile?.subscription_tier === "personal" ? "bg-primary/10 border-2 border-primary" : "bg-muted"}`}>
              <p className="text-sm text-muted-foreground">Personal</p>
              <p className="text-2xl font-bold text-foreground">10%</p>
            </div>
            <div className={`p-4 rounded-lg ${profile?.subscription_tier === "entrepreneur" ? "bg-primary/10 border-2 border-primary" : "bg-muted"}`}>
              <p className="text-sm text-muted-foreground">Entrepreneur</p>
              <p className="text-2xl font-bold text-foreground">12%</p>
            </div>
            <div className={`p-4 rounded-lg ${profile?.subscription_tier === "business" ? "bg-primary/10 border-2 border-primary" : "bg-muted"}`}>
              <p className="text-sm text-muted-foreground">Business</p>
              <p className="text-2xl font-bold text-foreground">15%</p>
            </div>
            <div className={`p-4 rounded-lg ${profile?.subscription_tier === "enterprise" ? "bg-primary/10 border-2 border-primary" : "bg-muted"}`}>
              <p className="text-sm text-muted-foreground">Enterprise</p>
              <p className="text-2xl font-bold text-foreground">20%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            After 10 successful referrals, your rate increases by 2% up to a maximum of 20%
          </p>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {!referrals || referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet. Share your link to start earning!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      New {ref.subscription_tier} subscriber
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-500">
                      +${(ref.commission_cents / 100).toFixed(2)}
                    </p>
                    <Badge variant={ref.status === "paid" ? "default" : "secondary"}>
                      {ref.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
