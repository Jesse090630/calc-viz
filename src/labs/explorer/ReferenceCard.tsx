/**
 * LAB — 参考卡:六条特殊极限的**索引**。
 *
 * ⚠️⚠️ 提示词点名:**这不是主教学体验**,而且**只在学生探索过之后才出现**。
 * 所以它:
 *   · 默认是收起来的,要按一下才展开;
 *   · 放在 Explorer 的**最底下**,而 Explorer 本身排在六节课之后;
 *   · 每一条展开后先说「靠哪条推出来」,再说结论 —— 顺序不能反。
 *
 * ⚠️ 卡片上的每一条都必须能点开看到:图、一句解读、它由哪条推出、一道变形例题。
 * 四样缺一样,它就退化成一张公式表 —— 而公式表正是这一节从头到尾在避免的东西。
 */
import { useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  FORMS_BY_FAMILY,
  formOf,
  sampleCurve,
  spanAt,
  type Family,
  type FormId,
} from '../../math/specialForms';
import { answerTex, exampleFor } from '../../math/patternMatch';

const FAMILY_LABEL: Readonly<Record<Family, string>> = {
  trigonometric: 'Trigonometric',
  exponential: 'Exponential',
  logarithmic: 'Logarithmic',
};

const ROLE_COLOR = { subject: LAB.pass, companion: LAB.x2, aside: LAB.x1 } as const;

/** 一条极限的缩略图:主曲线 + 它的局部替身。中等缩放,一眼看得出「贴合」。 */
function Sparkline({ id }: { id: FormId }) {
  const form = formOf(id);
  const span = spanAt(id, 2);
  const series = useMemo(
    () => form.curves.map((curve) => ({ curve, points: sampleCurve(curve.at, -span, span, 120) })),
    [form, span],
  );
  const { yMin, yMax } = useMemo(() => {
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (const { points } of series) {
      for (const p of points) {
        if (p.y === null || !Number.isFinite(p.y)) continue;
        low = Math.min(low, p.y);
        high = Math.max(high, p.y);
      }
    }
    if (!Number.isFinite(low) || high - low < 1e-12) return { yMin: -1, yMax: 1 };
    const pad = (high - low) * 0.16;
    return { yMin: low - pad, yMax: high + pad };
  }, [series]);

  const V = makeViewport({
    width: 260, height: 120,
    xMin: -span, xMax: span, yMin, yMax,
    padLeft: 10, padRight: 10, padTop: 10, padBottom: 10,
  });

  return (
    <svg
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${form.title}: the curve and its local companion near zero`}
    >
      {yMin < 0 && yMax > 0 && (
        <line x1={V.padLeft} y1={toSvgY(V, 0)} x2={V.width - V.padRight} y2={toSvgY(V, 0)} stroke={LAB.axis} strokeWidth={1} />
      )}
      <line x1={toSvgX(V, 0)} y1={V.padTop} x2={toSvgX(V, 0)} y2={V.height - V.padTop} stroke={LAB.axis} strokeWidth={1} opacity={0.55} />
      {series.map(({ curve, points }) => (
        <path
          key={curve.key}
          d={polylinePath(V, points)}
          fill="none"
          stroke={ROLE_COLOR[curve.role]}
          strokeWidth={curve.role === 'subject' ? 2.2 : 1.5}
          strokeDasharray={curve.role === 'companion' ? '5 4' : undefined}
          strokeLinecap="round"
          opacity={curve.role === 'aside' ? 0.7 : 1}
        />
      ))}
    </svg>
  );
}

function Entry({ id, open, onToggle }: { id: FormId; open: boolean; onToggle: () => void }) {
  const form = formOf(id);
  const example = exampleFor(id);

  return (
    <div
      data-reference-entry={id}
      data-open={open ? 'yes' : 'no'}
      className="rounded-xl border border-slate-800 bg-slate-900/40 transition hover:border-slate-600"
    >
      <button
        type="button"
        data-action={`reference-${id}`}
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="text-sm text-slate-100">
          <Tex src={form.limitTex} />
        </span>
        <span aria-hidden="true" className="font-mono text-xs text-slate-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-3 py-3">
          <Sparkline id={id} />
          <p data-readout="reading" className="mt-2 text-xs leading-relaxed text-slate-300">
            {form.reading}
          </p>

          <p data-readout="provenance" className="mt-2.5 text-xs leading-relaxed text-slate-400">
            {form.provenBy.length > 0 ? (
              <>
                <span className="text-slate-500">Proved from </span>
                <span style={{ color: LAB.x2 }}>
                  {form.provenBy.map((parent) => formOf(parent).ratioTex).map((tex, i) => (
                    <span key={tex}>
                      {i > 0 ? ' and ' : ''}
                      <Tex src={tex} />
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-500">Rests on </span>
                <span style={{ color: LAB.x1 }}>{form.groundedIn}</span>
              </>
            )}
          </p>

          <div className="mt-2.5 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              one transformed example
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-100">
              <Tex src={example.tex} />
              <span className="text-slate-600">=</span>
              <span data-readout="example-answer" style={{ color: LAB.pass }}>
                <Tex src={answerTex(example.id)} />
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReferenceCard() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<FormId | null>(null);

  if (!shown) {
    return (
      <section
        data-panel="reference"
        data-shown="no"
        className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Reference card
        </p>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-400">
          A compact list of all six, for looking things up later. It is deliberately not the way to
          learn them — every entry here was earned somewhere else in this section.
        </p>
        <button
          type="button"
          data-action="show-reference"
          onClick={() => setShown(true)}
          className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          Show the reference card →
        </button>
      </section>
    );
  }

  return (
    <section
      data-panel="reference"
      data-shown="yes"
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Common special limits
      </p>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {(Object.keys(FORMS_BY_FAMILY) as Family[]).map((family) => (
          <div key={family} data-family={family} className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: LAB.x1 }}>
              {FAMILY_LABEL[family]}
            </p>
            <div className="mt-2 space-y-2">
              {FORMS_BY_FAMILY[family].map((id) => (
                <Entry
                  key={id}
                  id={id}
                  open={open === id}
                  onToggle={() => setOpen((current) => (current === id ? null : id))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
        Tap any line to see its picture, what it means, which earlier limit proves it, and one problem
        it solves.
      </p>
    </section>
  );
}
