import { DateTime } from "luxon"

/** Match JS `Date.getDay()`: 0 = Sunday … 6 = Saturday → Luxon weekday (1 = Mon … 7 = Sun). */
function jsWeekdayToLuxon(js: number): number {
  return js === 0 ? 7 : js
}

export function parseTimeLocalHHMM(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

/**
 * Next UTC instant when the schedule fires, strictly after `strictlyAfter` (interpreted in UTC then converted).
 */
export function computeNextRunAt(input: {
  frequency: "daily" | "weekly"
  timezone: string
  timeLocal: string
  /** 0–6 for weekly (Sunday–Saturday); ignored for daily */
  weekday: number | null
  strictlyAfter: Date
}): Date {
  const { frequency, timezone, timeLocal, weekday, strictlyAfter } = input
  const parts = parseTimeLocalHHMM(timeLocal)
  if (!parts) throw new Error("Invalid time_local (use HH:MM, 24h)")
  const { hour, minute } = parts

  const after = DateTime.fromJSDate(strictlyAfter, { zone: "utc" }).setZone(timezone)
  if (!after.isValid) throw new Error("Invalid timezone")

  if (frequency === "daily") {
    let t = after
    let candidate = t.set({ hour, minute, second: 0, millisecond: 0 })
    if (candidate <= t) candidate = candidate.plus({ days: 1 })
    return candidate.toUTC().toJSDate()
  }

  if (weekday === null || weekday < 0 || weekday > 6) {
    throw new Error("Weekly automations require weekday (0–6, Sunday–Saturday)")
  }
  const wantLuxon = jsWeekdayToLuxon(weekday)
  const startOfDay = after.startOf("day")
  for (let i = 0; i < 21; i++) {
    const candidate = startOfDay.plus({ days: i }).set({ hour, minute, second: 0, millisecond: 0 })
    if (candidate.weekday !== wantLuxon) continue
    if (candidate > after) return candidate.toUTC().toJSDate()
  }
  throw new Error("Could not compute next weekly run")
}
