'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { AI_EMPLOYEES } from '@/lib/products'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Send, Bot, User } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { DictationButton } from '@/components/dictation-button'

function getUIMessageText(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ''
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function EmployeeChatClient({ employeeId }: { employeeId: string }) {
  const employee = AI_EMPLOYEES.find((e) => e.id === employeeId)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
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
      <div className="mb-6 flex items-center gap-4">
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
              <h3 className="mb-2 text-lg font-medium text-foreground">Start a conversation with {employee.name}</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                {employee.description} Ask me anything that fits my role as your {employee.role}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const text = getUIMessageText(message)
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
    </div>
  )
}
