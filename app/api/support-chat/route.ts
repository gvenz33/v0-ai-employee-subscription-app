import { NextRequest, NextResponse } from "next/server"
import { streamText, convertToModelMessages } from "ai"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history } = await request.json()

    // Check if user is requesting human support
    const humanKeywords = ["speak to human", "talk to human", "human support", "real person", "live agent", "human agent"]
    const needsHuman = humanKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    )

    if (needsHuman) {
      // Notify admin
      await notifyAdmin(sessionId, message)
      
      return NextResponse.json({
        response: "I understand you'd like to speak with a human. I've notified our support team and someone will join this conversation shortly. Our typical response time is within 1-2 hours during business hours.",
        needsHuman: true,
        isHuman: false
      })
    }

    // Fetch FAQ knowledge base
    const { data: faqs } = await getSupabaseAdmin()
      .from("faq_knowledge_base")
      .select("question, answer, category")
      .order("helpful_count", { ascending: false })

    const faqContext = faqs?.map(faq => 
      `Q: ${faq.question}\nA: ${faq.answer}`
    ).join("\n\n") || ""

    // Build system prompt with knowledge base
    const systemPrompt = `You are a helpful customer support AI for 247 AI Employees (247aiemployees.net), a SaaS platform that provides AI-powered employees/agents to automate business tasks.

KNOWLEDGE BASE:
${faqContext}

IMPORTANT INFORMATION:
- Company: 247 AI Employees (247aiemployees.net)
- Support email: hello@247aiemployees.net
- Admin email for escalation: gvenz33@gmail.com

PRICING TIERS:
- Personal: $19/month - 5 AI employees, 50 tasks/month
- Entrepreneur: $49/month - 10 AI employees, 200 tasks/month  
- Business: $99/month - 20 AI employees, 1,000 tasks/month
- Enterprise: $199/month - All 30 AI employees, effectively unlimited tasks

TOKEN PACKS (add task credits to monthly cap):
- Boost Pack: 50 tasks for $14.99
- Power Pack: 150 tasks for $39.99
- Scale Pack: 500 tasks for $99.99

A LA CARTE: Users can unlock individual premium AI employees for $9.99/month each.

AFFILIATE PROGRAM: Tiered commission - Personal 10%, Entrepreneur 12%, Business 15%, Enterprise 20%. Max 20%.

GUIDELINES:
1. Be friendly, helpful, and concise
2. Use the knowledge base to answer questions accurately
3. If you cannot confidently answer a question, offer to connect them with human support
4. Never make up information about features or pricing
5. For account-specific issues, recommend they contact hello@247aiemployees.net
6. If the conversation becomes complex or the user seems frustrated, offer human support

Current conversation context: The user is asking about ${message.toLowerCase().includes("pricing") ? "pricing" : message.toLowerCase().includes("cancel") ? "cancellation" : message.toLowerCase().includes("affiliate") ? "affiliate program" : "general support"}.`

    // Generate AI response
    const result = await streamText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      messages: await convertToModelMessages([
        ...history.slice(-10), // Last 10 messages for context
        { role: "user", content: message }
      ])
    })

    // Get full response text
    let responseText = ""
    for await (const chunk of result.textStream) {
      responseText += chunk
    }

    // Store conversation in database
    await storeConversation(sessionId, message, responseText)

    // Check if AI suggests human support
    const suggestsHuman = responseText.toLowerCase().includes("speak with a human") || 
                          responseText.toLowerCase().includes("human support") ||
                          responseText.toLowerCase().includes("contact our team")

    return NextResponse.json({
      response: responseText,
      needsHuman: suggestsHuman,
      isHuman: false
    })
  } catch (error) {
    console.error("[v0] Support chat error:", error)
    return NextResponse.json({
      response: "I apologize, but I'm having trouble processing your request. Please try again or email us at hello@247aiemployees.net for assistance.",
      needsHuman: false,
      isHuman: false
    })
  }
}

async function storeConversation(sessionId: string, userMessage: string, aiResponse: string) {
  try {
    // Get or create conversation
    let { data: conversation } = await getSupabaseAdmin()
      .from("support_conversations")
      .select("id")
      .eq("session_id", sessionId)
      .single()

    if (!conversation) {
      const { data: newConv } = await getSupabaseAdmin()
        .from("support_conversations")
        .insert({ session_id: sessionId })
        .select("id")
        .single()
      conversation = newConv
    }

    if (conversation) {
      // Store messages
      await getSupabaseAdmin().from("support_messages").insert([
        { conversation_id: conversation.id, role: "user", content: userMessage },
        { conversation_id: conversation.id, role: "assistant", content: aiResponse }
      ])
    }
  } catch (error) {
    console.error("[v0] Error storing conversation:", error)
  }
}

async function notifyAdmin(sessionId: string, message: string) {
  try {
    // Update conversation to needs_human
    await getSupabaseAdmin()
      .from("support_conversations")
      .update({ needs_human: true })
      .eq("session_id", sessionId)

    // In production, send email notification to gvenz33@gmail.com
    console.log("[v0] Human support requested:", {
      to: "gvenz33@gmail.com",
      sessionId,
      lastMessage: message,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[v0] Error notifying admin:", error)
  }
}
