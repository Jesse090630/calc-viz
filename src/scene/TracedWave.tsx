/**
 * SCENE — 通用“参数推进时留下轨迹”的二维曲线。
 *
 * 它不知道 sin / cos,只接受 valueAt(t)。概念层决定参数是什么、值是什么;
 * 这里仅把 [t, valueAt(t)] 映射到世界坐标并截到 through。
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Interval } from '../math/types';

const DEFAULT_SAMPLES = 256;

export function TracedWave({
  origin,
  domain,
  through,
  valueAt,
  color,
  xScale = 1,
  yScale = 1,
  lineWidth = 3,
  opacity = 1,
}: {
  origin: readonly [number, number, number];
  domain: Interval;
  through: number;
  valueAt: (t: number) => number;
  color: string;
  xScale?: number;
  yScale?: number;
  lineWidth?: number;
  opacity?: number;
}) {
  const [a, b] = domain;
  const end = Math.max(a, Math.min(b, through));
  const points = useMemo(() => {
    if (end <= a) return [];
    const fraction = (end - a) / (b - a);
    const count = Math.max(2, Math.ceil(DEFAULT_SAMPLES * fraction));
    return Array.from({ length: count + 1 }, (_, i) => {
      const t = a + ((end - a) * i) / count;
      return [
        origin[0] + (t - a) * xScale,
        origin[1] + valueAt(t) * yScale,
        origin[2],
      ] as [number, number, number];
    });
  }, [a, end, origin, valueAt, xScale, yScale]);

  if (points.length === 0) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent={opacity < 1}
      opacity={opacity}
    />
  );
}
