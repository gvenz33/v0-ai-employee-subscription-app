export interface Plan {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: "month"
  features: string[]
  limits: {
    aiEmployees: number
    tasksPerMonth: number
    support: string
  }
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter",
    description: "Get started with AI employees for basic tasks",
    priceInCents: 0,
    interval: "month",
    features: [
      "3 AI Employees",
      "50 tasks per month",
      "Basic analytics",
      "Email support",
      "Standard response time",
    ],
    limits: {
      aiEmployees: 3,
      tasksPerMonth: 50,
      support: "email",
    },
  },
  {
    id: "pro",
    name: "Professional",
    description: "Scale your business with advanced AI capabilities",
    priceInCents: 4900,
    interval: "month",
    popular: true,
    features: [
      "10 AI Employees",
      "500 tasks per month",
      "Advanced analytics",
      "Priority support",
      "Custom AI training",
      "API access",
      "Team collaboration",
    ],
    limits: {
      aiEmployees: 10,
      tasksPerMonth: 500,
      support: "priority",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited access for maximum productivity",
    priceInCents: 14900,
    interval: "month",
    features: [
      "Unlimited AI Employees",
      "Unlimited tasks",
      "Real-time analytics",
      "24/7 dedicated support",
      "Custom AI model training",
      "Full API access",
      "SSO & advanced security",
      "Dedicated account manager",
      "White-label options",
    ],
    limits: {
      aiEmployees: 999,
      tasksPerMonth: 999999,
      support: "dedicated",
    },
  },
]

export const AI_EMPLOYEE_CATALOG = [
  {
    name: "Sales Sage",
    role: "Sales Assistant",
    description: "Automates outreach, qualifies leads, and manages your sales pipeline with precision.",
    tier_required: "free",
    icon: "TrendingUp",
  },
  {
    name: "Content Creator",
    role: "Content Writer",
    description: "Generates blog posts, social media content, and marketing copy tailored to your brand.",
    tier_required: "free",
    icon: "PenTool",
  },
  {
    name: "Data Analyst",
    role: "Analytics Expert",
    description: "Processes data, generates reports, and provides actionable business insights.",
    tier_required: "free",
    icon: "BarChart3",
  },
  {
    name: "Customer Champion",
    role: "Support Agent",
    description: "Handles customer inquiries, resolves tickets, and maintains satisfaction scores.",
    tier_required: "pro",
    icon: "Headphones",
  },
  {
    name: "SEO Strategist",
    role: "SEO Specialist",
    description: "Optimizes content for search engines, tracks rankings, and builds backlink strategies.",
    tier_required: "pro",
    icon: "Search",
  },
  {
    name: "Social Media Manager",
    role: "Social Media Expert",
    description: "Schedules posts, engages with audiences, and analyzes social performance metrics.",
    tier_required: "pro",
    icon: "Share2",
  },
  {
    name: "Email Marketer",
    role: "Email Specialist",
    description: "Crafts email campaigns, segments audiences, and optimizes open and click-through rates.",
    tier_required: "pro",
    icon: "Mail",
  },
  {
    name: "Code Assistant",
    role: "Developer Aid",
    description: "Reviews code, generates documentation, and helps debug complex technical issues.",
    tier_required: "enterprise",
    icon: "Code",
  },
  {
    name: "Finance Analyst",
    role: "Financial Advisor",
    description: "Tracks expenses, forecasts revenue, and generates comprehensive financial reports.",
    tier_required: "enterprise",
    icon: "DollarSign",
  },
  {
    name: "HR Manager",
    role: "Human Resources",
    description: "Screens resumes, schedules interviews, and manages employee onboarding workflows.",
    tier_required: "enterprise",
    icon: "Users",
  },
  {
    name: "Project Coordinator",
    role: "Project Manager",
    description: "Organizes tasks, tracks deadlines, and ensures seamless cross-team collaboration.",
    tier_required: "enterprise",
    icon: "Clipboard",
  },
  {
    name: "Legal Advisor",
    role: "Legal Assistant",
    description: "Reviews contracts, ensures compliance, and provides regulatory guidance for your business.",
    tier_required: "enterprise",
    icon: "Shield",
  },
]

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id)
}

export function canAccessEmployee(userTier: string, requiredTier: string): boolean {
  const tierOrder = ["free", "pro", "enterprise"]
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier)
}
