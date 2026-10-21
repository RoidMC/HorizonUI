/**
 * HorizonUI · NavShell 上下文
 *
 * 壳是「断点驱动的导航布局」的唯一持有者：断点形态、过渡期间的渲染形态、动画窗口、
 * 内容列方向、抽屉开合都在 NavShell.vue 里。宿主偶尔需要读它们——典型场景是
 * 「nav 正在切形态时，别叠加自己的过渡」。
 *
 * 本文件同时收拢壳的另两份对外契约（都只有壳能定义，放在别处就会漂移）：
 *   - 展开偏好的持久化键 NAV_STORAGE_KEYS
 *   - 调试面板观测的形状 NavShellDebugTarget
 *
 * 用法（宿主任意位于 NavShell 内容插槽内的组件）：
 *   const shell = useNavShell()
 *   if (shell?.isNavAnimating.value) pause()
 *
 * 为什么是 provide/inject 而不是全局 store：
 *   nav 状态是「每个 NavShell 实例一份」，不是 app 级；库的模块级响应式单例在 SSR 下
 *   会跨请求泄漏（参见 useToast.ts 的同款教训），而 provide/inject 挂在组件实例上，
 *   随实例（= 随请求）销毁。
 *
 * 为什么缺失时返回 null，而不像 useToast 那样回退到本地实例：
 *   读不到只意味着调用位置不在 NavShell 子树内；静默造一个假的动画状态只会掩盖接线错误。
 */
import { inject } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'

export interface NavShellContext {
  /** 断点判定的移动态（已含 forceView 覆盖） */
  isMobileView: ComputedRef<boolean>
  /** 实际渲染的形态：过渡期间保持旧形态，动画走完才翻转 */
  displayMobileView: Ref<boolean>
  /** 是否处于视图切换的动画窗口（宿主可据此暂停自己的过渡） */
  isNavAnimating: Ref<boolean>
  /** 内容列方向：动画窗口内保持旧方向，避免内容在 nav 退场时硬跳 */
  containerDirection: ComputedRef<'row' | 'column'>
  /** 桌面态是否展开（always-expanded 或 hover 生效） */
  isExpanded: ComputedRef<boolean>
  /** 移动抽屉是否展开 */
  drawerOpen: Ref<boolean>
  /** 切换移动抽屉开合 */
  toggleDrawer: () => void
}

/**
 * 桌面展开偏好的持久化键（键名沿用宿主老版 Navmenu，迁移后用户偏好不丢）。
 *
 * 壳读它决定展开行为，宿主的操作按钮与调试面板读写同一个偏好——三处共用这一份
 * 常量，而不是各自写一遍字符串：键名一旦改动，漏改一处就是「点了没反应」。
 */
export const NAV_STORAGE_KEYS = {
  /** 常驻展开（压倒 hover） */
  alwaysExpanded: 'horizon-nav-always-expanded',
  /** 是否允许 hover 展开 */
  hoverEnabled: 'horizon-nav-hover-enabled'
} as const

/**
 * 壳经 defineExpose 暴露给调试面板的观测视图。
 *
 * 字段是**解包后**的值（实例代理会解开 ref / computed），所以面板可直接读；
 * `inputType` 仍可写（调试时把误判的 touch 复位回 mouse）。
 * 只列面板真正用到的项，壳内部变量不进这里。
 */
export interface NavShellDebugTarget {
  /** 断点判定的移动态（已含 forceView 覆盖） */
  isMobileView: boolean
  /** 实际渲染的形态（过渡期间保持旧形态） */
  displayMobileView: boolean
  /** 是否处于视图切换的动画窗口 */
  isNavAnimating: boolean
  /** 内容列方向 */
  containerDirection: 'row' | 'column'
  /** 桌面态是否展开 */
  isExpanded: boolean
  /** 移动抽屉是否展开 */
  drawerOpen: boolean
  /** 已 hover（未防抖） */
  isHovered: boolean
  /** 已 hover（150ms 防抖后，驱动展开的那一个） */
  debouncedIsHovered: boolean
  /** 指针类型判定（触屏防护的输入） */
  inputType: 'mouse' | 'touch' | 'pen'
}

/** NavShell 上下文的注入键；由 NavShell.vue 在 setup 里 provide（每实例一份） */
export const NAV_SHELL_KEY: InjectionKey<NavShellContext> = Symbol('horizon:nav-shell')

/** 取当前 NavShell 上下文；不在 NavShell 子树内时为 null */
export function useNavShell(): NavShellContext | null {
  return inject(NAV_SHELL_KEY, null)
}
