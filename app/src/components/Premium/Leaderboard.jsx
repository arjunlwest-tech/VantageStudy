import React, { useState, useMemo } from 'react'
import { LEADERBOARD_TYPES } from '../lib/premium'

export default function Leaderboard({ gameStats, userRank, leaderboardType = 'global', friends = [] }) {
  const [selectedType, setSelectedType] = useState(leaderboardType)

  // Mock leaderboard data based on game stats
  const mockLeaderboard = useMemo(() => {
    if (!gameStats) return []
    
    const leaders = [
      { rank: 1, name: 'NeuralMaster', score: 2500 + Math.random() * 500, xp: 45000, tier: 'ultimate' },
      { rank: 2, name: 'StellarSage', score: 2300 + Math.random() * 400, xp: 38000, tier: 'elite' },
      { rank: 3, name: 'GravityBinder', score: 2100 + Math.random() * 300, xp: 32000, tier: 'pro' },
      { rank: 4, name: 'You', score: 1850 + (gameStats.totalScore || 0) / 100, xp: gameStats.totalXP || 15000, tier: 'pro', isUser: true },
      { rank: 5, name: 'VoidClimber', score: 1750 + Math.random() * 250, xp: 24000, tier: 'pro' },
      { rank: 6, name: 'QuantumLeaper', score: 1600 + Math.random() * 200, xp: 19000, tier: 'free' },
    ]
    return leaders
  }, [gameStats])

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '30px', textAlign: 'center' }}>
        Global Leaderboards
      </h2>

      {/* Leaderboard Type Selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {LEADERBOARD_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            style={{
              padding: '10px 20px',
              background: selectedType === type ? '#6366f1' : '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 120px 100px 80px',
          gap: '15px',
          padding: '15px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
          fontWeight: 700,
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <div>Rank</div>
          <div>Player</div>
          <div style={{ textAlign: 'right' }}>Score</div>
          <div style={{ textAlign: 'right' }}>XP</div>
          <div style={{ textAlign: 'center' }}>Tier</div>
        </div>

        {mockLeaderboard.map((player, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 120px 100px 80px',
              gap: '15px',
              padding: '15px',
              borderBottom: idx < mockLeaderboard.length - 1 ? '1px solid rgba(99, 102, 241, 0.1)' : 'none',
              background: player.isUser ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: player.rank <= 3 ? '#fbbf24' : 'rgba(255,255,255,0.8)' }}>
              {player.rank <= 3 ? ['🥇', '🥈', '🥉'][player.rank - 1] : player.rank}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{player.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                {player.isUser ? 'You' : 'Rank ' + player.rank}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
              {player.score.toFixed(0)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>
              {player.xp.toLocaleString()}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: player.tier === 'ultimate' ? 'rgba(251, 191, 36, 0.2)' : player.tier === 'elite' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: player.tier === 'ultimate' ? '#fbbf24' : player.tier === 'elite' ? '#ec4899' : '#6366f1',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}>
                {player.tier}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Your Rank Summary */}
      {userRank && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '10px' }}>Your Ranking</h3>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', margin: '10px 0' }}>
            #{userRank.rank} / {userRank.totalPlayers}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            {userRank.pointsToNextRank} points away from next rank
          </p>
        </div>
      )}
    </div>
  )
}
