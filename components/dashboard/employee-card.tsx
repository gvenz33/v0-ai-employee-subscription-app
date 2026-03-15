"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Lock, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { AIEmployee } from "@/lib/products"

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
        // Update existing employee
        await supabase
          .from("ai_employees")
          .update({ is_active: !isActive })
          .eq("id", userEmployee.id)
      } else {
        // Create new employee for user
        await supabase
          .from("ai_employees")
          .insert({
            user_id: userId,
            name: employee.name,
            role: employee.role,
            description: employee.description,
            avatar_url: employee.avatar,
            tier_required: employee.tierRequired,
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
    router.push(`/dashboard/employees/${employee.id}/chat`)
  }

  return (
    <Card className={`bg-card border-border relative ${isLocked ? "opacity-75" : ""}`}>
      {isLocked && (
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            {employee.tierRequired.charAt(0).toUpperCase() + employee.tierRequired.slice(1)}
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            {employee.avatar}
          </div>
          <div className="flex-1">
            <CardTitle className="text-foreground">{employee.name}</CardTitle>
            <CardDescription className="text-muted-foreground">{employee.role}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{employee.description}</p>
        
        <div className="flex flex-wrap gap-1">
          {employee.capabilities.slice(0, 3).map((cap) => (
            <Badge key={cap} variant="secondary" className="text-xs">
              {cap}
            </Badge>
          ))}
          {employee.capabilities.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{employee.capabilities.length - 3}
            </Badge>
          )}
        </div>

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
            />
            <span className="text-sm text-muted-foreground">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          
          <Button
            size="sm"
            variant={isActive ? "default" : "outline"}
            disabled={isLocked || !isActive}
            onClick={handleChat}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
