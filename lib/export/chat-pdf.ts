import "server-only"

import { jsPDF } from "jspdf"
import type { ChatMessageRow } from "@/lib/chat-message-utils"

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[]
}

export function buildChatPdfBuffer(input: {
  employeeName: string
  employeeRole: string
  sessionTitle: string
  exportedAt: string
  messages: ChatMessageRow[]
}): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(`Conversation with ${input.employeeName}`, margin, y)
  y += 22

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${input.employeeRole} · ${input.sessionTitle}`, margin, y)
  y += 14
  doc.text(`Exported ${input.exportedAt}`, margin, y)
  y += 24
  doc.setTextColor(0)

  for (const message of input.messages) {
    const label = message.role === "user" ? "You" : input.employeeName
    const timestamp = new Date(message.created_at).toLocaleString()
    const header = `${label} · ${timestamp}`

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    const headerLines = wrapText(doc, header, maxWidth)
    if (y + headerLines.length * 14 + 40 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(headerLines, margin, y)
    y += headerLines.length * 14 + 6

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    const bodyLines = wrapText(doc, message.content, maxWidth)
    if (y + bodyLines.length * 14 + 20 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(bodyLines, margin, y)
    y += bodyLines.length * 14 + 18
  }

  return Buffer.from(doc.output("arraybuffer"))
}
