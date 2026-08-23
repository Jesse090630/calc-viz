/**
 * LAB — 非递减:右侧的三块面板
 *
 *   ① LiveRule    —— 前件 / 结论,代入当前这一对的数字
 *   ② Comparison  —— `<` 与 `≤` 并排,同一对输入下**同时**给判定
 *   ③ MentalModel —— ↗ → ↘ 三格,当前这一对亮起对应的那一格
 *
 * ⚠️ 判定状态一律挂 `data-*` 属性(`data-verdict` / `data-shape` / `data-relation-holds`)。
 * 这个项目里已经有三次浏览器测试**靠读文案**误判的记录
 * (KaTeX 读不出、CSS uppercase 改了大小写、常驻的对照表里永远写着 "×")。
 * 规矩:要断言"当前状态",就给它一个属性,别搜文字。
 *
 * ⚠️ `<` 与 `≤` 的对照表**常驻显示**,不是只在平坦时才出现。
 * 只在平坦时弹出来的话,学生看到的是"平坦时有个提示",
 * 而不是"这两条规则一直都在,只是在平坦处才分道扬镳"。
 */
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import { RELATIONS } from '../../math/monotonicity';
import { SHAPE_COPY, showX, showY, type PairReading, type Shape } from '../../math/nondecreasing';

const STRICT = RELATIONS['strictly-increasing'];
const NONDECREASING = RELATIONS.nondecreasing;

function Verdict({ ok }: { ok: boolean }) {
  const state = ok ? STATE.pass : STATE.fail;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-xs font-bold"
      style={{ color: state.color }}
    >
      <span aria-hidden="true">{state.symbol}</span>
      <span className="sr-only">{state.text}</span>
    </span>
  );
}

/* ── ① 当前这一对代入定义 ──────────────────────────────────────────── */

export function LiveRule({ reading }: { reading: PairReading }) {
  const shape = SHAPE_COPY[reading.shape];
  return (
    <section
      data-panel="live-rule"
      data-verdict={reading.satisfiesNondecreasing ? 'holds' : 'broken'}
      data-shape={reading.shape}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The rule, right now</p>

      {/* 前件。由 `snapPair` 保证,永远成立 —— 所以它是灰的,不抢戏。 */}
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-slate-300">
          <Tex src="x_1 < x_2" />
        </span>
        <span className="font-mono text-xs text-slate-500">
          {showX(reading.x1)} &lt; {showX(reading.x2)}
        </span>
        <Verdict ok />
      </div>

      <p className="mt-2 text-center text-slate-600" aria-hidden="true">↓</p>

      {/* 结论。这一行才是变量。 */}
      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <span className="text-lg text-slate-100">
          <Tex src={NONDECREASING.consequentTex} />
        </span>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: reading.satisfiesNondecreasing ? LAB.pass : LAB.fail }}
        >
          {showY(reading.y1)} {reading.shape === 'flat' ? '=' : reading.shape === 'up' ? '<' : '>'}{' '}
          {showY(reading.y2)}
        </span>
        <Verdict ok={reading.satisfiesNondecreasing} />
      </div>

      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: shape.allowed ? LAB.pass : LAB.fail }}
      >
        <span aria-hidden="true" className="mr-1 text-base">{shape.arrow}</span>
        {shape.note}
      </p>

      {/*
        ⚠️ 只有在**中间整段都平**的时候才说"这一段是平的"。
        两端等高不等于中间平 —— 有下坡的图上先上后下也能回到同一高度。
      */}
      {reading.shape === 'flat' && (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {reading.flatBetween
            ? 'Every section between these two inputs is flat.'
            : 'The two outputs match, but the graph did not stay level between them — it went up and then came back down.'}
        </p>
      )}
    </section>
  );
}

/* ── ② `<` 与 `≤` 并排 ─────────────────────────────────────────────── */

export function Comparison({ reading }: { reading: PairReading }) {
  const rows = [
    { relation: STRICT, holds: reading.satisfiesStrict, name: 'Strictly increasing' },
    { relation: NONDECREASING, holds: reading.satisfiesNondecreasing, name: 'Nondecreasing' },
  ];
  const split = reading.satisfiesNondecreasing && !reading.satisfiesStrict;

  return (
    <section data-panel="comparison" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">One symbol apart</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.relation.id}
            data-relation={row.relation.id}
            data-relation-holds={row.holds ? 'yes' : 'no'}
            className={
              'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ' +
              (row.holds ? 'border-slate-700 bg-slate-900/60' : 'border-red-500/30 bg-red-500/5')
            }
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{row.name}</p>
              <p className="mt-0.5 text-slate-100">
                <Tex src={row.relation.consequentTex} />
              </p>
            </div>
            <Verdict ok={row.holds} />
          </div>
        ))}
      </div>

      {/* 分道扬镳的那一刻才点题 —— 平时这句留着会变成背景噪音 */}
      <p
        data-split={split ? 'yes' : 'no'}
        className={
          'mt-3 rounded-lg px-3 py-2 text-sm leading-relaxed transition ' +
          (split ? 'bg-amber-400/10 text-amber-200' : 'text-slate-500')
        }
      >
        {split ? (
          <>
            Same pair, two different answers. <span className="font-mono font-bold">≤</span> allows flat
            sections; <span className="font-mono font-bold">&lt;</span> does not.
          </>
        ) : (
          <>Land both points on a flat stretch to see these two disagree.</>
        )}
      </p>
    </section>
  );
}

/* ── ③ ↗ → ↘ ──────────────────────────────────────────────────────── */

const CELLS: readonly Shape[] = ['up', 'flat', 'down'];

export function MentalModel({ active }: { active: Shape }) {
  return (
    <section data-panel="mental-model" data-active={active} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The whole rule</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CELLS.map((cell) => {
          const copy = SHAPE_COPY[cell];
          const on = cell === active;
          return (
            <div
              key={cell}
              data-cell={cell}
              data-on={on ? 'yes' : 'no'}
              className={
                'rounded-xl border px-2 py-3 text-center transition duration-300 ' +
                (on
                  ? copy.allowed
                    ? 'scale-[1.04] border-green-400/60 bg-green-400/10'
                    : 'scale-[1.04] border-red-400/60 bg-red-400/10'
                  : 'border-slate-800 bg-slate-900/40')
              }
            >
              <p
                className="text-2xl leading-none"
                aria-hidden="true"
                style={{ color: copy.allowed ? LAB.pass : LAB.fail, opacity: on ? 1 : 0.45 }}
              >
                {copy.arrow}
              </p>
              <p
                className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: copy.allowed ? LAB.pass : LAB.fail, opacity: on ? 1 : 0.5 }}
              >
                {copy.allowed ? 'allowed' : 'not allowed'}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Up is fine. Flat is fine. Down is the only thing the definition forbids.
      </p>
    </section>
  );
}
