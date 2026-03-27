"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Bot, User, UserCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: string
  content: string
  created_at: string
}

interface Conversation {
  id: string
  session_id: string
  status: string
  needs_human: boolean
  created_at: string
}

export default function SupportConversationPage() {
  const params = useParams()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchConversation()
    // Set up realtime subscription
    const channel = supabase
      .channel(`conversation-${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${params.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchConversation = async () => {
    setIsLoading(true)
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", params.id)
      .single()

    const { data: msgs } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true })

    setConversation(conv)
    setMessages(msgs || [])
    setIsLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await supabase.from("support_messages").insert({
        conversation_id: params.id,
        role: "admin",
        content: newMessage.trim()
      })

      // Update conversation
      await supabase
        .from("support_conversations")
        .update({ needs_human: false, updated_at: new Date().toISOString() })
        .eq("id", params.id)

      setNewMessage("")
      fetchConversation()
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const markResolved = async () => {
    await supabase
      .from("support_conversations")
      .update({ status: "resolved", needs_human: false })
      .eq("id", params.id)
    fetchConversation()
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    )
  }

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/support" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Support Conversation</h1>
            <p className="text-sm text-muted-foreground">{conversation?.session_id.slice(0, 30)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation?.needs_human && (
            <Badge className="bg-orange-500 text-white">Needs Response</Badge>
          )}
          <Badge variant={conversation?.status === "active" ? "default" : "secondary"}>
            {conversation?.status}
          </Badge>
          {conversation?.status === "active" && (
            <Button variant="outline" onClick={markResolved}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role !== "user" && (
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  message.role === "admin" ? "bg-green-500" : "bg-primary"
                )}>
                  {message.role === "admin" ? (
                    <UserCircle className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
              )}
              <div className="max-w-[70%]">
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "admin"
                      ? "bg-green-500/10 border border-green-500/30 text-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.role === "admin" && (
                    <p className="text-xs text-green-500 font-medium mb-1">Admin Response</p>
                  )}
                  {message.content}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        {conversation?.status === "active" && (
          <div className="border-t border-border p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your response as admin..."
                className="flex-1"
                disabled={isSending}
              />
              <Button type="submit" disabled={isSending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  )
}
