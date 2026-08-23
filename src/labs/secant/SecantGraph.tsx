/**
 * LAB — 割线图
 *
 * 图是主讲人。上面同时存在四样东西,而且**分阶段出现**:
 *   ① 曲线 + A、B 两点(始终在)
 *   ② Δx —— 沿 A 的高度画的**水平**直角边
 *   ③ Δy —— 从那条边的末端竖直上到 B 的边
 *   ④ 割线 —— 穿过 A、B 并延伸到画面两侧
 *
 * ⚠️ 直角三角形的直角顶点放在 **(b, f(a))**,不是 (a, f(b))。
 * 这样水平边贴着 A 的高度、竖直边贴着 B 的横坐标,
 * 「先走 Δx,再爬 Δy」的顺序与公式 (f(b)−f(a))/(b−a) 的读法一致。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  DOMAIN,
  sampleCurve,
  secantLine,
  showNumber,
  type SecantReading,
} from '../../math/rateOfChange';

/** f(x)=x² 在 ±3.2 处是 10.24,所以纵向留到 11.5。 */
export const V = makeViewport({
  width: 660,
  height: 440,
  xMin: -3.5,
  xMax: 3.5,
  yMin: -2.2,
  yMax: 11.5,
  padLeft: 38,
  padRight: 22,
  padTop: 22,
  padBottom: 34,
});

export type Reveal = 'points' | 'run' | 'rise' | 'ratio';

export interface SecantGraphProps {
  reading: SecantReading;
  reveal: Reveal;
  onChangeA: (x: number) => void;
  onChangeB: (x: number) => void;
  /** 靠近动画进行中时不让拖 */
  busy?: boolean;
}

