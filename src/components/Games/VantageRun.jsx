import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, PerspectiveCamera, Environment, Stars, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

function AnswerGate({ position, text, isCorrect, onHit }) {
  const ref = useRef()
  
  useFrame((state) => {
    if (ref.current) {
      // Glow pulse
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05
      ref.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={position}>
      <mesh ref={ref}>
        <torusGeometry args={[1.5, 0.05, 16, 32]} />
        <meshStandardMaterial color={isCorrect ? "#10b981" : "#6366f1"} emissive={isCorrect ? "#10b981" : "#6366f1"} emissiveIntensity={2} transparent opacity={0.6} />
      </mesh>
      <Text position={[0, 0, 0.1]} fontSize={0.3} color="white" maxWidth={2.5} textAlign="center" anchorX="center" anchorY="middle">
        {text}
      </Text>
    </group>
  )
}

function Player({ position, targetLane }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetLane * 3, 0.15)
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <MeshDistortMaterial color="#ffffff" emissive="#6366f1" emissiveIntensity={2} distort={0.4} speed={5} />
    </mesh>
  )
}

function Track({ speed }) {
  const ref = useRef()
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.position.z += speed * delta
      if (ref.current.position.z > 20) ref.current.position.z = 0
    }
  })

  return (
    <gridHelper ref={ref} args={[100, 20, "#1e293b", "#334155"]} rotation={[0, 0, 0]} position={[0, -1, 0]} />
  )
}

export default function VantageRun({ studySet, lowGraphics, reduceMotion, onComplete }) {
  const [lane, setLane] = useState(0) // -1, 0, 1
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [speed, setSpeed] = useState(8)
  
  const questions = useMemo(() => studySet.quizQuestions.filter(q => q.type === 'mcq'), [studySet])

  useEffect(() => {
    if (!activeQuestion && questions.length > 0) {
      setActiveQuestion(questions[Math.floor(Math.random() * questions.length)])
    }
  }, [activeQuestion, questions])

  const handlePortal = (isCorrect) => {
    if (isCorrect) {
      setScore(s => s + 100)
      setSpeed(s => Math.min(s + 0.5, 20))
      setActiveQuestion(null)
    } else {
      setGameOver(true)
    }
  }

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setLane(l => Math.max(l - 1, -1))
      if (e.key === 'ArrowRight' || e.key === 'd') setLane(l => Math.min(l + 1, 1))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (gameOver) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 12 }}>DE-SYNCED</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Session Stability Lost at Score {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', cursor: 'none' }}>
      <Canvas shadows={!lowGraphics} dpr={lowGraphics ? 1 : [1, 1.5]}>
        <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={60} />
        <ambientLight intensity={lowGraphics ? 1.0 : 0.5} />
        {!lowGraphics && <pointLight position={[10, 10, 10]} intensity={1} />}
        {!lowGraphics && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
        {!lowGraphics && <Environment preset="city" />}

        <Player position={[0, 0, 0]} targetLane={lane} />
        <Track speed={speed} />

        {activeQuestion && (
          <group>
            <Text position={[0, 4, -10]} fontSize={0.6} color="white" maxWidth={8} textAlign="center">
              {activeQuestion.question}
            </Text>
            {activeQuestion.options.map((opt, idx) => {
              const xPos = (idx - 1) * 3 // Spread across -3, 0, 3 (lanes)
              const isCorrect = opt === activeQuestion.correct
              return (
                <MovingGate 
                  key={idx} 
                  position={[xPos, 0, -20]} 
                  speed={speed} 
                  text={opt} 
                  isCorrect={isCorrect} 
                  targetLane={lane}
                  onHit={() => handlePortal(isCorrect)} 
                />
              )
            })}
          </group>
        )}
      </Canvas>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
         <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px var(--accent)' }}>{score}</div>
         <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>Vantage Sync Score</div>
      </div>
    </div>
  )
}

function MovingGate({ position, speed, text, isCorrect, targetLane, onHit }) {
  const ref = useRef()
  const [hit, setHit] = useState(false)
  const initialZ = position[2]

  useFrame((state, delta) => {
    if (ref.current && !hit) {
      ref.current.position.z += speed * delta
      
      // Collision detection
      if (ref.current.position.z > -0.5 && ref.current.position.z < 0.5) {
         const currentLane = Math.round(ref.current.position.x / 3)
         if (currentLane === targetLane) {
            setHit(true)
            onHit()
         }
      }

      // Cleanup
      if (ref.current.position.z > 5) {
         // Missed portal or passed through wrong one logic handled by game over if not hitting correct
         // But here we just hide it
      }
    }
  })

  return (
    <group ref={ref} position={position}>
      <AnswerGate text={text} isCorrect={isCorrect} />
    </group>
  )
}
