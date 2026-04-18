import { z } from "zod"

export const scheduledAutomationBodySchema = z
  .object({
    ai_employee_id: z.string().min(1),
    title: z.string().max(200).optional(),
    prompt: z.string().min(10).max(12000),
    timezone: z.string().min(1).max(80),
    time_local: z.string().min(4).max(8),
    frequency: z.enum(["daily", "weekly"]),
    weekday: z.number().int().min(0).max(6).optional().nullable(),
    delivery_email: z.string().email().max(320),
  })
  .refine((d) => d.frequency !== "weekly" || typeof d.weekday === "number", {
    message: "weekday required for weekly",
    path: ["weekday"],
  })
  .refine((d) => d.frequency !== "daily" || d.weekday == null, {
    message: "weekday must be omitted for daily",
    path: ["weekday"],
  })

export type ScheduledAutomationBody = z.infer<typeof scheduledAutomationBodySchema>

export const tierOrder: Record<string, number> = {
  free: 0,
  personal: 1,
  entrepreneur: 2,
  business: 3,
  enterprise: 4,
}
