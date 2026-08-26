/**
 * 把**屏幕上显示的数字**读回一个 number。
 *
 * ⚠️ 显示层用的是真上标(`1×10⁻⁴`),`Number()` 直接吃会得到 NaN。
 * 检查里到处写 `Number(el.textContent)` 的后果是:断言拿到 NaN,
 * 而 `NaN > x` 恒假 —— 一堆检查会**静静地变成永远通过**。
 * (换成 `showScientific` 那一轮,squeeze 与 infinite 两个检查当场炸了;
 *  炸了是好事,静静通过才可怕。)
 *
 * 这个文件同时是 `showScientific` 的**往回读**:两边必须互为逆。
 */
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

export function parseShown(text) {
  if (text === null || text === undefined) return Number.NaN;
  // U+2212 MINUS SIGN 与 ASCII 连字符都当负号
  const s = String(text).trim().replace(/−/g, '-');
  const m = /^(-?[\d.]+)×10([⁻⁰¹²³⁴-⁹]+)$/.exec(s);
  if (!m) return Number(s);
  const exponent = m[2]
    .replace(/⁻/g, '-')
    .replace(/[⁰¹²³⁴-⁹]/g, (c) => String(SUPERSCRIPT.indexOf(c)));
  return Number(m[1]) * 10 ** Number(exponent);
}
