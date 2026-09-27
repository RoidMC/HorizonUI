/**
 * RTL 方向判定 composable。
 *
 * 真相源是宿主的语言配置，通过 createHorizon({ dir }) 注入 —— 库不依赖 i18n 框架，
 * 也不读 DOM 上的 <html dir>（那通常是宿主在 onMounted 里兜底写回的，拿它当源是循环依赖）。
 *
 * 传 ref / getter 时保持响应式：运行时切语言，isRtl 跟着变。
 */
import { computed, toValue } from 'vue'
import { useHorizonConfig } from '../config'

export function useDirection() {
  const config = useHorizonConfig()

  const dir = computed<'ltr' | 'rtl'>(() => toValue(config.dir) ?? 'ltr')
  const isRtl = computed(() => dir.value === 'rtl')

  return { isRtl, dir }
}
