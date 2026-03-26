export interface Plan {
  id: string
  name: string
  description: string
  monthlyPriceInCents: number
  annualPriceInCents: number // 2 months free = 10 months worth
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
    id: "starter",
    name: "Starter",
    description: "Get started with AI employees for basic tasks",
    monthlyPriceInCents: 1900, // $19/month
    annualPriceInCents: 19000, // $190/year (10 months, 2 months free)
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
    monthlyPriceInCents: 4900, // $49/month
    annualPriceInCents: 49000, // $490/year (10 months, 2 months free)
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
    monthlyPriceInCents: 14900, // $149/month
    annualPriceInCents: 149000, // $1490/year (10 months, 2 months free)
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

// For Stripe subscription products - maps plan IDs to billing intervals
export const SUBSCRIPTION_PLANS = PLANS.map(plan => ({
  ...plan,
  priceInCents: plan.monthlyPriceInCents, // Default to monthly for backward compatibility
}))

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id)
}

export function getPriceInCents(planId: string, interval: 'month' | 'year'): number {
  const plan = getPlanById(planId)
  if (!plan) return 0
  return interval === 'year' ? plan.annualPriceInCents : plan.monthlyPriceInCents
}

export function getAnnualSavings(planId: string): number {
  const plan = getPlanById(planId)
  if (!plan) return 0
  const monthlyCostForYear = plan.monthlyPriceInCents * 12
  return monthlyCostForYear - plan.annualPriceInCents
}

export function canAccessEmployee(userTier: string, requiredTier: string): boolean {
  const tierOrder = ["starter", "pro", "enterprise"]
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier)
}

// AI Employee catalog with roles and tier requirements
export const AI_EMPLOYEES = [
  {
    name: "Sales Sage",
    role: "Sales Assistant",
    description: "Automates outreach, qualifies leads, and manages your sales pipeline with precision.",
    tier_required: "starter",
    icon: "TrendingUp",
  },
  {
    name: "Content Creator",
    role: "Content Writer",
    description: "Generates blog posts, social media content, and marketing copy tailored to your brand.",
    tier_required: "starter",
    icon: "PenTool",
  },
  {
    name: "Data Analyst",
    role: "Analytics Expert",
    description: "Processes data, generates reports, and provides actionable business insights.",
    tier_required: "starter",
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

// Alias for backward compatibility
export const AI_EMPLOYEE_CATALOG = AI_EMPLOYEES

// Token packs for users who exceed their monthly limits
export interface TokenPack {
  id: string
  name: string
  description: string
  tasks: number
  priceInCents: number
  savings?: string
  popular?: boolean
}

export const TOKEN_PACKS: TokenPack[] = [
  {
    id: "token-pack-small",
    name: "Boost Pack",
    description: "Perfect for occasional overages",
    tasks: 50,
    priceInCents: 999, // $9.99
  },
  {
    id: "token-pack-medium",
    name: "Power Pack",
    description: "Best value for growing teams",
    tasks: 150,
    priceInCents: 2499, // $24.99
    savings: "Save 17%",
    popular: true,
  },
  {
    id: "token-pack-large",
    name: "Enterprise Pack",
    description: "Maximum tasks for heavy usage",
    tasks: 500,
    priceInCents: 6999, // $69.99
    savings: "Save 30%",
  },
]

export function getTokenPackById(id: string): TokenPack | undefined {
  return TOKEN_PACKS.find((pack) => pack.id === id)
}
