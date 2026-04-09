import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, MeshDistortMaterial, PerspectiveCamera, Stars, Environment } from '@react-three/drei'
import * as THREE from 'three'

function FloatingTile({ text, tileId, isDefinition, onSelect, activeId, matchedIds, matcherId }) {
  const ref = useRef()
  const isMatched = matchedIds.has(tileId)
  const isActive = activeId === tileId
  const isLinked = matcherId && matchedIds.has(matcherId)
  
  useFrame((state) => {
    if (ref.current && !isMatched) {
      ref.current.rotation.y += 0.005
      ref.current.position.y += Math.sin(state.clock.elapsedTime + tileId.charCodeAt(0)) * 0.002
    }
  })

  if (isMatched) return null

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={ref} onClick={() => onSelect(tileId, isDefinition)}>
        <boxGeometry args={[2.5, 1.2, 0.2]} />
        <meshStandardMaterial 
          color={isActive ? "#6366f1" : isDefinition ? "#ec4899" : "#10b981"} 
          transparent 
          opacity={isActive ? 0.8 : 0.15} 
          emissive={isActive ? "#6366f1" : isDefinition ? "#ec4899" : "#10b981"}
          emissiveIntensity={isActive ? 1 : 0.2}
          metalness={1}
          roughness={0}
        />
        <Text position={[0, 0, 0.11]} fontSize={0.18} color="white" maxWidth={2.2} textAlign="center" anchorX="center" anchorY="middle">
          {text}
        </Text>
      </mesh>
    </Float>
  )
}

export default function GravityMatch({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  const [activeTerm, setActiveTerm] = useState(null)
  const [matchedPairs, setMatchedPairs] = useState(new Set())
  
  const tiles = useMemo(() => {
    const cardLimit = 3 + (level?.difficulty || 1) * 1
    const cards = (studySet.flashcards || []).slice(0, Math.min(studySet.flashcards?.length || 0, cardLimit))
    
    const all = []
    cards.forEach((c, idx) => {
      const cardId = `card-${idx}`
      all.push({ 
        tileId: `term-${cardId}`, 
        cardId, 
        text: c.front, 
        isDef: false, 
        pos: [Math.random()*10-5, Math.random()*6-3, Math.random()*2] 
      })
      all.push({ 
        tileId: `def-${cardId}`, 
        cardId, 
        text: c.back, 
        isDef: true, 
        pos: [Math.random()*10-5, Math.random()*6-3, Math.random()*2] 
      })
    })
    return all.sort(() => Math.random() - 0.5)
  }, [studySet, level])

  const handleTileSelect = (tileId, isDef) => {
    // If already matched, ignore
    if (matchedPairs.has(tileId)) return

    // If this is the first selection
    if (!activeTerm) {
      setActiveTerm(tileId)
      return
    }

    // If clicking the same tile, deselect
    if (activeTerm === tileId) {
      setActiveTerm(null)
      return
    }

    // Get the card IDs from tile IDs
    const activeCardId = activeTerm.split('-')[1]
    const currentCardId = tileId.split('-')[1]
    const isActiveDefType = activeTerm.startsWith('def-')
    const isCurrentDefType = tileId.startsWith('def-')

    // Check if they're a valid pair (same card, different tile type)
    if (activeCardId === currentCardId && isActiveDefType !== isCurrentDefType) {
      // Correct match!
      setMatchedPairs(prev => new Set([...prev, activeTerm, tileId]))
      const newScore = score + 100
      setScore(newScore)
      setActiveTerm(null)
      
      if (newScore >= (tiles.length / 2) * 100) {
        setWin(true)
      }
    } else {
      // Wrong match
      setHealth(h => {
        const newHealth = h - 1
        if (newHealth <= 0) setGameOver(true)
        return newHealth
      })
      setActiveTerm(tileId) // Show the new selection
    }
  }

  if (win) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 12, color: '#10b981', textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>PERFECT ALIGNMENT</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>All Pairs Matched - Final Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * (level?.multiplier || 1))} XP</button>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 12 }}>GRAVITY COLLAPSE</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Too many mismatches - Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: 'radial-gradient(circle at center, #1e293b, #050816)' }}>
      <Canvas camera={{ position: [0, 0, 10] }} dpr={lowGraphics ? 1 : [1, 1.25]}>
        <ambientLight intensity={lowGraphics ? 1.2 : 1} />
        {!lowGraphics && <pointLight position={[10, 10, 10]} />}
        {!lowGraphics && <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />}
        {tiles.map((t) => (
          <group key={t.tileId} position={t.pos}>
            <FloatingTile 
              text={t.text} 
              tileId={t.tileId} 
              isDefinition={t.isDef}
              activeId={activeTerm} 
              matchedIds={matchedPairs}
              matcherId={activeTerm?.split('-')[1] === t.cardId && activeTerm !== t.tileId ? activeTerm : null}
              onSelect={handleTileSelect} 
            />
          </group>
        ))}
      </Canvas>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: '1rem', fontFamily: 'monospace' }}>
        <div>Health: {Array(health).fill('❤️').join('')}</div>
        <div>Pairs Matched: {matchedPairs.size / 2} / {tiles.length / 2}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px var(--accent)' }}>{score}</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>{level?.name || 'Gravity Match'}</div>
      </div>
    </div>
  )
}
