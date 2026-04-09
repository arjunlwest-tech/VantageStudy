import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, PerspectiveCamera, Environment, Stars } from '@react-three/drei'
import * as THREE from 'three'

function Player({ position, health }) {
  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 0.2, 8]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={health > 0 ? 1 : 0} />
      </mesh>
    </group>
  )
}

function Asteroid({ position, answer, isCorrect, targetAnswer, level, lowGraphics, onHit, onMiss }) {
  const ref = useRef()
  const [health, setHealth] = useState(3)
  const rotVel = useRef([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5])

  useFrame((state, delta) => {
    if (ref.current && health > 0) {
      ref.current.position.z += (5 + (level?.difficulty || 1) * 1.5) * delta
      ref.current.rotation.x += rotVel.current[0] * delta
      ref.current.rotation.y += rotVel.current[1] * delta
      ref.current.rotation.z += rotVel.current[2] * delta

      if (ref.current.position.z > 10) {
        setHealth(-1)
        if (isCorrect) onMiss()
      }
    }
  })

  const handleShot = (correct) => {
    if (correct && isCorrect) {
      setHealth(h => h - 1)
      if (health <= 1) {
        onHit(true)
      }
    } else if (!correct && !isCorrect) {
      setHealth(h => h - 1)
      if (health <= 1) {
        onHit(true)
      }
    } else if (health > 0) {
      onHit(false)
    }
  }

  if (health <= 0) return null

  return (
    <group ref={ref} position={position} onClick={() => handleShot(answer === targetAnswer)}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.6, 4]} />
        <meshStandardMaterial 
          color={isCorrect ? "#10b981" : "#f43f5e"} 
          emissive={isCorrect ? "#10b981" : "#f43f5e"} 
          emissiveIntensity={lowGraphics ? 1 : 1.5} 
          wireframe={health <= 1}
        />
      </mesh>
      <Text fontSize={0.25} color="white" position={[0, 0, 0.65]} anchorX="center" anchorY="middle" maxWidth={1.5}>
        {answer}
      </Text>
      {health <= 2 && <mesh position={[0.7, 0, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#ff6b6b" onClick={(e) => e.stopPropagation()} /></mesh>}
    </group>
  )
}

export default function StellarStriker({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [playerPos, setPlayerPos] = useState([0, -3, 0])
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  const [asteroids, setAsteroids] = useState([])
  const [gameTime, setGameTime] = useState(0)
  const timerRef = useRef()

  const questions = useMemo(() => studySet.quizQuestions?.filter(q => q.type === 'mcq') || [], [studySet])
  const [currentQuestion, setCurrentQuestion] = useState(null)

  useEffect(() => {
    if (questions.length > 0 && !currentQuestion) {
      setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)])
    }
  }, [questions, currentQuestion])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setGameTime(t => {
        if (t >= 30) {
          setWin(true)
          return t
        }
        return t + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      setPlayerPos(p => {
        if (e.key === 'ArrowLeft' || e.key === 'a') return [Math.max(p[0] - 0.5, -4), p[1], p[2]]
        if (e.key === 'ArrowRight' || e.key === 'd') return [Math.min(p[0] + 0.5, 4), p[1], p[2]]
        if (e.key === 'ArrowUp' || e.key === 'w') return [p[0], Math.min(p[1] + 0.5, 3), p[2]]
        if (e.key === 'ArrowDown' || e.key === 's') return [p[0], Math.max(p[1] - 0.5, -3), p[2]]
        return p
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      if (!gameOver && !win && currentQuestion) {
        const newAsteroid = {
          id: Math.random(),
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 6,
          answer: currentQuestion.options[Math.floor(Math.random() * currentQuestion.options.length)],
          isCorrect: Math.random() < 0.6,
          z: -15
        }
        setAsteroids(prev => {
          const updated = [...prev, newAsteroid]
          return updated.length > 12 ? updated.slice(-12) : updated
        })
      }
    }, 1200 - (level?.difficulty || 1) * 100)

    return () => clearInterval(spawnInterval)
  }, [gameOver, win, currentQuestion, level?.difficulty])

  const handleAsteroidHit = (correct) => {
    if (correct) {
      setScore(s => s + 150)
    } else {
      setHealth(h => {
        const newHealth = h - 1
        if (newHealth <= 0) setGameOver(true)
        return newHealth
      })
    }
  }

  const handleAsteroidMiss = () => {
    setHealth(h => {
      const newHealth = h - 1
      if (newHealth <= 0) setGameOver(true)
      return newHealth
    })
  }

  if (win) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 12, color: '#fbbf24', textShadow: '0 0 30px rgba(251,191,36,0.3)' }}>SECTOR SECURED</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Time Survived: 30 seconds - Final Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * (level?.multiplier || 1))} XP</button>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 12 }}>SHIELD BREACHED</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Combat Failed at Score {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
        <ambientLight intensity={lowGraphics ? 1 : 0.5} />
        {!lowGraphics && <pointLight position={[10, 10, 10]} intensity={1} />}
        {!lowGraphics && <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />}
        {!lowGraphics && <Environment preset="space" />}

        <Player position={playerPos} health={health} />

        {currentQuestion && asteroids.map(ast => (
          <Asteroid
            key={ast.id}
            position={[ast.x, ast.y, ast.z]}
            answer={ast.answer}
            isCorrect={ast.isCorrect}
            targetAnswer={currentQuestion.correct}
            level={level}
            lowGraphics={lowGraphics}
            onHit={handleAsteroidHit}
            onMiss={handleAsteroidMiss}
          />
        ))}
      </Canvas>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: '1rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '8px' }}>Health: {Array(health).fill('❤️').join('')}</div>
        <div style={{ marginBottom: '8px' }}>Score: {score}</div>
        <div style={{ marginBottom: '8px' }}>Time: {gameTime}s / 60s</div>
        {currentQuestion && <div style={{ marginTop: '10px', maxWidth: '300px', fontSize: '0.9rem' }}>{currentQuestion.question}</div>}
      </div>
    </div>
  )
}
