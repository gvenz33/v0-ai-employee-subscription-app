import "server-only"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettingsRow } from "@/lib/platform-settings"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function settingsTable() {
  return (getSupabaseAdmin() as any).from("platform_settings")
}

export async function getPlatformSettings(): Promise<PlatformSettingsRow> {
  const { data, error } = await settingsTable().select("*").eq("id", 1).maybeSingle()

  if (error || !data) {
    return {
      id: 1,
      support_chat_enabled: DEFAULT_PLATFORM_SETTINGS.support_chat_enabled,
      updated_at: new Date().toISOString(),
    }
  }

  return data as PlatformSettingsRow
}

export async function isSupportChatEnabled(): Promise<boolean> {
  const settings = await getPlatformSettings()
  return settings.support_chat_enabled
}
