/**
 * 单文件版成绩台的入口。
 *
 * ⚠️ 存在的理由是**部署被卡住了**:GitHub 账号有计费锁,Actions 一次都跑不起来,
 *   线上站点停在四个提交之前。这个入口打出一个**自带全部代码的 HTML**,
 *   双击就能用,不依赖 GitHub、不依赖服务器、也不依赖网络。
 *
 * ⚠️ 只装成绩台,不装整站 —— 整站会把 Three.js 之类一起拖进来。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GradeConsoleLab } from '../src/labs/gradeConsole/GradeConsoleLab';
import '../src/index.css';
import 'katex/dist/katex.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-dvh">
      <GradeConsoleLab />
    </div>
  </StrictMode>,
);
