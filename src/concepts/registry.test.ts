/**
 * 登记表与真链的一致性守卫。
 *
 * `registry.ts` 为了不把七条链拖进首页 chunk,把 `steps` 写成了手写常量。
 * 手写常量一定会脱节 —— 除非有测试盯着。这个文件就是那个测试。
 * 它可以随便 import 真链,因为测试不进打包。
 */
import { describe, it, expect } from 'vitest';
import { CONCEPTS, conceptById, recommendedAfter } from './registry';
import type { Chain } from '../engine/types';
import { LIMITS_CHAIN } from './limits/chain';
import { DERIVATIVE_CHAIN } from './derivative/chain';
import { RIEMANN_SUM_CHAIN } from './riemann-sum/chain';
import { LOG_INTEGRAL_CHAIN } from './log-integral/chain';
import { SHELL_METHOD_CHAIN } from './shell-method/chain';
import { DISK_METHOD_CHAIN } from './disk-method/chain';
import { UNIT_CIRCLE_CHAIN } from './unit-circle/chain';
import { TRIG_RATES_CHAIN } from './trig-rates/chain';

const REAL_CHAINS: readonly Chain[] = [
  LIMITS_CHAIN,
  DERIVATIVE_CHAIN,
  RIEMANN_SUM_CHAIN,
  LOG_INTEGRAL_CHAIN,
  SHELL_METHOD_CHAIN,
  DISK_METHOD_CHAIN,
  UNIT_CIRCLE_CHAIN,
  TRIG_RATES_CHAIN,
];

describe('⭐ 登记表的手写 steps 必须与真链一致', () => {
  for (const chain of REAL_CHAINS) {
    it(`${chain.id} 有 ${chain.stages.length} 步`, () => {
      expect(conceptById(chain.id).steps).toBe(chain.stages.length);
    });
  }

  it('登记表与真链一一对应,没有多也没有少', () => {
    expect(CONCEPTS.map((c) => c.id).sort()).toEqual(REAL_CHAINS.map((c) => c.id).sort());
  });

  it('标题与真链的 title 一致', () => {
    for (const chain of REAL_CHAINS) {
      expect(conceptById(chain.id).title).toBe(chain.title);
    }
  });
});

describe('推荐顺序自洽', () => {
  it('每个 next 都指向一个存在的概念', () => {
    for (const c of CONCEPTS) {
      expect(() => conceptById(c.next)).not.toThrow();
    }
  });

  it('recommendedAfter 返回的是下一个概念本身', () => {
    expect(recommendedAfter('limits').id).toBe('derivative');
    expect(recommendedAfter('riemann-sum').id).toBe('log-integral');
    expect(recommendedAfter('log-integral').id).toBe('shell-method');
  });

  it('next 链条走一圈能覆盖所有概念(没有孤岛)', () => {
    const seen = new Set<string>();
    let cursor = CONCEPTS[0]!.id;
    for (let i = 0; i < CONCEPTS.length; i++) {
      expect(seen.has(cursor), `${cursor} 被访问了两次,推荐链有环但没覆盖全部`).toBe(false);
      seen.add(cursor);
      cursor = conceptById(cursor).next;
    }
    expect(seen.size).toBe(CONCEPTS.length);
  });

  it('未知 id 报错而不是静默返回 undefined', () => {
    expect(() => conceptById('nope')).toThrow(/Unknown concept/);
  });
});

describe('⚠️ 首页需要的每一项配套资源都要跟上', () => {
  // 这条是被线上事故逼出来的:W7 把 log-integral 加进登记表却没配缩略图,
  // Home 直接抛错、首页一张卡都渲染不出来。
  // 单条链的截图完全看不到这个 —— 只有真的打开首页才会撞上。
  it('每个概念都在 Home 的 THUMBNAILS 里有一张图', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../ui/Home.tsx', import.meta.url), 'utf8'),
    );
    const block = source.slice(source.indexOf('const THUMBNAILS'), source.indexOf('function ConceptLink'));
    for (const c of CONCEPTS) {
      const key = /^[a-z]+$/.test(c.id) ? `${c.id}:` : `'${c.id}':`;
      expect(block.includes(key), `${c.id} 缺首页缩略图`).toBe(true);
    }
  });
});
