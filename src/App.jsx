import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { loadState, saveState, getLevel, getXPInLevel, getXPPercent, getLevelTitle } from './lib/store'
import { generateWithAI, setApiKey, getStoredKey, hasAI } from './lib/ai'

const Scene3D = lazy(() => import('./components/Scene3D'))

/* ============================================
   UI UTILS & HELPERS
   ============================================ */
const genId = () => Math.random().toString(36).substring(2, 9)
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const speak = (text) => {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const msg = new SpeechSynthesisUtterance(text)
  msg.rate = 0.95
  msg.pitch = 1
  window.speechSynthesis.speak(msg)
}

/* ============================================
   ANIMATED ICON COMPONENTS
   ============================================ */
const Lightning = ({ size = '1em' }) => <span className="icon-lightning" style={{ fontSize: size }}>⚡</span>
const Fire = ({ size = '1em' }) => <span className="icon-fire" style={{ fontSize: size }}>🔥</span>
const Spin = ({ children }) => <span className="icon-spin">{children}</span>
const Bounce = ({ children }) => <span className="icon-bounce">{children}</span>
const GlowAccent = ({ children }) => <span className="icon-glow-accent">{children}</span>
const GlowEmerald = ({ children }) => <span className="icon-glow-emerald">{children}</span>
const GlowPink = ({ children }) => <span className="icon-glow-pink">{children}</span>
const Float = ({ children }) => <span className="icon-float">{children}</span>

const VIEW_TITLES = {
  dashboard: <><GlowAccent>📊</GlowAccent> Dashboard</>,
  upload: <><Float>📁</Float> Study Hub</>,
  study: <><Float>📚</Float> Study Set</>,
  coach: <><Spin>🤖</Spin> AI Study Coach</>,
  timer: <><GlowPink>⏱️</GlowPink> Focus Timer</>,
  notes: <><Bounce>📝</Bounce> Notes</>,
  whiteboard: <><GlowAccent>🎨</GlowAccent> Whiteboard</>,
  achievements: <><Float>🏆</Float> Achievements</>,
  quests: <><Lightning size="1.1em" /> Daily Quests</>,
  stats: <><GlowEmerald>📈</GlowEmerald> Statistics</>,
  settings: <><Spin>⚙️</Spin> Settings</>,
}

const ACHIEVEMENTS = [
  { id: 'first_upload', name: 'First Upload', desc: 'Upload your first study material.', icon: '📄', check: (s) => s.studySets.length >= 1 },
  { id: 'five_sets', name: 'Collector', desc: 'Create 5 study sets.', icon: '📚', check: (s) => s.studySets.length >= 5 },
  { id: 'card_master_10', name: 'Card Master', desc: 'Master 10 flashcards.', icon: '🃏', check: (s) => s.cardsMastered >= 10 },
  { id: 'card_master_50', name: 'Flash Scholar', desc: 'Master 50 flashcards.', icon: '⚡', check: (s) => s.cardsMastered >= 50 },
  { id: 'quiz_ace', name: 'Quiz Ace', desc: 'Score 100% on a quiz.', icon: '💯', check: (s) => s.quizScores.some(x => x === 100) },
  { id: 'quiz_10', name: 'Quiz Warrior', desc: 'Complete 10 quizzes.', icon: '📝', check: (s) => s.quizScores.length >= 10 },
  { id: 'level_3', name: 'Scholar', desc: 'Reach Level 3.', icon: '📈', check: (s) => getLevel(s.totalXP) >= 3 },
  { id: 'level_5', name: 'Expert', desc: 'Reach Level 5.', icon: '🎖️', check: (s) => getLevel(s.totalXP) >= 5 },
  { id: 'level_10', name: 'Sage', desc: 'Reach Level 10.', icon: '🧙', check: (s) => getLevel(s.totalXP) >= 10 },
  { id: 'xp_500', name: 'XP Hoarder', desc: 'Earn 500 XP.', icon: '💰', check: (s) => s.totalXP >= 500 },
  { id: 'xp_2000', name: 'XP Legend', desc: 'Earn 2000 XP.', icon: '💎', check: (s) => s.totalXP >= 2000 },
  { id: 'streak_3', name: 'On Fire', desc: '3-day study streak.', icon: '🔥', check: (s) => s.streak >= 3 },
  { id: 'streak_7', name: 'Dedicated', desc: '7-day study streak.', icon: '⚡', check: (s) => s.streak >= 7 },
  { id: 'timer_5', name: 'Focused', desc: 'Complete 5 focus sessions.', icon: '⏱️', check: (s) => s.timerSessions >= 5 },
  { id: 'coach_chat', name: "Coach's Pet", desc: 'Get advice from AI Coach.', icon: '🤖', check: (s) => s.plansGenerated >= 1 },
  { id: 'note_taker', name: 'Scribe', desc: 'Write a study note.', icon: '✍️', check: (s) => s.notes.some(n => (n.body || '').length > 20) },
]

const QUESTS = [
  { id: 'q1', title: 'Daily Reviewer', desc: 'Review flashcards today.', icon: '🃏', xp: 30, check: (s) => s.cardsMastered > 0 },
  { id: 'q2', title: 'Quiz Champion', desc: 'Score at least 70% on a quiz.', icon: '📝', xp: 50, check: (s) => s.quizScores.some(x => x >= 70) },
  { id: 'q3', title: 'Focus Master', desc: 'Complete a focus session.', icon: '⏱️', xp: 40, check: (s) => s.timerSessions > 0 },
  { id: 'q4', title: 'Upload Hero', desc: 'Upload a new study set.', icon: '📄', xp: 30, check: (s) => s.studySets.length > 0 },
  { id: 'q5', title: 'Note Taker', desc: 'Write 50+ words in a note.', icon: '📝', xp: 25, check: (s) => s.notes.some(n => (n.body || '').split(/\s+/).length >= 50) },
  { id: 'q6', title: 'AI Explorer', desc: 'Ask the AI Coach a question.', icon: '🤖', xp: 20, check: (s) => s.plansGenerated > 0 },
  { id: 'q7', title: 'Streak Builder', desc: 'Maintain a 2-day streak.', icon: '🔥', xp: 35, check: (s) => s.streak >= 2 },
  { id: 'q8', title: 'Master Learner', desc: 'Reach Level 2.', icon: '⭐', xp: 100, check: (s) => getLevel(s.totalXP) >= 2 },
]

/* ============================================
   MAIN APP
   ============================================ */
