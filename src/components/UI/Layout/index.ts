// Layout 套件出口。
//
// 一组协同工作的结构原语（容器 / 顶 / 侧 / 主 / 底），放同一目录集中维护，
// 对外统一以 UILayout* 前缀暴露，避免宿主逐个 import 深路径。
export { default as UILayout } from './Layout.vue'
export { default as UILayoutHeader } from './LayoutHeader.vue'
export { default as UILayoutAside } from './LayoutAside.vue'
export { default as UILayoutMain } from './LayoutMain.vue'
export { default as UILayoutFooter } from './LayoutFooter.vue'