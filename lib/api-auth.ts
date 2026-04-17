"use server"

import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export interface ApiKeyData {
  id: string
  user_id: string
  name: string
  permissions: {
    chat: boolean
    tasks: boolean
    plan: boolean
    actions: boolean
    status: boolean
  }
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex")
}

// Generate a new API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = "247ai_"
  const randomPart = crypto.randomBytes(32).toString("hex")
  const key = `${prefix}${randomPart}`
  const hash = hashApiKey(key)
  return { key, prefix, hash }
}

// Validate API key from request header
export async function validateApiKey(request: Request): Promise<{
  valid: boolean
  data?: ApiKeyData
  error?: string
}> {
  const authHeader = request.headers.get("Authorization")
  
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" }
  }

  const [type, key] = authHeader.split(" ")
  
  if (type !== "Bearer" || !key) {
    return { valid: false, error: "Invalid Authorization format. Use: Bearer <api_key>" }
  }

  if (!key.startsWith("247ai_")) {
    return { valid: false, error: "Invalid API key format" }
  }

  const keyHash = hashApiKey(key)
  const supabase = await createClient()

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("id, user_id, name, permissions, is_active, expires_at")
    .eq("key_hash", keyHash)
    .single()

  if (error || !apiKey) {
    return { valid: false, error: "Invalid API key" }
  }

  if (!apiKey.is_active) {
    return { valid: false, error: "API key is deactivated" }
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" }
  }

  // Update last used timestamp
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)

  return {
    valid: true,
    data: {
      id: apiKey.id,
      user_id: apiKey.user_id,
      name: apiKey.name,
      permissions: apiKey.permissions,
    },
  }
}

// Log API request
export async function logApiRequest(
  apiKeyId: string | null,
  userId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  request: Request
) {
  const supabase = await createClient()
  
  await supabase.from("api_logs").insert({
    api_key_id: apiKeyId,
    user_id: userId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
    user_agent: request.headers.get("user-agent") || "unknown",
  })
}

// Create API key for a user
export async function createApiKeyForUser(
  userId: string,
  name: string = "Default API Key"
): Promise<{ success: boolean; key?: string; error?: string }> {
  const supabase = await createClient()
  const { key, prefix, hash } = generateApiKey()

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    name,
    key_hash: hash,
    key_prefix: prefix,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, key }
}
