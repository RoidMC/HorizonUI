<script setup lang="ts">
// HorizonUI · Toast 列表（internal，不外发）
//
// 为什么单独一层：reka-ui 2.11 起 toast 队列由 ToastProvider 内部的 store 持有，
// 只有 provider 子树里的 useToastManager() 才读得到。而 <UIToast> 本身是 provider 的父级
// （要往 ToastProvider 传 manager 与位置），读不到 → 队列渲染必须下沉到这一个子组件。
//
// ToastRoot 会把自身 teleport 进 viewport，所以在组件树上它与 viewport 是否相邻无所谓，
// 这里只负责把每条 toast 渲染成卡片（类名是语义类名，皮肤在 themes/components/ui/_toast.scss），
// 外加 maxCount 的「轮播」——也只有这里能拿到队列，见下面 watchEffect。
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRoot,
  ToastTitle,
  useToastManager,
} from 'reka-ui'
import { watchEffect } from 'vue'
import { useSkin } from '../../composables/useUnstyled'
import type { HorizonToastData, ToastItem, ToastPosition, ToastType } from '../../composables/useToast'
import HIcon from './HIcon.vue'

const props = defineProps<{
  position: ToastPosition
  /** 同时可见条数上限（0 = 不限制）。超出时关掉最旧的，滚动让位给新来的。 */
  maxCount: number
  unstyled?: boolean
}>()

const { skin } = useSkin(() => props.unstyled)

const { toasts, close } = useToastManager<HorizonToastData>()

// maxCount → 轮播：
// reka 的 provider `limit` 只把超限者标记 data-limited + inert（仍留在队列里），
// 而它的 stack 计算是 `limited = !closing && …visibleIndex >= limit` —— 一旦某条开始关闭
// （open=false → closing），data-limited 就被摘掉。于是「全部关闭」时，之前被皮肤
// display:none 藏起来的那些会在退出动画里集体现形（且无视 limit）。
// 所以不走「藏」而走「关」：可见条数超出上限时，直接关掉最旧的那些。
// 队列里永不存在被藏起来的条目，也就没有「解冻即现形」这一说，语义等价于「最多显示 N 条」。
// toasts 是「新在前」（reka useToastStore.add 把新条目塞到数组头），故最旧的在末尾。
watchEffect(() => {
  const max = props.maxCount
  if (max < 1) return // 0（或负数）= 不限制
  const openToasts = toasts.value.filter((t) => t.open)
  const excess = openToasts.length - max
  if (excess <= 0) return
  for (const t of openToasts.slice(-excess)) close(t.id)
})

const icons: Record<ToastType, string> = {
  default: 'tdesign:notification',
  success: 'tdesign:check-circle',
  error: 'tdesign:error-circle',
  warning: 'tdesign:error-triangle',
  info: 'tdesign:info-circle',
  loading: 'tdesign:loading',
}

const iconFor = (t: ToastItem): string =>
  t.data?.icon || icons[(t.status ?? 'default') as ToastType] || icons.default

// data-status 由 reka 落在 ToastRoot 上；这里只同步输出语义类名（unstyled 时为 undefined）。
// 退出态用 h-toast--exiting 修饰类（!open 即已关闭、进入退出动画），与皮肤里的动画选择器对齐。
const toastClass = (t: ToastItem) => [
  skin('h-toast'),
  skin(`h-toast--${t.status ?? 'default'}`),
  skin(`h-toast--at-${props.position}`),
  t.data?.class,
  t.open ? undefined : skin('h-toast--exiting'),
]
</script>

<template>
  <ToastRoot v-for="t in toasts" :key="t.id" :toast="t" :class="toastClass(t)">
    <div :class="skin('h-toast-main')">
      <span :class="[skin('h-toast-icon'), t.status === 'loading' ? skin('h-toast-spin') : undefined]">
        <HIcon :name="iconFor(t)" />
      </span>

      <div :class="skin('h-toast-body')">
        <ToastTitle v-if="t.title" :class="skin('h-toast-title')">{{ t.title }}</ToastTitle>
        <ToastDescription v-if="t.description" :class="skin('h-toast-desc')">{{ t.description }}</ToastDescription>
      </div>
    </div>

    <div :class="skin('h-toast-footer')">
      <ToastAction v-if="t.actionProps" :class="skin('h-toast-action')">
        {{ t.actionProps.label }}
      </ToastAction>

      <ToastClose :class="skin('h-toast-close')" aria-label="Close">
        <HIcon name="tdesign:close" />
      </ToastClose>
    </div>
  </ToastRoot>
</template>