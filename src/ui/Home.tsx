/**
 * UI — 首页
 *
 * Concept Atlas:保留干净、清楚、整齐的目录原则,但给三十节课加上搜索、
 * 分类与最近访问。顶部只写功能性信息,不放第二次访问就变成噪音的营销文案。
 *
 * ⚠️ 卡片标题一律用**概念本身的名字**(Increasing Functions / Domain of a Function),
 * 不用「Every Pair Must Work」这类金句。金句适合当课内的钩子,
 * 但目录是拿来**找东西**的:找的人心里想的是"定义域",不是那句话。
 *
 * ⚠️ 首页的体积纪律(W6 立的,别破坏):
 * ① **不 import 任何实验台组件。** 预览是几十行独立 SVG,不是把课搬过来。
 * ② **不碰 Three.js。** 这一页一个 canvas 都不该有。
 * 判断有没有破坏,不要靠读代码 —— 跑构建、在真浏览器里量首屏下载量。
 *
 * 推导链目录仍然封存在 `ConceptGrid.tsx`(八条链的路由都还在,只是首页不列)。
 */
import { useEffect, useRef, useState } from 'react';
import { PREVIEWS } from './previews/LessonPreviews';
import { usePreviewClock } from './previews/clock';
// ⚠️ 六条特殊极限的**标题从目录里取**,不在这里再抄一遍。
//    抄一遍的代价是:课页顶上写一个名字、目录卡上写另一个 —— 那是最招人烦的一种不一致,
//    而且 `home-check.mjs` 正是在查这个。这里 import 的是纯数学模块,不是实验台组件,
//    首页的体积纪律不受影响。
import { formOf } from '../math/specialForms';

interface LessonCard {
  readonly id: string;
  /** 概念的名字。这是标题。 */
  readonly title: string;
  /** 一行说明,尽量控制在七八个词以内 —— 三列排布下超过两行卡片就参差了。 */
  readonly question: string;
}

const LESSONS: readonly LessonCard[] = [
  {
    id: 'chain-rule',
    title: 'The Chain Rule',
    question: 'Two stages of stretching multiply.',
  },
  {
    id: 'u-substitution',
    title: 'u-Substitution',
    question: 'Where the du actually comes from.',
  },
  {
    id: 'ftc',
    title: 'The Fundamental Theorem',
    question: 'Widen by h; the extra area is a rectangle.',
  },
  {
    id: 'by-parts',
    title: 'Integration by Parts',
    question: 'The wrong u is legal, just useless.',
  },
  {
    id: 'implicit',
    title: 'Implicit Differentiation',
    question: 'That dy/dx is the chain rule.',
  },
  {
    id: 'related-rates',
    title: 'Related Rates',
    question: 'Same move, but the variable is time.',
  },
  {
    id: 'optimization',
    title: 'Optimization',
    question: 'Setting the derivative to zero is a filter, not an answer.',
  },
  {
    id: 'bisect-line',
    title: 'Cut It in Half Through P',
    question: 'Turn the line halfway around and the two sides trade places.',
  },
  /* ── 七条推导链 ────────────────────────────────────────────────
   * ⚠️ 这七条一直都在,路由也一直能开,但改版之后首页不再列出它们,
   *    于是只能靠手打 URL 进去。AGENTS.md 说得很清楚:推导链**就是**
   *    这个产品的差异点(GeoGebra / Desmos 只给结果,不给来历),
   *    它不该是藏起来的那一半。
   */
  {
    id: 'derivative',
    title: 'The Derivative',
    question: 'Two points, and then only one.',
  },
  {
    id: 'riemann-sum',
    title: 'Riemann Sums',
    question: 'Rectangles, until they stop being wrong.',
  },
  {
    id: 'log-integral',
    title: 'The Natural Log',
    question: 'The power rule has a hole at \u22121.',
  },
  {
    id: 'shell-method',
    title: 'The Shell Method',
    question: 'Spin a strip; get a cylinder.',
  },
  {
    id: 'disk-method',
    title: 'The Disk Method',
    question: 'Cut the same solid the other way.',
  },
  {
    id: 'unit-circle',
    title: 'The Unit Circle',
    question: 'Where sine and cosine actually live.',
  },
  {
    id: 'trig-rates',
    title: 'Trig Derivatives',
    question: 'Walk the circle and read the speed.',
  },
  {
    id: 'functions',
    title: 'Definition of a Function',
    question: 'One input may not have two outputs.',
  },
  {
    id: 'domain',
    title: 'Domain of a Function',
    question: 'Which inputs the rule is allowed to take.',
  },
  {
    id: 'increasing',
    title: 'Increasing Functions',
    question: 'What “increasing” actually requires.',
  },
  {
    id: 'one-sided',
    title: 'One-Sided Limits',
    question: 'Two sides. One destination — or two.',
  },
  {
    id: 'limit-vs-value',
    title: 'Limit vs Function Value',
    question: 'The point doesn\u2019t decide the limit.',
  },
  {
    id: 'epsilon-delta',
    title: 'The Epsilon-Delta Definition',
    question: 'Give me any \u03b5. I can find a \u03b4.',
  },
  {
    id: 'infinite-limits',
    title: 'Infinite Limits',
    question: 'Approach the wall. It never touches.',
  },
  {
    id: 'squeeze',
    title: 'The Squeeze Theorem',
    question: 'Trapped from both sides.',
  },
  {
    id: 'indeterminate',
    title: 'Indeterminate Forms',
    question: '0/0 tells you nothing yet.',
  },
  {
    id: 'sin-over-x',
    title: formOf('sin-over-x').title,
    question: 'Geometry, then squeeze. In radians.',
  },
  {
    id: 'tan-over-x',
    title: formOf('tan-over-x').title,
    question: 'Sin and tan become indistinguishable.',
  },
  {
    id: 'cos-over-x',
    title: formOf('cos-over-x').title,
    question: 'Cosine changes much more slowly.',
  },
  {
    id: 'cos-over-x2',
    title: formOf('cos-over-x2').title,
    question: 'How fast does cosine flatten?',
  },
  {
    id: 'exp-over-x',
    title: formOf('exp-over-x').title,
    question: 'The quotient is a secant slope.',
  },
  {
    id: 'log-over-x',
    title: formOf('log-over-x').title,
    question: 'The exponential limit, reflected.',
  },
  {
    id: 'special-limits',
    title: 'Special Limit Explorer',
    question: 'Can you turn it into one you know?',
  },
  {
    id: 'difference-of-squares',
    title: 'Difference of Squares',
    question: 'Cut the square and slide the pieces.',
  },
  {
    id: 'difference-of-cubes',
    title: 'Difference of Cubes',
    question: 'Why is the second factor so strange?',
  },
  {
    id: 'binomial-theorem',
    title: 'The Binomial Theorem',
    question: 'Where the coefficients come from.',
  },
  {
    id: 'geometric-series',
    title: 'Geometric Series',
    question: 'Shift, subtract, and watch the middle vanish.',
  },
  {
    id: 'secant-to-tangent',
    title: 'From Secant to Tangent',
    question: 'Let h shrink. Why derivatives need limits.',
  },
  {
    id: 'intervals',
    title: 'Increasing and Decreasing Intervals',
    question: 'Scan the curve and read it left to right.',
  },
  {
    id: 'nondecreasing',
    title: 'Nondecreasing Functions',
    question: 'Up or flat. Never down.',
  },
  {
    id: 'nonincreasing',
    title: 'Nonincreasing Functions',
    question: 'Down or flat. Never up.',
  },
  {
    id: 'symmetry',
    title: 'Even and Odd Functions',
    question: 'Odd, even, or neither — by test, not by shape.',
  },
  {
    id: 'periodic',
    title: 'Periodic Functions',
    question: 'Slide a graph onto itself and find T.',
  },
  {
    id: 'secant',
    title: 'Average Rate of Change',
    question: 'The slope of the line through two points.',
  },
  {
    id: 'floor',
    title: 'The Floor Function',
    question: 'Why −1.3 drops to −2, not −1.',
  },
  {
    id: 'ceiling',
    title: 'The Ceiling Function',
    question: 'Why 4.2 jumps up to 5.',
  },
];

