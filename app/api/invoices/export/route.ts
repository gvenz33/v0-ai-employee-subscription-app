import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEffectiveWhiteLabelSettings } from "@/lib/white-label"
import {
  buildInvoicePdfBuffer,
  buildInvoicesSpreadsheetBuffer,
  resolveInvoiceBranding,
} from "@/lib/export/invoice-export"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const format = request.nextUrl.searchParams.get("format") || "xlsx"
  const invoiceId = request.nextUrl.searchParams.get("invoiceId")

  const query = supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: invoices, error } = invoiceId ? await query.eq("id", invoiceId) : await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!invoices?.length) {
    return NextResponse.json({ error: "No invoices found" }, { status: 404 })
  }

  if (format === "xlsx") {
    const buffer = buildInvoicesSpreadsheetBuffer(invoices)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="invoices.xlsx"',
      },
    })
  }

  if (format === "pdf") {
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required for PDF export" }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()

    const whiteLabel = await getEffectiveWhiteLabelSettings(supabase, user.id)
    const branding = resolveInvoiceBranding(whiteLabel, profile?.full_name ?? null)
    const buffer = buildInvoicePdfBuffer({
      invoice: invoices[0],
      billToName: profile?.full_name || "Customer",
      billToEmail: user.email || "",
      branding,
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: "format must be pdf or xlsx" }, { status: 400 })
}
