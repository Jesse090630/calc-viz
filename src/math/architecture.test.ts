/**
 * 架构约束的自动检查 —— 把 CLAUDE.md 里的"三个禁止"变成机器可执行的规则。
 * 靠自觉守不住,靠测试才守得住。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = join(process.cwd(), 'src');

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return filesUnder(p);
    return ['.ts', '.tsx'].includes(extname(e.name)) ? [p] : [];
  });
}

const importsOf = (src: string): string[] =>
  [...src.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');

describe('禁止 1 — src/math/ 不得依赖任何渲染库', () => {
  const FORBIDDEN = ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei', 'zustand', 'katex'];
  const all = filesUnder(join(SRC, 'math'));
  /**
   * ⚠️ 这条规则针对的是**会被打包的源文件**。
   *
   * 禁止 1 的目的是:math 模块可以被任何地方 import 而不拖进 React / Three / KaTeX。
   * `*.test.ts` **永远不会**进产物(Vite 只打包从入口可达的东西),
   * 所以测试文件 import katex 不影响这个目的 —— 而它能换来一件有价值的事:
   * 把一百多条手写公式**真的丢给 KaTeX 解析一遍**。
   * KaTeX 解析失败不抛错、不崩溃,它在页面上画一块红字;
   * 不在测试里主动 throw,那种错就只能靠人一张张看出来。
   *
   * (同样的分寸在 `logIntegral` 那条规则里已经立过:源文件不许出现 `Math.log`,
   *  而测试文件里**必须**有 —— 那是第二条独立验证路径。)
   *
   * 测试文件仍然不许碰 React / Three / zustand:那些和"验证公式"无关。
   */
  const isTest = (file: string) => /\.test\.tsx?$/.test(file);
  const sources = all.filter((file) => !isTest(file));
  const tests = all.filter(isTest);

  it('math 目录下确实有文件(防止规则因为路径写错而空跑)', () => {
    expect(sources.length).toBeGreaterThan(3);
    expect(tests.length).toBeGreaterThan(3);
  });

  for (const file of sources) {
    it(`${file.replace(SRC, 'src')} 只依赖 node 内置模块与自身`, () => {
      const bad = importsOf(readFileSync(file, 'utf8')).filter((s) =>
        FORBIDDEN.some((f) => s === f || s.startsWith(`${f}/`)),
      );
      expect(bad).toEqual([]);
    });
  }

  // 测试文件:只放行 katex,而且只为"渲染得出来吗"这一件事
  const TEST_FORBIDDEN = FORBIDDEN.filter((name) => name !== 'katex');
  for (const file of tests) {
    it(`${file.replace(SRC, 'src')}(测试)不拉进 React / Three / zustand`, () => {
      const bad = importsOf(readFileSync(file, 'utf8')).filter((s) =>
        TEST_FORBIDDEN.some((f) => s === f || s.startsWith(`${f}/`)),
      );
      expect(bad).toEqual([]);
    });
  }

  it('⚠️ katex 只出现在**测试**里,一个源文件都不许有', () => {
    // 放行只针对测试。这条断言守住那个边界。
    const leaked = sources.filter((file) => importsOf(readFileSync(file, 'utf8')).includes('katex'));
    expect(leaked.map((f) => f.replace(SRC, 'src'))).toEqual([]);
    // 而且放行确实被用上了 —— 否则这段例外是死条文
    const usingKatex = tests.filter((file) => importsOf(readFileSync(file, 'utf8')).includes('katex'));
    expect(usingKatex.length, '没有任何测试在验证公式渲染,这条例外就不该存在').toBeGreaterThan(0);
  });
});

describe('⭐ W7/W8 专属:推导对数的模块不许用 Math.log 抄近路', () => {
  // 整条链要推的结论就是"那块面积是一个对数"。
  // 用 Math.log 去算它等于把结论当前提,推导变成循环论证。
  // 这条规则不能靠自觉 —— 它看起来只是"省事",而且改完测试照样全绿。
  const GUARDED = ['logIntegral.ts', 'tanIntegral.ts'];

  for (const name of GUARDED) {
    const file = join(SRC, 'math', name);
    if (!existsSync(file)) continue;
    it(`src/math/${name} 的主路径不出现 Math.log`, () => {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(code.includes('Math.log'), `${name} 用 Math.log 抄了近路`).toBe(false);
    });
  }

  it('但测试文件里【必须】有 Math.log —— 那是第二条独立验证路径', () => {
    const testFile = join(SRC, 'math', 'logIntegral.test.ts');
    if (!existsSync(testFile)) return;
    expect(readFileSync(testFile, 'utf8').includes('Math.log')).toBe(true);
  });
});

describe('⭐ src/labs/ 是实验台,不是推导链 —— 两条结构性约束', () => {
  // 这一层是 increasing 那一节引入的。它**故意**不走 `src/engine/`:
  // 那一节要教的是"任取一对",不存在"第几步",硬套上一步/下一步会把概念讲歪。
  // 但"故意不用"和"忘了用"在代码里长得一模一样,所以把它钉成规则。
  const files = filesUnder(join(SRC, 'labs'));

  it('labs 目录下确实有文件(防止规则因为路径写错而空跑)', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const file of files) {
    const shown = file.replace(SRC, 'src');

    it(`${shown} 不 import 推导链引擎`, () => {
      const bad = importsOf(readFileSync(file, 'utf8')).filter((s) => s.includes('/engine/'));
      expect(bad, '实验台一旦接上引擎就会长出"上一步/下一步"').toEqual([]);
    });

    // 这一节全程是二维的。拉进 Three.js 等于让一个只需要 SVG 的页面
    // 背上 gzip 241 kB —— W6 花了整整一轮才把首页的这笔开销去掉。
    it(`${shown} 不 import Three.js`, () => {
      const bad = importsOf(readFileSync(file, 'utf8')).filter(
        (s) => s === 'three' || s.startsWith('three/') || s.startsWith('@react-three/'),
      );
      expect(bad, '二维的一节不该背上 3D 引擎的体积').toEqual([]);
    });
  }
});

describe('禁止 3 — src/engine/ 不得出现任何具体概念的名字', () => {
  // ⚠️ 刻意【不加】词边界 \b。违规在现实中长这样:shellRadius / diskGeometry / RiemannBars,
  //    加了 \b 就全漏掉了(这条规则最初就是这么写的,被变异测试抓出来才改的)。
  const CONCEPT_WORDS = /shell|washer|disk|riemann|secant|tangent|unit ?circle|solid of revolution/gi;
  const files = filesUnder(join(SRC, 'engine'));

  it('engine 目录下确实有文件(防止规则因为路径写错而空跑)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.replace(SRC, 'src')} 保持概念无关`, () => {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '') // 去块注释
        .replace(/\/\/.*$/gm, ''); // 去行注释
      const hits = [...new Set(code.match(CONCEPT_WORDS) ?? [])];
      expect(hits, `engine 层出现了概念专属词汇:${hits.join(', ')}`).toEqual([]);
    });
  }
});
