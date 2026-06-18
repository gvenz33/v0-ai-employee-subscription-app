'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AI_EMPLOYEES } from '@/lib/products'
import { chatRowToUIMessage, getTextFromUIMessage, type ChatSessionRow } from '@/lib/chat-message-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Plus,
  FileText,
  FileType,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { DictationButton } from '@/components/dictation-button'
import { cn } from '@/lib/utils'

function formatSessionDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EmployeeChatPanel({
  employeeId,
  sessionId,
  initialMessages,
  onConversationUpdated,
}: {
  employeeId: string
  sessionId: string
  initialMessages: UIMessage[]
  onConversationUpdated: () => void
}) {
  const employee = AI_EMPLOYEES.find((e) => e.id === employeeId)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: {
          messages: msgs,
          id,
          employeeId,
        },
      }),
    }),
    onFinish: () => {
      onConversationUpdated()
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  if (!employee) return null

  return (
    <Card className="flex flex-1 flex-col overflow-hidden border-border bg-card">
      <CardHeader className="border-b border-border py-3">
        <CardDescription className="text-sm">
          Chat with {employee.name} - {employee.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">Continue your conversation with {employee.name}</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Past messages are saved automatically. Ask anything that fits the role of {employee.role}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const text = getTextFromUIMessage(message)
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {employee.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{text}</p>
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-muted">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${employee.name} something...`}
            disabled={isLoading}
            className="flex-1 border-border bg-background"
          />
          <DictationButton
            disabled={isLoading}
            appendText={(snippet) => setInput((prev) => (prev ? `${prev.trimEnd()} ` : '') + snippet)}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

export function EmployeeChatClient({ employeeId }: { employeeId: string }) {
  const employee = AI_EMPLOYEES.find((e) => e.id === employeeId)
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSessionRow[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadSessions = useCallback(async () => {
    const res = await fetch(`/api/chat/sessions?employeeId=${encodeURIComponent(employeeId)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.sessions ?? []) as ChatSessionRow[]
  }, [employeeId])

  const loadSessionMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/chat/sessions/${id}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.messages ?? []).map(chatRowToUIMessage)
  }, [])

  const activateSession = useCallback(
    async (id: string, sessionList?: ChatSessionRow[]) => {
      const messages = await loadSessionMessages(id)
      setSessionId(id)
      setInitialMessages(messages)
      if (sessionList) setSessions(sessionList)
      router.replace(`/dashboard/employees/${employeeId}?session=${id}`, { scroll: false })
    },
    [employeeId, loadSessionMessages, router],
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      try {
        let list = await loadSessions()
        const requested =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('session')
            : null
        let activeId = requested && list.some((s) => s.id === requested) ? requested : list[0]?.id

        if (!activeId) {
          const createRes = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId }),
          })
          if (createRes.ok) {
            const created = await createRes.json()
            activeId = created.session.id
            list = [created.session, ...list]
          }
        }

        if (!cancelled && activeId) {
          await activateSession(activeId, list)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [employeeId, loadSessions, activateSession])

  const handleNewConversation = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      })
      if (!res.ok) return
      const { session } = await res.json()
      const list = await loadSessions()
      await activateSession(session.id, list)
    } finally {
      setCreating(false)
    }
  }

  const refreshSessions = async () => {
    const list = await loadSessions()
    setSessions(list)
  }

  if (!employee) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">AI Employee not found</p>
            <Link href="/dashboard/employees">
              <Button className="mt-4">Back to Employees</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/employees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-lg text-primary">
                {employee.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{employee.name}</h1>
              <p className="text-sm text-muted-foreground">{employee.role}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewConversation} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            New conversation
          </Button>
          {sessionId && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/chat/sessions/${sessionId}/export?format=pdf`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/chat/sessions/${sessionId}/export?format=docx`}>
                  <FileType className="mr-2 h-4 w-4" />
                  Export DOCX
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <Card className="hidden w-72 shrink-0 flex-col border-border bg-card md:flex">
          <CardHeader className="border-b border-border py-3">
            <CardDescription className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="h-4 w-4" />
              Conversation history
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-full max-h-[calc(100vh-260px)]">
              <div className="space-y-1 p-2">
                {loading ? (
                  <p className="p-3 text-sm text-muted-foreground">Loading history...</p>
                ) : sessions.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No saved conversations yet.</p>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => activateSession(session.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                        session.id === sessionId
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-transparent hover:border-border hover:bg-muted/50',
                      )}
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.title || 'New conversation'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatSessionDate(session.updated_at)}</p>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {loading || !sessionId ? (
          <Card className="flex flex-1 items-center justify-center border-border bg-card">
            <CardContent className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading conversation...
            </CardContent>
          </Card>
        ) : (
          <EmployeeChatPanel
            key={sessionId}
            employeeId={employeeId}
            sessionId={sessionId}
            initialMessages={initialMessages}
            onConversationUpdated={refreshSessions}
          />
        )}
      </div>
    </div>
  )
}
