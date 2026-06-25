import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, ContactShadows } from '@react-three/drei';
import { type MotionValue } from 'motion/react';

/**
 * The hero centrepiece: a faceted, distorting "core" that reacts to the pointer
 * (parallax tilt) and to scroll (it recedes and rotates as the page advances).
 * Loaded only when `useRich3D()` is true, so no-WebGL / reduced-motion visitors
 * never download three.js — this whole module is a separate lazy chunk.
 *
 * Fully offline-safe: lit by explicit accent-coloured lights only (no network
 * HDR/Environment), so it renders identically with no internet. Palette is the
 * brand indigo→violet exclusively.
 */
function Core({ progress }: { progress?: MotionValue<number> }) {
  // `any` sidesteps the duplicate-@types/three Group/Mesh type clash between the
  // hoisted drei copy and this workspace's; the runtime objects are real THREE.*.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const group = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shell = useRef<any>(null);

  useFrame((state, delta) => {
    const p = progress ? progress.get() : 0;
    const ease = Math.min(1, delta * 3);
    const { x: px, y: py } = state.pointer;
    if (group.current) {
      group.current.rotation.y += (px * 0.5 + p * 1.4 - group.current.rotation.y) * ease;
      group.current.rotation.x += (-py * 0.35 - group.current.rotation.x) * ease;
      group.current.scale.setScalar(1 - p * 0.25);
      group.current.position.y = -p * 1.2;
    }
    if (shell.current) {
      shell.current.rotation.y -= delta * 0.25;
      shell.current.rotation.z += delta * 0.04;
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.3} rotationIntensity={0.8} floatIntensity={1.4}>
        {/* Solid distorting core */}
        <mesh castShadow>
          <icosahedronGeometry args={[1.45, 12]} />
          <MeshDistortMaterial color="#5b5ef0" distort={0.32} speed={1.6} roughness={0.08} metalness={0.92} />
        </mesh>
        {/* Faceted wireframe shell, counter-rotating */}
        <mesh ref={shell} scale={1.92}>
          <icosahedronGeometry args={[1.45, 1]} />
          <meshStandardMaterial color="#a6b1ff" wireframe transparent opacity={0.22} metalness={0.4} roughness={0.5} />
        </mesh>
      </Float>

      {/* Small satellites in the accent ramp */}
      <Float speed={2} rotationIntensity={1.6} floatIntensity={2.2} position={[2.7, 1.4, -1.5]}>
        <mesh scale={0.34} castShadow>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#818cf8" roughness={0.15} metalness={0.85} />
        </mesh>
      </Float>
      <Float speed={1.7} rotationIntensity={1.3} floatIntensity={1.8} position={[-2.9, -1.3, -1]}>
        <mesh scale={0.42}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6d6ff2" roughness={0.2} metalness={0.7} />
        </mesh>
      </Float>
      <Float speed={2.4} rotationIntensity={2} floatIntensity={2.6} position={[2.2, -1.7, 0.4]}>
        <mesh scale={0.2}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#c7cdff" roughness={0.25} metalness={0.6} />
        </mesh>
      </Float>

      <ContactShadows position={[0, -2.4, 0]} opacity={0.4} scale={11} blur={3} far={4.5} color="#1a1240" />
    </group>
  );
}

export default function HeroCanvas({ progress }: { progress?: MotionValue<number> }) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      shadows
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 5]} intensity={1.2} castShadow />
      {/* Accent rim lights — indigo + violet, no neon */}
      <pointLight position={[-5, 2, 3]} intensity={45} color="#6366f1" />
      <pointLight position={[4, -3, 2]} intensity={28} color="#8b5cf6" />
      <Core progress={progress} />
    </Canvas>
  );
}