export function SecantGraph({ reading, reveal, onChangeA, onChangeB, busy = false }: SecantGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const curve = sampleCurve(V.xMin, V.xMax, 300);
  const line = secantLine(reading);

  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  const ax = toSvgX(V, reading.a);
  const ay = toSvgY(V, reading.fa);
  const bx = toSvgX(V, reading.b);
  const by = toSvgY(V, reading.fb);
  /** 直角顶点 */
  const cornerX = bx;
  const cornerY = ay;
  /** 靠近视口右/左边缘时,标签必须往内侧写,否则会被裁掉 */
  const nearRightEdge = bx > V.width - 120;
  const aNearLeftEdge = ax < 130;

  const showRun = reveal !== 'points';
  const showRise = reveal === 'rise' || reveal === 'ratio';
  const showLine = reveal === 'ratio';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label="A parabola with two draggable points and the straight line through them"
    >
      {/* 坐标轴 */}
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        <line x1={x0} y1={V.padTop} x2={x0} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1.2} />
        {ticks(V.xMin, V.xMax, 1).map((t) => (
          <g key={`x${t}`}>
            <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
            {t !== 0 && (
              <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
                {t}
              </text>
            )}
          </g>
        ))}
        {ticks(2, V.yMax, 2).map((t) => (
          <g key={`y${t}`}>
            <line x1={x0 - 4} y1={toSvgY(V, t)} x2={x0 + 4} y2={toSvgY(V, t)} stroke={LAB.axis} strokeWidth={1} />
            <text x={x0 - 8} y={toSvgY(V, t) + 4} fill={LAB.muted} fontSize={10} textAnchor="end" fontFamily="ui-monospace, monospace">
              {t}
            </text>
          </g>
        ))}
      </g>

      <path
        d={polylinePath(V, curve)}
        fill="none"
        stroke={LAB.curve}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 割线:延伸到窗口两侧,让"这是一条直线"这件事看得见 */}
      {showLine && line && (
        <line
          x1={toSvgX(V, V.xMin)}
          y1={toSvgY(V, line.at(V.xMin))}
          x2={toSvgX(V, V.xMax)}
          y2={toSvgY(V, line.at(V.xMax))}
          stroke={LAB.pass}
          strokeWidth={2.2}
          opacity={0.95}
        />
      )}

      {/* Δx —— 水平直角边,贴着 A 的高度 */}
      {showRun && (
        <g>
          <line x1={ax} y1={ay} x2={cornerX} y2={cornerY} stroke={LAB.x1} strokeWidth={2.4} />
          <text
            x={(ax + cornerX) / 2}
            y={cornerY + 17}
            fill={LAB.x1}
            fontSize={12}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            Δx = {showNumber(reading.run)}
          </text>
        </g>
      )}

      {/* Δy —— 竖直直角边,贴着 B 的横坐标 */}
      {showRise && (
        <g>
          <line x1={cornerX} y1={cornerY} x2={bx} y2={by} stroke={LAB.x2} strokeWidth={2.4} />
          {/* 直角记号,强调这是个直角三角形 */}
          <path
            d={`M${cornerX - 9 * Math.sign(cornerX - ax || 1)} ${cornerY} L${cornerX - 9 * Math.sign(cornerX - ax || 1)} ${cornerY + (by < cornerY ? -9 : 9)} L${cornerX} ${cornerY + (by < cornerY ? -9 : 9)}`}
            fill="none"
            stroke={LAB.muted}
            strokeWidth={1.2}
            opacity={0.8}
          />
          {/*
            ⚠️ 标签要往画面**内侧**写。
            B 常常落在右端(比如 b = 3 时),往右写会被视口裁掉 ——
            截图里 "Δy = 8.00" 和 "B = (3.00, 9.00)" 都只剩半截。
          */}
          <text
            x={bx + (nearRightEdge ? -9 : 9)}
            y={(cornerY + by) / 2 + 4}
            fill={LAB.x2}
            fontSize={12}
            fontWeight={700}
            textAnchor={nearRightEdge ? 'end' : 'start'}
            fontFamily="ui-monospace, monospace"
          >
            Δy = {showNumber(reading.rise)}
          </text>
        </g>
      )}

      {/* A 与 B */}
      {[
        // `toEnd` 决定标签写在点的左边还是右边 —— 贴着边缘的那一侧永远不写。
        { px: ax, py: ay, color: LAB.x1, name: 'A', x: reading.a, y: reading.fa, toEnd: !aNearLeftEdge },
        { px: bx, py: by, color: LAB.x2, name: 'B', x: reading.b, y: reading.fb, toEnd: nearRightEdge },
      ].map((p) => (
        <g key={p.name}>
          <line x1={p.px} y1={y0} x2={p.px} y2={p.py} stroke={p.color} strokeWidth={1.1} strokeDasharray="4 4" opacity={0.5} />
          <circle cx={p.px} cy={p.py} r={10} fill={p.color} opacity={0.15} />
          <circle cx={p.px} cy={p.py} r={5} fill={p.color} stroke="#0b1020" strokeWidth={1.6} />
          <text
            x={p.px + (p.toEnd ? -10 : 10)}
            y={p.py - 10}
            fill={p.color}
            fontSize={12}
            fontWeight={700}
            textAnchor={p.toEnd ? 'end' : 'start'}
            fontFamily="ui-monospace, monospace"
          >
            {p.name} = ({showNumber(p.x)}, {showNumber(p.y)})
          </text>
        </g>
      ))}

      {/* x 轴上的两个手柄 */}
      {!busy && (
        <>
          <DraggableXPoint
            svgRef={svgRef}
            viewport={V}
            value={reading.a}
            onChange={onChangeA}
            interval={DOMAIN}
            color={LAB.x1}
            label="a"
            describe={(v) => `a equals ${showNumber(v)}`}
          />
          <DraggableXPoint
            svgRef={svgRef}
            viewport={V}
            value={reading.b}
            onChange={onChangeB}
            interval={DOMAIN}
            color={LAB.x2}
            label="b"
            describe={(v) => `b equals ${showNumber(v)}`}
          />
        </>
      )}
    </svg>
  );
}
