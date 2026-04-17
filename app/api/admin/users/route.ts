import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin, is_admin")
      .eq("id", user.id)
      .single()

    if (!profile?.is_superadmin && !profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email, password, full_name, subscription_tier } = await request.json()

    // Create user with admin client
    const { data: newUser, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Get task limit for tier
    const taskLimits: Record<string, number> = {
      personal: 100,
      entrepreneur: 500,
      business: 2000,
      enterprise: 999999
    }

    // Create profile
    await getSupabaseAdmin().from("profiles").insert({
      id: newUser.user.id,
      email: email,
      full_name,
      subscription_tier,
      tasks_limit: taskLimits[subscription_tier] || 100
    })

    // Create affiliate record
    const referralCode = `REF${newUser.user.id.slice(0, 8).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    
    const commissionRates: Record<string, number> = {
      personal: 10,
      entrepreneur: 12,
      business: 15,
      enterprise: 20
    }

    await getSupabaseAdmin().from("affiliates").insert({
      user_id: newUser.user.id,
      referral_code: referralCode,
      commission_rate: commissionRates[subscription_tier] || 10
    })

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
