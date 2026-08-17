/** Default feature bundles per subscription plan (platform admin can apply). */
export const PLAN_FEATURE_PRESETS = {
  starter: {
    projects: true,
    boq: false,
    procurement: false,
    site: true,
    finance: false,
    leads: false,
    portfolio: true,
    people: true,
    impact: false,
    inventory: false,
  },
  pro: {
    projects: true,
    boq: true,
    procurement: true,
    site: true,
    finance: true,
    leads: true,
    portfolio: true,
    people: true,
    impact: true,
    inventory: false,
  },
  enterprise: {
    projects: true,
    boq: true,
    procurement: true,
    site: true,
    finance: true,
    leads: true,
    portfolio: true,
    people: true,
    impact: true,
    inventory: true,
  },
}

export const PLAN_SEAT_DEFAULTS = {
  starter: 10,
  pro: 30,
  enterprise: 100,
}
