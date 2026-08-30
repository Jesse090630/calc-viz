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

type SectionId = 'foundations' | 'limits' | 'algebra';
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
] as const;

const LESSON_BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
const RECENT_LESSONS_KEY = 'calc-viz:recent-lessons';

function readRecentLessons(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_LESSONS_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((id): id is string => typeof id === 'string' && LESSON_BY_ID.has(id))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function LessonCardLink({
  lesson,
  active,
  onPreview,
  onVisit,
}: {
  readonly lesson: LessonCard;
  readonly active: boolean;
  readonly onPreview: (id: string) => void;
  readonly onVisit: (id: string) => void;
}) {
  return (
    <a
      data-lesson-card={lesson.id}
      data-active={active || undefined}
      href={`#/${lesson.id}`}
      onPointerEnter={() => onPreview(lesson.id)}
      onFocus={() => onPreview(lesson.id)}
      onClick={() => onVisit(lesson.id)}
      className="lesson-index__link"
    >
      <span className="lesson-index__mark" aria-hidden="true" />
      <span className="lesson-index__copy">
        <strong>{lesson.title}</strong>
        <small>{lesson.question}</small>
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
  const [recentLessonIds, setRecentLessonIds] = useState<string[]>(readRecentLessons);

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
  const previewSection = SECTIONS.find((section) => section.lessonIds.includes(previewLesson.id));
  const recentLessons = recentLessonIds
    .map((id) => LESSON_BY_ID.get(id))
    .filter((lesson): lesson is LessonCard => Boolean(lesson));

  const recordVisit = (id: string) => {
    const next = [id, ...recentLessonIds.filter((recentId) => recentId !== id)].slice(0, 3);
    setRecentLessonIds(next);
    try {
      window.localStorage.setItem(RECENT_LESSONS_KEY, JSON.stringify(next));
    } catch {
      // Browsing in a locked-down context should never block navigation.
    }
  };

  return (
    <main data-home-shell className="home-shell">
      <header className="studio-header">
        <a href="#/" className="studio-wordmark" aria-label="Calc Viz home">
          <span>CALC</span><i>↘</i><span>VIZ</span>
        </a>
        <p>Visual derivations for calculus</p>
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
        <p>Don’t memorize the last line.</p>
        <h1 id="home-title">See where the{' '}<br /><em>formula comes from.</em></h1>
        <div>
          <span aria-hidden="true">↓</span>
          <p>Point at a lesson. Its picture keeps the explanation moving before you open it.</p>
        </div>
      </section>

      <a
        className="formula-download"
        href="./Jesse'sSecretFormula.pdf"
        target="_blank"
        rel="noreferrer"
        aria-label="Open Jesse's Secret Formula PDF in a new tab"
      >
        <span className="formula-download__index" aria-hidden="true">PDF / 01</span>
        <span className="formula-download__title">
          <small>Keep the full reference sheet nearby</small>
          <strong>Jesse&apos;s Secret Formula</strong>
        </span>
        <span className="formula-download__meta">8 pages · 636 KB</span>
        <span className="formula-download__action">Open + download <b aria-hidden="true">↗</b></span>
      </a>

      <nav className="home-filters" aria-label="Lesson categories">
        <button
          type="button"
          aria-pressed={activeSection === 'all'}
          onClick={() => setActiveSection('all')}
        >
          All <span>{LESSONS.length}</span>
        </button>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-pressed={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label} <span>{section.lessonIds.length}</span>
          </button>
        ))}
        <p aria-live="polite">{resultCount} {resultCount === 1 ? 'lesson' : 'lessons'}</p>
      </nav>

      {resultCount > 0 ? (
        <div className="home-workbench">
          <div className="lesson-index">
            {recentLessons.length > 0 && activeSection === 'all' && !normalizedQuery ? (
              <p className="home-recent" aria-label="Recently opened lessons">
                Last opened
                {recentLessons.map((lesson, index) => (
                  <span key={lesson.id}>
                    {index > 0 ? ' / ' : ' '}
                    <a href={`#/${lesson.id}`} onClick={() => recordVisit(lesson.id)}>{lesson.title}</a>
                  </span>
                ))}
              </p>
            ) : null}

            {visibleSections.map((section) => (
              <section key={section.id} className="home-section" aria-labelledby={`section-${section.id}`}>
                <div className="home-section__heading">
                  <h2 id={`section-${section.id}`}>{section.label}</h2>
                  <p>{section.description}</p>
                  <span>{section.lessons.length}</span>
                </div>
                <div className="home-list">
                  {section.lessons.map((lesson) => (
                    <LessonCardLink
                      key={lesson.id}
                      lesson={lesson}
                      active={previewLesson.id === lesson.id}
                      onPreview={setPreviewLessonId}
                      onVisit={recordVisit}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="live-preview" aria-live="polite">
            <div className="live-preview__label">
              <span>Live preview</span>
              <span>{previewSection?.label}</span>
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
              <p>{previewLesson.question}</p>
              <h2>{previewLesson.title}</h2>
              <a href={`#/${previewLesson.id}`} onClick={() => recordVisit(previewLesson.id)}>
                Open this explanation <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="home-empty" role="status">
          <span aria-hidden="true">∅</span>
          <h2>No matching lesson</h2>
          <p>Try a concept such as “limit,” “function,” or “series.”</p>
          <button type="button" onClick={() => { setQuery(''); setActiveSection('all'); }}>
            Clear search
          </button>
        </div>
      )}

      <footer className="studio-footer">
        <p>Built to explain the step between the picture and the formula.</p>
        <a href="#/notation">Notation guide ↗</a>
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
