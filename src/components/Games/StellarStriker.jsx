import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, PerspectiveCamera, Stars } from '@react-three/drei'
import * as THREE from 'three'

function Laser({ position }) {
  const ref = useRef()
  useFrame((state, delta) => {
    if (ref.current) ref.current.position.z -= delta * 50
  })
  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
      <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={5} />
    </mesh>
  )
}

function Asteroid({ position, text, isTarget, onExplode, speed }) {
  const ref = useRef()
  const [exploded, setExploded] = useState(false)
  const [lasers, setLasers] = useState([])
  
  useFrame((state, delta) => {
    if (ref.current && !exploded) {
      ref.current.rotation.x += delta * 0.5
      ref.current.rotation.y += delta * 0.8
      ref.current.position.z += delta * speed
      
      if (ref.current.position.z > 5) {
         setExploded(true)
         onExplode(false) // Count as miss
      }
    }
  })

  const shoot = () => {
    setExploded(true)
    onExplode(isTarget)
  }

  if (exploded) return null

  return (
    <group ref={ref} position={position} onClick={shoot}>
      <mesh>
        <dodecahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#334155" roughness={1} />
      </mesh>
      <Text position={[0, 0, 1.3]} fontSize={0.3} color="white" maxWidth={2}>
        {text}
      </Text>
    </group>
  )
}

function Ship() {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.x = state.pointer.x * 5
      ref.current.position.y = state.pointer.y * 3
      ref.current.rotation.z = -state.pointer.x * 0.5
    }
  })

  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 1.5, 4]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

export default function StellarStriker({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  
  const questions = useMemo(() => (studySet?.quizQuestions || []).filter(q => q.type === 'mcq'), [studySet])
  
  // Difficulty Scaling
  const [activeQ, setActiveQ] = useState(() => questions.length > 0 ? questions[0] : null)
  const asteroidSpeed = 3 + (level?.difficulty || 1) * 1.5

  const onExplode = (success) => {
    if (success) {
      const newScore = score + 150
      setScore(newScore)
      if (newScore >= 1000) {
        setWin(true)
      } else {
        setActiveQ(questions[Math.floor(Math.random() * questions.length)])
      }
    } else {
      setGameOver(true)
    }
  }

  if (questions.length === 0) {
    return (
       <div style={{ padding: 40, textAlign: 'center', color: 'white' }}>
          <h3>Insufficient Data</h3>
          <p>This dimension requires MCQ questions in your study set.</p>
          <button className="btn" onClick={() => onComplete(0)}>Return</button>
       </div>
    )
  }

  if (win) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white' }}>
        <h1>MISSION ACCOMPLISHED</h1>
        <p>Target acquisition successful.</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  if (gameOver) {
     return (
       <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white' }}>
         <h1>SYSTEM COMPROMISED</h1>
         <p>Accuracy dropped below critical threshold.</p>
         <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
       </div>
     )
  }

  return (
    <div style={{ height: '100%', background: '#000' }}>
      <Canvas dpr={lowGraphics ? 1 : [1, 1.25]}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        {!lowGraphics && <Stars count={2000} />}
        <ambientLight intensity={lowGraphics ? 1.0 : 0.5} />
        {!lowGraphics && <pointLight position={[10, 10, 10]} intensity={2} />}
        <Ship />
        
        {activeQ && (
          <group>
             <Text position={[0, 4, 0]} fontSize={0.5} color="white" textAlign="center" maxWidth={10}>{activeQ.question}</Text>
             {activeQ.options.map((opt, i) => (
               <Asteroid 
                 key={opt + i} 
                 position={[(i - 1.5) * 4, (i % 2) * 2 - 1, -25 - (i * 8)]} 
                 text={opt} 
                 isTarget={opt === activeQ.correct}
                 onExplode={onExplode}
                 speed={asteroidSpeed}
               />
             ))}
          </group>
        )}
      </Canvas>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
         <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px var(--accent)' }}>{score}</div>
         <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>{level?.name || 'Vantage Sync'}</div>
      </div>
    </div>
  )
}
