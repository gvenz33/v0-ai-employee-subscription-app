"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, AlertCircle, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

interface Conversation {
  id: string
  session_id: string
  user_id: string | null
  status: string
  needs_human: boolean
  created_at: string
  updated_at: string
  support_messages: {
    id: string
    role: string
    content: string
    created_at: string
  }[]
}

export default function SupportManagementPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "human" | "active">("all")

  const supabase = createClient()

  useEffect(() => {
    fetchConversations()
  }, [filter])

  const fetchConversations = async () => {
    setIsLoading(true)
    let query = supabase
      .from("support_conversations")
      .select(`
        *,
        support_messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .order("updated_at", { ascending: false })

    if (filter === "human") {
      query = query.eq("needs_human", true)
    } else if (filter === "active") {
      query = query.eq("status", "active")
    }

    const { data } = await query.limit(50)
    setConversations(data || [])
    setIsLoading(false)
  }

  const markAsResolved = async (id: string) => {
    await supabase
      .from("support_conversations")
      .update({ status: "resolved", needs_human: false })
      .eq("id", id)
    fetchConversations()
  }

  const humanRequests = conversations.filter(c => c.needs_human).length
  const activeChats = conversations.filter(c => c.status === "active").length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Support Conversations</h1>
        <p className="text-muted-foreground mt-1">Manage and respond to customer support chats</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card 
          className={`bg-card border-border cursor-pointer transition-colors ${filter === "human" ? "border-primary" : ""}`}
          onClick={() => setFilter("human")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Human</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{humanRequests}</div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-card border-border cursor-pointer transition-colors ${filter === "active" ? "border-primary" : ""}`}
          onClick={() => setFilter("active")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeChats}</div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-card border-border cursor-pointer transition-colors ${filter === "all" ? "border-primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{conversations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>
            {filter === "human" ? "Conversations Needing Human Support" : 
             filter === "active" ? "Active Conversations" : "All Conversations"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No conversations found</div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map(conv => (
                <div key={conv.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">
                          Session: {conv.session_id.slice(0, 20)}...
                        </p>
                        {conv.needs_human && (
                          <Badge className="bg-orange-500 text-white">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs Human
                          </Badge>
                        )}
                        <Badge variant={conv.status === "active" ? "default" : "secondary"}>
                          {conv.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {conv.support_messages?.length || 0} messages | 
                        Last updated: {new Date(conv.updated_at).toLocaleString()}
                      </p>
                      {conv.support_messages && conv.support_messages.length > 0 && (
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          <span className="font-medium">
                            {conv.support_messages[conv.support_messages.length - 1].role}:
                          </span>{" "}
                          {conv.support_messages[conv.support_messages.length - 1].content.slice(0, 100)}...
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link href={`/admin/support/${conv.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      {conv.status === "active" && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => markAsResolved(conv.id)}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
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
