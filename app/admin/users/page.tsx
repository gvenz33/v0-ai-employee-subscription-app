"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Shield, CreditCard, Bot, Share2, Ban, Trash2 } from "lucide-react"
import { PLANS, AI_EMPLOYEES } from "@/lib/products"

interface Profile {
  id: string
  full_name: string
  email?: string
  subscription_tier: string
  tasks_used: number
  tasks_limit: number
  enterprise_custom_monthly_cents?: number | null
  enterprise_custom_yearly_cents?: number | null
  api_access_suspended?: boolean
  is_superadmin: boolean
  is_admin: boolean
  affiliate_enabled: boolean
  payment_override: boolean
  disabled_agents: string[]
  created_at: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", subscription_tier: "personal" })
  const [newPassword, setNewPassword] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    setUsers(data || [])
    setIsLoading(false)
  }

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    setActionError(null)

    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)

    if (newPassword.trim().length >= 8) {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setActionError(data.error || "Failed to update password")
        return
      }
    }

    setNewPassword("")
    fetchUsers()
    setIsEditOpen(false)
  }

  const addUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        fetchUsers()
        setIsAddOpen(false)
        setNewUser({ email: "", password: "", full_name: "", subscription_tier: "personal" })
      }
    } catch (error) {
      console.error("Error adding user:", error)
    }
  }

  const deleteUser = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setActionError(null)

    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) {
        setActionError(data.error || "Failed to delete user")
        return
      }
      setDeleteTarget(null)
      if (selectedUser?.id === deleteTarget.id) {
        setIsEditOpen(false)
        setSelectedUser(null)
      }
      fetchUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      setActionError("Failed to delete user")
    } finally {
      setIsDeleting(false)
    }
  }

  const openEdit = (user: Profile) => {
    setSelectedUser(user)
    setNewPassword("")
    setActionError(null)
    setIsEditOpen(true)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase()),
  )

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      personal: "bg-gray-500",
      entrepreneur: "bg-blue-500",
      business: "bg-purple-500",
      enterprise: "bg-yellow-500",
    }
    return colors[tier] || "bg-gray-500"
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage user accounts, tiers, and permissions
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <PasswordInput
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Temporary password"
                />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select
                  value={newUser.subscription_tier}
                  onValueChange={(v) => setNewUser({ ...newUser, subscription_tier: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addUser} className="w-full">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID..."
          className="pl-10"
        />
      </div>

      {actionError && !isEditOpen && (
        <p className="text-sm text-destructive mb-4">{actionError}</p>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="p-3 sm:p-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="p-3 sm:p-4 text-sm font-medium text-muted-foreground">Tier</th>
                  <th className="p-3 sm:p-4 text-sm font-medium text-muted-foreground">Tasks</th>
                  <th className="p-3 sm:p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-3 sm:p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="p-3 sm:p-4">
                        <div>
                          <p className="font-medium text-foreground">{user.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground">{user.email || user.id.slice(0, 8) + "..."}</p>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <Badge className={`${getTierColor(user.subscription_tier)} text-white`}>
                          {user.subscription_tier}
                        </Badge>
                      </td>
                      <td className="p-3 sm:p-4">
                        <p className="text-sm text-foreground">{user.tasks_used} / {user.tasks_limit}</p>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex gap-2 flex-wrap">
                          {user.api_access_suspended && (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              API suspended
                            </Badge>
                          )}
                          {user.is_superadmin && (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                              <Shield className="h-3 w-3 mr-1" />Super
                            </Badge>
                          )}
                          {user.is_admin && (
                            <Badge variant="outline" className="text-blue-500 border-blue-500">Admin</Badge>
                          )}
                          {user.payment_override && (
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              <CreditCard className="h-3 w-3 mr-1" />Free
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {currentUserId !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setNewPassword("")
            setActionError(null)
          }
        }}
      >
        <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 pt-4">
              {selectedUser.email && (
                <div className="space-y-1">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Set New Password</Label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                />
                <p className="text-xs text-muted-foreground">Min. 8 characters. Only applied when you save changes.</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Subscription Tier
                </Label>
                <Select
                  value={selectedUser.subscription_tier}
                  onValueChange={(v) => setSelectedUser({ ...selectedUser, subscription_tier: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.id === "enterprise"
                          ? "Founders - Custom"
                          : `${plan.name} - $${plan.monthlyPriceInCents / 100}/mo`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser.subscription_tier === "enterprise" && (
                <div className="space-y-3 rounded-md border border-border p-4">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Founders custom pricing (superadmin quote)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Set negotiated pricing in USD. Leave blank to keep it as contact-only custom pricing.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly price (USD)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          selectedUser.enterprise_custom_monthly_cents == null
                            ? ""
                            : (selectedUser.enterprise_custom_monthly_cents / 100).toString()
                        }
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          const cents = v === "" ? null : Math.round(Number(v) * 100)
                          setSelectedUser({
                            ...selectedUser,
                            enterprise_custom_monthly_cents: Number.isFinite(cents as number) ? cents : null,
                          })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yearly price (USD)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          selectedUser.enterprise_custom_yearly_cents == null
                            ? ""
                            : (selectedUser.enterprise_custom_yearly_cents / 100).toString()
                        }
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          const cents = v === "" ? null : Math.round(Number(v) * 100)
                          setSelectedUser({
                            ...selectedUser,
                            enterprise_custom_yearly_cents: Number.isFinite(cents as number) ? cents : null,
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasks Used</Label>
                  <Input
                    type="number"
                    value={selectedUser.tasks_used}
                    onChange={(e) => setSelectedUser({ ...selectedUser, tasks_used: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tasks Limit</Label>
                  <Input
                    type="number"
                    value={selectedUser.tasks_limit}
                    onChange={(e) => setSelectedUser({ ...selectedUser, tasks_limit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Admin Access
                    </Label>
                    <p className="text-xs text-muted-foreground">Can access admin console</p>
                  </div>
                  <Switch
                    checked={selectedUser.is_admin}
                    onCheckedChange={(v) => setSelectedUser({ ...selectedUser, is_admin: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Payment Override
                    </Label>
                    <p className="text-xs text-muted-foreground">Bypass payment requirements</p>
                  </div>
                  <Switch
                    checked={selectedUser.payment_override}
                    onCheckedChange={(v) => setSelectedUser({ ...selectedUser, payment_override: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Share2 className="h-4 w-4" /> Affiliate Program
                    </Label>
                    <p className="text-xs text-muted-foreground">Can participate in affiliate program</p>
                  </div>
                  <Switch
                    checked={selectedUser.affiliate_enabled}
                    onCheckedChange={(v) => setSelectedUser({ ...selectedUser, affiliate_enabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Ban className="h-4 w-4" /> Suspend API access
                    </Label>
                    <p className="text-xs text-muted-foreground">Blocks API and high-traffic automations</p>
                  </div>
                  <Switch
                    checked={Boolean(selectedUser.api_access_suspended)}
                    onCheckedChange={(v) => setSelectedUser({ ...selectedUser, api_access_suspended: v })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bot className="h-4 w-4" /> Disabled AI Agents
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Toggle agents off for this user</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border p-3">
                  {AI_EMPLOYEES.map((agent) => (
                    <label key={agent.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedUser.disabled_agents?.includes(agent.id)}
                        onChange={(e) => {
                          const current = selectedUser.disabled_agents || []
                          if (e.target.checked) {
                            setSelectedUser({ ...selectedUser, disabled_agents: [...current, agent.id] })
                          } else {
                            setSelectedUser({
                              ...selectedUser,
                              disabled_agents: current.filter((id) => id !== agent.id),
                            })
                          }
                        }}
                        className="rounded border-border"
                      />
                      {agent.name}
                    </label>
                  ))}
                </div>
              </div>

              {actionError && <p className="text-sm text-destructive">{actionError}</p>}

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <Button onClick={() => updateUser(selectedUser.id, selectedUser)} className="flex-1">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              <strong>{deleteTarget?.full_name || deleteTarget?.email || "this user"}</strong> and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
