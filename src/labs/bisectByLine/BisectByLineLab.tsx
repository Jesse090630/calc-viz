/**
 * LAB — 过外点 P 的平分线:介值定理真正的用法。
 *
 * ⭐⭐ 这一页只要讲清一件事:**IVT 的门槛不是连续性,是"两个端点异号"。**
 *   而这道题里那两个端点是**白送**的:把有向直线转过 π,它还是同一条线,
 *   左右却对调了,所以 `g(θ + π) = −g(θ)`。
 *
 * 页面结构就是论证的三步:
 *   ① 图 —— 看见"左侧"这块面积随 θ 变;
 *   ② 转过 π 的那一对缩略图 —— 看见同一条线、相反的两块;
 *   ③ g(θ) 曲线 —— 看见两端异号、中间连续、必然穿零。
 *
 * ⚠️ 平台(直线完全碰不到图形)必须画出来:那是"P 在外面"留下的唯一痕迹,
 *   而它对论证毫无影响 —— 这一点学生自己看一眼就懂了。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/bisectByLine.ts`。
 */
import { useMemo, useRef, useState } from 'react';
import {
  CENTROID_TRAP,
  HEADLINE,
  MAIN_IDEA,
  OUTSIDE_NOTE,
  type Pt,
  SHAPES,
  WHY_ENDPOINTS,
  angleTo,
  areaLeft,
  bisect,
  boundary,
  centreShortcut,
  centroid,
  centroidLineGap,
  centroidLineShare,
  clipLeft,
  gap,
  gapCurve,
  hitState,
  leftPieces,
  matchedTotal,
  rotatedOutline,
  pushOutside,
  shapeOf,
  show,
  tangentAngles,
} from '../../math/bisectByLine';
import { LAB } from '../shared/theme';

const W = 460;
const H = 340;
const SPAN = 8.6;                                  // 视野半宽(世界单位)
const K = W / (2 * SPAN);
const sx = (x: number) => W / 2 + x * K;
const sy = (y: number) => H / 2 - y * K;
const poly = (pts: readonly Pt[]) => pts.map((p) => `${sx(p[0]).toFixed(2)},${sy(p[1]).toFixed(2)}`).join(' ');

/** 一条穿过整幅画的直线的两个端点。 */
function lineEnds(P: Pt, theta: number, reach = 26): [Pt, Pt] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [[P[0] - c * reach, P[1] - s * reach], [P[0] + c * reach, P[1] + s * reach]];
}

