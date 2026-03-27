"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, DollarSign, Users, TrendingUp, Settings } from "lucide-react"

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  commission_rate: number
  total_referrals: number
  total_earnings_cents: number
  pending_earnings_cents: number
  paid_earnings_cents: number
  is_active: boolean
  created_at: string
  profiles?: {
    full_name: string
    email: string
    subscription_tier: string
  }
}

export default function AffiliateManagementPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    programEnabled: true,
    minPayout: 5000, // $50 in cents
    personalRate: 10,
    entrepreneurRate: 12,
    businessRate: 15,
    enterpriseRate: 20,
    maxRate: 20,
    bonusThreshold: 10 // referrals to get bonus
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAffiliates()
  }, [])

  const fetchAffiliates = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("affiliates")
      .select(`
        *,
        profiles (
          full_name,
          email,
          subscription_tier
        )
      `)
      .order("total_earnings_cents", { ascending: false })
    
    setAffiliates(data || [])
    setIsLoading(false)
  }

  const updateAffiliate = async (affiliateId: string, updates: Partial<Affiliate>) => {
    await supabase
      .from("affiliates")
      .update(updates)
      .eq("id", affiliateId)
    
    fetchAffiliates()
    setIsEditOpen(false)
  }

  const filteredAffiliates = affiliates.filter(aff => 
    aff.referral_code.toLowerCase().includes(search.toLowerCase()) ||
    aff.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalEarnings = affiliates.reduce((sum, a) => sum + a.total_earnings_cents, 0)
  const totalPending = affiliates.reduce((sum, a) => sum + a.pending_earnings_cents, 0)
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.total_referrals, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Affiliate Program</h1>
          <p className="text-muted-foreground mt-1">Manage affiliates, commissions, and payouts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{affiliates.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalReferrals}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">${(totalEarnings / 100).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">${(totalPending / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Structure */}
      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Commission Structure
          </CardTitle>
          <CardDescription>Tiered commission rates based on subscription level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Personal</p>
              <p className="text-2xl font-bold text-foreground">{globalSettings.personalRate}%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Entrepreneur</p>
              <p className="text-2xl font-bold text-foreground">{globalSettings.entrepreneurRate}%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Business</p>
              <p className="text-2xl font-bold text-foreground">{globalSettings.businessRate}%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Enterprise</p>
              <p className="text-2xl font-bold text-foreground">{globalSettings.enterpriseRate}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            After {globalSettings.bonusThreshold} referrals, rate increases by 2% up to max {globalSettings.maxRate}%
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or referral code..."
          className="pl-10"
        />
      </div>

      {/* Affiliates List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="p-4 text-sm font-medium text-muted-foreground">Affiliate</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">Referral Code</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">Rate</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">Referrals</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">Earnings</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredAffiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No affiliates found</td>
                  </tr>
                ) : (
                  filteredAffiliates.map(affiliate => (
                    <tr key={affiliate.id} className="border-b border-border last:border-0">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{affiliate.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{affiliate.profiles?.subscription_tier}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{affiliate.referral_code}</code>
                      </td>
                      <td className="p-4">
                        <span className="text-foreground font-medium">{affiliate.commission_rate}%</span>
                      </td>
                      <td className="p-4">
                        <span className="text-foreground">{affiliate.total_referrals}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-foreground font-medium">${(affiliate.total_earnings_cents / 100).toFixed(2)}</p>
                          {affiliate.pending_earnings_cents > 0 && (
                            <p className="text-xs text-orange-500">${(affiliate.pending_earnings_cents / 100).toFixed(2)} pending</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={affiliate.is_active ? "default" : "secondary"}>
                          {affiliate.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedAffiliate(affiliate); setIsEditOpen(true); }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Affiliate Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Edit Affiliate: {selectedAffiliate?.profiles?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={selectedAffiliate.commission_rate}
                  onChange={(e) => setSelectedAffiliate({ 
                    ...selectedAffiliate, 
                    commission_rate: parseFloat(e.target.value) 
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active Status</Label>
                <Switch
                  checked={selectedAffiliate.is_active}
                  onCheckedChange={(v) => setSelectedAffiliate({ ...selectedAffiliate, is_active: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Pending Earnings (cents)</Label>
                <Input
                  type="number"
                  value={selectedAffiliate.pending_earnings_cents}
                  onChange={(e) => setSelectedAffiliate({ 
                    ...selectedAffiliate, 
                    pending_earnings_cents: parseInt(e.target.value) 
                  })}
                />
                <p className="text-xs text-muted-foreground">Set to 0 after payout</p>
              </div>

              <Button 
                onClick={() => updateAffiliate(selectedAffiliate.id, {
                  commission_rate: selectedAffiliate.commission_rate,
                  is_active: selectedAffiliate.is_active,
                  pending_earnings_cents: selectedAffiliate.pending_earnings_cents
                })} 
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
