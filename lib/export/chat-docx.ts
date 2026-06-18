import "server-only"

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx"
import type { ChatMessageRow } from "@/lib/chat-message-utils"

export async function buildChatDocxBuffer(input: {
  employeeName: string
  employeeRole: string
  sessionTitle: string
  exportedAt: string
  messages: ChatMessageRow[]
}): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `Conversation with ${input.employeeName}`,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${input.employeeRole} · ${input.sessionTitle}`, italics: true }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Exported ${input.exportedAt}`, italics: true, size: 20 })],
    }),
    new Paragraph({ text: "" }),
  ]

  for (const message of input.messages) {
    const label = message.role === "user" ? "You" : input.employeeName
    const timestamp = new Date(message.created_at).toLocaleString()
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${label} · ${timestamp}`, bold: true })],
      }),
      new Paragraph({ text: message.content }),
      new Paragraph({ text: "" }),
    )
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
