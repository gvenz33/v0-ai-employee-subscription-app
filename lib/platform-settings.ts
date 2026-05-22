export type PlatformSettingsRow = {
  id: number
  support_chat_enabled: boolean
  updated_at: string
}

export const DEFAULT_PLATFORM_SETTINGS: Pick<PlatformSettingsRow, "support_chat_enabled"> = {
  support_chat_enabled: true,
}
