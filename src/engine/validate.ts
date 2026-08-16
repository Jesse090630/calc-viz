/**
 * ENGINE — 链数据校验
 *
 * 存在理由:Stage 是数据,数据里的错(参数名打错、滑块范围写反、autoplay 指向不存在的参数)
 * TypeScript 是查不出来的。这个函数把这类错误变成测试能抓到的东西。
 * 以后每加一条链,只要给它写一行 `expect(validateChain(X)).toEqual([])` 就有了基础保障。
 */
import type { Chain } from './types';

export function validateChain(chain: Chain): string[] {
  const problems: string[] = [];
  const p = (msg: string) => problems.push(msg);

  if (chain.stages.length === 0) p('chain has no stages');

  const seen = new Set<string>();
  for (const s of chain.stages) {
    if (seen.has(s.id)) p(`duplicate stage id: "${s.id}"`);
    seen.add(s.id);
  }

  const labels = new Set<string>();
  for (const s of chain.stages) {
    if (labels.has(s.label)) p(`duplicate stage label: "${s.label}"`);
    labels.add(s.label);
  }

  for (const s of chain.stages) {
    const where = `stage "${s.id}"`;
    if (s.title.trim() === '') p(`${where}: empty title`);
    if (s.narration.trim() === '') p(`${where}: empty narration`);
    if (s.show.length === 0 && s.formula === undefined) {
      p(`${where}: shows nothing and has no formula — the step would be blank`);
    }

    // 该步生效的参数集合
    const active: Record<string, number> = { ...chain.defaultParams, ...(s.params ?? {}) };

    for (const key of Object.keys(s.params ?? {})) {
      if (!(key in chain.defaultParams)) {
        p(`${where}: params."${key}" is not declared in chain.defaultParams`);
      }
    }

    for (const c of s.controls ?? []) {
      const w = `${where}: control "${c.param}"`;
      if (!(c.param in chain.defaultParams)) p(`${w} is not declared in chain.defaultParams`);
      if (!(c.min < c.max)) p(`${w} has min >= max (${c.min} >= ${c.max})`);
      if (!(c.step > 0)) p(`${w} has step <= 0`);
      const v = active[c.param];
      if (v !== undefined && (v < c.min || v > c.max)) {
        p(`${w} starts at ${v}, outside its own range [${c.min}, ${c.max}]`);
      }
      if (c.label.trim() === '') p(`${w} has empty label`);
    }

    const a = s.autoplay;
    if (a) {
      const w = `${where}: autoplay`;
      if (!(a.param in chain.defaultParams)) p(`${w} targets undeclared param "${a.param}"`);
      if (a.durationMs <= 0) p(`${w} has durationMs <= 0`);
      if (a.delayMs < 0) p(`${w} has negative delayMs`);
      if (a.from === a.to) p(`${w} goes from ${a.from} to ${a.to} — nothing would move`);
      // 纪律:相机移动与物体运动绝不同时发生。相机过渡约 1.1s,所以延迟不得低于它。
      if (s.camera !== 'free' && a.delayMs < 800) {
        p(`${w} starts after only ${a.delayMs}ms — camera may still be moving (need >= 800)`);
      }
    }

    const highlighted = (s.formula ?? []).filter((f) => f.highlight).length;
    if (highlighted > 1) p(`${where}: ${highlighted} highlighted formula lines (max 1)`);
    if ((s.formula ?? []).length > 4) {
      p(`${where}: ${(s.formula ?? []).length} formula lines (max 4 — do not dump formulas)`);
    }
  }

  return problems;
}
