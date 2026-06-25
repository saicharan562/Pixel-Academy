import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

/**
 * Persistent, very-lightweight WebGL backdrop that makes the whole app feel alive.
 * A slowly-rotating field of translucent low-poly shapes — low dpr, no shadows,
 * pointer-events disabled — so it costs almost nothing while scrolling data screens.
 */
function Field() {
  // `any` avoids a duplicate-@types/three Group-type clash between the hoisted
  // (drei) copy and this workspace's copy. The runtime object is a THREE.Group.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const group = useRef<any>(null);
  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.05;
      group.current.rotation.x += delta * 0.018;
    }
  });

  // Calm, single-accent palette (indigo→violet) — no neon.
  const shapes = useMemo(
    () => [
      { p: [-4, 2, -2], c: '#818cf8', s: 0.9, geo: 'ico' as const },
      { p: [4.5, -1.5, -3], c: '#6366f1', s: 0.7, geo: 'torus' as const },
      { p: [-3, -2.5, -4], c: '#7c7cf0', s: 0.8, geo: 'dodec' as const },
      { p: [3, 2.8, -5], c: '#a6b1ff', s: 0.6, geo: 'ico' as const },
      { p: [0, 0, -6], c: '#5457e8', s: 1.1, geo: 'octa' as const },
      { p: [-5, 0.5, -3], c: '#8b8bf2', s: 0.5, geo: 'torus' as const },
    ],
    [],
  );

  return (
    <group ref={group}>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 4]} intensity={30} color="#818cf8" />
      <pointLight position={[-6, -4, 2]} intensity={24} color="#d946ef" />
      {shapes.map((sh, i) => (
        <Float key={i} speed={1 + i * 0.2} rotationIntensity={1.4} floatIntensity={2} position={sh.p as [number, number, number]}>
          <mesh scale={sh.s}>
            {sh.geo === 'ico' && <icosahedronGeometry args={[1, 0]} />}
            {sh.geo === 'torus' && <torusGeometry args={[1, 0.38, 16, 36]} />}
            {sh.geo === 'dodec' && <dodecahedronGeometry args={[1, 0]} />}
            {sh.geo === 'octa' && <octahedronGeometry args={[1, 0]} />}
            <meshStandardMaterial
              color={sh.c}
              transparent
              opacity={0.55}
              roughness={0.25}
              metalness={0.7}
              wireframe={i % 2 === 0}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export function AmbientField() {
  return (
    <Canvas
      dpr={1}
      camera={{ position: [0, 0, 6], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
      frameloop="always"
    >
      <Field />
    </Canvas>
  );
}
