#!/usr/bin/env bash
# 给无头 Chromium 补齐系统库。
#
# ⚠️ 为什么需要这个脚本:这个沙箱的 /tmp 会被清空,而 Playwright 自带的
# headless_shell 依赖十几个系统 .so。清掉之后,三项浏览器检查会一起崩在
#     error while loading shared libraries: libXdamage.so.1
# 上 —— 报错信息躲在 Playwright 的 launch log 深处,第一眼只看到 "Node.js v22"。
# 这一轮里它发生了四次,每次都要现查现装。所以固化成一个命令。
#
#   bash tests/e2e/setup-browser-libs.sh
#   export LD_LIBRARY_PATH=/tmp/libs/ext/usr/lib/aarch64-linux-gnu
#
# ⚠️ 2026-10 更新:沙箱被回收之后 apt 的索引也没了(`apt-get update` 写不进
#   /var/lib/apt/lists,`apt-get download` 一律 "Unable to locate package")。
#   好消息是基础镜像已经自带了绝大多数库 —— 实测只缺 **libXdamage.so.1** 一个。
#   所以这个脚本现在分两步:能用 apt 就用 apt;不能用就把缺的那一个**打桩**。
#   桩里的四个入口全部 abort —— 无头模式下根本不会被调用到,
#   真要被调用了就当场炸,而不是悄悄渲染出一张不对的图。
set -e
DEST=/tmp/libs
mkdir -p "$DEST" && cd "$DEST"
apt-get update >/dev/null 2>&1 || true
apt-get download \
  libnspr4 libnss3 libasound2 \
  libxdamage1 libxfixes3 libxrandr2 libxcomposite1 libxkbcommon0 \
  libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
  libcups2 libdrm2 libgbm1 libpango-1.0-0 libcairo2 >/dev/null 2>&1 || true
mkdir -p ext
# ⚠️ `|| true` 不能省:apt 不可用时它以 100 退出,而 `set -e` 会在这里
#   直接掐断脚本 —— 下面那段兜底的打桩**根本走不到**。
#   一个"有兜底"的脚本,如果在兜底之前就退出,等于没有兜底。
for d in *.deb; do [ -e "$d" ] && dpkg-deb -x "$d" ext; done
mkdir -p ext/usr/lib/aarch64-linux-gnu

# apt 不可用时的兜底:只补 libXdamage.so.1 这一个
if [ ! -f ext/usr/lib/aarch64-linux-gnu/libXdamage.so.1 ]; then
  cat > xdamage_stub.c <<'STUB'
#include <stdio.h>
#include <stdlib.h>
static void boom(const char *fn) {
  fprintf(stderr, "libXdamage stub: %s was actually called\n", fn);
  abort();
}
int XDamageQueryExtension(void *d, int *e, int *r) { (void)d;(void)e;(void)r; boom("XDamageQueryExtension"); return 0; }
unsigned long XDamageCreate(void *d, unsigned long dr, int l) { (void)d;(void)dr;(void)l; boom("XDamageCreate"); return 0; }
void XDamageDestroy(void *d, unsigned long dm) { (void)d;(void)dm; boom("XDamageDestroy"); }
void XDamageSubtract(void *d, unsigned long dm, unsigned long r, unsigned long p) { (void)d;(void)dm;(void)r;(void)p; boom("XDamageSubtract"); }
STUB
  gcc -shared -fPIC -Wl,-soname,libXdamage.so.1 \
      -o ext/usr/lib/aarch64-linux-gnu/libXdamage.so.1 xdamage_stub.c
  echo "  (libXdamage.so.1 由桩补上 —— apt 不可用)"
fi

echo "✓ $(ls ext/usr/lib/aarch64-linux-gnu | wc -l) 个库已就位"
echo "  export LD_LIBRARY_PATH=$DEST/ext/usr/lib/aarch64-linux-gnu"
