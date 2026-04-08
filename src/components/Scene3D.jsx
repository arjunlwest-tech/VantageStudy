import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, MeshTransmissionMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

/* Floating wireframe geometry with distortion */
function FloatingGeo({ position, scale, speed, color, shape }) {
  const ref = useRef()
  useFrame((s) => {
    const t = s.clock.getElapsedTime() * speed
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.5
    ref.current.rotation.y = Math.cos(t * 0.3) * 0.5
    ref.current.rotation.z = Math.sin(t * 0.2) * 0.25
    ref.current.position.y = position[1] + Math.sin(t) * 0.4
  })
  const geo = useMemo(() => {
    switch (shape) {
      case 'icosahedron': return <icosahedronGeometry args={[1, 1]} />
      case 'octahedron': return <octahedronGeometry args={[1, 0]} />
      case 'torus': return <torusGeometry args={[1, 0.3, 16, 40]} />
      case 'torusKnot': return <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />
      case 'dodecahedron': return <dodecahedronGeometry args={[1, 0]} />
      case 'sphere': return <sphereGeometry args={[1, 16, 16]} />
      case 'tetrahedron': return <tetrahedronGeometry args={[1, 0]} />
      default: return <icosahedronGeometry args={[1, 1]} />
    }
  }, [shape])
  return (
    <Float speed={speed * 1.5} rotationIntensity={0.3} floatIntensity={0.7}>
      <mesh ref={ref} position={position} scale={scale}>
        {geo}
        <MeshDistortMaterial color={color} transparent opacity={0.1} wireframe distort={0.15} speed={1.2} />
      </mesh>
    </Float>
  )
}


/* Particle field that slowly rotates and responds to mouse */
function ParticleField() {
  const count = 150
  const ref = useRef()
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 30
    return pos
  }, [])
  
  // Create a ref to store a smoothed mouse position
  const mouseRef = useRef({ x: 0, y: 0 })
  
  useFrame((s) => {
    const t = s.clock.getElapsedTime()
    
    // Smooth the pointer value directly within this block
    mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, s.pointer.x || 0, 0.05)
    mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, s.pointer.y || 0, 0.05)
    
    ref.current.rotation.y = t * 0.01 + (mouseRef.current.x * 0.1)
    ref.current.rotation.x = Math.sin(t * 0.08) * 0.04 - (mouseRef.current.y * 0.1)
  })
  
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial size={0.025} color="#818cf8" transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

export default function Scene3D() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 5, 5]} intensity={0.2} />
        <pointLight position={[-6, -4, -3]} intensity={0.08} color="#6366f1" />
        <pointLight position={[6, 3, 2]} intensity={0.08} color="#ec4899" />
        <pointLight position={[0, -5, 4]} intensity={0.05} color="#22d3ee" />

        {/* Large dramatic shapes */}
        <FloatingGeo position={[-5, 2.5, -4]} scale={0.9} speed={0.35} color="#6366f1" shape="icosahedron" />
        <FloatingGeo position={[5, -2, -5]} scale={0.7} speed={0.28} color="#a78bfa" shape="octahedron" />
        <FloatingGeo position={[-3.5, -3, -3]} scale={0.55} speed={0.45} color="#ec4899" shape="torusKnot" />
        <FloatingGeo position={[4, 3, -6]} scale={0.8} speed={0.32} color="#22d3ee" shape="dodecahedron" />
        <FloatingGeo position={[0, -4, -7]} scale={1} speed={0.2} color="#818cf8" shape="torus" />
        <FloatingGeo position={[-6, 0, -5]} scale={0.45} speed={0.5} color="#10b981" shape="octahedron" />
        <FloatingGeo position={[6.5, 1, -8]} scale={0.65} speed={0.25} color="#f59e0b" shape="sphere" />
        <FloatingGeo position={[-1, 4, -6]} scale={0.5} speed={0.38} color="#6366f1" shape="icosahedron" />
        
        {/* NEW SHAPES */}
        <FloatingGeo position={[-7, -3, -8]} scale={0.6} speed={0.4} color="#ec4899" shape="tetrahedron" />
        <FloatingGeo position={[8, -4, -6]} scale={0.8} speed={0.3} color="#22d3ee" shape="torusKnot" />
        <FloatingGeo position={[3, 5, -9]} scale={0.5} speed={0.45} color="#a78bfa" shape="icosahedron" />
        <FloatingGeo position={[-4, 6, -10]} scale={0.7} speed={0.2} color="#10b981" shape="dodecahedron" />

        {/* Additional wireframes to replace glass spheres */}
        <FloatingGeo position={[2.5, 1.5, -2.5]} scale={0.35} speed={0.4} color="#6366f1" shape="torusKnot" />
        <FloatingGeo position={[-2.5, -1.5, -3.5]} scale={0.25} speed={0.5} color="#ec4899" shape="octahedron" />
        <FloatingGeo position={[0, 3, -4]} scale={0.2} speed={0.6} color="#22d3ee" shape="dodecahedron" />
        <FloatingGeo position={[4, -3, -6]} scale={0.4} speed={0.3} color="#f59e0b" shape="icosahedron" />
        <FloatingGeo position={[-5, 0, -8]} scale={0.3} speed={0.4} color="#a78bfa" shape="tetrahedron" />

        {/* Sparkles */}
        <Sparkles count={100} size={1.5} scale={20} speed={0.3} opacity={0.15} color="#818cf8" />

        <ParticleField />
      </Canvas>
    </div>
  )
}
