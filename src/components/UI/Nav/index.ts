// Nav 套件出口：菜单项（双模式）+ 递归节点 + 操作区（三形态）+ 应用骨架 + 开发期调试面板。
// NavShell 是容器层归库后的形态：壳收布局行为（断点驱动 / 切换状态机 /
// containerDirection 延迟 / hover 展开 / 触屏防护），数据（items / actions /
// logo / linkAs）经 props 注入——站点个性留在数据层，重复成本关在库里。
export { default as UINavMenuItem } from './NavMenuItem.vue'
export { default as UINavMenuItemNode } from './NavMenuItemNode.vue'
export { default as UIWidgetActions } from './WidgetActions.vue'
export { default as UINavShell } from './NavShell.vue'
// 开发期调试面板：宿主必须 dev 门控地动态 import（勿用自动注册的全局组件名，
// 那会被编译成静态 import 进产物），见 NavDebugPanel.vue 文件头。
export { default as UINavDebugPanel } from './NavDebugPanel.vue'
// 壳状态向内容插槽内的组件暴露（断点形态 / 动画窗口 / 内容列方向 / 抽屉），
// 以及壳的两份对外契约：偏好持久化键、调试面板观测的形状
export { useNavShell, NAV_SHELL_KEY, NAV_STORAGE_KEYS } from './useNavShell'
export type { NavShellContext, NavShellDebugTarget } from './useNavShell'
export { resolveText } from './nav-types'
export type { NavItem, NavSubItem, WidgetAction, NavText } from './nav-types'
