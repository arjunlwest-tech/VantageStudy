# Quick Start Guide - Premium Features Integration

## Overview
This guide shows how to integrate the premium features into your VantageStudy application.

## Step 1: Import Premium Components

```javascript
import PremiumHub from './components/Premium/PremiumHub'
import SubscriptionTier from './components/Premium/SubscriptionTier'
import Leaderboard from './components/Premium/Leaderboard'
import Tournaments from './components/Premium/Tournaments'
```

## Step 2: Import Premium Utilities

```javascript
import { 
  PREMIUM_TIERS,
  TOURNAMENT_MODES,
  LEADERBOARD_TYPES,
  isPremiumActive, 
  canAccessFeature, 
  getDailyLimit, 
  getXPMultiplier 
} from './lib/premium'
```

## Step 3: Import State Management

```javascript
import store from './lib/store'
```

## Step 4: Update App Component State

Add subscription and premium-related state to your main App component:

```javascript
const App = () => {
  const [gameStore, setGameStore] = useState(() => store.loadState())
  const [showPremiumHub, setShowPremiumHub] = useState(false)

  // Save state whenever it changes
  useEffect(() => {
    store.saveState(gameStore)
  }, [gameStore])

  // Check if user is premium
  const userIsPremium = isPremiumActive(gameStore)
  const xpMultiplier = getXPMultiplier(gameStore)

  // ... rest of component
}
```

## Step 5: Add Premium Hub Button to Navigation

```javascript
<button 
  onClick={() => setShowPremiumHub(!showPremiumHub)}
  style={{ 
    padding: '8px 16px', 
    background: userIsPremium ? '#10b981' : '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600
  }}
>
  {userIsPremium ? '💎 Premium' : '⭐ Upgrade'}
</button>
```

## Step 6: Add Premium Hub Modal

```javascript
{showPremiumHub && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#050816',
    zIndex: 999,
    overflow: 'auto'
  }}>
    <button 
      onClick={() => setShowPremiumHub(false)}
      style={{ 
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: '#1e293b',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        zIndex: 1000
      }}
    >
      ✕ Close
    </button>

    <PremiumHub 
      gameStore={gameStore}
      onUpdateSubscription={(newTier) => {
        setGameStore({
          ...gameStore,
          subscriptionTier: newTier,
          isPremium: newTier !== 'free'
        })
      }}
    />
  </div>
)}
```

## Step 7: Apply XP Multiplier to Game Completion

When a game completes, apply the multiplier:

```javascript
const handleGameComplete = (baseXP) => {
  const multiplier = getXPMultiplier(gameStore)
  const finalXP = baseXP * multiplier

  setGameStore({
    ...gameStore,
    totalXP: gameStore.totalXP + finalXP
  })
}
```

## Step 8: Check Feature Access Before Showing Premium Features

```javascript
const canAccessTournaments = canAccessFeature(gameStore, 'pro')
const canAccessAdvancedLeaderboards = canAccessFeature(gameStore, 'elite')

if (!canAccessTournaments) {
  // Show upgrade prompt or paywall
  return <PaywallModal requiredTier="pro" />
}
```

## Step 9: Display User's Current Status

```javascript
<div style={{ padding: '15px', background: '#1e293b', borderRadius: '8px' }}>
  <div>Tier: {gameStore.subscriptionTier.toUpperCase()}</div>
  <div>XP Multiplier: {xpMultiplier}x</div>
  <div>Total XP: {gameStore.totalXP.toLocaleString()}</div>
  <div>Premium Status: {userIsPremium ? '✅ Active' : '⭐ Upgrade'}</div>
</div>
```

## Step 10: Add Game-Specific XP Multiplier Display

```javascript
const GameCard = ({ game, baseXP }) => {
  const multiplier = getXPMultiplier(gameStore)
  const finalXP = baseXP * multiplier

  return (
    <div style={{ padding: '20px', background: '#1e293b', borderRadius: '8px' }}>
      <h3>{game.name}</h3>
      <div>Base XP: {baseXP}</div>
      <div style={{ color: '#6366f1' }}>
        Final XP with {multiplier}x: <strong>{finalXP}</strong>
      </div>
      <button onClick={() => playGame(game, finalXP)}>Play</button>
    </div>
  )
}
```

---

## Complete Example: Game Card with Premium Features

