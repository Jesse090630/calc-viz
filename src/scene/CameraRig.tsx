/**
 * SCENE — 相机预设与过渡
 *
 * 纪律(CLAUDE.md §7):相机移动与物体运动绝不同时发生。
 * 这里只负责"相机怎么走";"物体什么时候开始动"由 Stage.autoplay.delayMs 保证,
 * 两边的时长必须对得上 —— 所以 TRANSITION_MS 是导出的,链数据的 delayMs 要 ≥ 它。
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraPreset } from '../engine/types';

export const TRANSITION_MS = 1100;

interface Preset {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
}

/**
 * front 用很小的 FOV + 拉远相机,接近正交投影 —— 这样"二维视图"看起来真的是平的,
 * 从 front 切到 three-quarter 时用户能认出那是同一个东西。
 */
export const CAMERA_PRESETS: Record<CameraPreset, Preset> = {
  front: { position: [0.9, 2.0, 15.5], target: [0.9, 2.0, 0], fov: 18 },
  'three-quarter': { position: [5.6, 4.6, 8.4], target: [0, 1.7, 0], fov: 34 },
  // wide:摊平后的板长 2πx ≈ 7.5,three-quarter 装不下会被裁掉右端。
  // 略带俯角是必要的 —— 完全正面看不出它是有厚度的"板"而不是一张纸。
  wide: { position: [1.6, 3.6, 16.5], target: [0, 1.3, 0], fov: 26 },
  top: { position: [0.2, 12, 0.6], target: [0, 0, 0], fov: 28 },
  free: { position: [5.6, 4.6, 8.4], target: [0, 1.7, 0], fov: 34 },
};

const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

interface Tween {
  from: THREE.Vector3;
  fromTarget: THREE.Vector3;
  fromFov: number;
  to: Preset;
  start: number;
}

export function CameraRig({ preset }: { preset: CameraPreset }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  const tween = useRef<Tween | null>(null);
  const applied = useRef<CameraPreset | null>(null);

  useEffect(() => {
    // ⚠️ OrbitControls(makeDefault)是在子组件挂载后才写进 R3F store 的,
    //    首帧这里拿到的 controls 是 null。早期版本没等它,导致 target 从未被设置,
    //    front 视图一直看着 y = 0 而不是 y = 2,曲线顶端被切在画面外。
    if (!controls) return;
    if (applied.current === preset) return;
    const to = CAMERA_PRESETS[preset];

    if (applied.current === null) {
      // 首帧:直接就位,不做过渡
      camera.position.set(...to.position);
      camera.fov = to.fov;
      camera.updateProjectionMatrix();
      if (controls) controls.target.set(...to.target);
    } else {
      tween.current = {
        from: camera.position.clone(),
        fromTarget: controls ? controls.target.clone() : new THREE.Vector3(),
        fromFov: camera.fov,
        to,
        start: performance.now(),
      };
    }
    applied.current = preset;
  }, [preset, camera, controls]);

  useFrame(() => {
    const t = tween.current;
    if (!t) return;
    const k = Math.min(1, (performance.now() - t.start) / TRANSITION_MS);
    const e = easeInOutQuad(k);

    camera.position.lerpVectors(t.from, new THREE.Vector3(...t.to.position), e);
    camera.fov = t.fromFov + (t.to.fov - t.fromFov) * e;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.lerpVectors(t.fromTarget, new THREE.Vector3(...t.to.target), e);
      controls.update();
    }
    if (k >= 1) tween.current = null;
  });

  return null;
}