type SectionId = 'foundations' | 'limits' | 'algebra' | 'derivations';
type SectionFilter = 'all' | SectionId;

interface LessonSection {
  readonly id: SectionId;
  readonly label: string;
  readonly description: string;
  readonly lessonIds: readonly string[];
}

const SECTIONS: readonly LessonSection[] = [
  {
    id: 'foundations',
    label: 'Functions & behavior',
    description: 'Read a function before you calculate with it.',
    lessonIds: [
      'functions',
      'domain',
      'increasing',
      'intervals',
      'nondecreasing',
      'nonincreasing',
      'symmetry',
      'periodic',
      'secant',
      'floor',
      'ceiling',
    ],
  },
  {
    id: 'limits',
    label: 'Limits & change',
    description: 'Approach, compare, and make the destination unavoidable.',
    lessonIds: [
      'one-sided',
      'limit-vs-value',
      'epsilon-delta',
      'infinite-limits',
      'squeeze',
      'indeterminate',
      'sin-over-x',
      'tan-over-x',
      'cos-over-x',
      'cos-over-x2',
      'exp-over-x',
      'log-over-x',
      'special-limits',
      'secant-to-tangent',
    ],
  },
  {
    id: 'algebra',
    label: 'Algebra patterns',
    description: 'Cut, rearrange, and watch an identity explain itself.',
    lessonIds: [
      'difference-of-squares',
      'difference-of-cubes',
      'binomial-theorem',
      'geometric-series',
    ],
  },
  {
    id: 'derivations',
    label: 'Derivations',
    description: 'Step through a formula being built, one move at a time.',
    lessonIds: [
      'derivative',
      'chain-rule',
      'u-substitution',
      'ftc',
      'by-parts',
      'implicit',
      'related-rates',
      'optimization',
      'bisect-line',
      'riemann-sum',
      'log-integral',
      'shell-method',
      'disk-method',
      'unit-circle',
      'trig-rates',
    ],
  },
] as const;

