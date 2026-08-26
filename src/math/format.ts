/** 把坐标值格式化成适合轴标签与 KaTeX 边界的短字符串。 */
export function formatCoordinate(value: number, syntax: 'plain' | 'tex' = 'plain'): string {
  const pi = syntax === 'tex' ? '\\pi' : 'π';
  const ratios: ReadonlyArray<readonly [number, number]> = [
    [-2, 1], [-3, 2], [-1, 1], [-1, 2],
    [0, 1],
    [1, 2], [1, 1], [3, 2], [2, 1],
  ];
  for (const [numerator, denominator] of ratios) {
    if (Math.abs(value - (numerator / denominator) * Math.PI) > 1e-12) continue;
    if (numerator === 0) return '0';
    const sign = numerator < 0 ? '-' : '';
    const magnitude = Math.abs(numerator);
    const coefficient = magnitude === 1 ? '' : String(magnitude);
    return denominator === 1
      ? `${sign}${coefficient}${pi}`
      : `${sign}${coefficient}${pi}/${denominator}`;
  }
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(6)));
}

/**
 * 显示用。屏幕上的每个数字都从这里出去,组件里不许自己 toFixed。
 * (原本住在 `monotonicity.ts`,第二节课也要用,搬到这里避免两处各写一份。)
 */
export function showNumber(value: number, places = 2): string {
  if (!Number.isFinite(value)) return '—';
  // 避免 -0.00
  const fixed = value.toFixed(places);
  return fixed === `-${(0).toFixed(places)}` ? (0).toFixed(places) : fixed;
}

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

/**
 * 科学记数法,**指数写成真正的上标**。
 *
 * ⚠️⚠️ 这个函数是被一张截图逼出来的。原先各处都在手写
 *   `value.toExponential(1).replace('e+', '×10').replace('e-', '×10⁻')`
 * 于是:
 *   · `1` → `"1.0e+0"` → **`"1.0×100"`** —— 屏幕上写着一百,实际是一;
 *   · `1e5` → `"1e+5"` → **`"1×105"`** —— 写着一百零五;
 *   · `1e-4` → `"1e-4"` → `"1×10⁻4"` —— 负号是上标、数字不是,半截。
 * 三种都不报错、都不崩,只是**在屏幕上写出一个假数**,而这正是最危险的一类错。
 *
 * ⚠️ 指数为 0 时不写指数部分 —— `1×10⁰` 是对的但没人这么读。
 */
export function showScientific(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const [mantissa = '', exponent = '0'] = value.toExponential(digits).split('e');
  const power = Number(exponent);
  if (power === 0) return mantissa;
  const rendered = String(power)
    .split('')
    .map((ch) => SUPERSCRIPT[ch] ?? ch)
    .join('');
  return `${mantissa}×10${rendered}`;
}

/**
 * 小的用定点、大的用科学记数。
 * `threshold` 以内(含)走 `showNumber`,以外走 `showScientific`。
 */
export function showCompact(value: number, places = 3, lower = 1e-3, upper = 1e4): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs === 0 || (abs >= lower && abs < upper)) return showNumber(value, places);
  return showScientific(value, 1);
}
