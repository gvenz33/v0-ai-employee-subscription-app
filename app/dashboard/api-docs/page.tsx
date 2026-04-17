"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check, Key, Code, Zap, BarChart3, MessageSquare, ListTodo } from "lucide-react"
import { toast } from "sonner"

export default function ApiDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://247aiemployees.net'

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(endpoint)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  const endpoints = [
    {
      method: "POST",
      path: "/api/chat",
      icon: MessageSquare,
      description: "Send messages to AI employees and get responses",
      request: `{
  "employee_id": "life-coach",
  "message": "Help me create a morning routine"
}`,
      response: `{
  "success": true,
  "response": "I'd be happy to help you create an effective morning routine...",
  "employee": "life-coach",
  "tokens_used": 150
}`
    },
    {
      method: "POST",
      path: "/api/tasks",
      icon: ListTodo,
      description: "Create background tasks for AI employees to process",
      request: `{
  "employee_id": "content-creator",
  "title": "Write blog post",
  "prompt": "Write a 500 word blog post about AI productivity",
  "priority": "high"
}`,
      response: `{
  "success": true,
  "task": {
    "id": "uuid-here",
    "status": "pending",
    "created_at": "2026-04-17T12:00:00Z"
  }
}`
    },
    {
      method: "GET",
      path: "/api/plan",
      icon: BarChart3,
      description: "Get current subscription plan and usage information",
      request: `// No body required`,
      response: `{
  "success": true,
  "plan": {
    "tier": "enterprise",
    "name": "Enterprise",
    "tasks_used": 150,
    "tasks_limit": 999999,
    "tasks_remaining": 999849,
    "usage_percent": 0.01,
    "features": ["all_agents", "unlimited_tasks", "priority_support"]
  }
}`
    },
    {
      method: "POST",
      path: "/api/actions",
      icon: Zap,
      description: "Execute quick actions with AI employees",
      request: `{
  "action": "summarize",
  "employee_id": "virtual-assistant",
  "input": "Long text to summarize..."
}`,
      response: `{
  "success": true,
  "action": "summarize",
  "result": "Summary of the provided text...",
  "tokens_used": 75
}`
    },
    {
      method: "GET",
      path: "/api/status",
      icon: Key,
      description: "Check API status, account info, and available employees",
      request: `// No body required`,
      response: `{
  "success": true,
  "status": "operational",
  "account": {
    "tier": "enterprise",
    "tasks_used": 150,
    "tasks_limit": 999999
  },
  "available_employees": 30,
  "api_version": "1.0.0"
}`
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">API Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Integrate 247 AI Employees into your applications with our REST API
        </p>
      </div>

      {/* Authentication */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Authentication
          </CardTitle>
          <CardDescription>
            All API requests require authentication using your API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
            <p className="text-muted-foreground mb-2"># Include in request headers:</p>
            <p className="text-foreground">Authorization: Bearer YOUR_API_KEY</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate API keys from your <a href="/dashboard/settings" className="text-primary hover:underline">Settings</a> page or use the <code className="bg-muted px-1 rounded">/api/keys</code> endpoint.
          </p>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input 
              value={baseUrl} 
              readOnly 
              className="font-mono bg-muted/50"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(baseUrl, 'base')}
            >
              {copiedEndpoint === 'base' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Endpoints</h2>
        
        {endpoints.map((endpoint) => (
          <Card key={endpoint.path} className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <endpoint.icon className="h-5 w-5 text-primary" />
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    endpoint.method === 'GET' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="font-mono">{endpoint.path}</code>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(`${baseUrl}${endpoint.path}`, endpoint.path)}
                >
                  {copiedEndpoint === endpoint.path ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <CardDescription>{endpoint.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="request" className="w-full">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="mt-4">
                  <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm">
                    <code>{endpoint.request}</code>
                  </pre>
                </TabsContent>
                <TabsContent value="response" className="mt-4">
                  <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm">
                    <code>{endpoint.response}</code>
                  </pre>
                </TabsContent>
                <TabsContent value="curl" className="mt-4">
                  <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm">
                    <code>{`curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${endpoint.method === 'POST' ? ` \\
  -d '${endpoint.request.replace(/\n/g, '').replace(/\s+/g, ' ')}'` : ''}`}</code>
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate Limits */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>API rate limits based on your subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">100</p>
              <p className="text-sm text-muted-foreground">Personal</p>
              <p className="text-xs text-muted-foreground">req/min</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">500</p>
              <p className="text-sm text-muted-foreground">Entrepreneur</p>
              <p className="text-xs text-muted-foreground">req/min</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">2000</p>
              <p className="text-sm text-muted-foreground">Business</p>
              <p className="text-xs text-muted-foreground">req/min</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">Unlimited</p>
              <p className="text-sm text-muted-foreground">Enterprise</p>
              <p className="text-xs text-muted-foreground">req/min</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
