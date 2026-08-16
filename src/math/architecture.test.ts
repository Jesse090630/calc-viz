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
  const files = filesUnder(join(SRC, 'math'));

  it('math 目录下确实有文件(防止规则因为路径写错而空跑)', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const file of files) {
    it(`${file.replace(SRC, 'src')} 只依赖 node 内置模块与自身`, () => {
      const bad = importsOf(readFileSync(file, 'utf8')).filter((s) =>
        FORBIDDEN.some((f) => s === f || s.startsWith(`${f}/`)),
      );
      expect(bad).toEqual([]);
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