export default function App() {
  const [state, setState] = useState(loadState)
  const [view, setView] = useState('dashboard')
  const [activeSetId, setActiveSetId] = useState(null)
  const [studyMode, setStudyMode] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const [theme, setTheme] = useState(localStorage.getItem('vs_theme') || 'dark')
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('vs_motion') === 'true')
  const [visualState, setVisualState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vs_visuals')) || { fontSize: 'normal', dyslexic: false, color: 'indigo' } }
    catch { return { fontSize: 'normal', dyslexic: false, color: 'indigo' } }
  })
  const [zenMode, setZenMode] = useState(false)

  const lastLevelRef = useRef(getLevel(state.totalXP))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vs_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion)
    localStorage.setItem('vs_motion', reduceMotion)
  }, [reduceMotion])

  useEffect(() => {
    localStorage.setItem('vs_visuals', JSON.stringify(visualState))
    document.documentElement.setAttribute('data-fontsize', visualState.fontSize)
    document.documentElement.setAttribute('data-dyslexic', visualState.dyslexic)
    document.documentElement.setAttribute('data-color', visualState.color)
  }, [visualState])

  useEffect(() => {
    document.documentElement.setAttribute('data-zen', zenMode)
  }, [zenMode])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const save = useCallback((newState) => { saveState(newState); setState(newState); }, [])

  const addXP = useCallback((amount) => {
    setState(prev => {
      const next = { ...prev, totalXP: prev.totalXP + amount }
      saveState(next)
      const newLevel = getLevel(next.totalXP)
      if (newLevel > lastLevelRef.current) {
        lastLevelRef.current = newLevel
        setTimeout(() => { setShowLevelUp(true); fireConfetti() }, 300)
      }
      const popup = document.createElement('div')
      popup.className = 'xp-popup'
      popup.textContent = `+${amount} XP`
      popup.style.left = `${window.innerWidth / 2}px`
      popup.style.top = `${window.innerHeight / 2}px`
      document.body.appendChild(popup)
      setTimeout(() => popup.remove(), 1400)
      return next
    })
  }, [])

  const updateStreak = useCallback(() => {
    setState(prev => {
      const today = new Date().toISOString().split('T')[0]
      if (prev.lastStudyDate === today) return prev
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      let newStreak = prev.streak
      if (prev.lastStudyDate === yesterday) newStreak++
      else if (prev.lastStudyDate !== today) newStreak = 1
      const next = { ...prev, streak: newStreak, lastStudyDate: today, studyDays: { ...prev.studyDays, [today]: (prev.studyDays[today] || 0) + 1 } }
      saveState(next); return next
    })
  }, [])

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 }, colors: ['#6366f1','#a78bfa','#10b981','#ec4899','#22d3ee','#f59e0b'] })
  }

  const switchView = useCallback((v) => { setView(v); setStudyMode(null); setSidebarOpen(false) }, [])

  /* ============ FILE UPLOAD ============ */
  const handleFiles = async (files) => {
    if (!files.length) return
    setUploadProgress({ pct: 5, text: `Preparing ${files.length} file(s)...` })
    let combinedText = '', names = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress({ pct: 10 + (i / files.length) * 40, text: `📄 Parsing ${file.name}...` })
      let text = ''
      try {
        if (file.name.endsWith('.pdf')) { text = await extractPDF(file) }
        else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) { text = await extractDOCX(file) }
        else { text = await file.text() }
      } catch (e) { console.error(e) }
      if (text && text.trim().length >= 20) {
        combinedText += text + '\n\n'
        names.push(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '))
      }
    }
    if (!combinedText || combinedText.trim().length < 20) {
      setUploadProgress({ pct: 100, text: '⚠️ Files too short or empty.' })
      setTimeout(() => setUploadProgress(null), 2500); return
    }
    setUploadProgress({ pct: 60, text: hasAI() ? '🧠 Gemini AI is analyzing your content...' : '⚙️ Generating study materials...' })
    try {
      const generated = await generateWithAI(combinedText)
      const setName = names.length > 1 ? names[0] + ' & ' + (names.length - 1) + ' more' : (names[0] || 'Study Set')
      const studySet = {
        id: genId(), name: setName,
        description: combinedText.substring(0, 150).trim() + '...',
        rawText: combinedText,
        flashcards: generated.flashcards, quizQuestions: generated.quizQuestions,
        lessons: generated.lessons, aiGenerated: generated.aiGenerated,
        createdAt: new Date().toISOString(), progress: 0,
      }
      setState(prev => { const next = { ...prev, studySets: [studySet, ...prev.studySets] }; saveState(next); return next })
      updateStreak(); addXP(50)
      setUploadProgress({ pct: 100, text: `✅ Created "${setName}" — ${generated.flashcards.length} cards, ${generated.quizQuestions.length} questions, ${generated.lessons.length} lessons!` })
    } catch (e) { console.error(e); setUploadProgress({ pct: 100, text: '❌ Error generating.' }) }
    setTimeout(() => setUploadProgress(null), 3500)
  }

  async function extractPDF(file) {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    const ab = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(it => it.str).join(' ') + '\n\n'
    }
    return text
  }
  async function extractDOCX(file) {
    const mammoth = await import('mammoth')
    const ab = await file.arrayBuffer()
    return (await mammoth.extractRawText({ arrayBuffer: ab })).value
  }

  /* ============ SIDEBAR NAV ============ */
  const navItems = [
    { label: 'Main', items: [
      { view: 'dashboard', icon: <GlowAccent>📊</GlowAccent>, text: 'Dashboard' },
      { view: 'upload', icon: <Float>📁</Float>, text: 'Study Hub', badge: state.studySets.length },
      { view: 'coach', icon: <Spin>🤖</Spin>, text: 'AI Coach' },
    ]},
    { label: 'Tools', items: [
      { view: 'timer', icon: <GlowPink>⏱️</GlowPink>, text: 'Focus Timer' },
      { view: 'notes', icon: <Bounce>📝</Bounce>, text: 'Notes' },
      { view: 'whiteboard', icon: <GlowAccent>🎨</GlowAccent>, text: 'Whiteboard' },
    ]},
    { label: 'Progress', items: [
      { view: 'achievements', icon: <Float>🏆</Float>, text: 'Achievements' },
      { view: 'quests', icon: <Lightning />, text: 'Daily Quests' },
      { view: 'stats', icon: <GlowEmerald>📈</GlowEmerald>, text: 'Statistics' },
      { view: 'upgrade', icon: <Float>💎</Float>, text: 'Vantage Pro' },
    ]},
  ]

  return (
    <>
      {!reduceMotion && <Suspense fallback={null}><Scene3D /></Suspense>}

      {showLevelUp && (
        <div className="modal-overlay" onClick={() => setShowLevelUp(false)}>
          <motion.div className="modal" initial={{ scale: 0.5 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}><Lightning size="3.5rem" /></div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>Level {getLevel(state.totalXP)}!</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 18, fontSize: '1rem' }}>You're now a <strong style={{ color: 'var(--accent-2)' }}>{getLevelTitle(state.totalXP)}</strong>!</div>
            <button className="btn primary" onClick={() => setShowLevelUp(false)}>Keep Studying! <Lightning /></button>
          </motion.div>
        </div>
      )}

      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand" onClick={() => switchView('dashboard')}>
            <div className="sidebar-logo">VS</div>
            <div><div className="sidebar-brand-name">VantageStudy</div><div className="sidebar-brand-sub">By Vantage Suites</div></div>
          </div>
          <div className="sidebar-xp">
            <div className="sidebar-xp-header">
              <span className="sidebar-xp-level"><Lightning size="0.9em" /> Lvl {getLevel(state.totalXP)} — {getLevelTitle(state.totalXP)}</span>
              <span className="sidebar-xp-amount">{getXPInLevel(state.totalXP)} / 500</span>
            </div>
            <div className="sidebar-xp-track"><div className="sidebar-xp-fill" style={{ width: `${getXPPercent(state.totalXP)}%` }} /></div>
            <div className="sidebar-streak"><Fire size="0.95em" /> <span style={{ color: 'var(--amber)' }}>{state.streak} day streak</span></div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(group => (
              <div key={group.label}>
                <div className="sidebar-nav-label">{group.label}</div>
                {group.items.map(item => (
                  <button key={item.view} className={`sidebar-link ${view === item.view ? 'active' : ''}`} onClick={() => switchView(item.view)}>
                    <span className="link-icon">{item.icon}</span>
                    <span className="link-text">{item.text}</span>
                    {item.badge !== undefined && <span className="link-badge">{item.badge}</span>}
                  </button>
                ))}
              </div>
            ))}
            <div className="sidebar-nav-label">Config</div>
            <button className="sidebar-link" onClick={() => setShowSettings(true)}>
              <span className="link-icon"><Spin>⚙️</Spin></span>
              <span className="link-text">AI Settings</span>
              {hasAI() && <span className="link-badge" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--emerald)' }}>✓ AI</span>}
            </button>
          </nav>
          <AmbientAudio />
          <div className="sidebar-footer">Made with ❤️ by Vantage Suites · 2026</div>
        </aside>

        <main className="main-content">
          <div className="topbar">
            <div className="topbar-title">{VIEW_TITLES[view] || ''}</div>
            <div className="topbar-right">
              <button className="theme-toggle-btn" onClick={() => setZenMode(true)} title="Zen Mode" style={{ border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <Float>🧘</Float>
              </button>
              <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <div className="topbar-stat"><Lightning size="0.9em" /> <span className="sv">{state.totalXP.toLocaleString()}</span> XP</div>
              <div className="topbar-stat"><Fire size="0.9em" /> <span className="sv">{state.streak}</span></div>
            </div>
          </div>
          <div className="page-content">
            <AnimatePresence mode="wait">
              <motion.div key={view + (activeSetId || '') + (studyMode || '')} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}>
                {view === 'dashboard' && <DashboardView state={state} switchView={switchView} openSet={id => { setActiveSetId(id); switchView('study') }} />}
                {view === 'upload' && <UploadView state={state} setState={setState} save={save} handleFiles={handleFiles} uploadProgress={uploadProgress} searchFilter={searchFilter} setSearchFilter={setSearchFilter} openSet={id => { setActiveSetId(id); switchView('study') }} setShowPaste={setShowPaste} />}
                {view === 'study' && <StudyView state={state} setState={setState} save={save} activeSetId={activeSetId} studyMode={studyMode} setStudyMode={setStudyMode} addXP={addXP} switchView={switchView} updateStreak={updateStreak} fireConfetti={fireConfetti} />}
                {view === 'coach' && <CoachView state={state} setState={setState} save={save} addXP={addXP} />}
                {view === 'timer' && <TimerView state={state} setState={setState} save={save} addXP={addXP} updateStreak={updateStreak} fireConfetti={fireConfetti} />}
                {view === 'notes' && <NotesView state={state} setState={setState} save={save} />}
                {view === 'whiteboard' && <WhiteboardView />}
                {view === 'achievements' && <AchievementsView state={state} />}
                {view === 'quests' && <QuestsView state={state} />}
                {view === 'stats' && <StatsView state={state} />}
                {view === 'upgrade' && <UpgradeView switchView={switchView} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {showPaste && <PasteModal state={state} setState={setState} save={save} onClose={() => setShowPaste(false)} addXP={addXP} updateStreak={updateStreak} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} theme={theme} setTheme={setTheme} reduceMotion={reduceMotion} setReduceMotion={setReduceMotion} visualState={visualState} setVisualState={setVisualState} />}
      
      {zenMode && <button className="zen-exit-btn" onClick={() => setZenMode(false)}>Exit Zen Mode</button>}
    </>
  )
}

/* ============================================
   DASHBOARD
   ============================================ */
