import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useHorizonConfig } from '../config'

/**
 * 皮肤开关的统一判定：prop 优先，其次全局配置，都没有则出样式。
 *
 * prop 必须可区分「没传」和「传了 false」，所以调用方的 prop 类型是
 * `boolean | undefined`，不要给 withDefaults 填默认值 —— 填了就再也盖不住全局配置。
 */
export function useUnstyled(prop?: () => boolean | undefined): ComputedRef<boolean> {
  const config = useHorizonConfig()
  return computed(() => prop?.() ?? config.unstyled ?? false)
}

/**
 * 组件统一入口：拿到皮肤类名工厂。
 * `unstyled` 时类名返回 undefined —— 组件的 DOM 结构与 data-* 状态照旧，
 * 只是不再挂语义类名，库自带 CSS 命中不到（宿主仍可自己写类名接管）。
 */
export function useSkin(prop?: () => boolean | undefined) {
  const unstyled = useUnstyled(prop)
  const skin = (name: string): string | undefined => (unstyled.value ? undefined : name)
  return { unstyled, skin }
}