const LESSON_BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
function LessonCardLink({
  lesson,
  active,
  onPreview,
}: {
  readonly lesson: LessonCard;
  readonly active: boolean;
  readonly onPreview: (id: string) => void;
}) {
  return (
    <a
      data-lesson-card={lesson.id}
      data-active={active || undefined}
      href={`#/${lesson.id}`}
      onPointerEnter={() => onPreview(lesson.id)}
      onFocus={() => onPreview(lesson.id)}
      className="lesson-index__link"
    >
      <span className="lesson-index__mark" aria-hidden="true" />
      <span className="lesson-index__copy">
        <strong>{lesson.title}</strong>
      </span>
      <span aria-hidden="true" className="lesson-index__arrow">→</span>
    </a>
  );
}

export function Home() {
  const { phase, animated } = usePreviewClock();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<SectionFilter>('all');
  const [previewLessonId, setPreviewLessonId] = useState(LESSONS[0]!.id);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSections = SECTIONS.map((section) => ({
    ...section,
    lessons: section.lessonIds
      .map((id) => LESSON_BY_ID.get(id))
      .filter((lesson): lesson is LessonCard => Boolean(lesson))
      .filter((lesson) => {
        if (activeSection !== 'all' && section.id !== activeSection) return false;
        if (!normalizedQuery) return true;
        return `${lesson.title} ${lesson.question}`.toLocaleLowerCase().includes(normalizedQuery);
      }),
  })).filter((section) => section.lessons.length > 0);

  const resultCount = visibleSections.reduce((total, section) => total + section.lessons.length, 0);
  const visibleLessons = visibleSections.flatMap((section) => section.lessons);
  const previewLesson = visibleLessons.find((lesson) => lesson.id === previewLessonId)
    ?? visibleLessons[0]
    ?? LESSONS[0]!;
  const Preview = PREVIEWS[previewLesson.id]!;

  return (
    <main data-home-shell className="home-shell">
      <header className="studio-header">
        <a href="#/" className="studio-wordmark" aria-label="Calc Viz home">
          <span>CALC</span><i>↘</i><span>VIZ</span>
        </a>
        <label className="home-search">
          <span className="sr-only">Search lessons</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder="Find a concept…"
          />
          <kbd aria-label="Press slash to search">/</kbd>
        </label>
      </header>

      <section className="home-thesis" aria-labelledby="home-title">
        <h1 id="home-title">See where{' '}<br /><em>formulas come from.</em></h1>
      </section>

      <div className="formula-download">
        <span className="formula-download__title">
          <strong>Jesse&apos;s Secret Formula</strong>
        </span>
        <span className="formula-download__actions">
          {/* 站上读:整张表按纸上的页铺开,可筛可打印 */}
          <a className="formula-download__action" href="#/formulas">
            All 192 <b aria-hidden="true">→</b>
          </a>
          <a
            className="formula-download__action"
            href="./Jesse'sSecretFormula.pdf"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Jesse's Secret Formula PDF in a new tab"
          >
            PDF <b aria-hidden="true">↗</b>
          </a>
        </span>
      </div>

      <nav className="home-filters" aria-label="Lesson categories">
        <button
          type="button"
          aria-pressed={activeSection === 'all'}
          onClick={() => setActiveSection('all')}
        >
          All
        </button>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {resultCount > 0 ? (
        <div className="home-workbench">
          <div className="lesson-index">
            {visibleSections.map((section) => (
              <section key={section.id} className="home-section" aria-labelledby={`section-${section.id}`}>
                <div className="home-section__heading">
                  <h2 id={`section-${section.id}`}>{section.label}</h2>
                </div>
                <div className="home-list">
                  {section.lessons.map((lesson) => (
                    <LessonCardLink
                      key={lesson.id}
                      lesson={lesson}
                      active={previewLesson.id === lesson.id}
                      onPreview={setPreviewLessonId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="live-preview" aria-live="polite">
            <div className="live-preview__label">
              <span>Preview</span>
            </div>
            <div
              data-active-preview
              data-preview-for={previewLesson.id}
              className="live-preview__frame"
            >
              <Preview phase={phase} />
              <span className="live-preview__crosshair" aria-hidden="true" />
            </div>
            <div className="live-preview__copy">
              <h2>{previewLesson.title}</h2>
              <a href={`#/${previewLesson.id}`}>
                Open <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="home-empty" role="status">
          <h2>No results</h2>
          <button type="button" onClick={() => { setQuery(''); setActiveSection('all'); }}>
            Clear
          </button>
        </div>
      )}

      <footer className="studio-footer">
        <a href="#/notation">Notation ↗</a>
      </footer>

      {/* 静止时明说一句,免得有人以为预览坏了。会动的时候这里什么都不该有。 */}
      {!animated && (
        <p className="home-motion-note">Previews paused — reduced motion is on.</p>
      )}
    </main>
  );
}

/** 课程页面顶部的返回链接 */
export function BackLink() {
  return (
    <a
      href="#/"
      className="back-link absolute left-4 top-4 z-10"
    >
      <span aria-hidden="true">←</span> all topics
    </a>
  );
}
