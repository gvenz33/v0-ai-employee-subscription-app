import { Bell, FileText, Inbox, LayoutDashboard, Megaphone, Users } from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Leads & follow-up",
    description:
      "Respond to inquiries, draft follow-ups, and keep conversations moving so opportunities do not go cold.",
  },
  {
    icon: Inbox,
    title: "Inbox & admin",
    description:
      "Triage messages, summarize threads, and turn noise into clear next steps—without living in your inbox.",
  },
  {
    icon: Megaphone,
    title: "Content support",
    description:
      "Repurpose what you already made into posts, emails, and updates so you stay visible without a full marketing team.",
  },
  {
    icon: FileText,
    title: "Simple SOPs",
    description:
      "Document how work gets done, tighten handoffs, and make repeat tasks easier for you or a small team.",
  },
  {
    icon: Bell,
    title: "Reminders & nudges",
    description:
      "Stay on top of renewals, callbacks, and follow-through so nothing important depends on memory alone.",
  },
  {
    icon: LayoutDashboard,
    title: "Light reporting",
    description:
      "See what ran, what completed, and where time went—enough to improve the week without a BI project.",
  },
]

export function Features() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            A back office that runs lean
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Self-serve gives you proven templates and workflows to run lean. A custom build is engineered around your
            business—different level of fit and hands-on work. Pick the path that matches how you operate.
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
              <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
