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
set -e
DEST=/tmp/libs
mkdir -p "$DEST" && cd "$DEST"
apt-get update >/dev/null 2>&1 || true
apt-get download \
  libnspr4 libnss3 libasound2 \
  libxdamage1 libxfixes3 libxrandr2 libxcomposite1 libxkbcommon0 \
  libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
  libcups2 libdrm2 libgbm1 libpango-1.0-0 libcairo2 >/dev/null 2>&1
mkdir -p ext
for d in *.deb; do dpkg-deb -x "$d" ext; done
echo "✓ $(ls ext/usr/lib/aarch64-linux-gnu | wc -l) 个库已就位"
echo "  export LD_LIBRARY_PATH=$DEST/ext/usr/lib/aarch64-linux-gnu"
