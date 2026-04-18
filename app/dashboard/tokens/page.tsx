import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskCreditsClient } from "@/components/dashboard/task-credits-client"
import { TOKEN_PACKS } from "@/lib/products"
import {
  PRIMARY_AI_MODEL,
  PROVIDER_SUMMARY,
  TASK_COST_GUIDE,
  formatProviderCostDisclaimer,
} from "@/lib/token-economics"

export default async function TokensPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tasks_used, tasks_limit, subscription_tier")
    .eq("id", user.id)
    .single()

  const tasksUsed = profile?.tasks_used ?? 0
  const tasksLimit = profile?.tasks_limit ?? 50
  const tier = profile?.subscription_tier ?? "personal"

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Task credits & usage</h1>
        <p className="text-muted-foreground mt-1">
          Understand how AI usage maps to task credits, and buy add-on packs when you need more.
        </p>
      </div>

      <TaskCreditsClient
        tasksUsed={tasksUsed}
        tasksLimit={tasksLimit}
        subscriptionTier={tier}
      />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Where usage comes from</CardTitle>
          <CardDescription className="text-pretty">{PROVIDER_SUMMARY}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Primary model for most product flows: <code className="text-foreground">{PRIMARY_AI_MODEL}</code>
          </p>
          <p>{formatProviderCostDisclaimer()}</p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Typical token use by activity</CardTitle>
          <CardDescription>
            One <strong className="text-foreground">task credit</strong> is counted per chat message or
            automation run against your monthly allowance. Under the hood, the model bills by tokens;
            short interactions use fewer tokens than long documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Typical tokens (rough)</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TASK_COST_GUIDE.map((row) => (
                <TableRow key={row.activity}>
                  <TableCell className="font-medium text-foreground">{row.activity}</TableCell>
                  <TableCell>{row.typicalTokens}</TableCell>
                  <TableCell className="text-muted-foreground">{row.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Add-on pack pricing (with margin)</CardTitle>
          <CardDescription>
            Pack prices include platform operations, support, and a sustainable margin over estimated
            provider cost. Per-task figures help compare packs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Task credits</TableHead>
                <TableHead className="text-right">Per task (approx.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TOKEN_PACKS.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium text-foreground">{pack.name}</TableCell>
                  <TableCell className="text-right">
                    ${(pack.priceInCents / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{pack.tasks.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${((pack.priceInCents / 100) / pack.tasks).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
