// 库内只有「样式入口」会 import .scss，类型检查时按原样放行（实际编译交给宿主的 bundler）。
declare module '*.scss' {
  const css: string
  export default css
}

declare module '*.css' {
  const css: string
  export default css
}

// 内置图标资源：assets/imgs/index.ts 用 `?raw` 读 SVG 源码（取内联 body，见该文件）。
// Vite 的 `?raw` 后缀默认导出整段文件文本；这里给类型系统一个等价声明。
declare module '*.svg?raw' {
  const source: string
  export default source
}