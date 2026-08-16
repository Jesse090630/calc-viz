/**
 * SCENE — 把 math/shellSurface 的顶点函数变成 Three.js 几何。
 *
 * 这里【只有】三角网格的拼装,没有任何数学 —— 数学全在 src/math/shellSurface.ts,
 * 那边有 vitest 覆盖。这样"壳的形状对不对"不需要靠看画面判断。
 *
 * 壳由 6 个面片拼成:外壁 / 内壁 / 顶 / 底 / 两个端盖。
 */
import * as THREE from 'three';
import { shellSurfacePoint, type ShellSurfaceSpec } from '../../math/shellSurface';

/** (a, b) ∈ [0,1]² → (u, v, w) */
type PatchMap = (a: number, b: number) => readonly [number, number, number];
interface Patch {
  readonly nA: number;
  readonly nB: number;
  readonly map: PatchMap;
}

function patchesFor(segments: number): Patch[] {
  return [
    { nA: segments, nB: 1, map: (a, b) => [a, b, 1] }, // 外壁
    { nA: segments, nB: 1, map: (a, b) => [a, b, 0] }, // 内壁
    { nA: segments, nB: 1, map: (a, b) => [a, 1, b] }, // 顶
    { nA: segments, nB: 1, map: (a, b) => [a, 0, b] }, // 底
    { nA: 1, nB: 1, map: (a, b) => [0, a, b] }, // 端盖 u = 0
    { nA: 1, nB: 1, map: (a, b) => [1, a, b] }, // 端盖 u = 1
  ];
}

interface ShellGeometryData {
  readonly patches: Patch[];
}

export function createShellGeometry(segments = 96): THREE.BufferGeometry {
  const patches = patchesFor(segments);
  const index: number[] = [];
  let total = 0;

  for (const p of patches) {
    const base = total;
    const cols = p.nB + 1;
    for (let i = 0; i < p.nA; i++) {
      for (let j = 0; j < p.nB; j++) {
        const k = base + i * cols + j;
        index.push(k, k + 1, k + cols, k + 1, k + cols + 1, k + cols);
      }
    }
    total += (p.nA + 1) * (p.nB + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geometry.setIndex(index);
  geometry.userData = { patches } satisfies ShellGeometryData;
  return geometry;
}

export function updateShellGeometry(
  geometry: THREE.BufferGeometry,
  spec: ShellSurfaceSpec,
): void {
  const data = geometry.userData as ShellGeometryData;
  const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;

  let k = 0;
  for (const p of data.patches) {
    for (let i = 0; i <= p.nA; i++) {
      for (let j = 0; j <= p.nB; j++) {
        const [u, v, w] = p.map(i / p.nA, j / p.nB);
        const { x, y, z } = shellSurfacePoint(u, v, w, spec);
        arr[k++] = x;
        arr[k++] = y;
        arr[k++] = z;
      }
    }
  }

  attr.needsUpdate = true;
  geometry.computeVertexNormals(); // 漏了这句,摊平后会一片漆黑
  geometry.computeBoundingSphere();
}

/** 建好并立即填充 */
export function buildShell(spec: ShellSurfaceSpec, segments = 96): THREE.BufferGeometry {
  const g = createShellGeometry(segments);
  updateShellGeometry(g, spec);
  return g;
}
