import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const patchSchema = z.object({
  is_active: z.boolean(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: "Invalid body (is_active boolean required)" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("scheduled_automations")
    .update({
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error || !data) {
    return Response.json({ error: "Automation not found" }, { status: 404 })
  }

  return Response.json({ automation: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("scheduled_automations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
