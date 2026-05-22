import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { SupportChatWidget } from "@/components/support-chat-widget"
import { BetaPromoPopup } from "@/components/beta/beta-promo-popup"
import { shouldShowSupportChatWidget } from "@/lib/branded-public"
import { siteDefaultMetadata } from "@/lib/site-metadata"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = siteDefaultMetadata

export const viewport: Viewport = {
  themeColor: "#3b82f6",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const showSupport = await shouldShowSupportChatWidget()

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${_inter.variable} ${_spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <BetaPromoPopup />
          {showSupport ? <SupportChatWidget /> : null}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
