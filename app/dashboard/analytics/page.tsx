'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface TaskLog {
  id: string
  task_type: string
  tokens_used: number
  created_at: string
  ai_employee_id: string | null
}

interface Profile {
  tasks_used: number
  tasks_limit: number
  subscription_tier: string
}

interface DailyUsage {
  date: string
  tasks: number
  tokens: number
}

interface TaskTypeBreakdown {
  name: string
  value: number
  color: string
}

const COLORS = ['#00D9FF', '#0EA5E9', '#6366F1', '#8B5CF6', '#A855F7']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([])
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [taskTypeBreakdown, setTaskTypeBreakdown] = useState<TaskTypeBreakdown[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tasks_used, tasks_limit, subscription_tier')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Calculate date range
      const now = new Date()
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

      // Fetch task logs
      const { data: logs } = await supabase
        .from('task_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (logs) {
        setTaskLogs(logs)
        
        // Process daily usage
        const dailyMap = new Map<string, { tasks: number; tokens: number }>()
        
        // Initialize all days in range
        for (let i = 0; i < daysBack; i++) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]
          dailyMap.set(dateStr, { tasks: 0, tokens: 0 })
        }

        // Aggregate logs
        logs.forEach(log => {
          const dateStr = new Date(log.created_at).toISOString().split('T')[0]
          const existing = dailyMap.get(dateStr) || { tasks: 0, tokens: 0 }
          dailyMap.set(dateStr, {
            tasks: existing.tasks + 1,
            tokens: existing.tokens + log.tokens_used
          })
        })

        // Convert to array and sort
        const dailyArray = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            tasks: data.tasks,
            tokens: data.tokens
          }))
          .reverse()

        setDailyUsage(dailyArray)

        // Process task type breakdown
        const typeMap = new Map<string, number>()
        logs.forEach(log => {
          const existing = typeMap.get(log.task_type) || 0
          typeMap.set(log.task_type, existing + 1)
        })

        const typeArray = Array.from(typeMap.entries())
          .map(([name, value], index) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
            value,
            color: COLORS[index % COLORS.length]
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)

        setTaskTypeBreakdown(typeArray)
      }

      setLoading(false)
    }

    loadData()
  }, [timeRange])

  const totalTasks = taskLogs.length
  const totalTokens = taskLogs.reduce((sum, log) => sum + log.tokens_used, 0)
  const avgTasksPerDay = totalTasks / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)
  const usagePercent = profile ? (profile.tasks_used / profile.tasks_limit) * 100 : 0

  // Calculate trend (compare first half vs second half of period)
  const halfPoint = Math.floor(dailyUsage.length / 2)
  const firstHalf = dailyUsage.slice(0, halfPoint).reduce((sum, d) => sum + d.tasks, 0)
  const secondHalf = dailyUsage.slice(halfPoint).reduce((sum, d) => sum + d.tasks, 0)
  const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usage Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track your AI employee task consumption and usage patterns
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {trendPercent >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={trendPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(trendPercent).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Used
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all AI employees
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Tasks/Day
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {avgTasksPerDay.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Over selected period
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Quota
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {profile?.tasks_used || 0} / {profile?.tasks_limit || 50}
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {usagePercent.toFixed(0)}% of monthly limit used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Usage Over Time Chart */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Task Usage Over Time</CardTitle>
            <CardDescription>
              Daily task completion trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyUsage}>
                    <defs>
                      <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 12 }}
                      tickLine={{ stroke: '#444' }}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fill: '#888', fontSize: 12 }}
                      tickLine={{ stroke: '#444' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tasks"
                      stroke="#00D9FF"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTasks)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No task data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task Type Breakdown */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Task Types</CardTitle>
            <CardDescription>
              Breakdown by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {taskTypeBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskTypeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {taskTypeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-muted-foreground text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No task data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Bar Chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Token Consumption</CardTitle>
          <CardDescription>
            Daily token usage across all AI employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {dailyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar 
                    dataKey="tokens" 
                    fill="#6366F1" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No token data available for this period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest tasks completed by your AI employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {taskLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent activity. Start using your AI employees to see task logs here.
            </p>
          ) : (
            <div className="space-y-4">
              {taskLogs.slice(-10).reverse().map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground capitalize">
                        {log.task_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {log.tokens_used.toLocaleString()} tokens
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
