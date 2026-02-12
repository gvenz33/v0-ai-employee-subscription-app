import { Bot, BarChart3, Shield, Zap, Clock, Settings } from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "Specialized AI Agents",
    description: "Each AI employee is trained for specific roles - sales, marketing, support, development, and more.",
  },
  {
    icon: Zap,
    title: "Instant Deployment",
    description: "Hire and deploy AI employees in minutes. No training period required, they start working immediately.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track performance, task completion, and ROI with comprehensive dashboards and reports.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption, SOC 2 compliance, and role-based access controls keep your data safe.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Your AI employees never sleep, take breaks, or call in sick. Continuous productivity around the clock.",
  },
  {
    icon: Settings,
    title: "Custom Configuration",
    description: "Fine-tune each AI employee's behavior, tone, and workflows to match your business processes.",
  },
]

export function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Everything you need to scale with AI
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Our platform provides the tools and infrastructure to manage your AI workforce effectively.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
