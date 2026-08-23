/**
 * LAB — 「滑一段,看它落不落回自己身上」
 *
 * 画三样东西:
 *   ① 原曲线(蓝)
 *   ② **半透明的副本**,整体右移 `liveShift`(琥珀)
 *   ③ 一段高亮的原始区间,以及它平移之后应该落到的位置
 *
 * ⚠️ `liveShift` 与 `targetShift` 是**两个**量。前者是动画当前所在的位置,
 * 后者是学生选定的 T。分开是因为这一节的教学重点就是"滑过去"这个动作本身 ——
 * 副本必须**看得见地移动**,而不是从 0 瞬移到 T。
 *
 * 受控组件:不存状态、不算数学,数字全部由上层从 `src/math/periodicity.ts` 取好传进来。
 */
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
// ⚠️ 刻度**不能**用 `math/format` 的 `formatCoordinate`:它只认到 ±2π,
// 3π 和 4π 会掉下去显示成 `9.424778` / `12.566371` —— 整条轴的 π 语言当场破功
// (截图里就是这样)。`formatShift` 认得 π/12 的任意倍数。
import { formatShift, sampleCurve, type PeriodicFunction } from '../../math/periodicity';

/**
 * 窗口横跨 -2π … 4π(六个 π),纵向留够 sin 的 ±1 再加一点余量。
 * 宽度选得比 4π 还多一截,是为了让"右移 4π"之后副本仍有一部分留在画面里 ——
 * 否则最大的那个 T 一选,副本整个滑出屏幕,什么也看不到。
 */
export const V = makeViewport({
  width: 720,
  height: 340,
  xMin: -2 * Math.PI - 0.4,
  xMax: 4 * Math.PI + 0.4,
  yMin: -1.45,
  yMax: 1.45,
  padLeft: 34,
  padRight: 20,
  padTop: 26,
  padBottom: 34,
});

/** x 轴上标 π 的整数倍。`formatCoordinate` 已经会写成 `2π` / `-π` 这种形式。 */
const TICKS = [-2, -1, 0, 1, 2, 3, 4].map((k) => k * Math.PI);

export interface PeriodGraphProps {
  fn: PeriodicFunction;
  /** 动画当前所在的位移 */
  liveShift: number;
  /** 学生选定的 T */
  targetShift: number;
  matches: boolean;
  /** 偏离最大的那个 x —— 不匹配时在图上指出来 */
  worstX: number;
  worstMismatch: number;
  /** 高亮区间的左端 */
  highlightFrom?: number;
}

