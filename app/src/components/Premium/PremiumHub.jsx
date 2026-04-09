import React, { useState } from 'react'
import SubscriptionTier from './SubscriptionTier'
import Leaderboard from './Leaderboard'
import Tournaments from './Tournaments'
import { isPremiumActive, canAccessFeature, getXPMultiplier } from '../lib/premium'

export default function PremiumHub({ gameStore, onUpdateSubscription }) {
  const [activeTab, setActiveTab] = useState('tiers')
  const [showPaywall, setShowPaywall] = useState(false)
  const [requiredTier, setRequiredTier] = useState(null)

  const userTier = gameStore?.subscriptionTier || 'free'
  const isPremium = isPremiumActive(gameStore)
  const xpMultiplier = getXPMultiplier(gameStore)

  const handleAccessPremiumFeature = (requiredTierLevel) => {
    if (!canAccessFeature(gameStore, requiredTierLevel)) {
      setRequiredTier(requiredTierLevel)
      setShowPaywall(true)
      return false
    }
    return true
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#050816' }}>
      {/* Paywall Modal */}
      {showPaywall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '15px' }}>Premium Feature</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '25px' }}>
              This feature requires a {requiredTier} tier subscription.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowPaywall(false)}
                style={{
                  padding: '12px 24px',
                  background: '#1e293b',
                  color: 'white',
                  border: '1px solid #64748b',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPaywall(false)
                  setActiveTab('tiers')
                }}
                style={{
                  padding: '12px 24px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Premium Hub</h1>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Current Tier</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6366f1', textTransform: 'capitalize' }}>
              {userTier} {isPremium && '✓'}
            </div>
            {isPremium && (
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '5px' }}>
                {xpMultiplier}x XP Multiplier Active
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #1e293b', marginBottom: '30px' }}>
          {[
            { id: 'tiers', label: '💎 Subscription Tiers', icon: '💎' },
            { id: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
            { id: 'tournaments', label: '🎮 Tournaments', icon: '🎮' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '15px 25px',
                background: 'transparent',
                color: activeTab === tab.id ? '#6366f1' : 'rgba(255,255,255,0.6)',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #6366f1' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'tiers' && (
          <SubscriptionTier 
            currentTier={userTier}
            onSelect={(tier) => {
              onUpdateSubscription?.(tier)
              if (tier !== 'free') {
                // In production, show Stripe checkout
                alert(`Upgrading to ${tier} tier... (Stripe integration in production)`)
              }
            }}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard
            gameStats={gameStore}
            userRank={{
              rank: Math.floor(Math.random() * 10000) + 1,
              totalPlayers: 50000 + Math.floor(Math.random() * 100000),
              pointsToNextRank: Math.floor(Math.random() * 1000) + 100
            }}
            leaderboardType="global"
          />
        )}

        {activeTab === 'tournaments' && (
          <Tournaments
            userStats={gameStore}
            onJoinTournament={(tourn) => {
              if (!isPremium && tourn.name !== 'Daily Duel') {
                handleAccessPremiumFeature('pro')
                return
              }
              alert(`Joined ${tourn.name}!`)
            }}
          />
        )}
      </div>

      {/* Feature Comparison */}
      {!isPremium && (
        <div style={{ maxWidth: '1200px', margin: '40px auto 0' }}>
          <h3 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, marginBottom: '20px' }}>
            Unlock Your Potential
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {[
              { feature: '🚀 2-3x XP Multiplier', benefit: 'Progress Faster' },
              { feature: '🏆 Tournament Access', benefit: 'Win Prizes' },
              { feature: '📊 Advanced Leaderboards', benefit: 'Flexible Ranking' },
              { feature: '💬 Study Groups', benefit: 'Learn Together' },
              { feature: '⭐ Priority Support', benefit: 'Get Help Fast' },
              { feature: '🎁 Exclusive Rewards', benefit: 'Special Perks' }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  hover: { background: 'rgba(99, 102, 241, 0.15)' }
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{item.feature}</div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>{item.benefit}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
