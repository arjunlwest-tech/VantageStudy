import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Stars, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

function Well({ position, name, color, isTarget, onCapture }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
       ref.current.rotation.y += 0.02
       const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
       ref.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={position}>
      <mesh ref={ref}>
        <torusKnotGeometry args={[1.5, 0.4, 128, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} wireframe />
      </mesh>
      <Text position={[0, -2.5, 0]} fontSize={0.5} color="white" fontWeight="900">{name}</Text>
    </group>
  )
}

function FloatingTerm({ text, category, wells, onSort, speed }) {
  const ref = useRef()
  const [captured, setCaptured] = useState(false)

  useFrame((state, delta) => {
    if (ref.current && !captured) {
      ref.current.position.z += delta * speed
      
      // Auto-fail if it passes
      if (ref.current.position.z > 5) {
        setCaptured(true)
        onSort(null) // Miss
      }
    }
  })

  const handleCapture = (wellName) => {
    setCaptured(true)
    onSort(wellName === category)
  }

  if (captured) return null

  return (
    <group ref={ref}>
       <Float speed={5} rotationIntensity={2} floatIntensity={1}>
         <mesh>
           <octahedronGeometry args={[0.8, 0]} />
           <meshStandardMaterial color="#ffffff" emissive="#6366f1" emissiveIntensity={1} />
         </mesh>
         <Text position={[0, 0, 1]} fontSize={0.3} color="white" maxWidth={2} textAlign="center">
           {text}
         </Text>
       </Float>
       
       {wells.map((well, idx) => (
         <mesh 
           key={well.name} 
           position={[well.position[0], well.position[1], 0]} 
           visible={false} 
           onClick={() => handleCapture(well.name)}
         >
           <sphereGeometry args={[2]} />
           <meshBasicMaterial transparent opacity={0} />
         </mesh>
       ))}
    </group>
  )
}

export default function NebulaSort({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [score, setScore] = useState(0)
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
      if (newScore >= 1000) {
        setWin(true)
      } else {
        setActiveIdx(i => (i + 1) % questions.length)
      }
    } else {
      setGameOver(true)
    }
  }

  if (!activeQ) return null

  if (win || gameOver) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>{win ? 'DIMENSION STABILIZED' : 'NEURAL COLLAPSE'}</h1>
        <p>{win ? 'Categories correctly reconciled.' : 'Cognitive sorting threshold breached.'}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: '#000' }}>
      <Canvas dpr={lowGraphics ? 1 : [1, 1.25]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        {!lowGraphics && <Stars count={3000} />}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        
        {wells.map(w => <Well key={w.name} {...w} />)}
        
        <FloatingTerm 
          key={activeQ.question}
          text={activeQ.question} 
          category={activeQ.correct} 
          wells={wells}
          speed={3 + (level?.difficulty || 1) * 0.8}
          onSort={onSort}
        />
      </Canvas>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
         <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px var(--accent)' }}>{score}</div>
         <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>{level?.name || 'Vantage Sync'}</div>
         <div style={{ color: 'white', fontSize: '0.9rem', marginTop: 10 }}>Click the Gravity Well matching the concept</div>
      </div>
    </div>
  )
}
