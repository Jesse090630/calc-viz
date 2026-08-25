/**
 * LAB — 「Trap the Output」的图。
 *
 * 两条带子:**横的是 ε(输出容差),竖的是 δ(输入容差)。**
 * 学生要做的事只有一件:把竖带收窄,直到它框住的那段曲线整个落进横带里。
 *
 * ⚠️ 颜色分工必须钉死,否则整节课的语言就乱了:
 *   横带 = 琥珀(要求) · 竖带 = 青(我们的选择) · 成功 = 绿 · 逃出去的那截 = 红。
 *
 * ⚠️ 失败时**要把逃出去的那一截单独画出来**。只把整段染红等于说"这里不行",
 * 而学生需要看见的是"**哪一段**跑出去了、跑出去多少"。
 *
 * 受控组件:不存状态、不算数学。
 */
import { LAB } from '../shared/theme';
import { makeViewport, toSvgX, toSvgY } from '../shared/viewport';
import {
  A,
  L,
  f,
  isTrapped,
  outputReach,
  show,
  viewHalfHeight,
  viewHalfWidth,
  zoomFactor,
} from '../../math/epsilonDelta';

/**
 * ⚠️ 取景跟着 ε 走(见数学模块的注释):
 * 不缩放的话,ε = 0.01 的横带只有半个像素高,"收紧"在屏幕上根本看不见。
 */
export function makeScope(epsilon: number) {
  const halfY = viewHalfHeight(epsilon);
  const halfX = viewHalfWidth(epsilon);
  return makeViewport({
    width: 660,
    height: 440,
    xMin: A - halfX * 1.15,
    xMax: A + halfX * 1.15,
    yMin: L - halfY,
    yMax: L + halfY,
    padLeft: 42,
    padRight: 26,
    padTop: 22,
    padBottom: 40,
  });
}

export function TrapGraph({ epsilon, delta }: { epsilon: number; delta: number }) {
  const V = makeScope(epsilon);
  const zoom = zoomFactor(epsilon);
  const trapped = isTrapped(epsilon, delta);
  const ax = toSvgX(V, A);
  const ly = toSvgY(V, L);
  const bandTop = toSvgY(V, L + epsilon);
  const bandBottom = toSvgY(V, L - epsilon);
  const dLeft = toSvgX(V, A - delta);
  const dRight = toSvgX(V, A + delta);
  const reach = outputReach(delta);

  /** 竖带框住的那一段曲线 */
  const seg = { x1: dLeft, y1: toSvgY(V, f(A - delta)), x2: dRight, y2: toSvgY(V, f(A + delta)) };
  /** 逃出去的那两截(上下各一) */
  const escapes = trapped
    ? []
    : ([
        { from: L + epsilon, to: L + reach },
        { from: L - reach, to: L - epsilon },
      ] as const);

  return (
    <svg
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`A line with a horizontal epsilon band around y = ${L} and a vertical delta band around x = ${A}`}
    >
      {/* ε 带 —— 输出必须落在这里 */}
      <rect
        x={V.padLeft}
        y={bandTop}
        width={V.width - V.padLeft - V.padRight}
        height={Math.max(1, bandBottom - bandTop)}
        fill={LAB.x2}
        opacity={0.13}
        style={{ transition: 'y 180ms ease, height 180ms ease' }}
      />
      {[L + epsilon, L - epsilon].map((y) => (
        <line key={y} x1={V.padLeft} y1={toSvgY(V, y)} x2={V.width - V.padRight} y2={toSvgY(V, y)} stroke={LAB.x2} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.8} />
      ))}
      <line x1={V.padLeft} y1={ly} x2={V.width - V.padRight} y2={ly} stroke={LAB.x2} strokeWidth={1} opacity={0.45} />

      {/* δ 带 —— 我们允许输入落在这里 */}
      <rect
        x={dLeft}
        y={V.padTop}
        width={Math.max(1, dRight - dLeft)}
        height={V.height - V.padTop - V.padBottom}
        fill={LAB.x1}
        opacity={0.11}
        style={{ transition: 'x 180ms ease, width 180ms ease' }}
      />
      {[dLeft, dRight].map((x, i) => (
        <line key={i} x1={x} y1={V.padTop} x2={x} y2={V.height - V.padBottom} stroke={LAB.x1} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.8} />
      ))}

      {/* 直线本体 */}
      <line
        x1={toSvgX(V, V.xMin)}
        y1={toSvgY(V, f(V.xMin))}
        x2={toSvgX(V, V.xMax)}
        y2={toSvgY(V, f(V.xMax))}
        stroke={LAB.curve}
        strokeWidth={2.2}
        opacity={0.5}
      />
      {/* 被 δ 框住的那一段:成功时绿,失败时留原色,逃出去的部分另外标红 */}
      <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke={trapped ? LAB.pass : LAB.curve} strokeWidth={4.5} strokeLinecap="round" />

      {/*
        逃出去的那两截。
        ⚠️ 单独画,而不是把整段染红 —— 学生要看的是"**哪一段**跑出去了"。
      */}
      {escapes.map((band, i) => (
        <rect
          key={i}
          x={dLeft}
          y={toSvgY(V, band.to)}
          width={Math.max(1, dRight - dLeft)}
          height={Math.max(1, toSvgY(V, band.from) - toSvgY(V, band.to))}
          fill={LAB.fail}
          opacity={0.28}
        />
      ))}

      {/* 目标点 (a, L) */}
      <circle cx={ax} cy={ly} r={5.5} fill={LAB.x2} stroke="#0b1020" strokeWidth={1.8} />

      {/* 标签 */}
      <text x={V.padLeft + 6} y={bandTop - 7} fill={LAB.x2} fontSize={12} fontWeight={700} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
        ε = {show(epsilon)}
      </text>
      <text x={(dLeft + dRight) / 2} y={V.height - V.padBottom + 16} fill={LAB.x1} fontSize={12} fontWeight={700} textAnchor="middle" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
        δ = {show(delta)}
      </text>
      <text x={ax + 10} y={ly - 10} fill={LAB.x2} fontSize={11} fontWeight={700} textAnchor="start" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
        ({A}, {L})
      </text>
      {/* ⚠️ 画面被放大了就必须说出来。悄悄放大是另一种骗人。 */}
      {zoom > 1.05 && (
        <text
          x={V.width - V.padRight}
          y={V.padTop + 12}
          fill={LAB.muted}
          fontSize={11}
          fontWeight={700}
          textAnchor="end"
          fontFamily="ui-monospace, monospace"
          stroke="#0b1020"
          strokeWidth={3.5}
          paintOrder="stroke"
        >
          zoomed ×{zoom < 10 ? zoom.toFixed(1) : Math.round(zoom)}
        </text>
      )}

      {!trapped && (
        <text
          x={dRight + 10}
          y={toSvgY(V, L + reach) + 12}
          fill={LAB.fail}
          fontSize={12}
          fontWeight={700}
          textAnchor="start"
          fontFamily="ui-monospace, monospace"
          stroke="#0b1020"
          strokeWidth={3.5}
          paintOrder="stroke"
        >
          out by {show(reach - epsilon)}
        </text>
      )}
    </svg>
  );
}
