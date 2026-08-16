/**
 * SCENE — 画布外壳
 *
 * 一个场景走到底:所谓"二维视图"只是把相机放到 front 预设(小 FOV,接近正交)。
 * 这样 2D → 3D 不存在交接缝,用户看到的始终是同一个对象在同一个空间里。
 */
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { CameraPreset } from '../engine/types';
import { CameraRig, CAMERA_PRESETS } from './CameraRig';
import { COLOR } from './theme';

export function Stage3D({
  preset,
  children,
}: {
  preset: CameraPreset;
  children: ReactNode;
}) {
  const initial = CAMERA_PRESETS.front;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [...initial.position], fov: initial.fov, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ background: COLOR.background }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 7]} intensity={1.5} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} color="#88aaff" />

      {/* autoRotate 永久禁用:相机移动必须服务于数学理解,不许自己转着玩 */}
      <OrbitControls makeDefault autoRotate={false} enablePan={false} minDistance={3} maxDistance={40} />
      <CameraRig preset={preset} />

      {children}
    </Canvas>
  );
}
