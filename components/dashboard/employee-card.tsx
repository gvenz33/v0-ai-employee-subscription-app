"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Lock, MessageSquare, ShoppingCart, Heart, Wallet, UtensilsCrossed, Plane, GraduationCap, Activity, Baby, Share2, PenTool, Search, RefreshCw, Megaphone, Target, Presentation, Settings, Headphones, TrendingUp, Users, Calendar, Clipboard, FileText, Briefcase, Calculator, FileSignature, Receipt, ShieldCheck, Handshake, Palette, Globe, Workflow, Rocket, Lightbulb, Building, Mic, BookOpen, BarChart3, Microscope, Code2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { type AIEmployee, tierMayPurchaseAlaCarte, A_LA_CARTE_MONTHLY_PRICE_CENTS } from "@/lib/products"
import { AlaCarteCheckout } from "@/components/dashboard/ala-carte-checkout"

const iconMap: Record<string, React.ReactNode> = {
  Heart: <Heart className="h-5 w-5" />,
  Wallet: <Wallet className="h-5 w-5" />,
  UtensilsCrossed: <UtensilsCrossed className="h-5 w-5" />,
  Plane: <Plane className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Activity: <Activity className="h-5 w-5" />,
  Baby: <Baby className="h-5 w-5" />,
  Share2: <Share2 className="h-5 w-5" />,
  PenTool: <PenTool className="h-5 w-5" />,
  Search: <Search className="h-5 w-5" />,
  RefreshCw: <RefreshCw className="h-5 w-5" />,
  Megaphone: <Megaphone className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Settings: <Settings className="h-5 w-5" />,
  Headphones: <Headphones className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  Clipboard: <Clipboard className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Briefcase: <Briefcase className="h-5 w-5" />,
  Calculator: <Calculator className="h-5 w-5" />,
  FileSignature: <FileSignature className="h-5 w-5" />,
  Receipt: <Receipt className="h-5 w-5" />,
  ShieldCheck: <ShieldCheck className="h-5 w-5" />,
  Handshake: <Handshake className="h-5 w-5" />,
  Palette: <Palette className="h-5 w-5" />,
  Globe: <Globe className="h-5 w-5" />,
  Workflow: <Workflow className="h-5 w-5" />,
  Rocket: <Rocket className="h-5 w-5" />,
  Lightbulb: <Lightbulb className="h-5 w-5" />,
  Building: <Building className="h-5 w-5" />,
  Mic: <Mic className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Microscope: <Microscope className="h-5 w-5" />,
  Code2: <Code2 className="h-5 w-5" />,
}

const tierLabels: Record<string, string> = {
  personal: "Personal",
  entrepreneur: "Entrepreneur",
  business: "Business",
  enterprise: "Enterprise",
}

interface UserEmployee {
  id: string
  is_active: boolean
  tasks_completed: number
}

interface EmployeeCardProps {
  employee: AIEmployee
  userEmployee?: UserEmployee
  hasAccess: boolean
  userTier: string
  unlockedViaAlaCarte: boolean
  userId: string
}

export function EmployeeCard({
  employee,
  userEmployee,
  hasAccess,
  userTier,
  unlockedViaAlaCarte,
  userId,
}: EmployeeCardProps) {
  const [isActive, setIsActive] = useState(userEmployee?.is_active || false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAlaCarteCheckout, setShowAlaCarteCheckout] = useState(false)
  const router = useRouter()

  const isLocked = !hasAccess
  const showAlaCarteCta =
    isLocked && employee.isALaCarte && tierMayPurchaseAlaCarte(userTier)
  const showAlaCarteIneligible =
    isLocked && employee.isALaCarte && !tierMayPurchaseAlaCarte(userTier)

  const handleToggle = async () => {
    if (isLocked) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      if (userEmployee) {
        await supabase.from("ai_employees").update({ is_active: !isActive }).eq("id", userEmployee.id)
      } else {
        await supabase.from("ai_employees").insert({
          user_id: userId,
          name: employee.name,
          role: employee.role,
          description: employee.description,
          tier_required: employee.tier_required,
          is_active: true,
        })
      }

      setIsActive(!isActive)
      router.refresh()
    } catch (error) {
      console.error("Error toggling employee:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChat = () => {
    router.push(`/dashboard/employees/${employee.id}`)
  }

  return (
    <>
      <Card
        className={`relative border-border bg-card transition-all hover:border-primary/30 ${isLocked ? "opacity-60" : ""}`}
      >
        {isLocked && (
          <div className="absolute right-2 top-2 z-10">
            <Badge variant="outline" className="gap-1 bg-background/80 text-xs backdrop-blur-sm">
              <Lock className="h-3 w-3" />
              {tierLabels[employee.tier_required] || employee.tier_required}
            </Badge>
          </div>
        )}

        {employee.isALaCarte && isLocked && (
          <div className="absolute left-2 top-2 z-10">
            <Badge className="gap-1 bg-primary text-xs">
              <ShoppingCart className="h-3 w-3" />${A_LA_CARTE_MONTHLY_PRICE_CENTS / 100}/mo
            </Badge>
          </div>
        )}

        {unlockedViaAlaCarte && hasAccess && (
          <div className="absolute left-2 top-2 z-10">
            <Badge variant="secondary" className="text-xs">
              À la carte
            </Badge>
          </div>
        )}

        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {iconMap[employee.icon] || <Users className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm text-foreground">{employee.name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">{employee.role}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <p className="line-clamp-2 text-xs text-muted-foreground">{employee.description}</p>

          {userEmployee && (
            <p className="text-xs text-muted-foreground">{userEmployee.tasks_completed} tasks completed</p>
          )}

          {showAlaCarteCta && (
            <Button className="w-full text-xs" size="sm" type="button" onClick={() => setShowAlaCarteCheckout(true)}>
              Subscribe ${(A_LA_CARTE_MONTHLY_PRICE_CENTS / 100).toFixed(2)}/mo
            </Button>
          )}

          {showAlaCarteIneligible && (
            <p className="text-xs text-muted-foreground">
              À la carte add-ons are for Personal &amp; Entrepreneur plans. Upgrade your base plan or choose Enterprise
              for full access.
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={isLocked || isLoading}
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
            </div>

            <Button
              size="sm"
              variant={isActive ? "default" : "outline"}
              disabled={isLocked || !isActive}
              onClick={handleChat}
              className="h-7 text-xs"
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAlaCarteCheckout && (
        <AlaCarteCheckout
          employeeId={employee.id}
          employeeName={employee.name}
          onClose={() => {
            setShowAlaCarteCheckout(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
