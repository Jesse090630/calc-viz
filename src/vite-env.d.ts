/// <reference types="vite/client" />

/**
 * ⚠️ 这个文件的存在只为一件事:让 `import.meta.env.BASE_URL` 有类型。
 *
 * 公式表的 PDF 放在 `public/`,链接必须写成
 *   `${import.meta.env.BASE_URL}calculus-formula-sheet.pdf`
 * 而不是 `/calculus-formula-sheet.pdf` —— GitHub Pages 把整站挂在 `/calc-viz/`
 * 子路径下,写死斜杠开头的路径在**本地开发时正常、线上 404**,
 * 是那种只在部署之后才暴露的错。
 */
