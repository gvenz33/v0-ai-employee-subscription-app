import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateApiKey, hashApiKey } from "@/lib/api-auth"

// Create a new API key
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name = "API Key" } = body

    const { key, prefix, hash } = generateApiKey()

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name,
      key_hash: hash,
      key_prefix: prefix,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return the full key only once - it cannot be retrieved again
    return NextResponse.json({
      success: true,
      api_key: key,
      name,
      message: "Save this API key securely. It will not be shown again.",
      usage: {
        header: "Authorization: Bearer <your_api_key>",
        example: `curl -H "Authorization: Bearer ${key}" https://247aiemployees.net/api/status`,
      },
    })

  } catch (error) {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}

// List user's API keys (without the actual keys)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, is_active, permissions, last_used_at, expires_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    keys: keys.map(k => ({
      ...k,
      key_preview: `${k.key_prefix}...`,
    })),
  })
}

// Delete an API key
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get("id")

  if (!keyId) {
    return NextResponse.json({ error: "Missing key ID" }, { status: 400 })
  }

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "API key deleted" })
}