export function PeriodGraph({
  fn,
  liveShift,
  targetShift,
  matches,
  worstX,
  worstMismatch,
  highlightFrom = 0,
}: PeriodGraphProps) {
  const base = sampleCurve(fn, V.xMin, V.xMax, 420);
  // 副本:把同一条曲线整体右移 liveShift。取样时向左多取一段,
  // 这样移过来之后左边不会出现空缺。
  const copy = sampleCurve(fn, V.xMin - liveShift, V.xMax, 420).map((p) => ({
    x: p.x + liveShift,
    y: p.y,
  }));

  const y0 = toSvgY(V, 0);
  const sliding = Math.abs(liveShift - targetShift) > 1e-6;
  const highlightTo = highlightFrom + (targetShift > 0 ? targetShift : 0);

  return (
    <svg
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${fn.label} drawn over several periods, with a translucent copy shifted right`}
    >
      {/* 高亮:原始的一段,以及它平移后应该落到的那一段 */}
      {targetShift > 0 && (
        <g>
          <rect
            x={toSvgX(V, highlightFrom)}
            y={V.padTop}
            width={Math.max(0, toSvgX(V, highlightTo) - toSvgX(V, highlightFrom))}
            height={V.height - V.padTop - V.padBottom}
            fill={LAB.interval}
            opacity={0.16}
            style={{ transition: 'width 320ms ease' }}
          />
          <rect
            x={toSvgX(V, highlightTo)}
            y={V.padTop}
            width={Math.max(0, toSvgX(V, highlightTo + targetShift) - toSvgX(V, highlightTo))}
            height={V.height - V.padTop - V.padBottom}
            fill={matches ? LAB.pass : LAB.fail}
            opacity={0.1}
            style={{ transition: 'x 320ms ease, width 320ms ease, fill 260ms ease' }}
          />
        </g>
      )}

      {/* 坐标轴 */}
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
            <text
              x={toSvgX(V, t)}
              y={y0 + 17}
              fill={LAB.muted}
              fontSize={11}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {t < 0 ? `-${formatShift(-t)}` : formatShift(t)}
            </text>
          </g>
        ))}
        {[-1, 1].map((t) => (
          <text
            key={t}
            x={toSvgX(V, 0) - 7}
            y={toSvgY(V, t) + 4}
            fill={LAB.muted}
            fontSize={10}
            textAnchor="end"
            fontFamily="ui-monospace, monospace"
          >
            {t}
          </text>
        ))}
      </g>

      {/* 原曲线 */}
      <path
        d={polylinePath(V, base)}
        fill="none"
        stroke={LAB.curve}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/*
        平移后的副本。半透明 + 略粗,重合时会形成一条实心的亮线,
        不重合时两条线明显分岔 —— 这就是整节课要看的那个现象。
      */}
      {liveShift > 0 && (
        <path
          d={polylinePath(V, copy)}
          fill="none"
          stroke={matches && !sliding ? LAB.pass : LAB.x2}
          strokeWidth={matches && !sliding ? 2.6 : 2.2}
          strokeDasharray={matches && !sliding ? undefined : '7 5'}
          strokeLinecap="round"
          opacity={0.9}
          style={{ transition: 'stroke 260ms ease' }}
        />
      )}

      {/*
        不匹配时,把**偏离最大的那个 x** 指出来。
        只说"不匹配"太抽象;指着一处说"这里差 2.00"才是证据。
      */}
      {targetShift > 0 && !matches && !sliding && (
        <g>
          <line
            x1={toSvgX(V, worstX)}
            y1={toSvgY(V, fn.at(worstX))}
            x2={toSvgX(V, worstX)}
            y2={toSvgY(V, fn.at(worstX + targetShift))}
            stroke={LAB.fail}
            strokeWidth={2.5}
          />
          <circle cx={toSvgX(V, worstX)} cy={toSvgY(V, fn.at(worstX))} r={4} fill={LAB.curve} />
          <circle cx={toSvgX(V, worstX)} cy={toSvgY(V, fn.at(worstX + targetShift))} r={4} fill={LAB.x2} />
          {/*
            ⚠️ 标签不能放在红色竖线的中点。那条线跨越 +1 到 −1,中点正好落在 x 轴上,
            读数于是压在轴线和刻度文字上(截图里 "off by 2.00" 盖住了 "−2π")。
            改放到两点中较高那个的上方,那里始终是空的。
          */}
          <text
            x={toSvgX(V, worstX) + 9}
            y={Math.min(toSvgY(V, fn.at(worstX)), toSvgY(V, fn.at(worstX + targetShift))) - 8}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            fontFamily="ui-monospace, monospace"
          >
            off by {worstMismatch.toFixed(2)}
          </text>
        </g>
      )}

      {/* 位移标尺:从 0 到当前位移画一条带箭头的线,让 T 有长度感 */}
      {liveShift > 0 && (
        <g aria-hidden="true">
          <line
            x1={toSvgX(V, highlightFrom)}
            y1={V.padTop + 8}
            x2={toSvgX(V, highlightFrom + liveShift)}
            y2={V.padTop + 8}
            stroke={LAB.x2}
            strokeWidth={1.6}
          />
          <path
            d={`M${toSvgX(V, highlightFrom + liveShift) - 6} ${V.padTop + 4} L${toSvgX(V, highlightFrom + liveShift)} ${V.padTop + 8} L${toSvgX(V, highlightFrom + liveShift) - 6} ${V.padTop + 12}`}
            fill="none"
            stroke={LAB.x2}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x={(toSvgX(V, highlightFrom) + toSvgX(V, highlightFrom + liveShift)) / 2}
            y={V.padTop + 2}
            fill={LAB.x2}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            T
          </text>
        </g>
      )}
    </svg>
  );
}
