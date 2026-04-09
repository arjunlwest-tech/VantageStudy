import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Stars, MeshTransmissionMaterial, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

function Pillar({ position, text, isCorrect, onLeap, lowGraphics, active }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  
  useFrame((state) => {
    if (ref.current) {
      const targetScale = hovered || active ? 1.2 : 1
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
      
      if (hovered || active) {
        ref.current.position.y += Math.sin(state.clock.elapsedTime * 5) * 0.01
      }
    }
  })
  
  return (
    <group 
      position={position}
      onClick={() => onLeap(isCorrect)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={ref}>
        <boxGeometry args={[2.2, 0.6, 2.2]} />
        <meshStandardMaterial 
          color={active ? "#10b981" : hovered ? "#6366f1" : "#1e293b"} 
          emissive={active ? "#10b981" : hovered ? "#6366f1" : "#000000"}
          emissiveIntensity={hovered || active ? 1 : 0}
        />
      </mesh>
      
      {/* Pillar support */}
      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[1.8, 10, 1.8]} />
        {lowGraphics ? (
          <meshStandardMaterial color="#050816" transparent opacity={0.8} />
        ) : (
          <MeshTransmissionMaterial 
            alphaHash 
            background={new THREE.Color('#050816')} 
            chromaticAberration={0.02} 
            distortion={0} 
            distortionScale={0} 
            temporalDistortion={0} 
            transmission={1} 
          />
        )}
      </mesh>
      
      <Text 
        position={[0, 0.6, 0]} 
        fontSize={0.25} 
        color="white" 
        rotation={[-Math.PI / 4, 0, 0]} 
        maxWidth={1.8}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  )
}

export default function VoidClimb({ studySet, lowGraphics, reduceMotion, onComplete, level }) {
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [win, setWin] = useState(false)
  const [height, setHeight] = useState(0)
  
  const questions = useMemo(() => (studySet.quizQuestions || []).filter(q => q.type === 'mcq'), [studySet])
  
  const baseSpacing = 3 + (level?.difficulty || 1) * 0.2
  const [activeQIdx, setActiveQIdx] = useState(0)
  const activeQ = questions[activeQIdx]

  const handleLeap = (correct) => {
    if (correct) {
      const newScore = score + 250
      const newHeight = height + 1
      setScore(newScore)
      setHeight(newHeight)
      
      if (activeQIdx + 1 >= questions.length) {
        setWin(true)
      } else {
        setActiveQIdx(i => i + 1)
      }
    } else {
      const newHealth = health - 1
      setHealth(newHealth)
      if (newHealth <= 0) {
        setGameOver(true)
      }
    }
  }

  if (gameOver) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 12 }}>FALLEN FROM GRACE</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Your path collapsed at Height {height} - Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  if (win || !activeQ) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 12, color: '#10b981', textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>APEX REACHED</h2>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Climbed to Height {height} - Final Score: {score}</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * (level?.multiplier || 1))} XP</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: '#050816' }}>
      <Canvas 
        camera={{ position: [0, 8 + height * 0.5, 10], rotation: [-Math.PI / 6, 0, 0], fov: 60 }} 
        dpr={lowGraphics ? 1 : [1, 1.25]}
      >
        {!lowGraphics && <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />}
        <ambientLight intensity={lowGraphics ? 1.0 : 0.5} />
        <pointLight position={[0, 10 + height * 0.5, 0]} intensity={lowGraphics ? 1 : 2} />
        
        <group position={[0, height * 3.5, -5]}>
          <Text position={[0, 4, -2]} fontSize={0.6} color="white" maxWidth={10} anchorX="center" anchorY="middle">
            {activeQ.question}
          </Text>
          {activeQ.options.map((opt, i) => (
            <Pillar 
              key={i + opt} 
              position={[(i - 1.5) * baseSpacing, 0, 0]} 
              text={opt} 
              isCorrect={opt === activeQ.correct} 
              onLeap={handleLeap}
              lowGraphics={lowGraphics}
              active={false}
            />
          ))}
        </group>

        {/* Floating background elements */}
        {!lowGraphics && (
          <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
            <mesh position={[-8, 4, -10]}>
              <torusKnotGeometry args={[1, 0.3, 100, 16]} />
              <meshStandardMaterial color="#6366f1" wireframe />
            </mesh>
          </Float>
        )}
      </Canvas>
      
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontSize: '1rem', fontFamily: 'monospace' }}>
        <div>Health: {Array(health).fill('❤️').join('')}</div>
        <div>Height: {height} / {questions.length}</div>
      </div>
      
      <div style={{ position: 'absolute', bottom: 40, right: 40, color: 'white' }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'right' }}>STEP {activeQIdx + 1} / {questions.length}</div>
        <div style={{ fontSize: '2rem', fontWeight: 900 }}>SCORE: {score}</div>
      </div>
    </div>
  )
}
