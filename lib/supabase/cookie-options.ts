const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const supabaseCookieOptions = {
  lifetime: ONE_YEAR_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
}
