"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileText, Download, ExternalLink, Receipt, FileSpreadsheet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Invoice {
  id: string
  stripe_invoice_id: string | null
  amount_cents: number
  currency: string
  status: string
  description: string | null
  invoice_url: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInvoices() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (!error && data) {
          setInvoices(data)
        }
      }
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  function formatCurrency(cents: number, currency: string = "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase()
    }).format(cents / 100)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice History</h1>
          <p className="text-muted-foreground">
            View, export with letterhead, or download spreadsheets for your records
          </p>
        </div>
        {invoices.length > 0 && (
          <Button variant="outline" asChild>
            <a href="/api/invoices/export?format=xlsx">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export all to Excel
            </a>
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>
            PDF exports use your white-label letterhead when enabled on Founders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your invoices will appear here after your first payment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {invoice.description || "Subscription Payment"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(invoice.created_at)}
                        {invoice.period_start && invoice.period_end && (
                          <span className="ml-2">
                            ({formatDate(invoice.period_start)} - {formatDate(invoice.period_end)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(invoice.amount_cents, invoice.currency)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={`/api/invoices/export?format=pdf&invoiceId=${invoice.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            PDF with letterhead
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href="/api/invoices/export?format=xlsx">
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Excel spreadsheet
                          </a>
                        </DropdownMenuItem>
                        {invoice.invoice_url && (
                          <DropdownMenuItem asChild>
                            <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Stripe receipt
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
