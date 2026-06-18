import "server-only"

import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import type { WhiteLabelSettings } from "@/lib/white-label"

export type InvoiceExportRow = {
  id: string
  description: string | null
  amount_cents: number
  currency: string
  status: string
  created_at: string
  period_start: string | null
  period_end: string | null
  stripe_invoice_id: string | null
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function buildInvoicePdfBuffer(input: {
  invoice: InvoiceExportRow
  billToName: string
  billToEmail: string
  branding: {
    brandName: string
    supportEmail: string
    primaryColor: string
    tagline: string
  }
}): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const { invoice, billToName, billToEmail, branding } = input

  const headerRgb = hexToRgb(branding.primaryColor)

  doc.setFillColor(headerRgb.r, headerRgb.g, headerRgb.b)
  doc.rect(0, 0, pageWidth, 96, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text(branding.brandName, margin, 42)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(branding.tagline, margin, 60)
  doc.text(branding.supportEmail, margin, 76)

  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("INVOICE", margin, 130)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(`Invoice date: ${formatDate(invoice.created_at)}`, margin, 152)
  if (invoice.stripe_invoice_id) {
    doc.text(`Reference: ${invoice.stripe_invoice_id}`, margin, 168)
  }

  doc.setFont("helvetica", "bold")
  doc.text("Bill to", margin, 200)
  doc.setFont("helvetica", "normal")
  doc.text(billToName || "Customer", margin, 216)
  doc.text(billToEmail, margin, 232)

  const tableTop = 270
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, tableTop, pageWidth - margin * 2, 24, "F")
  doc.setFont("helvetica", "bold")
  doc.text("Description", margin + 8, tableTop + 16)
  doc.text("Period", margin + 260, tableTop + 16)
  doc.text("Status", margin + 380, tableTop + 16)
  doc.text("Amount", pageWidth - margin - 70, tableTop + 16)

  doc.setFont("helvetica", "normal")
  const rowY = tableTop + 44
  const period =
    invoice.period_start && invoice.period_end
      ? `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}`
      : "—"

  const description = invoice.description || "Subscription payment"
  const descLines = doc.splitTextToSize(description, 220) as string[]
  doc.text(descLines, margin + 8, rowY)
  doc.text(period, margin + 260, rowY)
  doc.text(invoice.status, margin + 380, rowY)
  doc.setFont("helvetica", "bold")
  doc.text(formatMoney(invoice.amount_cents, invoice.currency), pageWidth - margin - 70, rowY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text("Thank you for your business.", margin, 520)

  return Buffer.from(doc.output("arraybuffer"))
}

export function buildInvoicesSpreadsheetBuffer(invoices: InvoiceExportRow[]): Buffer {
  const rows = invoices.map((invoice) => ({
    Date: formatDate(invoice.created_at),
    Description: invoice.description || "Subscription payment",
    PeriodStart: formatDate(invoice.period_start),
    PeriodEnd: formatDate(invoice.period_end),
    Status: invoice.status,
    Amount: invoice.amount_cents / 100,
    Currency: invoice.currency.toUpperCase(),
    Reference: invoice.stripe_invoice_id || invoice.id,
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Invoices")
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
}

export function resolveInvoiceBranding(
  whiteLabel: WhiteLabelSettings | null,
  profileName: string | null,
) {
  if (whiteLabel?.brand_name) {
    return {
      brandName: whiteLabel.brand_name,
      supportEmail: whiteLabel.support_email || "hello@247aiemployees.net",
      primaryColor: whiteLabel.primary_color || "#2563eb",
      tagline: whiteLabel.remove_247_branding ? "Invoice" : "Powered by 247 AI Employees",
    }
  }

  return {
    brandName: profileName ? `${profileName} · 247 AI Employees` : "247 AI Employees",
    supportEmail: "hello@247aiemployees.net",
    primaryColor: "#2563eb",
    tagline: "Your lean AI back office",
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 37, g: 99, b: 235 }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}
