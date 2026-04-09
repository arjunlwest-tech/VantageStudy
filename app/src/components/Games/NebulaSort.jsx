import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Stars, PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'

function Well({ position, name, color, isTarget, onCapture, lowGraphics }) {
  const ref = useRef()
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.02
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1 + (hovered ? 0.15 : 0)
      ref.current.scale.set(s, s, s)
    }
  })

  return (
    <group 
      position={position}
      ref={ref}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onCapture(name); }}
    >
      <mesh>
        <torusKnotGeometry args={[1.5, 0.4, 128, 16]} />
        <meshStandardMaterial 
          color={hovered ? '#ffffff' : color} 
          emissive={color} 
          emissiveIntensity={hovered ? 2 : 1.5} 
          wireframe 
        />
      </mesh>
      <Text position={[0, -2.8, 0]} fontSize={0.5} color={color} fontWeight="900" anchorX="center" anchorY="middle">
        {name}
      </Text>
    </group>
  )
}

function FloatingTerm({ text, category, wells, onSort, speed, lowGraphics }) {
  const ref = useRef()
  const [captured, setCaptured] = useState(false)
  const [moving, setMoving] = useState(true)

  useFrame((state, delta) => {
    if (ref.current && moving && !captured) {
      ref.current.position.z += delta * speed
      
      // Auto-fail if it passes
      if (ref.current.position.z > 5) {
        setCaptured(true)
        setMoving(false)
        onSort(false)
      }
    }
  })

  const handleCapture = (wellName) => {
    setCaptured(true)
    setMoving(false)
    onSort(wellName === category)
  }

  if (captured && !moving) return null

  return (
    <group ref={ref} position={[0, 0, -15]}>
      <Float speed={5} rotationIntensity={2} floatIntensity={1}>
        <mesh
          onClick={(e) => e.stopPropagation()}
        >
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial 
            color="#ffffff" 
            emissive="#6366f1" 
            emissiveIntensity={2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <Text 
          position={[0, 0, 1.1]} 
          fontSize={0.3} 
          color="white" 
          maxWidth={2.5} 
          textAlign="center"
          anchorX="center"
          anchorY="middle"
        >
          {text}
        </Text>
      </Float>
      
      {/* Collision zones for wells (invisible) */}
      {wells.map((well) => (
        <mesh
          key={well.name}
          position={well.position}
          visible={false}
          onClick={(e) => { e.stopPropagation(); handleCapture(well.name); }}
        >
          <sphereGeometry args={[2.5]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      ))}
    </group>
  )
}

export default function NebulaSort({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  
  const questions = useMemo(() => {
    const mcqs = (studySet?.quizQuestions || []).filter(q => q.type === 'mcq')
    return mcqs.sort(() => Math.random() - 0.5)
  }, [studySet])

  const [activeIdx, setActiveIdx] = useState(0)
  const activeQ = questions[activeIdx]

  const wells = useMemo(() => {
    if (!activeQ) return []
    // Use first 2 options as category wells
    return activeQ.options.slice(0, 2).map((opt, i) => ({
      name: opt,
      position: [i === 0 ? -6 : 6, 0, 0],
      color: i === 0 ? "#6366f1" : "#ec4899"
    }))
  }, [activeQ])

  const onSort = (success) => {
    if (success) {
      const newScore = score + 200
      setScore(newScore)
      
      if (activeIdx + 1 >= questions.length) {
        setWin(true)
      } else {
        setActiveIdx(i => i + 1)
      }
    } else {
      const newHealth = health - 1
      setHealth(newHealth)
      if (newHealth <= 0) {
        setGameOver(true)
      }
    }
  }

  if (!activeQ) return null

  if (win) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 12, color: '#10b981', textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>DIMENSION STABILIZED</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>All categories correctly reconciled - Final Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * (level?.multiplier || 1))} XP</button>
      </div>
    )
  }

  if (gameOver) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 12 }}>COGNITIVE COLLAPSE</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Sorting threshold breached - Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: '#000' }}>
      <Canvas dpr={lowGraphics ? 1 : [1, 1.25]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={60} />
        {!lowGraphics && <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />}
        {!lowGraphics && <Environment preset="space" />}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        
        {wells.map(w => (
          <Well 
            key={w.name} 
            position={w.position}
            name={w.name} 
            color={w.color}
            lowGraphics={lowGraphics}
            onCapture={(name) => onSort(name === activeQ.correct)}
          />
        ))}
        
        <FloatingTerm 
          key={activeQ.question + activeIdx}
          text={activeQ.question} 
          category={activeQ.correct} 
          wells={wells}
          speed={2 + (level?.difficulty || 1) * 0.3}
          lowGraphics={lowGraphics}
          onSort={onSort}
        />
      </Canvas>
      
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: '1rem', fontFamily: 'monospace' }}>
        <div>Health: {Array(health).fill('❤️').join('')}</div>
        <div>Categories Sorted: {activeIdx} / {questions.length}</div>
      </div>
      
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px var(--accent)' }}>{score}</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>{level?.name || 'Nebula Sort'}</div>
        <div style={{ color: 'white', fontSize: '0.9rem', marginTop: 10 }}>Click the Gravity Well matching the concept</div>
      </div>
    </div>
  )
}