function DashboardView({ state, switchView, openSet }) {
  const avg = state.quizScores.length > 0 ? Math.round(state.quizScores.reduce((a, b) => a + b, 0) / state.quizScores.length) : 0
  const today = new Date()
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (34 - i))
    const key = d.toISOString().split('T')[0]
    return { key, count: state.studyDays[key] || 0, isToday: i === 34 }
  })

  const cards = [
    { icon: <Lightning size="1.7rem" />, val: state.totalXP.toLocaleString(), label: 'Total XP' },
    { icon: <Float>📚</Float>, val: state.studySets.length, label: 'Study Sets' },
    { icon: <GlowAccent>🃏</GlowAccent>, val: state.cardsMastered, label: 'Cards Mastered' },
    { icon: <GlowEmerald>🎯</GlowEmerald>, val: avg + '%', label: 'Quiz Average' },
  ]

  return (
    <>
      <div className="dash-grid">
        {cards.map((c, i) => (
          <motion.div key={i} className="glass-card dash-card" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 200, damping: 20 }}>
            <div className="dash-card-icon">{c.icon}</div>
            <div className="dash-card-value">{c.val}</div>
            <div className="dash-card-label">{c.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="dash-row">
        <motion.div className="glass-card" style={{ padding: 20 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Fire /> Study Activity</h3>
          <div className="streak-grid">
            {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="streak-day-label">{d}</div>)}
            {days.map((d, i) => <div key={i} className={`streak-cell ${d.count >= 4 ? 'l4' : d.count >= 3 ? 'l3' : d.count >= 2 ? 'l2' : d.count >= 1 ? 'l1' : ''} ${d.isToday ? 'today' : ''}`} title={`${d.key}: ${d.count} activities`} />)}
          </div>
        </motion.div>
        <motion.div className="glass-card" style={{ padding: 20 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Lightning /> Quick Actions</h3>
          {[
            [<Float>📁</Float>, 'Upload Materials', 'upload'],
            [<Spin>🤖</Spin>, 'Ask AI Coach', 'coach'],
            [<GlowPink>⏱️</GlowPink>, 'Focus Session', 'timer'],
            [<Lightning />, 'Daily Quests', 'quests']
          ].map(([icon, text, v], i) => (
            <button key={i} className="quick-btn" onClick={() => switchView(v)}><span>{icon}</span> {text}</button>
          ))}
        </motion.div>
      </div>
      <motion.div className="glass-card" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><GlowAccent>📚</GlowAccent> Recent Study Sets</h3>
        {state.studySets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 8, opacity: 0.5 }}><Float>📚</Float></div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}>No study sets yet</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 14 }}>Upload materials to get started!</div>
            <button className="btn primary" onClick={() => switchView('upload')}><Float>📁</Float> Go to Study Hub</button>
          </div>
        ) : state.studySets.slice(0, 5).map((set, i) => (
          <motion.div key={set.id} className="recent-set-item" onClick={() => openSet(set.id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}>
            <div className="recent-set-icon"><GlowAccent>📚</GlowAccent></div>
            <div className="recent-set-info">
              <div className="recent-set-name">{set.name}{set.aiGenerated && <span className="ai-badge">🧠 AI</span>}</div>
              <div className="recent-set-meta">{set.flashcards.length} cards · {set.quizQuestions.length} questions · {(set.lessons || []).length} lessons</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </>
  )
}

/* ============================================
   UPLOAD / STUDY HUB
   ============================================ */
function UploadView({ state, handleFiles, uploadProgress, searchFilter, setSearchFilter, openSet, setState, save, setShowPaste }) {
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const deleteSet = (id) => {
    if (!confirm('Delete this study set?')) return
    save({ ...state, studySets: state.studySets.filter(s => s.id !== id) })
  }
  const filtered = state.studySets.filter(s => s.name.toLowerCase().includes(searchFilter.toLowerCase()))

  return (
    <>
      <div className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
      >
        <div className="upload-zone-icon"><Float>📄</Float></div>
        <div className="upload-zone-title">Drop your study materials here</div>
        <div className="upload-zone-desc">Upload multiple files to create one {hasAI() ? 'AI-powered' : ''} study set</div>
        <div className="format-tags">
          {['PDF', 'DOCX', 'TXT'].map(f => <span key={f} className="format-tag">{f}</span>)}
          {hasAI() && <span className="format-tag" style={{ background: 'rgba(16,185,129,0.06)', color: 'var(--emerald)', borderColor: 'rgba(16,185,129,0.15)' }}>🧠 Gemini AI</span>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        {uploadProgress && (
          <div className="progress-bar show">
            <div className="progress-track"><div className="progress-fill" style={{ width: `${uploadProgress.pct}%` }} /></div>
            <div className="progress-text">{uploadProgress.text}</div>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <button className="btn primary" onClick={() => setShowPaste(true)}>📋 Or Paste Your Notes</button>
      </div>
      <div className="sets-header">
        <h2><GlowAccent>📚</GlowAccent> Your Study Sets</h2>
        <input className="sets-search" placeholder="🔍 Search sets..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
      </div>
      <div className="sets-grid">
        {filtered.map((set, i) => (
          <motion.div key={set.id} className="glass-card set-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 20 }} onClick={() => openSet(set.id)}>
            <div className="set-card-header">
              <div className="set-card-icon"><GlowAccent>📚</GlowAccent></div>
              <button className="set-del-btn" onClick={e => { e.stopPropagation(); deleteSet(set.id) }}>🗑</button>
            </div>
            <div className="set-card-title">{set.name}{set.aiGenerated && <span className="ai-badge">🧠 AI</span>}</div>
            <div className="set-card-desc">{set.description || ''}</div>
            <div className="set-card-stats">
              <span className="set-stat">🃏 <span className="set-stat-num">{set.flashcards.length}</span></span>
              <span className="set-stat">📝 <span className="set-stat-num">{set.quizQuestions.length}</span></span>
              <span className="set-stat">📖 <span className="set-stat-num">{(set.lessons || []).length}</span></span>
            </div>
          </motion.div>
        ))}
      </div>
      {filtered.length === 0 && (
        <motion.div style={{ textAlign: 'center', padding: 48 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12, opacity: 0.3 }}><Float>📚</Float></div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dim)' }}>No study sets yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 4 }}>Upload materials or paste your notes!</div>
        </motion.div>
      )}
    </>
  )
}

/* ============================================
   STUDY VIEW
   ============================================ */
function StudyView({ state, setState, save, activeSetId, studyMode, setStudyMode, addXP, switchView, updateStreak, fireConfetti }) {
  const set = state.studySets.find(s => s.id === activeSetId)
  if (!set) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}>Study set not found.</div>

  const modes = [
    { id: 'flashcards', icon: '🃏', name: 'Flashcards', desc: 'Classic flip cards with spaced repetition' },
    { id: 'write', icon: '✍️', name: 'Write Mode', desc: 'Test your recall by typing answers' },
    { id: 'quiz', icon: '📝', name: 'Practice Test', desc: 'MCQ quiz with scratchpad whiteboard' },
    { id: 'match', icon: '🧩', name: 'Match', desc: 'Match terms with definitions' },
    { id: 'lessons', icon: '📖', name: 'Lessons', desc: 'Khan Academy-style chapters' },
    { id: 'cram', icon: '🧠', name: 'Cram Mode', desc: 'Rapid-fire last-minute review' },
  ]

  return (
    <>
      <div className="study-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="study-back-btn" onClick={() => switchView('upload')}>←</button>
          <div>
            <div className="study-header-title">{set.name}{set.aiGenerated && <span className="ai-badge" style={{ marginLeft: 10 }}>🧠 AI Generated</span>}</div>
            <div className="study-header-meta">{set.flashcards.length} cards · {set.quizQuestions.length} questions · {(set.lessons || []).length} lessons · {fmtDate(set.createdAt)}</div>
          </div>
        </div>
        <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => {
          const data = JSON.stringify(set, null, 2)
          const blob = new Blob([data], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${set.name.replace(/\s+/g, '_')}_export.json`
          a.click()
          URL.revokeObjectURL(url)
        }}><Float>💾</Float> Export JSON</button>
      </div>
      {!studyMode && (
        <div className="study-modes">
          {modes.map((m, i) => (
            <motion.div key={m.id} className="glass-card mode-card" initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }} onClick={() => { setStudyMode(m.id); updateStreak() }}>
              <div className="mode-icon"><Float>{m.icon}</Float></div>
              <div className="mode-name">{m.name}</div>
              <div className="mode-desc">{m.desc}</div>
            </motion.div>
          ))}
        </div>
      )}
      {studyMode === 'flashcards' && <FlashcardPlayer set={set} state={state} setState={setState} save={save} addXP={addXP} onBack={() => setStudyMode(null)} />}
      {studyMode === 'write' && <WriteMode set={set} addXP={addXP} onBack={() => setStudyMode(null)} fireConfetti={fireConfetti} />}
      {studyMode === 'quiz' && <QuizPlayer set={set} state={state} setState={setState} save={save} addXP={addXP} onBack={() => setStudyMode(null)} fireConfetti={fireConfetti} />}
      {studyMode === 'match' && <MatchMode set={set} addXP={addXP} onBack={() => setStudyMode(null)} fireConfetti={fireConfetti} />}
      {studyMode === 'lessons' && <LessonPlayer set={set} addXP={addXP} onBack={() => setStudyMode(null)} updateStreak={updateStreak} fireConfetti={fireConfetti} />}
      {studyMode === 'cram' && <CramMode set={set} addXP={addXP} onBack={() => setStudyMode(null)} />}
    </>
  )
}

/* ============================================
   FLASHCARD PLAYER
   ============================================ */
function FlashcardPlayer({ set, state, setState, save, addXP, onBack }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cards = set.flashcards
  const card = cards[index]

  const rate = (quality) => {
    if (quality >= 4) setState(prev => { const n = { ...prev, cardsMastered: prev.cardsMastered + 1 }; saveState(n); return n })
    addXP(quality >= 4 ? 10 : 5)
    setFlipped(false); setTimeout(() => setIndex(i => i + 1), 250)
  }

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' && !flipped) { e.preventDefault(); setFlipped(true) }
      else if (flipped) {
        if (e.key === '1') rate(1)
        else if (e.key === '2') rate(3)
        else if (e.key === '3') rate(5)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, index])

  if (!card) return (
    <motion.div className="glass-card results-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <div className="results-icon">🎉</div><div className="results-score">Done!</div>
      <div className="results-label">Reviewed all {cards.length} cards</div>
      <button className="btn primary" onClick={onBack}>Back to Set</button>
    </motion.div>
  )

  return (
    <div className="fc-player">
      <div className="fc-progress">
        <span className="fc-progress-text">{index + 1} / {cards.length}</span>
        <div className="fc-progress-track"><div className="fc-progress-fill" style={{ width: `${((index + 1) / cards.length) * 100}%` }} /></div>
      </div>
      <div className="fc-container" onClick={() => !flipped && setFlipped(true)}>
        <motion.div className={`flashcard ${flipped ? 'flipped' : ''}`} key={index} initial={{ opacity: 0, rotateY: -15 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ duration: 0.4 }}>
          <div className="fc-face fc-front">
            <div className="fc-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span><Lightning size="0.8em" /> Question</span>
              <button className="tts-btn" onClick={(e) => { e.stopPropagation(); speak(card.front) }} title="Read Aloud">🔊</button>
            </div>
            <div className="fc-text">{card.front}</div>
            <div className="fc-hint">Click or Space to reveal ✨</div>
          </div>
          <div className="fc-face fc-back">
            <div className="fc-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span><GlowEmerald>✓</GlowEmerald> Answer</span>
              <button className="tts-btn" onClick={(e) => { e.stopPropagation(); speak(card.back) }} title="Read Aloud">🔊</button>
            </div>
            <div className="fc-text">{card.back}</div>
            <div className="fc-hint" style={{ opacity: 0.6, fontSize: '0.7rem' }}>Press 1, 2, or 3 to rate</div>
          </div>
        </motion.div>
      </div>
      {flipped && (
        <motion.div className="fc-controls" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button className="btn hard" onClick={() => rate(1)}>😰 Hard</button>
          <button className="btn good" onClick={() => rate(3)}>👍 Good</button>
          <button className="btn easy" onClick={() => rate(5)}><Fire /> Easy</button>
        </motion.div>
      )}
    </div>
  )
}

/* ============================================
   WRITE MODE
   ============================================ */
function WriteMode({ set, addXP, onBack, fireConfetti }) {
  const [cards] = useState(() => [...set.flashcards].sort(() => Math.random() - 0.5).slice(0, 15))
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const inputRef = useRef()
  const card = cards[index]

  const check = () => {
    const val = inputRef.current?.value.trim().toLowerCase() || ''
    const ans = card.back.toLowerCase()
    const isCorrect = ans.includes(val) || val.includes(ans) || (val.length > 3 && levenshtein(val, ans) <= Math.floor(ans.length * 0.3))
    if (isCorrect) setCorrect(c => c + 1)
    setFeedback({ isCorrect, answer: card.back })
    setTimeout(() => { setFeedback(null); setIndex(i => i + 1); if (inputRef.current) inputRef.current.value = '' }, 1500)
  }

  if (!card) {
    const pct = Math.round((correct / cards.length) * 100)
    if (pct === 100) fireConfetti()
    addXP(20 + correct * 3)
    return <motion.div className="glass-card results-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }}><div className="results-icon">{pct >= 80 ? '🏆' : '📚'}</div><div className="results-score">{pct}%</div><div className="results-label">{correct} of {cards.length} correct</div><button className="btn primary" style={{ marginTop: 14 }} onClick={onBack}>Back to Set</button></motion.div>
  }

  return (
    <div className="fc-player">
      <div className="fc-progress"><span className="fc-progress-text">{index + 1} / {cards.length}</span><div className="fc-progress-track"><div className="fc-progress-fill" style={{ width: `${((index + 1) / cards.length) * 100}%` }} /></div></div>
      <motion.div className="glass-card quiz-card" key={index} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <div className="quiz-type"><Lightning size="0.75em" /> Write the answer</div>
        <div className="quiz-question">{card.front}</div>
        <input ref={inputRef} className="quiz-input" placeholder="Type your answer..." autoFocus onKeyDown={e => e.key === 'Enter' && !feedback && check()} disabled={!!feedback} />
        {feedback && <div className={`quiz-feedback ${feedback.isCorrect ? 'correct' : 'wrong'}`}>{feedback.isCorrect ? '✅ Correct!' : `❌ Answer: ${feedback.answer}`}</div>}
        {!feedback && <button className="quiz-submit-btn" onClick={check}><Lightning /> Check Answer</button>}
      </motion.div>
    </div>
  )
}

function levenshtein(a, b) {
  const m = []; for (let i = 0; i <= b.length; i++) m[i] = [i]; for (let j = 0; j <= a.length; j++) m[0][j] = j
  for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) m[i][j] = b[i-1] === a[j-1] ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1)
  return m[b.length][a.length]
}

/* ============================================
   QUIZ PLAYER + WHITEBOARD
   ============================================ */
function QuizPlayer({ set, state, setState, save, addXP, onBack, fireConfetti }) {
  const [questions] = useState(() => [...set.quizQuestions].sort(() => Math.random() - 0.5).slice(0, 15))
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const q = questions[index]
  const canvasRef = useRef()

  useEffect(() => {
    if (canvasRef.current) { canvasRef.current._initialized = false; initCanvas(canvasRef.current) }
  }, [])

  const answer = (optIdx) => {
    if (answered) return; setAnswered(true)
    const selected = q.options[optIdx]; const ok = selected === q.correct
    if (ok) setScore(s => s + 1)
    setFeedback({ ok, correct: q.correct, selected: optIdx })
    setTimeout(() => { setAnswered(false); setFeedback(null); setIndex(i => i + 1) }, 1800)
  }

  const submitFill = () => {
    if (answered) return; setAnswered(true)
    const val = document.getElementById('quizFillInput')?.value.trim() || ''
    const ok = val.toLowerCase() === q.correct.toLowerCase() || q.correct.toLowerCase().includes(val.toLowerCase())
    if (ok) setScore(s => s + 1)
    setFeedback({ ok, correct: q.correct })
    setTimeout(() => { setAnswered(false); setFeedback(null); setIndex(i => i + 1) }, 1800)
  }

  if (!q) {
    const pct = Math.round((score / questions.length) * 100)
    setState(prev => { const n = { ...prev, quizScores: [...prev.quizScores, pct] }; saveState(n); return n })
    addXP(30 + Math.floor(pct / 5)); if (pct >= 90) fireConfetti()
    return <motion.div className="glass-card results-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
      <div className="results-icon">{pct >= 90 ? '🏆' : pct >= 70 ? '🎯' : '📚'}</div>
      <div className="results-score">{pct}%</div><div className="results-label">Practice Test Complete!</div>
      <div className="results-stats"><div><div className="rs-val green">{score}</div><div className="rs-lbl">Correct</div></div><div><div className="rs-val red">{questions.length - score}</div><div className="rs-lbl">Wrong</div></div></div>
      <button className="btn primary" onClick={onBack}>Back to Set</button>
    </motion.div>
  }

  return (
    <div className="quiz-layout">
      <div className="quiz-panel">
        <div className="quiz-counter">Question {index + 1} / {questions.length}</div>
        <div className="fc-progress-track" style={{ marginBottom: 14 }}><div className="fc-progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} /></div>
        <motion.div className="glass-card quiz-card" key={index} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
          <div className="quiz-type"><Lightning size="0.75em" /> {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'truefalse' ? 'True or False' : 'Fill in the Blank'}</div>
          <div className="quiz-question">{q.question}</div>
          {(q.type === 'mcq' || q.type === 'truefalse') ? (
            <div className="quiz-options">
              {q.options.map((opt, i) => (
                <button key={i} className={`quiz-option ${feedback ? (opt === feedback.correct ? 'correct' : i === feedback.selected && !feedback.ok ? 'wrong' : 'disabled') : ''}`} onClick={() => answer(i)} disabled={answered}>
                  <span className="opt-letter">{String.fromCharCode(65 + i)}</span><span>{opt}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <input id="quizFillInput" className="quiz-input" placeholder="Type your answer..." onKeyDown={e => e.key === 'Enter' && submitFill()} disabled={answered} />
              {!answered && <button className="quiz-submit-btn" onClick={submitFill}><Lightning /> Submit</button>}
            </>
          )}
          {feedback && <div className={`quiz-feedback ${feedback.ok ? 'correct' : 'wrong'}`}>{feedback.ok ? '✅ Correct!' : `❌ Answer: ${feedback.correct}`}</div>}
        </motion.div>
      </div>
      <WhiteboardPanel canvasRef={canvasRef} />
    </div>
  )
}

/* ============================================
   WHITEBOARD PANEL
   ============================================ */
function WhiteboardPanel({ canvasRef }) {
  const [color, setColor] = useState('#a78bfa')
  const [tool, setTool] = useState('pen')
  const [size, setSize] = useState(3)
  const colors = ['#a78bfa', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#f1f5f9']

  useEffect(() => { setTimeout(() => { if (canvasRef.current) initCanvas(canvasRef.current) }, 100) }, [])
  useEffect(() => { if (canvasRef.current) { canvasRef.current._wbColor = color; canvasRef.current._wbTool = tool; canvasRef.current._wbSize = size } }, [color, tool, size])

  return (
    <div className="wb-panel">
      <div className="wb-header">
        <div className="wb-header-title"><GlowAccent>✏️</GlowAccent> Scratchpad</div>
        <div className="wb-tools">
          <button className={`wb-tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>✏️</button>
          <button className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>⬜</button>
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 3px' }} />
          {colors.map(c => <div key={c} className={`wb-color ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => { setColor(c); setTool('pen') }} />)}
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 3px' }} />
          <input type="range" className="wb-size" min="1" max="20" value={size} onChange={e => setSize(+e.target.value)} />
          <button className="wb-tool-btn" onClick={() => { const c = canvasRef.current; if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height) }}>🗑️</button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ flex: 1, width: '100%', cursor: 'crosshair', touchAction: 'none', borderRadius: '0 0 var(--r-xl) var(--r-xl)', background: 'rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function initCanvas(canvas) {
  if (!canvas || canvas._initialized) return
  const parent = canvas.parentElement
  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight - (parent.querySelector('.wb-header')?.offsetHeight || 48)
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  let drawing = false, lx = 0, ly = 0
  const getPos = (e) => { const r = canvas.getBoundingClientRect(); const clientX = e.clientX || e.touches?.[0]?.clientX || 0; const clientY = e.clientY || e.touches?.[0]?.clientY || 0; return { x: clientX - r.left, y: clientY - r.top } }
  const start = (e) => { drawing = true; const p = getPos(e); lx = p.x; ly = p.y }
  const draw = (e) => {
    if (!drawing) return
    const p = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = (canvas._wbTool || 'pen') === 'eraser' ? '#030712' : (canvas._wbColor || '#a78bfa')
    ctx.lineWidth = (canvas._wbTool || 'pen') === 'eraser' ? (canvas._wbSize || 3) * 4 : (canvas._wbSize || 3)
    ctx.moveTo(lx, ly); ctx.lineTo(p.x, p.y); ctx.stroke()
    lx = p.x; ly = p.y
  }
  const stop = () => { drawing = false }
  canvas.onmousedown = start; canvas.onmousemove = draw; canvas.onmouseup = stop; canvas.onmouseleave = stop
  canvas.ontouchstart = e => { e.preventDefault(); start(e) }
  canvas.ontouchmove = e => { e.preventDefault(); draw(e) }
  canvas.ontouchend = stop
  canvas._initialized = true
}

/* ============================================
   MATCH MODE
   ============================================ */
function MatchMode({ set, addXP, onBack, fireConfetti }) {
  const [pairs] = useState(() => set.flashcards.sort(() => Math.random() - 0.5).slice(0, 6))
  const [items, setItems] = useState(() => {
    const terms = pairs.map(p => ({ id: p.id, text: p.front.length > 30 ? p.front.substring(0, 30) + '...' : p.front, type: 'term', matched: false }))
    const defs = pairs.map(p => ({ id: p.id, text: p.back.length > 30 ? p.back.substring(0, 30) + '...' : p.back, type: 'def', matched: false }))
    return [...terms, ...defs].sort(() => Math.random() - 0.5)
  })
  const [selected, setSelected] = useState(null)
  const [matched, setMatched] = useState(0)
  const [attempts, setAttempts] = useState(0)

  const select = (idx) => {
    if (items[idx].matched) return
    if (selected === null) { setSelected(idx); return }
    setAttempts(a => a + 1)
    const prev = items[selected]; const curr = items[idx]
    if (prev.id === curr.id && prev.type !== curr.type) {
      setItems(its => its.map((it, i) => (i === selected || i === idx) ? { ...it, matched: true } : it))
      setMatched(m => m + 1); setSelected(null)
    } else { setSelected(null) }
  }

  if (matched === pairs.length) {
    addXP(25); fireConfetti()
    return <motion.div className="glass-card results-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }}><div className="results-icon">🧩</div><div className="results-score">Matched!</div><div className="results-label">{pairs.length} pairs in {attempts} attempts</div><button className="btn primary" style={{ marginTop: 14 }} onClick={onBack}>Back to Set</button></motion.div>
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="fc-progress" style={{ marginBottom: 16 }}><span className="fc-progress-text">{matched} / {pairs.length} matched</span><div className="fc-progress-track"><div className="fc-progress-fill" style={{ width: `${(matched / pairs.length) * 100}%` }} /></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {items.map((item, i) => (
          <motion.button key={i} className={`quiz-option ${item.matched ? 'correct disabled' : ''}`} style={{ minHeight: 70, justifyContent: 'center', textAlign: 'center', borderColor: selected === i ? 'var(--accent)' : undefined, boxShadow: selected === i ? 'var(--glow-accent)' : undefined }} onClick={() => select(i)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
            <span style={{ fontSize: '0.78rem' }}>{item.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ============================================
   CRAM MODE
   ============================================ */
function CramMode({ set, addXP, onBack }) {
  const [cards] = useState(() => [...set.flashcards].sort(() => Math.random() - 0.5))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [startTime] = useState(Date.now)
  const card = cards[index]

  if (!card) {
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    addXP(30)
    return <motion.div className="glass-card results-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }}><div className="results-icon">🧠</div><div className="results-score">Crammed!</div><div className="results-label">{cards.length} cards in {elapsed}s</div><button className="btn primary" style={{ marginTop: 14 }} onClick={onBack}>Back to Set</button></motion.div>
  }
  return (
    <div className="fc-player">
      <div className="fc-progress"><span className="fc-progress-text"><Lightning size="0.8em" /> {index + 1} / {cards.length}</span><div className="fc-progress-track"><div className="fc-progress-fill" style={{ width: `${((index + 1) / cards.length) * 100}%` }} /></div></div>
      <motion.div className="glass-card" key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} style={{ padding: 36, textAlign: 'center' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Lightning size="0.8em" /> Term</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 28, lineHeight: 1.4 }}>{card.front}</div>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 20, background: 'rgba(16,185,129,0.04)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 20, boxShadow: 'var(--glow-emerald)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Answer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{card.back}</div>
          </motion.div>
        )}
        {!revealed ? <button className="btn primary" onClick={() => setRevealed(true)}>Reveal Answer ✨</button>
          : <button className="btn primary" onClick={() => { setRevealed(false); setIndex(i => i + 1) }}>Next → <Lightning /></button>}
      </motion.div>
    </div>
  )
}

/* ============================================
   LESSON PLAYER (Khan Academy)
   ============================================ */
function LessonPlayer({ set, addXP, onBack, updateStreak, fireConfetti }) {
  const [activeChapter, setActiveChapter] = useState(0)
  const [completed, setCompleted] = useState(() => new Array((set.lessons || []).length).fill(false))
  const lessons = set.lessons || []

  if (lessons.length === 0) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)' }}><div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.4 }}><Float>📖</Float></div><div style={{ fontWeight: 600 }}>No lessons available for this set.</div></div>

  const pct = Math.round((completed.filter(Boolean).length / lessons.length) * 100)
  const lesson = lessons[activeChapter]

  const markDone = () => {
    if (completed[activeChapter]) return
    const next = [...completed]; next[activeChapter] = true; setCompleted(next)
    addXP(25); updateStreak()
    if (activeChapter < lessons.length - 1) setTimeout(() => setActiveChapter(i => i + 1), 600)
    else fireConfetti()
  }

  return (
    <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
      <motion.div className="glass-card" style={{ width: 240, flexShrink: 0, padding: 18 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '1.02rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><GlowAccent>📖</GlowAccent> Course Modules</div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.03)', borderRadius: 9, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--emerald), #34d399)', width: `${pct}%`, transition: 'width 500ms var(--ease-spring)' }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>{pct}% Complete</div>
        {lessons.map((l, i) => (
          <div key={i} onClick={() => setActiveChapter(i)} style={{ padding: 10, cursor: 'pointer', borderRadius: 10, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 200ms', background: activeChapter === i ? 'rgba(99,102,241,0.08)' : 'transparent', border: `1px solid ${activeChapter === i ? 'var(--border-accent)' : 'transparent'}`, boxShadow: activeChapter === i ? 'var(--glow-accent)' : 'none' }}>
            <span style={{ fontSize: '0.95rem' }}>{completed[i] ? <GlowEmerald>✅</GlowEmerald> : '⚪'}</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ch {i + 1}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 135 }}>{l.title}</div>
            </div>
          </div>
        ))}
      </motion.div>
      <motion.div className="glass-card" style={{ flex: 1, padding: 36 }} key={activeChapter} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Lightning size="0.75em" /> Chapter {activeChapter + 1}</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 20, letterSpacing: '-0.02em' }}>{lesson.title}</h2>
        <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.85, marginBottom: 26, whiteSpace: 'pre-wrap' }}>{lesson.content}</div>
        {lesson.keyTerms?.length > 0 && (
          <div style={{ marginBottom: 26, padding: 18, background: 'rgba(99,102,241,0.03)', borderRadius: 'var(--r-lg)', borderLeft: '4px solid var(--accent)', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><GlowAccent>🗝️</GlowAccent> Key Concepts</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lesson.keyTerms.map((t, i) => <span key={i} style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-2)' }}>📌 {t}</span>)}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 22 }}>
          <button className="btn" onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))} disabled={activeChapter === 0} style={{ opacity: activeChapter === 0 ? 0.3 : 1 }}>← Previous</button>
          {completed[activeChapter]
            ? <button className="btn" style={{ background: 'rgba(16,185,129,0.06)', color: 'var(--emerald)', borderColor: 'rgba(16,185,129,0.15)', pointerEvents: 'none' }}><GlowEmerald>✅</GlowEmerald> Completed</button>
            : <button className="btn primary" style={{ background: 'linear-gradient(135deg, var(--emerald), #059669)', border: 'none' }} onClick={markDone}>Mark as Read ✔</button>}
          <button className="btn" onClick={() => setActiveChapter(Math.min(lessons.length - 1, activeChapter + 1))} disabled={activeChapter === lessons.length - 1} style={{ opacity: activeChapter === lessons.length - 1 ? 0.3 : 1 }}>Next →</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ============================================
   AI STUDY COACH — Uses Gemini API when available
   ============================================ */
function CoachView({ state, setState, save, addXP }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: "Hey! 👋 I'm your AI Study Coach powered by Google Gemini. I can:\n\n📚 Analyze your study materials\n📝 Create quizzes on any topic\n💡 Explain concepts in detail\n🎯 Build personalized study plans\n⏱️ Give study technique tips\n\nWhat would you like help with?" }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const msgEndRef = useRef()

  const send = async () => {
    if (!input.trim() || isTyping) return
    const msg = input.trim(); setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setIsTyping(true)

    // Try Gemini AI first
    const storedKey = getStoredKey()
    if (storedKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(storedKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        // Build context from study sets
        const contextParts = state.studySets.slice(0, 3).map(s => `Study Set "${s.name}": ${(s.rawText || '').substring(0, 2000)}`).join('\n\n')
        const statsContext = `Student stats: Level ${getLevel(state.totalXP)}, ${state.totalXP} XP, ${state.streak} day streak, ${state.cardsMastered} cards mastered, ${state.quizScores.length} quizzes taken${state.quizScores.length > 0 ? ` (avg ${Math.round(state.quizScores.reduce((a,b) => a+b, 0) / state.quizScores.length)}%)` : ''}, ${state.studySets.length} study sets.`

        const prompt = `You are an expert AI study tutor and coach in VantageStudy. You're friendly, encouraging, and knowledgeable. Keep responses concise (2-4 paragraphs max). Use emoji sparingly for warmth.

${statsContext}

${contextParts ? `Here is the student's study material for context:\n${contextParts}\n` : ''}

Student's question: ${msg}

Respond helpfully. If the question relates to their study material, reference specific content. If asking for study tips, be practical and evidence-based. If asking for a quiz, create 3-4 quick questions. Always be motivating!`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        setIsTyping(false)
        setMessages(prev => [...prev, { role: 'bot', text }])
        setState(prev => { const n = { ...prev, plansGenerated: prev.plansGenerated + 1 }; saveState(n); return n })
        addXP(5)
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        return
      } catch (err) {
        console.error('AI Coach error:', err)
        // Fall through to local fallback
      }
    }

    // Local fallback
    setTimeout(() => {
      setIsTyping(false)
      const response = generateCoachResponse(msg, state)
      setMessages(prev => [...prev, { role: 'bot', text: response }])
      setState(prev => { const n = { ...prev, plansGenerated: prev.plansGenerated + 1 }; saveState(n); return n })
      addXP(5)
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }, 500 + Math.random() * 800)
  }

  return (
    <div className="chat-container">
      {!hasAI() && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 'var(--r-lg)', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>💡</span>
          <span>Add your <strong>free Gemini API key</strong> in Settings to unlock real AI tutoring!</span>
        </motion.div>
      )}
      <div className="glass-card">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <motion.div key={i} className={`chat-msg ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="chat-avatar">{m.role === 'bot' ? <Spin>🤖</Spin> : '👤'}</div>
              <div className="chat-bubble">{m.text}</div>
            </motion.div>
          ))}
          {isTyping && <div className="chat-typing"><Spin>🤖</Spin> AI is thinking</div>}
          <div ref={msgEndRef} />
        </div>
        <div className="chat-input-row">
          <input className="chat-input" placeholder={hasAI() ? "Ask Gemini anything about your studies..." : "Ask me anything..."} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={isTyping} />
          <button className="chat-send" onClick={send} disabled={isTyping}>Send <Lightning /></button>
        </div>
      </div>
    </div>
  )
}

function generateCoachResponse(msg, state) {
  const lower = msg.toLowerCase()
  const kw = lower.split(/\s+/).filter(w => w.length > 3)
  const match = state.studySets.find(s => kw.some(k => (s.rawText || '').toLowerCase().includes(k)))
  if (match) {
    const sents = (match.rawText || '').split(/[.!?]+/).filter(s => s.length > 20)
    const rel = sents.filter(s => kw.some(k => s.toLowerCase().includes(k))).slice(0, 3)
    if (rel.length) return `📚 Based on your "${match.name}" materials:\n\n${rel.map(s => '• ' + s.trim()).join('\n')}\n\nWould you like me to quiz you on this, or explain any concept in more detail?`
  }
  if (lower.includes('quiz') || lower.includes('test')) return state.studySets.length > 0 ? `📝 Great idea! Go to Study Hub → pick "${state.studySets[0].name}" → Practice Test.\n\nYou have ${state.studySets.length} sets with ${state.studySets.reduce((a,s) => a + s.quizQuestions.length, 0)} total questions ready! 💪` : '📚 Upload study materials first! I\'ll generate quizzes from them automatically.'
  if (lower.includes('flashcard')) return `🃏 You have ${state.studySets.reduce((a,s) => a + s.flashcards.length, 0)} flashcards across ${state.studySets.length} sets.\n\n💡 Pro tip: Use the "Hard/Good/Easy" buttons — I use SM-2 spaced repetition to optimize your learning!`
  if (lower.includes('study') && (lower.includes('plan') || lower.includes('how') || lower.includes('tip'))) return `📋 Here's your personalized study plan:\n\n1. ⏱️ 25-min focus session (Pomodoro)\n2. 🃏 Review flashcards (use Hard/Good/Easy)\n3. 📝 Take a practice test\n4. ☕ 5-min break\n5. 📖 Read through lessons\n6. 🔄 Repeat!\n\nYou're Level ${getLevel(state.totalXP)} with ${state.totalXP} XP — keep going! 🔥`
  if (lower.includes('help') || lower.includes('what can')) return `I can help with:\n\n📚 Searching your study materials\n📝 Creating study plans\n🃏 Explaining flashcard concepts\n⏱️ Study technique advice\n🎯 Progress tracking tips\n💪 Motivation boosts\n\nTry asking "explain photosynthesis" or "give me study tips"!`
  if (lower.includes('motivat') || lower.includes('tired') || lower.includes('hard')) return `💪 You've got this!\n\n• You've earned ${state.totalXP} XP total\n• ${state.cardsMastered} cards mastered\n• ${state.streak} day streak going strong! 🔥\n\nEvery expert was once a beginner. Take a break if you need one, then come back refreshed! ☕`
  const defaults = [
    `📊 Quick stats: ${state.totalXP} XP earned, Level ${getLevel(state.totalXP)} ${getLevelTitle(state.totalXP)}, ${state.streak} day streak!\n\nWhat topic would you like to study? I can search your materials! 📚`,
    `🎯 You've mastered ${state.cardsMastered} cards! Keep reviewing daily for best retention.\n\nWhat would you like help with?`,
    `💡 Pro tip: Active recall (flashcards + quizzes) is 3x more effective than re-reading notes!\n\nWant me to help you with anything specific? 📝`
  ]
  return defaults[Math.floor(Math.random() * defaults.length)]
}

/* ============================================
   FOCUS TIMER
   ============================================ */
function TimerView({ state, setState, save, addXP, updateStreak, fireConfetti }) {
  const [seconds, setSeconds] = useState(25 * 60)
  const [totalSec, setTotalSec] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [preset, setPreset] = useState(25)
  const intervalRef = useRef()

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current); setRunning(false)
            setState(p => { const n = { ...p, timerSessions: p.timerSessions + 1, timerTotalMinutes: p.timerTotalMinutes + Math.round(totalSec / 60) }; saveState(n); return n })
            addXP(20); updateStreak(); fireConfetti()
            try { if (Notification.permission === 'granted') new Notification('VantageStudy', { body: '🎉 Focus session complete!' }) } catch {}
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, totalSec])

  const pickPreset = (mins) => { if (running) return; setPreset(mins); setSeconds(mins * 60); setTotalSec(mins * 60) }
  const toggle = () => { if (!running) { updateStreak(); try { Notification.requestPermission() } catch {} } setRunning(r => !r) }
  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setSeconds(preset * 60); setTotalSec(preset * 60) }
  const m = Math.floor(seconds / 60), s = seconds % 60
  const circ = 2 * Math.PI * 120
  const offset = circ * (1 - seconds / totalSec)

  return (
    <div className="timer-container">
      <div className="timer-ring">
        <div className="timer-ring-bg" />
        <svg className="timer-svg" viewBox="0 0 260 260">
          <defs><linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="50%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
          <circle className="track" cx="130" cy="130" r="120" />
          <circle className="prog" cx="130" cy="130" r="120" stroke="url(#tg)" strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div className="timer-inner">
          <div className="timer-time">{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</div>
          <div className="timer-phase">{running ? (preset <= 10 ? 'Break Time ☕' : 'Focus Time 🎯') : 'Ready'}</div>
        </div>
      </div>
      <div className="timer-presets">
        {[25, 30, 45, 60, 5].map(mins => <button key={mins} className={`timer-preset ${preset === mins ? 'active' : ''}`} onClick={() => pickPreset(mins)}>{mins <= 10 ? `${mins}m break` : `${mins} min`}</button>)}
      </div>
      <div className="timer-controls">
        <button className="timer-btn start" onClick={toggle}>{running ? '⏸ Pause' : '▶ Start'}</button>
        <button className="timer-btn" onClick={reset}>↻ Reset</button>
      </div>
      <div className="timer-stats">
        <div className="timer-stat"><div className="timer-stat-val">{state.timerSessions}</div><div className="timer-stat-lbl">Sessions</div></div>
        <div className="timer-stat"><div className="timer-stat-val">{state.timerTotalMinutes}</div><div className="timer-stat-lbl">Minutes</div></div>
        <div className="timer-stat"><div className="timer-stat-val">{(state.timerTotalMinutes / 60).toFixed(1)}</div><div className="timer-stat-lbl">Hours</div></div>
      </div>
    </div>
  )
}

/* ============================================
   NOTES
   ============================================ */
function NotesView({ state, setState, save }) {
  const [activeId, setActiveId] = useState(state.notes[0]?.id || null)
  const timerRef = useRef()

  useEffect(() => {
    if (state.notes.length === 0) {
      const note = { id: genId(), title: '', body: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      save({ ...state, notes: [note] }); setActiveId(note.id)
    }
  }, [])

  const activeNote = state.notes.find(n => n.id === activeId)
  const createNote = () => {
    const note = { id: genId(), title: '', body: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    save({ ...state, notes: [note, ...state.notes] }); setActiveId(note.id)
  }
  const updateNote = (field, value) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      save({ ...state, notes: state.notes.map(n => n.id === activeId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n) })
    }, 600)
  }

  return (
    <div className="notes-layout">
      <motion.div className="glass-card notes-sidebar" style={{ padding: 18 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h3><Bounce>📝</Bounce> Your Notes</h3>
        {state.notes.map(note => (
          <div key={note.id} className={`note-item ${activeId === note.id ? 'active' : ''}`} onClick={() => setActiveId(note.id)}>
            <div className="note-item-title">{note.title || 'Untitled'}</div>
            <div className="note-item-date">{fmtDate(note.updatedAt)}</div>
          </div>
        ))}
        <button className="note-new-btn" onClick={createNote}>+ New Note</button>
      </motion.div>
      <motion.div className="glass-card notes-editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        {activeNote && <>
          <input className="note-title-input" defaultValue={activeNote.title} placeholder="Note title..." onChange={e => updateNote('title', e.target.value)} key={activeNote.id + '-t'} />
          <textarea className="note-body-input" defaultValue={activeNote.body} placeholder="Start writing your notes..." onChange={e => updateNote('body', e.target.value)} key={activeNote.id + '-b'} />
        </>}
      </motion.div>
    </div>
  )
}

/* ============================================
   STANDALONE WHITEBOARD
   ============================================ */
function WhiteboardView() {
  const canvasRef = useRef()
  useEffect(() => { setTimeout(() => { if (canvasRef.current) { canvasRef.current._initialized = false; initCanvas(canvasRef.current) }}, 150) }, [])
  return <div style={{ height: 'calc(100vh - 120px)' }}><WhiteboardPanel canvasRef={canvasRef} /></div>
}

/* ============================================
   ACHIEVEMENTS
   ============================================ */
function AchievementsView({ state }) {
  return (
    <>
      <div style={{ marginBottom: 18 }}><h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Float>🏆</Float> Achievements</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 3 }}>Unlock badges as you study and progress</p></div>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((ach, i) => {
          const unlocked = ach.check(state)
          return (
            <motion.div key={ach.id} className={`glass-card ach-card ${unlocked ? 'unlocked' : 'locked'}`} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 20 }}>
              <div className="ach-icon">{ach.icon}</div>
              <div className="ach-name">{ach.name}</div>
              <div className="ach-desc">{ach.desc}</div>
              <div className="ach-status">{unlocked ? '✓ Unlocked' : '🔒 Locked'}</div>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}

/* ============================================
   QUESTS
   ============================================ */
function QuestsView({ state }) {
  const done = QUESTS.filter(q => q.check(state))
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Lightning /> Daily Quests</h2>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>{done.length} / {QUESTS.length} completed</span>
      </div>
      <div className="sets-grid">
        {QUESTS.map((q, i) => {
          const isDone = q.check(state)
          return (
            <motion.div key={q.id} className="glass-card set-card" style={{ cursor: 'default', ...(isDone ? { borderColor: 'rgba(16,185,129,0.2)' } : {}) }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="set-card-header">
                <div className="set-card-icon" style={isDone ? { background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.15)' } : {}}>{isDone ? <GlowEmerald>{q.icon}</GlowEmerald> : q.icon}</div>
                <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", ...(isDone ? { background: 'rgba(16,185,129,0.06)', color: 'var(--emerald)' } : { background: 'rgba(99,102,241,0.06)', color: 'var(--accent-2)' }) }}>{isDone ? '✅ Done' : `+${q.xp} XP`}</span>
              </div>
              <div className="set-card-title">{q.title}</div>
              <div className="set-card-desc">{q.desc}</div>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}

/* ============================================
   STATISTICS
   ============================================ */
function StatsView({ state }) {
  const totalCards = state.studySets.reduce((a, s) => a + s.flashcards.length, 0)
  const totalQ = state.studySets.reduce((a, s) => a + s.quizQuestions.length, 0)
  const avg = state.quizScores.length > 0 ? Math.round(state.quizScores.reduce((a, b) => a + b, 0) / state.quizScores.length) : 0
  const best = state.quizScores.length > 0 ? Math.max(...state.quizScores) : 0
  const scores = state.quizScores.slice(-20)

  const statCards = [
    { icon: <Float>📚</Float>, val: totalCards, lbl: 'Total Cards' },
    { icon: <Bounce>📝</Bounce>, val: totalQ, lbl: 'Total Questions' },
    { icon: <GlowEmerald>🎯</GlowEmerald>, val: avg + '%', lbl: 'Avg Score' },
    { icon: <Float>🏆</Float>, val: best + '%', lbl: 'Best Score' },
  ]

  return (
    <>
      <div style={{ marginBottom: 18 }}><h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><GlowEmerald>📈</GlowEmerald> Statistics</h2></div>
      <div className="dash-grid" style={{ marginBottom: 18 }}>
        {statCards.map((c, i) => (
          <motion.div key={i} className="glass-card dash-card" initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }}>
            <div className="dash-card-icon">{c.icon}</div><div className="dash-card-value">{c.val}</div><div className="dash-card-label">{c.lbl}</div>
          </motion.div>
        ))}
      </div>
      <div className="dash-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
        <motion.div className="glass-card dash-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}><div className="dash-card-icon"><GlowPink>⏱️</GlowPink></div><div className="dash-card-value">{state.timerTotalMinutes}</div><div className="dash-card-label">Focus Minutes</div></motion.div>
        <motion.div className="glass-card dash-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}><div className="dash-card-icon"><Fire /></div><div className="dash-card-value">{state.streak}</div><div className="dash-card-label">Current Streak</div></motion.div>
      </div>
      <motion.div className="glass-card" style={{ padding: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><GlowAccent>📊</GlowAccent> Quiz Score History</h3>
        {scores.length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: 24, textAlign: 'center' }}><Float>📝</Float><div style={{ marginTop: 8 }}>Take quizzes to see your score chart!</div></div> : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '0 4px' }}>
            {scores.map((sc, i) => (
              <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${sc}%` }} transition={{ delay: 0.5 + i * 0.03, type: 'spring', stiffness: 200, damping: 20 }} style={{ flex: 1, background: `linear-gradient(180deg, ${sc >= 80 ? 'var(--emerald)' : sc >= 50 ? 'var(--amber)' : 'var(--red)'}, transparent)`, borderRadius: '3px 3px 0 0', minWidth: 6, position: 'relative' }} title={`${sc}%`} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}

/* ============================================
   PASTE MODAL
   ============================================ */
function PasteModal({ state, setState, save, onClose, addXP, updateStreak }) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (text.trim().length < 5) return alert('Please paste some study material.')
    setLoading(true)
    try {
      let generated;
      const lines = text.trim().split('\n').filter(l => l.includes('\t') || l.includes(' - ') || l.includes(': '))
      
      // If we detect a pattern for at least 3 lines or 50% of lines, treat as direct import
      if (lines.length >= 3 || (lines.length > 0 && lines.length >= text.trim().split('\n').length * 0.5)) {
        const flashcards = lines.map(line => {
          let [front, ...rest] = line.split(/\t| - |: /)
          return {
            id: genId(),
            front: front.trim(),
            back: rest.join(' ').trim(),
            difficulty: 0, nextReview: Date.now(), interval: 1, easeFactor: 2.5, status: 'new'
          }
        })
        generated = { flashcards, quizQuestions: [], lessons: [], aiGenerated: false }
      } else {
        generated = await generateWithAI(text)
      }

      const studySet = {
        id: genId(), name: name.trim() || 'My Study Set',
        description: text.substring(0, 150).trim() + '...',
        rawText: text,
        flashcards: generated.flashcards, quizQuestions: generated.quizQuestions,
        lessons: generated.lessons, aiGenerated: generated.aiGenerated,
        createdAt: new Date().toISOString(), progress: 0,
      }
      setState(prev => { const n = { ...prev, studySets: [studySet, ...prev.studySets] }; saveState(n); return n })
      updateStreak(); addXP(generated.aiGenerated ? 50 : 25); onClose()
    } catch (e) { console.error(e); alert('Error generating content. Please try again.') }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 560, textAlign: 'left', padding: 28 }} initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><Float>📋</Float> Paste Your Notes</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-dim)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 200ms' }}>✕</button>
        </div>
        {hasAI() && <div className="ai-badge" style={{ marginBottom: 10 }}>🧠 Gemini AI will analyze your content</div>}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Study set name..." style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: "'Inter', sans-serif", marginBottom: 10, backdropFilter: 'blur(4px)', transition: 'all 200ms' }} onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.08)' }} onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }} />
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste your notes, study guide, textbook content, or any study material..." style={{ width: '100%', minHeight: 180, padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical', lineHeight: 1.7, fontFamily: "'Inter', sans-serif", backdropFilter: 'blur(4px)' }} />
        <button className="btn primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center', opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>{loading ? <><Spin>🧠</Spin> Generating...</> : <><Lightning /> Generate Study Set</>}</button>
      </motion.div>
    </div>
  )
}

/* ============================================
   SETTINGS MODAL (API Key & Visuals)
   ============================================ */
function SettingsModal({ onClose, theme, setTheme, reduceMotion, setReduceMotion, visualState, setVisualState }) {
  const [key, setKey] = useState(getStoredKey())
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('ai') // 'ai' or 'visual'

  const saveKey = () => {
    if (setApiKey(key)) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const updateVisuals = (update) => setVisualState(v => ({ ...v, ...update }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 540, width: '90%', textAlign: 'left', padding: 0, overflow: 'hidden' }} initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
          <button style={{ flex: 1, padding: '16px', background: tab === 'ai' ? 'rgba(99,102,241,0.08)' : 'transparent', border: 'none', borderBottom: tab === 'ai' ? '2px solid var(--accent)' : '2px solid transparent', color: tab === 'ai' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 200ms' }} onClick={() => setTab('ai')}><Spin>🤖</Spin> AI Settings</button>
          <button style={{ flex: 1, padding: '16px', background: tab === 'visual' ? 'rgba(99,102,241,0.08)' : 'transparent', border: 'none', borderBottom: tab === 'visual' ? '2px solid var(--accent)' : '2px solid transparent', color: tab === 'visual' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 200ms' }} onClick={() => setTab('visual')}><Float>🎨</Float> Visuals</button>
        </div>

        <div style={{ padding: 28, maxHeight: '70vh', overflowY: 'auto' }}>
          {tab === 'ai' ? (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Spin>⚙️</Spin> Gemini API Connection</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 4 }}>Connect <strong>Google Gemini</strong> to unlock real AI-powered study tools.</p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: 14 }}>Get your free API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)', textDecoration: 'underline' }}>aistudio.google.com</a></p>
              <input className="api-key-input" placeholder="Enter your Gemini API key..." value={key} onChange={e => setKey(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveKey}>{saved ? <><GlowEmerald>✅</GlowEmerald> Saved!</> : <><Lightning /> Save API Key</>}</button>
              </div>
              <div style={{ marginTop: 16, padding: 14, background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 'var(--r-md)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Without an API key:</strong> Smart local text analysis generates study materials.<br/>
                <strong style={{ color: 'var(--accent-2)' }}>With Gemini AI:</strong> Get dramatically better flashcards, quizzes, lessons, and a real AI tutor that understands your content!
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="vsettings-section" style={{ padding: 0 }}>
                <h3 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>Appearance</h3>
                <div className="vsettings-row">
                  <div>
                    <div className="vsettings-label">Theme Mode</div>
                    <div className="vsettings-desc">Switch between Light and Dark mode.</div>
                  </div>
                  <button className={`vsettings-toggle ${theme === 'light' ? 'on' : ''}`} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
                </div>
                <div className="vsettings-row">
                  <div>
                    <div className="vsettings-label">Accent Color</div>
                    <div className="vsettings-desc">Personalize your study experience.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'indigo', c: '#6366f1' }, { id: 'emerald', c: '#10b981' }, 
                      { id: 'rose', c: '#e11d48' }, { id: 'amber', c: '#d97706' }
                    ].map(col => (
                      <div key={col.id} className={`color-swatch ${visualState.color === col.id ? 'active' : ''}`} style={{ background: col.c }} onClick={() => updateVisuals({ color: col.id })} />
                    ))}
                  </div>
                </div>

                <h3 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginTop: 24 }}>Typography & Motion</h3>
                
                <div className="vsettings-row">
                  <div>
                    <div className="vsettings-label">Font Size</div>
                    <div className="vsettings-desc">Scale text up or down for readability.</div>
                  </div>
                  <select style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', outline: 'none' }} value={visualState.fontSize} onChange={e => updateVisuals({ fontSize: e.target.value })}>
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <div className="vsettings-row">
                  <div>
                    <div className="vsettings-label">OpenDyslexic Font</div>
                    <div className="vsettings-desc">Enable high-legibility dyslexic font mode.</div>
                  </div>
                  <button className={`vsettings-toggle ${visualState.dyslexic ? 'on' : ''}`} onClick={() => updateVisuals({ dyslexic: !visualState.dyslexic })} />
                </div>
                
                <div className="vsettings-row">
                  <div>
                    <div className="vsettings-label">Reduce Motion</div>
                    <div className="vsettings-desc">Disable complex animations and 3D scenes.</div>
                  </div>
                  <button className={`vsettings-toggle ${reduceMotion ? 'on' : ''}`} onClick={() => setReduceMotion(!reduceMotion)} />
                </div>
              </div>
            </motion.div>
          )}
          <div style={{ marginTop: 24, textAlign: 'right' }}><button className="btn" onClick={onClose}>Close</button></div>
        </div>
      </motion.div>
    </div>
  )
}

/* ============================================
   AMBIENT AUDIO WIDGET
   ============================================ */
function AmbientAudio() {
  const [playing, setPlaying] = useState(false)
  const [track, setTrack] = useState('lofi')
  const [volume, setVolume] = useState(50)

  const tracks = {
    lofi: { name: 'Lofi Beats', icon: '🎧' },
    rain: { name: 'Rainstorm', icon: '🌧️' },
    cafe: { name: 'Cafe Vibes', icon: '☕' }
  }

  return (
    <div style={{ margin: 'auto 20px 20px', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}><Float speed={2}>🎧</Float> Ambient Focus</div>
        <button onClick={() => setPlaying(!playing)} style={{ width: 28, height: 28, borderRadius: '50%', background: playing ? 'var(--accent)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 200ms' }}>
          {playing ? '⏸' : '▶'}
        </button>
      </div>
      {playing && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {Object.entries(tracks).map(([k, v]) => (
              <button key={k} onClick={() => setTrack(k)} style={{ flex: 1, padding: '6px 0', background: track === k ? 'rgba(99,102,241,0.15)' : 'transparent', border: track === k ? '1px solid var(--accent)' : '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '0.8rem', color: track === k ? 'var(--text-primary)' : 'var(--text-dim)', cursor: 'pointer' }} title={v.name}>{v.icon}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔈</span>
            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(e.target.value)} style={{ flex: 1, height: 4, outline: 'none', cursor: 'pointer', accentColor: 'var(--accent)' }} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ============================================
   UPGRADE TO PRO VIEW
   ============================================ */
function UpgradeView({ switchView }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
        <Float speed={2} floatIntensity={2}><div style={{ fontSize: '4rem', marginBottom: 12 }}>💎</div></Float>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 14, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Vantage Pro
        </h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 30, maxWidth: 600, margin: '0 auto 30px', lineHeight: 1.6 }}>
          Unlock the ultimate learning experience. Get unlimited AI study sets, advanced learning analytics, and exclusive premium themes.
        </p>

        <div className="glass-card" style={{ padding: '30px', background: 'rgba(99,102,241,0.05)', display: 'inline-block', textAlign: 'left', minWidth: 320, marginBottom: 30, boxShadow: 'var(--glow-accent)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--gradient-primary)' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Pro Plan <span style={{ float: 'right', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500, paddingTop: 4 }}>$2.99 / mo</span></h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 26, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}><GlowEmerald>✓</GlowEmerald> Generate unlimited AI study sets</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}><GlowEmerald>✓</GlowEmerald> Upload files larger than 10MB</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}><GlowEmerald>✓</GlowEmerald> Deep analytics and learning history</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}><GlowEmerald>✓</GlowEmerald> Premium Ambient Focus soundscapes</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 10 }}><GlowEmerald>✓</GlowEmerald> Priority API access (no local key needed)</li>
          </ul>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem', fontWeight: 700 }} onClick={() => alert('Payment gateway incoming!')}>
            <Lightning /> Upgrade Now
          </button>
        </div>

        <div style={{ padding: '16px 24px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--r-md)', color: 'var(--emerald)', fontWeight: 600, display: 'inline-block', fontSize: '0.9rem' }}>
          🎉 Special Offer: ALL Vantage Pro features are completely FREE during our global beta! Enjoy!
        </div>
        
        <div style={{ marginTop: 40 }}>
          <button className="btn" onClick={() => switchView('dashboard')} style={{ padding: '10px 20px', borderRadius: '40px' }}>Return to Dashboard</button>
        </div>
      </motion.div>
    </div>
  )
}
