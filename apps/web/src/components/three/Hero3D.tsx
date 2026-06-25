import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial, OrbitControls, ContactShadows } from '@react-three/drei';

/**
 * Live, interactive WebGL scene — drag to rotate, auto-rotates on its own.
 * Fully offline-safe: lit by explicit coloured lights (no network HDR/Environment),
 * so it renders identically with no internet. Kept to a few meshes for snappiness.
 */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      {/* coloured rim lights give the metal its indigo/fuchsia sheen without an HDR */}
      <pointLight position={[-4, 2, 2]} intensity={40} color="#6366f1" />
      <pointLight position={[4, -2, 3]} intensity={30} color="#d946ef" />

      <Float speed={1.4} rotationIntensity={1.2} floatIntensity={1.8}>
        <mesh scale={1.5} castShadow>
          <icosahedronGeometry args={[1, 8]} />
          <MeshDistortMaterial color="#6366f1" distort={0.42} speed={2} roughness={0.1} metalness={0.85} />
        </mesh>
      </Float>

      <Float speed={2} rotationIntensity={2} floatIntensity={2.4} position={[2.4, 1.3, -1]}>
        <mesh scale={0.45}>
          <torusGeometry args={[1, 0.4, 24, 48]} />
          <meshStandardMaterial color="#d946ef" roughness={0.2} metalness={0.7} />
        </mesh>
      </Float>

      <Float speed={1.7} rotationIntensity={1.6} floatIntensity={2} position={[-2.5, -1.2, -1]}>
        <mesh scale={0.5}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#22d3ee" roughness={0.25} metalness={0.6} />
        </mesh>
      </Float>

      <ContactShadows position={[0, -2.1, 0]} opacity={0.35} scale={10} blur={2.6} far={4} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.1} />
    </>
  );
}

export function Hero3D() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      shadows
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <Scene />
    </Canvas>
  );
}
