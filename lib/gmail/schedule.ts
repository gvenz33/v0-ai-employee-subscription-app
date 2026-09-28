import { DateTime } from "luxon"
import { computeNextRunAt, parseTimeLocalHHMM } from "@/lib/compute-next-automation-run"

export type EmmaScanFrequency = "hourly" | "every_2_hours" | "every_4_hours" | "daily"

export function computeNextEmmaScanAt(input: {
  frequency: EmmaScanFrequency
  timezone: string
  timeLocal: string
  strictlyAfter: Date
}): Date {
  if (input.frequency === "daily") {
    return computeNextRunAt({
      frequency: "daily",
      timezone: input.timezone,
      timeLocal: input.timeLocal,
      weekday: null,
      strictlyAfter: input.strictlyAfter,
    })
  }

  const hours =
    input.frequency === "hourly" ? 1 : input.frequency === "every_2_hours" ? 2 : 4

  // Align interval bumps in the user's timezone for clearer local hours
  const after = DateTime.fromJSDate(input.strictlyAfter, { zone: "utc" }).setZone(input.timezone)
  if (!after.isValid) throw new Error("Invalid timezone")
  return after.plus({ hours }).toUTC().toJSDate()
}

export function assertEmmaScheduleInput(input: {
  frequency: string
  timeLocal: string
  timezone: string
  deliveryEmail: string
}): EmmaScanFrequency {
  const allowed: EmmaScanFrequency[] = ["hourly", "every_2_hours", "every_4_hours", "daily"]
  if (!allowed.includes(input.frequency as EmmaScanFrequency)) {
    throw new Error("frequency must be hourly, every_2_hours, every_4_hours, or daily")
  }
  if (!parseTimeLocalHHMM(input.timeLocal)) {
    throw new Error("time_local must be HH:MM (24h)")
  }
  if (!input.timezone.trim()) throw new Error("timezone is required")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.deliveryEmail)) {
    throw new Error("delivery_email must be a valid email")
  }
  return input.frequency as EmmaScanFrequency
}
