import React, { useState } from 'react'
import { PREMIUM_TIERS, LEADERBOARD_TYPES, XP_MULTIPLIERS } from '../lib/premium'

export default function SubscriptionTier({ onSelect, currentTier }) {
  const [selectedTier, setSelectedTier] = useState(currentTier || 'free')

  const handleSelectTier = (tier) => {
    setSelectedTier(tier)
    if (tier !== 'free') {
      // In production, this would integrate with Stripe/payment provider
      console.log(`Upgrading to ${tier} tier at $${PREMIUM_TIERS[tier].price}`)
    }
    onSelect?.(tier)
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '10px', textAlign: 'center' }}>
        Premium Tiers
      </h1>
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '40px', fontSize: '1.1rem' }}>
        Unlock advanced features and XP multipliers
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {Object.entries(PREMIUM_TIERS).map(([tierKey, tier]) => {
          const isSelected = selectedTier === tierKey
          return (
            <div
              key={tierKey}
              onClick={() => handleSelectTier(tierKey)}
              style={{
                padding: '25px',
                border: `2px solid ${isSelected ? '#6366f1' : '#1e293b'}`,
                borderRadius: '12px',
                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '10px', textTransform: 'capitalize', color: tier.color || '#ffffff' }}>
                {tierKey}
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '15px' }}>
                {tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
              </div>

              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.8', marginBottom: '15px' }}>
                <div style={{ marginBottom: '8px' }}>🎯 {tier.multiplier || 1}x XP Multiplier</div>
                <div style={{ marginBottom: '8px' }}>📊 {tier.dailyLimitMultiplier || 1}x Daily Limits</div>
                {tier.features?.map((feat, i) => (
                  <div key={i} style={{ marginBottom: '6px' }}>✓ {feat}</div>
                ))}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleSelectTier(tierKey); }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isSelected ? '#6366f1' : '#1e293b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.8'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                {tierKey === 'free' ? 'Current' : isSelected ? 'Selected' : 'Upgrade'}
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ 
        background: 'rgba(16, 185, 129, 0.1)', 
        border: '1px solid rgba(16, 185, 129, 0.3)', 
        padding: '20px', 
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
          💡 Tip: Your XP multiplier applies to all games. Advance faster and unlock premium achievements!
        </p>
      </div>
    </div>
  )
}
