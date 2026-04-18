"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Lock, MessageSquare, ShoppingCart, Heart, Wallet, UtensilsCrossed, Plane, GraduationCap, Activity, Baby, Share2, PenTool, Search, RefreshCw, Megaphone, Target, Presentation, Settings, Headphones, TrendingUp, Users, Calendar, Clipboard, FileText, Briefcase, Calculator, FileSignature, Receipt, ShieldCheck, Handshake, Palette, Globe, Workflow, Rocket, Lightbulb, Building, Mic, BookOpen, BarChart3, Microscope, Code2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { AIEmployee } from "@/lib/products"

// Map icon names to components
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
  isLocked: boolean
  userId: string
}

export function EmployeeCard({ employee, userEmployee, isLocked, userId }: EmployeeCardProps) {
  const [isActive, setIsActive] = useState(userEmployee?.is_active || false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    if (isLocked) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      if (userEmployee) {
        await supabase
          .from("ai_employees")
          .update({ is_active: !isActive })
          .eq("id", userEmployee.id)
      } else {
        await supabase
          .from("ai_employees")
          .insert({
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
    <Card className={`bg-card border-border relative transition-all hover:border-primary/30 ${isLocked ? "opacity-60" : ""}`}>
      {isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-xs">
            <Lock className="h-3 w-3" />
            {tierLabels[employee.tier_required] || employee.tier_required}
          </Badge>
        </div>
      )}

      {employee.isALaCarte && isLocked && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="gap-1 bg-primary text-xs">
            <ShoppingCart className="h-3 w-3" />
            ${(employee.aLaCartePriceInCents || 999) / 100}/mo
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {iconMap[employee.icon] || <Users className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-foreground text-sm truncate">{employee.name}</CardTitle>
            <CardDescription className="text-muted-foreground text-xs">{employee.role}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2">{employee.description}</p>

        {userEmployee && (
          <p className="text-xs text-muted-foreground">
            {userEmployee.tasks_completed} tasks completed
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={isLocked || isLoading}
              className="scale-75"
            />
            <span className="text-xs text-muted-foreground">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          
          <Button
            size="sm"
            variant={isActive ? "default" : "outline"}
            disabled={isLocked || !isActive}
            onClick={handleChat}
            className="h-7 text-xs"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
