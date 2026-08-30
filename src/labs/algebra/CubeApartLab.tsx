/**
 * LAB — 「Take a Cube Apart」(立方差 `a³ − b³ = (a − b)(a² + ab + b²)`)
 *
 * ⭐⭐ 这一课只回答一个问题:**第二个因子为什么长得那么怪?**
 * 答案在图上:剩下的壳切成三块长方体,三块的**厚度都是 a − b**,
 * 而三块的**截面**恰好是 a²、ab、b²。把公共的厚度提出来,剩下的就是那个因子。
 * 它不怪 —— 它是三块截面之和。
 *
 * ⚠️ 用**等距 SVG**,不拉 Three.js。这一页只要看清三块怎么摆,
 * 背上一个 3D 引擎(gzip 241 kB)不值当,而且 `src/labs/` 的架构测试也不允许。
 */
import { useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import {
  ActionButton,
  IntSlider,
  LessonHead,
  Panel,
  QuietButton,
  RevealButton,
  TermChip,
  Toggle,
  useTween,
} from './shared';
import {
  EXPANSION,
  FIRST_HALF,
  HEADLINE,
  PATTERNS,
  RANGE,
  SECOND_HALF,
  SIGNS,
  WHY_WEIRD,
  bigVolume,
  boxVolume,
  boxes,
  clampPair,
  crossSection,
  cubesTex,
  drawOrder,
  facesOf,
  factoredNumbersPlain,
  numbersPlain,
  patternOf,
  remainingVolume,
  smallVolume,
  survivingTerms,
  volumeByBoxes,
  volumeByFactors,
  type Box,
  type Sign,
} from '../../math/differenceOfCubes';

const SIGN_OPTIONS = [
  { id: 'difference' as const, label: 'Difference' },
  { id: 'sum' as const, label: 'Sum' },
];

/** 每块一个颜色。⚠️ 和它对应的那一项用同一个颜色 —— 图和式子必须对得上。 */
const BOX_COLOUR: Readonly<Record<Box['id'], string>> = {
  slab: LAB.x1,
  panel: LAB.x2,
  stick: LAB.pass,
};

/* ══ 等距图 ════════════════════════════════════════════════════════ */

function IsoView({ a, b, explode }: { a: number; b: number; explode: number }) {
  const scale = 260 / (a * 2.1);
  const list = useMemo(() => drawOrder(boxes(a, b)), [a, b]);

  // 取景:把所有面的顶点都算一遍,取包围盒
  const all = list.flatMap((box) => facesOf(box, explode, scale).flatMap((f) => f.points));
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const pad = 26;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;

  const shade: Readonly<Record<'top' | 'left' | 'right', number>> = {
    top: 0.42, left: 0.2, right: 0.3,
  };

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="w-full select-none"
      role="img"
      aria-label={`A cube of side ${a} with a cube of side ${b} taken out of one corner, split into three boxes`}
    >
      {list.map((box) => {
        const colour = BOX_COLOUR[box.id];
        return (
          <g key={box.id} data-box={box.id} data-volume={String(boxVolume(box))}>
            {facesOf(box, explode, scale).map((face) => (
              <polygon
                key={face.kind}
                data-face={face.kind}
                points={face.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
                fill={colour}
                fillOpacity={shade[face.kind]}
                stroke={colour}
                strokeWidth={1.3}
                strokeLinejoin="round"
              />
            ))}
          </g>
        );
      })}
      {/* 拆开之后给每块标上它的截面 —— 那三项 */}
      {explode > 0.6 && list.map((box) => {
        const points = facesOf(box, explode, scale).find((f) => f.kind === 'top')!.points;
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
        return (
          <text
            key={`t-${box.id}`}
            data-box-label={box.id}
            x={cx} y={cy + 4}
            fill={BOX_COLOUR[box.id]} fontSize={13} fontWeight={700} textAnchor="middle"
            fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke"
          >
            {box.termValue}
          </text>
        );
      })}
    </svg>
  );
}

/* ══ 代数 ══════════════════════════════════════════════════════════ */

function Expansion({ a, b }: { a: number; b: number }) {
  const [step, setStep] = useState(0);
  const cancelled = step >= 3;

  return (
    <Panel name="expansion" label="Multiply it out" extra={{ 'data-step': String(step) }}>
      <p className="text-base text-slate-100">
        <Tex src="(a - b)(a^2 + ab + b^2)" />
      </p>

      {step >= 1 && (
        <p className="mt-3 text-sm text-slate-300">
          <Tex src="a(a^2 + ab + b^2) - b(a^2 + ab + b^2)" />
        </p>
      )}

      {step >= 2 && (
        <div className="mt-3 space-y-1.5">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
            {FIRST_HALF.map((term, i) => (
              <TermChip key={`f${i}`} index={i} tex={term.tex} sign={term.sign} cancelled={cancelled && term.cancels} />
            ))}
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
            {SECOND_HALF.map((term, i) => (
              <TermChip key={`s${i}`} index={i + 1} tex={term.tex} sign={term.sign} cancelled={cancelled && term.cancels} />
            ))}
          </p>
        </div>
      )}

      {step >= 3 && (
        <p data-readout="cancel-note" className="mt-2 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
          Two pairs cancel: <Tex src="+a^2b" /> against <Tex src="-a^2b" />, and <Tex src="+ab^2" /> against{' '}
          <Tex src="-ab^2" />.
        </p>
      )}

      {step >= 4 && (
        <>
          <p data-readout="survivors" className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg">
            {survivingTerms().map((term, i) => (
              <TermChip key={term.tex} index={i} tex={term.tex} sign={term.sign} cancelled={false} />
            ))}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{WHY_WEIRD}</p>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
            <span className="text-slate-500">a³ − b³</span>
            <span data-readout="check-left" className="text-right" style={{ color: LAB.x1 }}>{remainingVolume(a, b)}</span>
            <span className="text-slate-500">(a−b)(a²+ab+b²)</span>
            <span data-readout="check-right" className="text-right" style={{ color: LAB.pass }}>{volumeByFactors(a, b)}</span>
          </div>
        </>
      )}

      {step < 4 && (
        <RevealButton
          onClick={() => setStep((n) => n + 1)}
          label={['Split the bracket →', 'Multiply each →', 'What cancels? →', 'What is left? →'][step] ?? 'Next →'}
        />
      )}
    </Panel>
  );
}

/** ⭐ 「少一项会怎样」—— 把 WHY_WEIRD 那句话变成可以自己试的东西。 */
function DropOnePanel({ a, b }: { a: number; b: number }) {
  const [dropped, setDropped] = useState<string | null>(null);
  const parts = [
    { tex: 'a^2', value: a * a },
    { tex: 'ab', value: a * b },
    { tex: 'b^2', value: b * b },
  ];
  const full = parts.reduce((s, p) => s + p.value, 0);
  const used = dropped === null ? full : full - parts.find((p) => p.tex === dropped)!.value;
  const product = (a - b) * used;
  const right = product === remainingVolume(a, b);

  return (
    <Panel name="drop-one" label="Why not a shorter second factor?" extra={{ 'data-dropped': dropped ?? 'none' }}>
      <p className="text-xs leading-relaxed text-slate-500">
        Take a term out of <Tex src="a^2 + ab + b^2" /> and see what the product becomes.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {parts.map((part) => (
          <button
            key={part.tex}
            type="button"
            data-drop={part.tex}
            data-active={dropped === part.tex ? 'yes' : 'no'}
            onClick={() => setDropped(dropped === part.tex ? null : part.tex)}
            className={
              'rounded-lg border px-2.5 py-1 text-sm transition ' +
              (dropped === part.tex ? 'border-amber-400/60 bg-amber-400/10 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-slate-500')
            }
          >
            drop <Tex src={part.tex} />
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">(a − b) × second factor</span>
        <span data-readout="drop-product" className="text-right" style={{ color: right ? LAB.pass : LAB.fail }}>{product}</span>
        <span className="text-slate-500">a³ − b³</span>
        <span data-readout="drop-target" className="text-right text-slate-300">{remainingVolume(a, b)}</span>
      </div>
      {/* ⚠️ 这里用红色是恰当的:少一项之后那个等式**确实不成立**了。 */}
      <p data-readout="drop-verdict" data-right={right ? 'yes' : 'no'} className="mt-2 text-xs leading-relaxed"
        style={{ color: right ? LAB.pass : LAB.fail }}>
        {right
          ? 'All three terms present — the product lands exactly on a³ − b³.'
          : `Off by ${Math.abs(remainingVolume(a, b) - product)}. That missing piece was doing real work.`}
      </p>
    </Panel>
  );
}

/* ══ 认形状 ════════════════════════════════════════════════════════ */

function PatternPanel() {
  const [id, setId] = useState(PATTERNS[0]!.id);
  const [step, setStep] = useState(0);
  const pattern = patternOf(id);

  return (
    <Panel name="patterns" label="Spot the pattern" extra={{ 'data-current': id, 'data-step': String(step) }}>
      <div className="flex flex-wrap gap-2">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-pattern={p.id}
            data-active={p.id === id ? 'yes' : 'no'}
            onClick={() => { setId(p.id); setStep(0); }}
            className={
              'rounded-lg border px-2.5 py-1.5 text-sm transition ' +
              (p.id === id ? 'border-amber-400/60 bg-amber-400/10 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-slate-500')
            }
          >
            <Tex src={p.tex} />
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-lg text-slate-100"><Tex src={pattern.tex} /></p>
        {step >= 1 && (
          <div data-readout="why" className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed">
            <p style={{ color: LAB.x1 }}>{pattern.aWhy}</p>
            <p style={{ color: LAB.x2 }}>{pattern.bWhy}</p>
          </div>
        )}
        {step >= 2 && <p className="text-base text-slate-100"><Tex src={pattern.asCubesTex} /></p>}
        {step >= 3 && (
          <p data-readout="factored" className="text-lg" style={{ color: LAB.pass }}>
            <Tex src={pattern.factoredTex} />
          </p>
        )}
      </div>
      {step < 3 && (
        <RevealButton
          onClick={() => setStep((n) => n + 1)}
          label={['Which cubes? →', 'Rewrite it →', 'Factor it →'][step] ?? 'Next →'}
        />
      )}
    </Panel>
  );
}

/* ══ 页面 ══════════════════════════════════════════════════════════ */

export function CubeApartLab() {
  const [rawA, setRawA] = useState(5);
  const [rawB, setRawB] = useState(2);
  const [sign, setSign] = useState<Sign>('difference');
  const { a, b } = useMemo(() => clampPair(rawA, rawB), [rawA, rawB]);
  const { t, play, reset, animated } = useTween(1600);
  const apart = t > 0.6;
  const entry = SIGNS[sign];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <LessonHead
        title="Difference of Cubes"
        headline={HEADLINE}
        lede="The strange second factor is just three cross-sections added up."
      />

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <IntSlider name="a" label="a" value={a} min={RANGE.min + 1} max={RANGE.max} onChange={setRawA} colour={LAB.x1} />
            <IntSlider name="b" label="b" value={b} min={RANGE.min} max={Math.max(RANGE.min, a - 1)} onChange={setRawB} colour={LAB.x2} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton name="explode" onClick={play} disabled={apart}>
              {animated ? 'Take it apart →' : 'Show the three boxes →'}
            </ActionButton>
            <QuietButton name="reset" onClick={reset}>Put it back</QuietButton>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.1fr_1fr_0.95fr]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {apart ? '② Three boxes' : '① One cube, minus a corner'}
            </p>
            <div className="mt-2">
              <IsoView a={a} b={b} explode={t} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {apart
                ? 'Every box is the same thickness — a − b. Only their cross-sections differ.'
                : 'The small cube in the near corner is being removed. What is left is the shell.'}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Panel name="volumes" label="What is left" extra={{ 'data-remaining': String(remainingVolume(a, b)) }}>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                <span className="text-slate-500">a³</span>
                <span data-readout="big" className="text-right" style={{ color: LAB.x1 }}>{bigVolume(a)}</span>
                <span className="text-slate-500">b³</span>
                <span data-readout="small" className="text-right" style={{ color: LAB.x2 }}>{smallVolume(b)}</span>
                <span className="text-slate-500">remaining</span>
                <span data-readout="remaining" className="text-right" style={{ color: LAB.pass }}>{remainingVolume(a, b)}</span>
              </div>
              <p className="mt-2 text-base text-slate-100"><Tex src={cubesTex(a, b)} /></p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{numbersPlain(a, b)}</p>
            </Panel>

            <Panel name="boxes" label="③ The common thickness" extra={{ 'data-sum': String(volumeByBoxes(a, b)) }}>
              <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
                <span className="text-slate-500">cross-section</span>
                <span className="text-slate-500">thickness</span>
                <span className="text-right text-slate-500">volume</span>
                {boxes(a, b).map((box) => (
                  <BoxRow key={box.id} box={box} thickness={a - b} />
                ))}
              </div>
              <p className="mt-2.5 text-sm text-slate-100">
                <Tex src={`(a - b)\\,(${boxes(a, b).map((box) => box.termTex).join(' + ')})`} />
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{factoredNumbersPlain(a, b)}</p>
            </Panel>

            <DropOnePanel a={a} b={b} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Expansion a={a} b={b} />

            <Panel name="result" label="The pattern" tone="good" extra={{ 'data-sign': sign }}>
              <div className="mb-2">
                <Toggle name="sign" options={SIGN_OPTIONS} value={sign} onChange={setSign} />
              </div>
              <p className="text-base text-slate-100"><Tex src={entry.factoredTex} display /></p>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                <span className="text-slate-500">first factor</span>
                <span className="text-right" style={{ color: LAB.x1 }}><Tex src={entry.firstFactorTex} /></span>
                <span className="text-slate-500">second factor</span>
                <span className="text-right" style={{ color: LAB.x2 }}><Tex src={entry.secondFactorTex} /></span>
                <span className="text-slate-500">at a = {a}, b = {b}</span>
                <span data-readout="sign-value" className="text-right" style={{ color: LAB.pass }}>{entry.at(a, b)}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {sign === 'difference'
                  ? 'Exponents go 2, 1, 0 across the second factor — a², ab, b².'
                  : 'Only the middle sign changed. Everything else is the same shape.'}
              </p>
            </Panel>
          </div>
        </div>
      </section>

      <div className="mt-4">
        <PatternPanel />
      </div>
    </main>
  );
}

function BoxRow({ box, thickness }: { box: Box; thickness: number }) {
  return (
    <>
      {/* ⚠️ 截面的**数值**单独挂一个属性。
          检查从文字里剥数字会连 KaTeX 渲染出的 "a2" 一起剥走,读成 22225。 */}
      <span data-box-term={box.id} data-section={String(Math.round(crossSection(box)))} style={{ color: BOX_COLOUR[box.id] }}>
        <Tex src={box.termTex} /> = {Math.round(crossSection(box))}
      </span>
      <span className="text-slate-400">{thickness}</span>
      <span data-box-volume={box.id} className="text-right text-slate-300">{boxVolume(box)}</span>
    </>
  );
}

/** 让 EXPANSION 保持被引用 —— 它是展开面板的数据源。 */
export const TERM_COUNT = EXPANSION.length;
