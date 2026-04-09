// Premium features and subscription management
export const PREMIUM_TIERS = {
  free: {
    name: 'Student',
    price: 0,
    features: [
      'Up to 5 study sets',
      'Basic games',
      '10 XP per correct answer',
      'Standard achievements',
      'Basic analytics',
      'Community support'
    ],
    limits: { studySets: 5, dailyGames: 3, dailyCoachQueries: 2 }
  },
  pro: {
    name: 'Scholar',
    price: 9.99,
    icon: '⭐',
    features: [
      'Unlimited study sets',
      'All game modes',
      '1.5x XP multiplier',
      'Premium achievements',
      'Advanced analytics',
      'Priority AI Coach',
      'Study groups (up to 5)',
      'Weekly challenges'
    ],
    limits: { studySets: 999, dailyGames: 999, dailyCoachQueries: 50 }
  },
  elite: {
    name: 'Master',
    price: 19.99,
    icon: '💎',
    features: [
      'Everything in Scholar',
      '2x XP multiplier',
      'Tournament access',
      'Private study groups',
      'Real-time leaderboards',
      'Custom game settings',
      'Advanced AI insights',
      'Monthly live coaching',
      'Ad-free experience'
    ],
    limits: { studySets: 999, dailyGames: 999, dailyCoachQueries: 200 }
  },
  ultimate: {
    name: 'Vantage Elite',
    price: 29.99,
    icon: '👑',
    features: [
      'Everything in Master',
      '3x XP multiplier',
      'Exclusive beta features',
      'Unlimited coaching',
      'Personal study advisor',
      'Advanced AI tutoring',
      'Group tournament hosting',
      'Revenue share program (content creators)',
      'Custom branding',
      'API access'
    ],
    limits: { studySets: 999, dailyGames: 999, dailyCoachQueries: 999 }
  }
}

export const LEADERBOARD_TYPES = ['global', 'weekly', 'monthly', 'friends', 'tournament']

export const TOURNAMENT_MODES = [
  { id: 'daily_duel', name: 'Daily Duel', duration: '24h', reward: 500 },
  { id: 'weekly_battle', name: 'Weekly Battle', duration: '7d', reward: 2000 },
  { id: 'monthly_championship', name: 'Monthly Championship', duration: '30d', reward: 10000 },
  { id: 'seasonal_clash', name: 'Seasonal Clash', duration: '90d', reward: 50000 },
]

export const SOCIAL_FEATURES = {
  studyGroups: { max: 50, premium: true, description: 'Collaborate with other learners' },
  challenges: { daily: true, weekly: true, community: true },
  messaging: { enabled: true, premium: false },
  streaming: { enabled: true, premium: true, maxMembers: 100 },
  tournaments: { enabled: true, premium: true }
}

export const XP_MULTIPLIERS = {
  free: 1,
  pro: 1.5,
  elite: 2,
  ultimate: 3
}

export const REWARD_TIERS = {
  bronze: { minXP: 0, badge: '🥉', bonus: 1 },
  silver: { minXP: 1000, badge: '🥈', bonus: 1.1 },
  gold: { minXP: 5000, badge: '🥇', bonus: 1.25 },
  platinum: { minXP: 15000, badge: '💠', bonus: 1.5 },
  diamond: { minXP: 50000, badge: '💎', bonus: 2 },
  legendary: { minXP: 100000, badge: '👑', bonus: 3 }
}

// Utility functions for premium features
export function isPremiumActive(state) {
  if (!state) return false
  const tier = state.subscriptionTier
  if (tier === 'free') return false
  if (!state.subscriptionExpiresAt) return true
  return new Date() < new Date(state.subscriptionExpiresAt)
}

export function canAccessFeature(state, requiredTier) {
  const tierLevels = { free: 0, pro: 1, elite: 2, ultimate: 3 }
  const currentLevel = tierLevels[state?.subscriptionTier || 'free']
  const requiredLevel = tierLevels[requiredTier] || 0
  return currentLevel >= requiredLevel
}

export function getDailyLimit(state, limitType) {
  const tier = state?.subscriptionTier || 'free'
  const limits = PREMIUM_TIERS[tier]?.limits || PREMIUM_TIERS.free.limits
  return limits[`daily${limitType.charAt(0).toUpperCase()}${limitType.slice(1)}`] || 3
}

export function getXPMultiplier(state) {
  const tier = state?.subscriptionTier || 'free'
  return XP_MULTIPLIERS[tier] || 1
}
