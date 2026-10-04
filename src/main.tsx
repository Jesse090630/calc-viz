import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './index.css';
import App from './App';
import {
  decideRecovery, hasReloaded, markReloaded, routeFromHash, safeSessionStorage,
} from './ui/chunkRecovery';

/**
 * ⭐⭐ 动态 import 取不到 chunk 时,Vite 会派发 `vite:preloadError`。
 *   这正是"页面开着跨过了一次部署"的那一刻:旧 `index.html` 指着已经不存在的文件名。
 *   默认行为是抛出去 —— 而抛出去的结果就是一块黑屏。这里拦下来,重载一次。
 *
 * ⚠️ 和 `RouteErrorBoundary` **共用同一把会话标记**(按路由)。
 *   各记各的话,一次换版会连着自动重载两次,用户会看到两下闪烁。
 */
window.addEventListener('vite:preloadError', (event) => {
  const route = routeFromHash(window.location.hash);
  const store = safeSessionStorage();
  if (decideRecovery(hasReloaded(route, store)) === 'show-message') return;
  markReloaded(route, store);
  event.preventDefault();
  window.location.reload();
});

const root = document.getElementById('root');
if (!root) throw new Error('#root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
