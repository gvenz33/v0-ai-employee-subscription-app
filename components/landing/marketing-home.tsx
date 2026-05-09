import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { StarterUseCases } from "@/components/landing/starter-use-cases"
import { AgentsShowcase } from "@/components/landing/agents-showcase"
import { Pricing } from "@/components/landing/pricing"
import { FAQ } from "@/components/landing/faq"
import { Footer } from "@/components/landing/footer"

export function MarketingHome() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <StarterUseCases />
        <AgentsShowcase />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
