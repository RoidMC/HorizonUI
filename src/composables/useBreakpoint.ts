/**
 * 断点检测 composable。
 *
 * 模块级单例尺寸：所有调用方共享同一份响应式状态，既保证单一数据源，
 * 也避免多次调用产生多个互相独立的 resize 监听。
 *
 * ⚠️ 监听必须**懒挂载**，不能在模块求值时挂 —— 库的 package.json 把 JS/TS 声明为
 * 无副作用（sideEffects 只有 scss/css），打包器有权裁剪「只做副作用」的模块，
 * 那种写法在宿主构建里会静默失效。改为首次客户端调用时挂载。
 *
 * SSR 兜底值与宿主既有实现一致：宽 1024(lg) / 高 900，保证首帧形态稳定。
 */
import { computed, readonly, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

/** 默认断点表（Tailwind 风格）。官网尺寸不同可整套替换 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export type BreakpointKey = keyof typeof BREAKPOINTS

export interface UseBreakpointOptions {
  /** 覆盖断点表；默认 {@link BREAKPOINTS} */
  breakpoints?: Record<string, number>
}

export interface UseBreakpointReturn {
  width: Readonly<Ref<number>>
  height: Readonly<Ref<number>>
  current: ComputedRef<string>
  /** 是否达到某断点（≥ 其最小值） */
  at: (key: string) => ComputedRef<boolean>
  /** 是否落在 [min, max) 区间 */
  between: (min: string, max: string) => ComputedRef<boolean>
  /** 是否小于某断点 */
  isBelow: (key: string) => ComputedRef<boolean>
}

const isClient = typeof window !== 'undefined'

const width = ref<number>(isClient ? window.innerWidth : BREAKPOINTS.lg)
const height = ref<number>(isClient ? window.innerHeight : 900)

let listening = false

function ensureResizeListener(): void {
  if (listening || !isClient) return
  listening = true

  width.value = window.innerWidth
  height.value = window.innerHeight

  // 150ms 防抖：拖动窗口时 resize 每帧触发，直接写会带动整棵订阅树重算
  let timer: number | null = null
  window.addEventListener(
    'resize',
    () => {
      if (timer !== null) clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        width.value = window.innerWidth
        height.value = window.innerHeight
      }, 150)
    },
    { passive: true }
  )
}

/** 按「从大到小」找第一个满足的键；都不满足时返回表里最小的那个 */
function resolveCurrent(table: Record<string, number>, w: number): string {
  const entries = Object.entries(table).sort((a, b) => b[1] - a[1])
  const hit = entries.find(([, min]) => w >= min)
  return hit ? hit[0] : (entries[entries.length - 1]?.[0] ?? '')
}

export function useBreakpoint(options: UseBreakpointOptions = {}): UseBreakpointReturn {
  ensureResizeListener()

  const table: Record<string, number> = options.breakpoints ?? BREAKPOINTS

  const at = (key: string): ComputedRef<boolean> =>
    computed(() => width.value >= (table[key] ?? 0))

  return {
    width: readonly(width),
    height: readonly(height),
    current: computed(() => resolveCurrent(table, width.value)),
    at,
    between: (min: string, max: string) =>
      computed(() => width.value >= (table[min] ?? 0) && width.value < (table[max] ?? 0)),
    isBelow: (key: string) => computed(() => width.value < (table[key] ?? 0))
  }
}