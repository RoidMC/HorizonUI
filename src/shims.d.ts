// 库内只有「样式入口」会 import .scss，类型检查时按原样放行（实际编译交给宿主的 bundler）。
declare module '*.scss' {
  const css: string
  export default css
}

declare module '*.css' {
  const css: string
  export default css
}
