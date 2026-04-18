"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AI_EMPLOYEES } from "@/lib/products"
import { createClient } from "@/lib/supabase/client"
import { Play, Clock, CheckCircle2, XCircle, RefreshCw, Plus, Copy, Eye, EyeOff, Loader2 } from "lucide-react"
import useSWR, { mutate } from "swr"

interface Task {
  id: string
  ai_employee_id: string
  title: string
  prompt: string
  result: string | null
  status: "pending" | "processing" | "completed" | "failed"
  priority: string
  trigger_type: string
  webhook_source: string | null
  tokens_used: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: RefreshCw },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function TasksPage() {
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskPrompt, setTaskPrompt] = useState("")
  const [priority, setPriority] = useState("normal")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  const { data: tasksData, error, isLoading } = useSWR<{ tasks: Task[] }>("/api/tasks", fetcher, {
    refreshInterval: 5000, // Auto-refresh every 5 seconds
  })

  const tasks = tasksData?.tasks || []

  useEffect(() => {
    // Fetch API key on mount
    const fetchApiKey = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("api_key")
          .eq("id", user.id)
          .single()
        if (profile?.api_key) {
          setApiKey(profile.api_key)
        }
      }
    }
    fetchApiKey()
  }, [])

  const handleSubmitTask = async () => {
    if (!selectedEmployee || !taskTitle || !taskPrompt) return
    
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedEmployee,
          title: taskTitle,
          prompt: taskPrompt,
          priority,
        }),
      })
      
      if (res.ok) {
        setTaskTitle("")
        setTaskPrompt("")
        setSelectedEmployee("")
        setPriority("normal")
        mutate("/api/tasks")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateApiKey = async () => {
    setIsGeneratingKey(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newKey = "ak_" + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")

      const { error } = await supabase
        .from("profiles")
        .update({ api_key: newKey })
        .eq("id", user.id)

      if (!error) {
        setApiKey(newKey)
      }
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getEmployeeName = (id: string) => {
    const employee = AI_EMPLOYEES.find(e => e.id === id)
    return employee?.name || id
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Task Queue</h1>
        <p className="text-muted-foreground">Submit tasks for your AI employees to process in the background</p>
      </div>

      <Tabs defaultValue="submit" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="submit">Submit Task</TabsTrigger>
          <TabsTrigger value="queue">Task Queue ({tasks.length})</TabsTrigger>
          <TabsTrigger value="api">API & Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                New Background Task
              </CardTitle>
              <CardDescription>
                Submit a task for an AI employee to process asynchronously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Employee</label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an AI employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_EMPLOYEES.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} - {employee.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Title</label>
                <Input
                  placeholder="e.g., Write blog post about AI trends"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Instructions</label>
                <Textarea
                  placeholder="Provide detailed instructions for the AI employee..."
                  rows={6}
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSubmitTask}
                disabled={!selectedEmployee || !taskTitle || !taskPrompt || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Submit Task
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count = tasks.filter(t => t.status === key).length
                if (count === 0) return null
                return (
                  <Badge key={key} variant="outline" className={config.color}>
                    {config.label}: {count}
                  </Badge>
                )
              })}
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate("/api/tasks")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No tasks in queue</p>
                <p className="text-sm text-muted-foreground/70">Submit a task to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const config = statusConfig[task.status]
                const StatusIcon = config.icon
                return (
                  <Card key={task.id} className="border-border/50 bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusIcon className={`h-4 w-4 ${task.status === "processing" ? "animate-spin" : ""} ${config.color.includes("emerald") ? "text-emerald-400" : config.color.includes("amber") ? "text-amber-400" : config.color.includes("blue") ? "text-blue-400" : "text-red-400"}`} />
                            <h3 className="font-medium truncate">{task.title}</h3>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getEmployeeName(task.ai_employee_id)} &bull; {new Date(task.created_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground/70 line-clamp-2">{task.prompt}</p>
                        </div>
                        <Dialog open={dialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => {
                          setDialogOpen(open)
                          if (!open) setSelectedTask(null)
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task)
                                setDialogOpen(true)
                              }}
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{task.title}</DialogTitle>
                              <DialogDescription>
                                {getEmployeeName(task.ai_employee_id)} &bull; {task.trigger_type}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Status</h4>
                                <Badge variant="outline" className={config.color}>
                                  {config.label}
                                </Badge>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Instructions</h4>
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                                  {task.prompt}
                                </p>
                              </div>
                              {task.result && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Result</h4>
                                  <div className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                                    {task.result}
                                  </div>
                                </div>
                              )}
                              {task.error_message && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2 text-red-400">Error</h4>
                                  <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                                    {task.error_message}
                                  </p>
                                </div>
                              )}
                              {task.tokens_used > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Tokens Used</h4>
                                  <p className="text-sm text-muted-foreground">{task.tokens_used.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>API Key</CardTitle>
              <CardDescription>
                Use this key to authenticate webhook requests from external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 rounded-lg px-4 py-2 font-mono text-sm">
                    {showApiKey ? apiKey : "ak_" + "•".repeat(48)}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No API key generated yet</p>
              )}
              <Button variant="outline" onClick={generateApiKey} disabled={isGeneratingKey}>
                {isGeneratingKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  apiKey ? "Regenerate API Key" : "Generate API Key"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Webhook Endpoint</CardTitle>
              <CardDescription>
                Send POST requests to trigger AI tasks from external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/50 rounded-lg px-4 py-2 text-sm overflow-x-auto">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/trigger
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/trigger`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Example Request</label>
                <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/trigger" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "ai_employee_id": "content-creator",
    "title": "Write blog post",
    "prompt": "Write a blog post about AI trends in 2024",
    "priority": "normal",
    "source": "zapier"
  }'`}
                </pre>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Available AI Employees</label>
                <div className="grid gap-2 md:grid-cols-2">
                  {AI_EMPLOYEES.map((employee) => (
                    <div key={employee.id} className="bg-muted/30 rounded-lg p-3">
                      <code className="text-primary text-sm">{employee.id}</code>
                      <p className="text-sm text-muted-foreground">{employee.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Integration Examples</CardTitle>
              <CardDescription>
                Connect your AI employees to popular automation platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-border/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Zapier</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use the Webhooks by Zapier app to send data to your AI employees
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Create a new Zap</li>
                    <li>Add &quot;Webhooks by Zapier&quot; action</li>
                    <li>Choose &quot;POST&quot; method</li>
                    <li>Paste your webhook URL</li>
                    <li>Add Authorization header with your API key</li>
                  </ol>
                </div>
                <div className="border border-border/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Make (Integromat)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use the HTTP module to trigger AI tasks
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Add HTTP &quot;Make a request&quot; module</li>
                    <li>Set method to POST</li>
                    <li>Enter your webhook URL</li>
                    <li>Add Bearer token authentication</li>
                    <li>Set body type to JSON</li>
                  </ol>
                </div>
                <div className="border border-border/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">n8n</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Self-hosted automation with HTTP Request node
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Add HTTP Request node</li>
                    <li>Set method to POST</li>
                    <li>Configure URL and headers</li>
                    <li>Add JSON body with task details</li>
                  </ol>
                </div>
                <div className="border border-border/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Custom Integration</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Build your own integration with any programming language
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Make HTTP POST request</li>
                    <li>Include Authorization header</li>
                    <li>Send JSON payload</li>
                    <li>Handle response status</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