```javascript
const GameCard = ({ game, studySet }) => {
  const [showPay wall, setShowPaywall] = useState(false)
  
  const handlePlayGame = () => {
    // Check if premium feature is required
    if (game.requiresPremium && !canAccessFeature(gameStore, 'pro')) {
      setShowPaywall(true)
      return
    }

    const baseXP = game.baseXP || 100
    const multiplier = getXPMultiplier(gameStore)
    const finalXP = baseXP * multiplier

    // Play the game
    startGame({
      game,
      studySet,
      onComplete: (score) => {
        handleGameComplete(score * multiplier)
      }
    })
  }

  return (
    <>
      <div style={{
        padding: '20px',
        background: '#1e293b',
        borderRadius: '8px',
        border: game.requiresPremium && !userIsPremium ? '2px solid #ec4899' : 'none'
      }}>
        <h3>{game.name}</h3>
        <p>{game.description}</p>
        
        {game.requiresPremium && !userIsPremium && (
          <div style={{ 
            padding: '10px', 
            background: 'rgba(236, 72, 153, 0.1)', 
            borderRadius: '4px',
            marginBottom: '10px'
          }}>
            🔒 Premium Feature - Upgrade to play
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          Base XP: {game.baseXP || 100}
          <span style={{ marginLeft: '20px', color: '#6366f1' }}>
            × {getXPMultiplier(gameStore)} = {(game.baseXP || 100) * getXPMultiplier(gameStore)} XP
          </span>
        </div>

        <button 
          onClick={handlePlayGame}
          disabled={game.requiresPremium && !userIsPremium}
          style={{
            padding: '10px 20px',
            background: game.requiresPremium && !userIsPremium ? '#64748b' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: game.requiresPremium && !userIsPremium ? 'not-allowed' : 'pointer'
          }}
        >
          {game.requiresPremium && !userIsPremium ? 'Unlock' : 'Play'}
        </button>
      </div>

      {showPaywall && (
        <PaywallModal 
          requiredTier="pro"
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  )
}
```

---

## State Structure Reference

```javascript
{
  // Basic user data
  totalXP: 15000,
  streak: 7,
  ...
  
  // Premium subscription
  subscriptionTier: 'elite', // free, pro, elite, ultimate
  subscriptionExpiresAt: '2024-12-31T23:59:59Z',
  isPremium: true,
  
  // Leaderboards
  globalRank: 234,
  weeklyRank: 45,
  monthlyRank: 89,
  
  // Tournaments
  activeTourn: 'weekly_battle',
  tournamentWins: 5,
  tournamentScore: 3450,
  
  // Game stats
  gameStats: {
    runner: { wins: 45, bestScore: 1850, totalPlayed: 127 },
    shooter: { wins: 62, bestScore: 2300, totalPlayed: 156 },
    // ... more games
  },
  
  // Social
  friendsList: ['user1', 'user2', ...],
  studyGroups: [],
  followers: 234,
  following: 156
}
```

---

## Tier Limits Reference

Use `getDailyLimit()` to enforce daily limits:

```javascript
const gamesPlayedToday = gameStore.gamesPlayedToday || 0
const dailyLimit = getDailyLimit(gameStore, 'Games') // Returns 3, 999, 999, or 999

if (gamesPlayedToday >= dailyLimit) {
  showUpgradePage()
} else {
  playGame()
}
```

---

## Integration Checklist

- [ ] Import all premium components
- [ ] Import premium utilities
- [ ] Add state management for gameStore
- [ ] Add showPremiumHub state
- [ ] Create Premium Hub button in navigation
- [ ] Implement Premium Hub modal
- [ ] Apply XP multiplier to games
- [ ] Add feature access checks
- [ ] Display user tier status
- [ ] Create paywall component
- [ ] Test game completion with multiplier
- [ ] Test tournament access restrictions
- [ ] Test leaderboard display
- [ ] Setup Stripe payment integration
- [ ] Test subscription tier upgrades

---

## Best Practices

1. **Always check with `isPremiumActive()`** before showing premium features
2. **Always use `getXPMultiplier()`** when calculating rewards
3. **Always validate feature access** with `canAccessFeature()`
4. **Save state after updates** with `store.saveState()`
5. **Show paywalls gracefully** without forcing upgrades
6. **Make free tier enjoyable** to encourage upgrades
7. **Highlight multiplier benefits** to motivate upgrades

---

## Performance Tips

- Lazy-load premium components only when needed
- Cache XP multiplier value to avoid repeated calculations
- Batch state updates when multiple changes occur
- Use `useCallback` for premium feature check functions
- Memoize leaderboard data to avoid re-renders

---

## Next Steps

1. Integrate payment provider (Stripe/Paddle)
2. Create payment flow for tier upgrades
3. Set up subscription webhook handlers
4. Create license key system for Ultimate tier
5. Add analytics tracking for conversion metrics

Good luck! 🚀