/** 转过 π 的那一对缩略图。⭐ 同一条线,两块颜色对调 —— 这一页的支点。 */
function Flip({ shapeId, P, theta }: { shapeId: string; P: Pt; theta: number }) {
  const s = shapeOf(shapeId);
  const w = 168;
  const h = 124;
  const k = w / (2 * 7.6);
  const px = (x: number) => w / 2 + x * k;
  const py = (y: number) => h / 2 - y * k;
  const pp = (pts: readonly Pt[]) => pts.map((q) => `${px(q[0]).toFixed(1)},${py(q[1]).toFixed(1)}`).join(' ');
  const ends = lineEnds(P, theta);
  return (
    <div className="grid grid-cols-2 gap-2">
      {[theta, theta + Math.PI].map((t, i) => (
        <div key={i}>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img"
            aria-label={i === 0 ? 'The directed line at angle theta, with its left side shaded'
              : 'The same line turned halfway around, with the other side shaded'}>
            <polygon points={pp(boundary(s, 240))} fill="none" stroke={LAB.muted} strokeWidth={1.2} />
            <polygon data-flip={i} points={pp(clipLeft(boundary(s, 240), P, t))}
              fill={LAB.pass} fillOpacity={0.42} stroke="none" />
            <line x1={px(ends[0][0])} y1={py(ends[0][1])} x2={px(ends[1][0])} y2={py(ends[1][1])}
              stroke={LAB.x2} strokeWidth={1.4} />
            <circle cx={px(P[0])} cy={py(P[1])} r={2.6} fill={LAB.x2} />
          </svg>
          <p className="mt-0.5 text-center font-mono text-[10px] text-slate-500">
            {i === 0 ? 'θ' : 'θ + π'} → <span data-flip-area={i} style={{ color: LAB.pass }}>
              {show(areaLeft(s, P, t), 3)}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function BisectByLineLab() {
  const [id, setId] = useState(SHAPES[0]!.id);
  const s = shapeOf(id);
  const [P, setP] = useState<Pt>(s.startP);
  const [theta, setTheta] = useState(0.35);
  const [solved, setSolved] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const T = useMemo(() => matchedTotal(s), [s]);
  const outline = useMemo(() => boundary(s, 720), [s]);
  const left = areaLeft(s, P, theta);
  const g = gap(s, P, theta);
  const hit = hitState(s, P, theta);
  const curve = useMemo(() => gapCurve(s, P, 0, 140), [s, P]);
  const answer = useMemo(() => bisect(s, P), [s, P]);
  const tangents = useMemo(() => tangentAngles(s, P), [s, P]);
  const shortcut = centreShortcut(s, P);
  const cen = useMemo(() => centroid(s), [s]);
  const cenOff = useMemo(() => centroidLineGap(s, P), [s, P]);
  const cenShare = useMemo(() => centroidLineShare(s, P), [s, P]);
  /** ⭐ 绕中心/形心转 180° 的轮廓 —— 「有没有中心」这件事得看得见,不能只写在字里。 */
  const spun = useMemo(() => rotatedOutline(s, shortcut !== null ? s.origin : cen, 360), [s, shortcut, cen]);
  const pieces = leftPieces(s, P, theta);

  const ends = lineEnds(P, theta);
  const leftPoly = clipLeft(outline, P, theta);

  /** 把 P 拖到别处。⚠️ 拖进图形里就推回外面 —— 题面的前提不能悄悄失效。 */
  const drag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return;
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    const y = ((e.clientY - box.top) / box.height) * H;
    setP(pushOutside(s, [(x - W / 2) / K, (H / 2 - y) / K]));
    setSolved(false);
  };

  // g 曲线的画布
  const GW = 460;
  const GH = 168;
  const gx = (t: number) => 34 + (t / Math.PI) * (GW - 48);
  const gy = (v: number) => GH / 2 - (v / T) * (GH / 2 - 18);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Continuity
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Cut It in Half Through P
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SHAPES.map((k) => (
            <button
              key={k.id} type="button" data-shape={k.id} data-active={k.id === id ? 'yes' : 'no'}
              onClick={() => { setId(k.id); setP(k.startP); setTheta(0.35); setSolved(false); }}
              className={
                'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
                (k.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          θ = <span data-readout="theta" data-theta-exact={theta} className="text-amber-300">
            {show(theta, 3)}
          </span>
          <input
            type="range" min={0} max={Math.PI} step={0.001} value={theta}
            onChange={(e) => { setTheta(Number(e.target.value)); setSolved(false); }}
            className="w-40 accent-amber-400" aria-label="Turn the line through P"
          />
        </label>
        <button
          type="button" data-action="solve"
          onClick={() => { setTheta(((answer.theta % Math.PI) + Math.PI) % Math.PI); setSolved(true); }}
          className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] text-emerald-100 transition hover:border-emerald-300"
        >
          run the bisection →
        </button>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ① 图 */}
        <section data-panel="stage" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① Drag P anywhere outside · turn the line
          </p>
          <svg
            ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full cursor-crosshair touch-none"
            onPointerDown={drag} onPointerMove={drag} role="img"
            aria-label="A shape with an external point P and a line through it, the left side of the line shaded"
          >
            {/* 从 P 出发的两条切线:它们之间才切得到图形 */}
            {tangents.map((t, i) => {
              const e = lineEnds(P, t, 30);
              return (
                <line key={i} data-tangent x1={sx(P[0])} y1={sy(P[1])} x2={sx(e[1][0])} y2={sy(e[1][1])}
                  stroke={LAB.muted} strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
              );
            })}

            {/* ⭐⭐ 转过 180° 的轮廓。椭圆:严丝合缝落回自己(所以有捷径);
                煎饼:对不上(所以没有捷径)。**这是这一页唯一说得清"有没有中心"的画面。** */}
            <polygon data-spun points={poly(spun)} fill="none" stroke={LAB.x1}
              strokeWidth={1.3} strokeDasharray="6 4" opacity={0.75} />

            {/* 左侧那一块 —— 和读数同源 */}
            {leftPoly.length > 2 && (
              <polygon data-left points={poly(leftPoly)} fill={LAB.pass} fillOpacity={0.32} stroke="none" />
            )}
            <polygon data-outline points={poly(outline)} fill="none" stroke={LAB.curve} strokeWidth={2.2} />

            {/* 有向直线 */}
            <line data-cut x1={sx(ends[0][0])} y1={sy(ends[0][1])} x2={sx(ends[1][0])} y2={sy(ends[1][1])}
              stroke={LAB.x2} strokeWidth={2.2} />
            {/* 方向箭头 —— "左侧"是相对方向说的,方向必须画出来 */}
            <polygon
              data-arrow
              points={([
                [P[0] + Math.cos(theta) * 1.5, P[1] + Math.sin(theta) * 1.5],
                [P[0] + Math.cos(theta) * 1.05 - Math.sin(theta) * 0.22, P[1] + Math.sin(theta) * 1.05 + Math.cos(theta) * 0.22],
                [P[0] + Math.cos(theta) * 1.05 + Math.sin(theta) * 0.22, P[1] + Math.sin(theta) * 1.05 - Math.cos(theta) * 0.22],
              ] as Pt[]).map((q) => `${sx(q[0]).toFixed(1)},${sy(q[1]).toFixed(1)}`).join(' ')}
              fill={LAB.x2}
            />

            {/* 中心 / 形心 */}
            {shortcut !== null ? (
              <g data-centre>
                <circle cx={sx(s.origin[0])} cy={sy(s.origin[1])} r={3.4} fill={LAB.x1} />
                <text x={sx(s.origin[0]) + 7} y={sy(s.origin[1]) - 5} fill={LAB.x1} fontSize={10}
                  fontFamily="ui-monospace, monospace">centre</text>
              </g>
            ) : (
              <g data-centroid>
                <circle cx={sx(cen[0])} cy={sy(cen[1])} r={3.4} fill={LAB.fail} />
                <text x={sx(cen[0]) + 7} y={sy(cen[1]) - 5} fill={LAB.fail} fontSize={10}
                  fontFamily="ui-monospace, monospace">centroid</text>
              </g>
            )}

            <circle data-p cx={sx(P[0])} cy={sy(P[1])} r={5.5} fill={LAB.x2} stroke="#0b1220" strokeWidth={1.6} />
            <text x={sx(P[0]) + 9} y={sy(P[1]) + 4} fill={LAB.x2} fontSize={11}
              fontFamily="ui-monospace, monospace">P</text>
          </svg>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            <p style={{ color: LAB.pass }}>
              left of the line = <span data-readout="left">{show(left, 3)}</span>
            </p>
            <p className="text-slate-400">
              right = <span data-readout="right">{show(T - left, 3)}</span>
              <span className="ml-3 text-slate-600">whole = <span data-readout="total">{show(T, 3)}</span></span>
            </p>
            <p data-readout="hit" data-state={hit} className="text-[10px] text-slate-500">
              {hit === 'crosses'
                ? 'this line crosses the shape'
                : 'this line misses the shape completely — everything is on one side'}
            </p>
            {/* ⚠️ 煎饼非凸,左侧可能是两块。题面写的是「两个区域」,
                屏幕上却是三块 —— 这句话必须由页面自己说,不能让人以为图画错了。 */}
            {pieces > 1 && (
              <p data-readout="pieces" data-count={pieces}
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] leading-relaxed text-slate-400">
                the left side is in {pieces} pieces here. The theorem never asked for one piece — it
                compares the area on the two sides of the line, and that is all it needs.
              </p>
            )}
            <p className="text-[10px] text-slate-600">
              dashed outline = the shape turned halfway around
              {shortcut !== null ? ' — it lands back on itself' : ' — it does not land back on itself'}
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          {/* ② 转过 π */}
          <section data-panel="flip" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② Turn it halfway around — same line, other side
            </p>
            <div className="mt-2"><Flip shapeId={id} P={P} theta={theta} /></div>
            <p className="mt-2 font-mono text-[11px] text-slate-400">
              the two add to <span data-readout="flip-sum" style={{ color: LAB.pass }}>
                {show(areaLeft(s, P, theta) + areaLeft(s, P, theta + Math.PI), 3)}
              </span>{' '}— the whole shape, every time
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{WHY_ENDPOINTS}</p>
          </section>

          {/* ③ g 曲线 */}
          <section data-panel="graph" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ The difference, swept from θ = 0 to θ = π
            </p>
            <svg viewBox={`0 0 ${GW} ${GH}`} className="mt-2 w-full" role="img"
              aria-label="The difference in area as the line turns, crossing zero between two opposite-signed ends">
              {/* 零线 */}
              <line x1={30} y1={gy(0)} x2={GW - 12} y2={gy(0)} stroke={LAB.axis} strokeWidth={1.4} />
              <text x={4} y={gy(0) + 3} fill={LAB.axis} fontSize={9} fontFamily="ui-monospace, monospace">0</text>
              {/* ±T 平台的高度 */}
              {[1, -1].map((k) => (
                <line key={k} x1={30} y1={gy(k * T)} x2={GW - 12} y2={gy(k * T)}
                  stroke={LAB.muted} strokeWidth={0.8} strokeDasharray="2 4" opacity={0.5} />
              ))}
              {/* 曲线 */}
              <polyline
                data-gcurve fill="none" stroke={LAB.curve} strokeWidth={2.2}
                points={curve.map((p) => `${gx(p.theta).toFixed(1)},${gy(p.g).toFixed(1)}`).join(' ')}
              />
              {/* 两个端点 —— 天生异号 */}
              {[curve[0]!, curve[curve.length - 1]!].map((p, i) => (
                <g key={i} data-endpoint={i}>
                  <circle cx={gx(p.theta)} cy={gy(p.g)} r={4.5} fill={p.g > 0 ? LAB.pass : LAB.fail} />
                  {/* ⚠️ 端点在下方时,标签要往**上**放:往下会和左下角的「θ = 0」压在一起。
                      两块内容叠在一起,读者只会以为是渲染坏了。*/}
                  <text x={gx(p.theta) + (i === 0 ? 6 : -6)} y={gy(p.g) + (p.g > 0 ? -8 : -9)}
                    textAnchor={i === 0 ? 'start' : 'end'} fill={p.g > 0 ? LAB.pass : LAB.fail}
                    fontSize={10} fontFamily="ui-monospace, monospace">
                    {i === 0 ? 'g(0)' : 'g(π)'} = {show(p.g, 2)}
                  </text>
                </g>
              ))}
              {/* 答案 */}
              <g data-answer>
                <line x1={gx(((answer.theta % Math.PI) + Math.PI) % Math.PI)} y1={18}
                  x2={gx(((answer.theta % Math.PI) + Math.PI) % Math.PI)} y2={GH - 12}
                  stroke={LAB.pass} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.8} />
                <circle cx={gx(((answer.theta % Math.PI) + Math.PI) % Math.PI)} cy={gy(0)} r={4}
                  fill="none" stroke={LAB.pass} strokeWidth={2} />
              </g>
              {/* 当前 θ */}
              <circle data-cursor cx={gx(theta)} cy={gy(g)} r={4} fill={LAB.x2} />
              <text x={30} y={GH - 2} fill={LAB.muted} fontSize={9} fontFamily="ui-monospace, monospace">θ = 0</text>
              <text x={GW - 12} y={GH - 2} textAnchor="end" fill={LAB.muted} fontSize={9}
                fontFamily="ui-monospace, monospace">θ = π</text>
            </svg>
            <div className="mt-1 space-y-0.5 font-mono text-[11px]">
              <p>
                <span className="text-slate-400">g(θ) = left − right = </span>
                <span data-readout="g" style={{ color: Math.abs(g) < 1e-6 ? LAB.pass : LAB.x2 }}>
                  {show(g, 3)}
                </span>
              </p>
              <p className="text-slate-500">
                the bisecting angle is{' '}
                <span data-readout="answer" style={{ color: LAB.pass }}>
                  {show(((answer.theta % Math.PI) + Math.PI) % Math.PI, 4)}
                </span>
                <span className="ml-2 text-slate-600">
                  found in <span data-readout="steps">{answer.steps}</span> halvings
                </span>
              </p>
              {solved && (
                <p data-readout="solved" style={{ color: LAB.pass }}>
                  ✓ left and right now agree to {show(Math.abs(g), 6)}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ④ 两条注脚:平台,以及"捷径" */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section data-panel="outside" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Why P being outside changes nothing
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{OUTSIDE_NOTE}</p>
        </section>
        <section
          data-panel="shortcut" className="rounded-2xl border p-4"
          style={{
            borderColor: shortcut === null ? `${LAB.fail}59` : `${LAB.x1}59`,
            background: shortcut === null ? `${LAB.fail}0f` : `${LAB.x1}0f`,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Is there a shortcut?
          </p>
          {shortcut !== null ? (
            <>
              <p className="mt-2 font-mono text-[11px]" style={{ color: LAB.x1 }}>
                line through the centre = <span data-readout="shortcut">{show(shortcut, 4)}</span>
                <span className="ml-2 text-slate-500">
                  — matches the bisector to {show(Math.abs(shortcut - (((answer.theta % Math.PI) + Math.PI) % Math.PI)), 6)}
                </span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.note}</p>
            </>
          ) : (
            <>
              <p className="mt-2 font-mono text-[11px]" style={{ color: LAB.fail }}>
                line through the centroid = <span data-readout="centroid-angle">{show(angleTo(P, cen), 4)}</span>
                <span className="ml-2 text-slate-400">
                  → splits it{' '}
                  <span data-readout="centroid-share">{show(cenShare * 100, 2)}</span>
                  {' / '}{show((1 - cenShare) * 100, 2)}
                  <span className="ml-2 text-slate-500">
                    (off by <span data-readout="centroid-off">{show(Math.abs(cenOff), 3)}</span>)
                  </span>
                </span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{CENTROID_TRAP}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.note}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
