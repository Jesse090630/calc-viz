import { describe, expect, it } from 'vitest';
import {
  RECOVERY_ACTION, RECOVERY_BODY, RECOVERY_TITLE, RELOAD_PREFIX,
  clearReloaded, decideRecovery, hasReloaded, markReloaded, reloadKey, routeFromHash,
  safeSessionStorage,
} from './chunkRecovery';

/** 一个最小的 Storage 替身,可以被设置成"一碰就抛"。 */
function fakeStore(throwing = false): Storage {
  const map = new Map<string, string>();
  const boom = () => { throw new Error('storage is disabled'); };
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (throwing ? boom() : map.get(k) ?? null),
    setItem: (k: string, v: string) => { if (throwing) boom(); map.set(k, v); },
    removeItem: (k: string) => { if (throwing) boom(); map.delete(k); },
  } as Storage;
}

describe('decideRecovery', () => {
  it('⭐⭐ 第一次出错先重载 —— 换版错位重载一次就好了', () => {
    expect(decideRecovery(false)).toBe('reload');
  });

  it('⭐⭐ 重载过还错,就说实话,绝不再重载', () => {
    // 这一条是防无限重载的全部依据。
    expect(decideRecovery(true)).toBe('show-message');
  });

  it('⚠️ 只有这两种结果 —— 没有"什么都不做"那一档', () => {
    // "什么都不做"就是黑屏,而黑屏正是要修的东西。
    for (const already of [true, false]) {
      expect(['reload', 'show-message']).toContain(decideRecovery(already));
    }
  });
});

describe('the per-route mark', () => {
  it('标记是按路由分开的 —— 一条课出过错不该影响别的课', () => {
    const s = fakeStore();
    markReloaded('theorems', s);
    expect(hasReloaded('theorems', s)).toBe(true);
    expect(hasReloaded('mvt', s)).toBe(false);
    expect(reloadKey('mvt')).toBe(`${RELOAD_PREFIX}mvt`);
  });

  it('⭐ 渲染成功之后标记要清掉', () => {
    // 不清的话,这个会话里下一次换版就享受不到自动重载,又是黑屏。
    const s = fakeStore();
    markReloaded('euler', s);
    expect(hasReloaded('euler', s)).toBe(true);
    clearReloaded('euler', s);
    expect(hasReloaded('euler', s)).toBe(false);
  });

  it('⚠️ sessionStorage 抛异常时不许跟着抛 —— 错误处理里再抛一个错最糟', () => {
    const bad = fakeStore(true);
    expect(() => hasReloaded('x', bad)).not.toThrow();
    expect(() => markReloaded('x', bad)).not.toThrow();
    expect(() => clearReloaded('x', bad)).not.toThrow();
    // 读不到就当没重载过:最差多重载一次,不会卡在黑屏
    expect(hasReloaded('x', bad)).toBe(false);
    expect(decideRecovery(hasReloaded('x', bad))).toBe('reload');
  });

  it('⚠️ 拿不到 storage(null)时同样不抛,而且仍然会重载一次', () => {
    expect(hasReloaded('x', null)).toBe(false);
    expect(() => markReloaded('x', null)).not.toThrow();
    expect(() => clearReloaded('x', null)).not.toThrow();
    expect(decideRecovery(hasReloaded('x', null))).toBe('reload');
  });

  it('safeSessionStorage 在这个环境里给得出东西或者给 null,不抛', () => {
    expect(() => safeSessionStorage()).not.toThrow();
  });
});

describe('what the user is told', () => {
  it('⭐ 消息得说清楚发生了什么、怎么办,而不是甩一句 Error', () => {
    expect(RECOVERY_TITLE.length).toBeGreaterThan(10);
    expect(RECOVERY_BODY.length).toBeGreaterThan(80);
    expect(RECOVERY_BODY.toLowerCase()).toContain('updated');
    expect(RECOVERY_BODY.toLowerCase()).toContain('reload');
    expect(RECOVERY_ACTION.toLowerCase()).toContain('reload');
  });

  it('⚠️ 不许出现开发者才看得懂的词', () => {
    const all = `${RECOVERY_TITLE} ${RECOVERY_BODY} ${RECOVERY_ACTION}`.toLowerCase();
    for (const jargon of ['chunk', 'undefined', 'react', 'boundary', 'hash', 'exception']) {
      expect(all).not.toContain(jargon);
    }
  });
});

describe('routeFromHash', () => {
  it('⚠️ 和 App.tsx 里那个路由器认同一个名字', () => {
    // 两边认的不是同一个路由,就会各记各的标记,一次换版连着重载两次。
    expect(routeFromHash('#/theorems')).toBe('theorems');
    expect(routeFromHash('#/')).toBe('');
    expect(routeFromHash('')).toBe('');
    expect(routeFromHash('#/polar-area')).toBe('polar-area');
    expect(routeFromHash('#theorems')).toBe('theorems');
  });
});
