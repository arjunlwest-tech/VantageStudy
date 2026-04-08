import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, PerspectiveCamera, Stars } from '@react-three/drei'
import * as THREE from 'three'

function Asteroid({ position, text, isTarget, onExplode }) {
  const ref = useRef()
  const [exploded, setExploded] = useState(false)
  
  useFrame((state, delta) => {
    if (ref.current && !exploded) {
      ref.current.rotation.x += delta * 0.5
      ref.current.rotation.y += delta * 0.8
      ref.current.position.z += delta * 4
      
      if (ref.current.position.z > 5) {
        // Recycle or handle missed
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

export default function StellarStriker({ studySet, lowGraphics, reduceMotion, onComplete }) {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  const questions = useMemo(() => (studySet?.quizQuestions || []).filter(q => q.type === 'mcq'), [studySet])
  
  // Safe default for state initialization
  const [activeQ, setActiveQ] = useState(() => questions.length > 0 ? questions[0] : null)

  const onExplode = (success) => {
    if (success) {
      setScore(s => s + 150)
      setActiveQ(questions[Math.floor(Math.random() * questions.length)])
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
                 position={[(i - 1.5) * 4, (i % 2) * 2 - 1, -20 - (i * 5)]} 
                 text={opt} 
                 isTarget={opt === activeQ.correct}
                 onExplode={onExplode}
               />
             ))}
          </group>
        )}
      </Canvas>
      <div style={{ position: 'absolute', top: 40, right: 40, color: 'white', fontFamily: 'monospace', fontSize: '1.5rem' }}>SCORE: {score}</div>
    </div>
  )
}
