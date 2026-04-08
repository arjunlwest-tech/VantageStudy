import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Stars, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

function Pillar({ position, text, isCorrect, onLeap }) {
  const [active, setActive] = useState(false)
  
  return (
    <group position={position}>
      <mesh onClick={() => onLeap(isCorrect)} onPointerOver={() => setActive(true)} onPointerOut={() => setActive(false)}>
        <boxGeometry args={[2, 0.5, 2]} />
        <meshStandardMaterial color={active ? "#6366f1" : "#1e293b"} />
      </mesh>
      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[1.8, 10, 1.8]} />
        <MeshTransmissionMaterial alphaHash background={new THREE.Color('#050816')} chromaticAberration={0.02} distortion={0} distortionScale={0} temporalDistortion={0} transmission={1} />
      </mesh>
      <Text position={[0, 0.6, 0]} fontSize={0.25} color="white" rotation={[-Math.PI / 4, 0, 0]} maxWidth={1.8}>
        {text}
      </Text>
    </group>
  )
}

export default function VoidClimb({ studySet, onComplete }) {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const questions = useMemo(() => studySet.quizQuestions.filter(q => q.type === 'mcq'), [studySet])
  const [activeQIdx, setActiveQIdx] = useState(0)
  const activeQ = questions[activeQIdx]

  const handleLeap = (correct) => {
    if (correct) {
      setScore(s => s + 250)
      if (activeQIdx + 1 < questions.length) {
        setActiveQIdx(i => i + 1)
      } else {
        onComplete(score + 250)
      }
    } else {
      setGameOver(true)
    }
  }

  if (gameOver || !activeQ) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050816', color: 'white' }}>
        <h1>FALLEN FROM GRACE</h1>
        <p>Your conceptual path was interrupted.</p>
        <button className="btn primary" onClick={() => onComplete(score)}>Claim {Math.round(score * 0.1)} XP</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: '#050816' }}>
      <Canvas camera={{ position: [0, 8, 10], rotation: [-Math.PI / 6, 0, 0] }}>
        <Stars />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 10, 0]} intensity={2} />
        
        <group position={[0, 0, -5]}>
          <Text position={[0, 4, -2]} fontSize={0.6} color="white" maxWidth={10}>{activeQ.question}</Text>
          {activeQ.options.map((opt, i) => (
             <Pillar 
               key={i + opt} 
               position={[(i - 1.5) * 3, 0, 0]} 
               text={opt} 
               isCorrect={opt === activeQ.correct} 
               onLeap={handleLeap}
             />
          ))}
        </group>

        {/* Floating background elements */}
        <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
          <mesh position={[-8, 4, -10]}>
            <torusKnotGeometry args={[1, 0.3, 100, 16]} />
            <meshStandardMaterial color="#6366f1" wireframe />
          </mesh>
        </Float>
      </Canvas>
      <div style={{ position: 'absolute', bottom: 40, right: 40, color: 'white' }}>
         <div style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'right' }}>STEP {activeQIdx + 1} / {questions.length}</div>
         <div style={{ fontSize: '2rem', fontWeight: 900 }}>SCORE: {score}</div>
      </div>
    </div>
  )
}
