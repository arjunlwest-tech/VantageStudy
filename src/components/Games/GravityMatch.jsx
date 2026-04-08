import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

function FloatingTile({ text, id, isDefinition, onSelect, activeId, matchedIds }) {
  const ref = useRef()
  const isMatched = matchedIds.has(id)
  const isActive = activeId === id
  
  useFrame((state) => {
    if (ref.current && !isMatched) {
      ref.current.rotation.y += 0.005
      ref.current.position.y += Math.sin(state.clock.elapsedTime + id.length) * 0.002
    }
  })

  if (isMatched) return null

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={ref} onClick={() => onSelect(id, isDefinition)}>
        <boxGeometry args={[2.5, 1.2, 0.2]} />
        <meshStandardMaterial 
          color={isMatched ? "#10b981" : isActive ? "#6366f1" : "#ffffff"} 
          transparent 
          opacity={isMatched ? 0.3 : 0.15} 
          metalness={1}
          roughness={0}
        />
        <Text position={[0, 0, 0.11]} fontSize={0.2} color="white" maxWidth={2.2} textAlign="center">
          {text}
        </Text>
      </mesh>
    </Float>
  )
}

export default function GravityMatch({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  const [activeTerm, setActiveTerm] = useState(null)
  const [activeDef, setActiveDef] = useState(null)
  const [matchedIds, setMatchedIds] = useState(new Set())
  
  const tiles = useMemo(() => {
    const cardLimit = 4 + (level?.difficulty || 1) * 2
    const cards = studySet.flashcards.slice(0, Math.min(studySet.flashcards.length, cardLimit))
    const all = []
    cards.forEach(c => {
      all.push({ id: c.id, text: c.front, isDef: false, pos: [Math.random()*10-5, Math.random()*6-3, Math.random()*4-2] })
      all.push({ id: c.id, text: c.back, isDef: true, pos: [Math.random()*10-5, Math.random()*6-3, Math.random()*4-2] })
    })
    return all.sort(() => Math.random() - 0.5)
  }, [studySet, level])

  useEffect(() => {
    if (activeTerm && activeDef) {
       const isCorrect = activeTerm === activeDef
       if (isCorrect) {
          setMatchedIds(prev => new Set([...prev, activeTerm]))
          const newScore = score + 100
          setScore(newScore)
          if (newScore >= 1000) {
            setWin(true)
          }
       }
       setTimeout(() => {
         setActiveTerm(null)
         setActiveDef(null)
       }, 500)
    }
  }, [activeTerm, activeDef, score])

  useEffect(() => {
    if (matchedIds.size === tiles.length / 2 && tiles.length > 0) {
      onComplete(score)
    }
  }, [matchedIds, tiles, score, onComplete])

  return (
    <div style={{ height: '100%', background: 'radial-gradient(circle at center, #1e293b, #050816)' }}>
      <Canvas camera={{ position: [0, 0, 10] }} dpr={lowGraphics ? 1 : [1, 1.25]}>
        <ambientLight intensity={lowGraphics ? 1.2 : 1} />
        {!lowGraphics && <pointLight position={[10, 10, 10]} />}
        {tiles.map((t, i) => (
          <group key={t.id + (t.isDef ? 'd' : 't')} position={t.pos}>
            <FloatingTile 
              text={t.text} 
              id={t.id} 
              isDefinition={t.isDef}
              activeId={t.isDef ? activeDef : activeTerm} 
              matchedIds={matchedIds}
              onSelect={(id, isDef) => isDef ? setActiveDef(id) : setActiveTerm(id)} 
            />
          </group>
        ))}
      </Canvas>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
         <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px var(--accent)' }}>{score}</div>
         <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>{level?.name || 'Vantage Sync'}</div>
      </div>
    </div>
  )
}
