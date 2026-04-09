// Persistent state management using localStorage

const STORAGE_KEY = 'vantageStudyState';

const DEFAULT_STATE = {
  // Core XP and progression
  totalXP: 0, streak: 0, lastStudyDate: null,
  studySets: [], notes: [], activeNoteId: null,
  completedQuests: [], cardsMastered: 0, quizScores: [],
  timerSessions: 0, timerTotalMinutes: 0, studyDays: {},
  plansGenerated: 0,
  
  // Premium subscription
  subscriptionTier: 'free', // free, pro, elite, ultimate
  subscriptionExpiresAt: null,
  isPremium: false,
  
  // Leaderboards and rankings
  globalRank: 999999,
  weeklyRank: 999999,
  monthlyRank: 999999,
  friendListRanks: [],
  
  // Tournament participation
  activeTourn: null,
  tournamentWins: 0,
  tournamentScore: 0,
  
  // Social features
  friendsList: [],
  studyGroups: [],
  followers: 0,
  following: 0,
  
  // Game statistics
  gameStats: {
    runner: { wins: 0, bestScore: 0, totalPlayed: 0 },
    shooter: { wins: 0, bestScore: 0, totalPlayed: 0 },
    match: { wins: 0, bestScore: 0, totalPlayed: 0 },
    tower: { wins: 0, bestScore: 0, totalPlayed: 0 },
    sort: { wins: 0, bestScore: 0, totalPlayed: 0 }
  },
  
  // Achievements & badges
  unlockedAchievements: [],
  badges: [],
  rewardTier: 'bronze'
};

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...DEFAULT_STATE, ...saved } : { ...DEFAULT_STATE };
  } catch { return { ...DEFAULT_STATE }; }
}

export function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function getLevel(xp) { return 1 + Math.floor(xp / 500); }
export function getXPInLevel(xp) { return xp % 500; }
export function getXPPercent(xp) { return (getXPInLevel(xp) / 500) * 100; }

const TITLES = ['Novice','Learner','Student','Scholar','Apprentice','Adept','Expert','Master','Sage','Genius','Prodigy','Virtuoso','Legend','Mythic','Transcendent'];
export function getLevelTitle(xp) { return TITLES[Math.min(getLevel(xp) - 1, TITLES.length - 1)]; }

// Premium and subscription utilities
export function isPremiumActive(state) {
  if (!state.subscriptionExpiresAt) return state.subscriptionTier !== 'free'
  return new Date() < new Date(state.subscriptionExpiresAt) && state.subscriptionTier !== 'free'
}

export function canAccessFeature(state, feature) {
  const tier = state.subscriptionTier
  const premiumFeatures = {
    leaderboards: ['pro', 'elite', 'ultimate'],
    tournaments: ['elite', 'ultimate'],
    studyGroups: ['pro', 'elite', 'ultimate'],
    advancedAnalytics: ['pro', 'elite', 'ultimate'],
    aiCoach: ['pro', 'elite', 'ultimate'],
    customGameSettings: ['elite', 'ultimate'],
    adFree: ['elite', 'ultimate'],
  }
  return !premiumFeatures[feature] || premiumFeatures[feature].includes(tier)
}

export function getDailyLimit(state, type) {
  const limitsPerTier = {
    free: { games: 3, coachQueries: 2, setCreations: 1 },
    pro: { games: 999, coachQueries: 50, setCreations: 50 },
    elite: { games: 999, coachQueries: 200, setCreations: 999 },
    ultimate: { games: 999, coachQueries: 999, setCreations: 999 }
  }
  return limitsPerTier[state.subscriptionTier]?.[type] || limitsPerTier['free'][type]
}

export function getXPMultiplier(state) {
  const multipliers = { free: 1, pro: 1.5, elite: 2, ultimate: 3 }
  return multipliers[state.subscriptionTier] || 1
}
