import { Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Grid,
  Html,
  Lightformer,
  OrbitControls,
} from '@react-three/drei'

type StudioSceneProps = {
  children: ReactNode
  cameraPosition?: [number, number, number]
  target?: [number, number, number]
  grid?: boolean
  contactShadowY?: number
  contactShadowScale?: number
}

/**
 * Escena compartida por todas las secciones: cámara, luces de estudio,
 * entorno, rejilla, sombras suaves y controles de órbita.
 */
export default function StudioScene({
  children,
  cameraPosition = [250, 200, 300],
  target = [0, 40, 0],
  grid = true,
  contactShadowY = -0.1,
  contactShadowScale = 600,
}: StudioSceneProps) {
  return (
    <div className="studio-scene">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{
          position: cameraPosition,
          fov: 40,
          near: 0.5,
          far: 5000,
        }}
      >
        <color attach="background" args={['#0b0e14']} />

        {/* Luces directas: clave, relleno y contraluz */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[300, 450, 350]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-320}
          shadow-camera-right={320}
          shadow-camera-top={320}
          shadow-camera-bottom={-320}
          shadow-camera-near={1}
          shadow-camera-far={1600}
          shadow-bias={-0.0005}
        />
        <directionalLight
          position={[-350, 180, -250]}
          intensity={1}
          color="#cfe0ff"
        />
        <directionalLight
          position={[0, 220, -420]}
          intensity={0.8}
          color="#9fb8ff"
        />

        {/* Entorno de estudio generado con lightformers, sin HDR externo */}
        <Environment resolution={256} environmentIntensity={0.6}>
          <Lightformer
            form="rect"
            intensity={4}
            position={[0, 4, -6]}
            scale={[10, 6, 1]}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={2}
            position={[-5, 2, 2]}
            scale={[3, 5, 1]}
            rotation-y={Math.PI / 2}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={1.5}
            position={[5, 1, 2]}
            scale={[3, 5, 1]}
            rotation-y={-Math.PI / 2}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="ring"
            intensity={2.5}
            position={[0, 6, 1]}
            scale={4}
            rotation-x={Math.PI / 2}
            target={[0, 0, 0]}
          />
        </Environment>

        {/* Suelo y rejilla de referencia (10 mm / 50 mm) */}
        {grid && (
          <>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.35, 0]}
              receiveShadow
            >
              <planeGeometry args={[1600, 1600]} />
              <shadowMaterial transparent opacity={0.3} />
            </mesh>

            <Grid
              position={[0, -0.15, 0]}
              args={[1200, 1200]}
              cellSize={10}
              cellThickness={0.6}
              cellColor="#263043"
              sectionSize={50}
              sectionThickness={1.2}
              sectionColor="#3d4b66"
              fadeDistance={900}
              fadeStrength={1.5}
              infiniteGrid
            />
          </>
        )}

        {/* Sombra de contacto suave bajo los objetos */}
        <ContactShadows
          position={[0, contactShadowY, 0]}
          opacity={0.55}
          scale={contactShadowScale}
          blur={2.6}
          far={250}
          resolution={512}
          smooth
        />

        <Suspense
          fallback={
            <Html center>
              <p className="studio-scene__loading">Cargando mando…</p>
            </Html>
          }
        >
          {children}
        </Suspense>

        {/* Órbita con el ratón y zoom con la rueda */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={target}
          minDistance={60}
          maxDistance={1200}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
    </div>
  )
}
