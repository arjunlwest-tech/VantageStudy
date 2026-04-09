import React, { useState, useMemo } from 'react'
import { TOURNAMENT_MODES } from '../lib/premium'

export default function Tournaments({ userStats, onJoinTournament }) {
  const [selectedMode, setSelectedMode] = useState(null)
  const [joinedTournaments, setJoinedTournaments] = useState([])

  const activeTournaments = useMemo(() => {
    return TOURNAMENT_MODES.map(mode => ({
      ...mode,
      participants: Math.floor(Math.random() * 500) + 50,
      prizePool: mode.name === 'Daily Duel' ? 500 : mode.name === 'Weekly Battle' ? 2500 : mode.name === 'Monthly Championship' ? 10000 : 50000,
      startTime: mode.name === 'Daily Duel' ? 'Starts in 2 hours' : 'Starts in 3 days',
      joined: joinedTournaments.includes(mode.id)
    }))
  }, [joinedTournaments])

  const handleJoinTournament = (tournament) => {
    if (!joinedTournaments.includes(tournament.id)) {
      setJoinedTournaments([...joinedTournaments, tournament.id])
      onJoinTournament?.(tournament)
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '10px', textAlign: 'center' }}>
        🏆 Tournaments
      </h2>
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '40px' }}>
        Compete against other players and win exclusive rewards
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {activeTournaments.map((tourn) => (
          <div
            key={tourn.id}
            style={{
              padding: '25px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: `2px solid ${tourn.joined ? '#10b981' : '#1e293b'}`,
              borderRadius: '12px',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>{tourn.name}</h3>
              {tourn.joined && <span style={{ background: '#10b981', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>✓ JOINED</span>}
            </div>

            <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.8', marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px' }}>🎮 Duration: {tourn.duration}</div>
              <div style={{ marginBottom: '8px' }}>👥 Participants: {tourn.participants}</div>
              <div style={{ marginBottom: '8px' }}>💰 Prize Pool: ${tourn.prizePool.toLocaleString()}</div>
              <div style={{ marginBottom: '8px' }}>⏰ {tourn.startTime}</div>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.7)'
            }}>
              <strong>Requirements:</strong> {tourn.minRequirements || 'None'}
            </div>

            <button
              onClick={() => handleJoinTournament(tourn)}
              disabled={tourn.joined}
              style={{
                width: '100%',
                padding: '12px',
                background: tourn.joined ? '#10b981' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: tourn.joined ? 'default' : 'pointer',
                fontWeight: 700,
                opacity: tourn.joined ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => !tourn.joined && (e.target.style.opacity = '0.8')}
              onMouseOut={(e) => !tourn.joined && (e.target.style.opacity = '1')}
            >
              {tourn.joined ? '✓ Registered' : 'Register Now'}
            </button>
          </div>
        ))}
      </div>

      {/* Your Tournament Stats */}
      {userStats && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '25px',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', fontWeight: 900 }}>Your Tournament Stats</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            <div style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '5px' }}>Total Wins</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>{userStats.tournamentWins || 0}</div>
            </div>
            <div style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '5px' }}>Current Streak</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#6366f1' }}>{userStats.currentStreak || 0}</div>
            </div>
            <div style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '5px' }}>Tournaments Entered</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ec4899' }}>{joinedTournaments.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
