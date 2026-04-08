// Persistent state management using localStorage

const STORAGE_KEY = 'vantageStudyState';

const DEFAULT_STATE = {
  totalXP: 0, streak: 0, lastStudyDate: null,
  studySets: [], notes: [], activeNoteId: null,
  completedQuests: [], cardsMastered: 0, quizScores: [],
  timerSessions: 0, timerTotalMinutes: 0, studyDays: {},
  plansGenerated: 0,
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
