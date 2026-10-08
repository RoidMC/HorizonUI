<script setup lang="ts">
// UIToast —— 通知宿主（reka-ui 2.11 Toast Manager 装配）。
//
// 契约同 Button：只输出语义类名（h-toast* 全在 themes/components/ui/_toast.scss），
// 组件内不写样式块。文案不写死中文 —— 库不下发 i18n。
//
// 2.11 起队列归 ToastProvider 内部持有的 store，外部通过 GlobalToastManager 往里投递
// （createToastManager → toastManager prop）。于是这里只负责三件事：
//   1. 把 useToast() 里的 manager 接到 ToastProvider 上；
//   2. 提供 reka 没有的「堆叠位置」（viewport 角落，走语义类名）与 maxCount（同时可见条数，
//      走「超限关最旧」的轮播，不用 reka 的 data-limited 藏法，原因见 ToastList.vue）；
//   3. 客户端挂载后再渲染 provider（reka 的 portal/collection 依赖 document，SSR 不渲染）。
// 队列渲染下沉到 internal/ToastList.vue：只有 provider 子树才能 useToastManager() 读到 toasts。
import { ToastProvider, ToastViewport } from 'reka-ui'
import { computed, onMounted, ref } from 'vue'
import { useToast } from '../../composables/useToast'
import type { ToastPosition } from '../../composables/useToast'
import { useDirection } from '../../composables/useDirection'
import ToastList from '../internal/ToastList.vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 初始堆叠位置；不传则用全局值（默认右上角，可经 toast.position() 运行时切换） */
    position?: ToastPosition
    /** 默认自动关闭毫秒数（0 或 Infinity 表示常驻（需手动 dismiss）） */
    duration?: number
    /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
    unstyled?: boolean
  }>(),
  { position: undefined, duration: 4000 }
)

const { skin } = useSkin(() => props.unstyled)

const { manager, maxCount, position: globalPosition, setPosition } = useToast()

// 若显式传了 position prop，用它初始化全局值
if (props.position) setPosition(props.position)

/** 实际生效位置（全局响应式，运行时可切换） */
const pos = computed<ToastPosition>(() => globalPosition.value)

// ⚠️ RTL：viewport 位置已用逻辑属性镜像（--top-left 在 RTL 下渲染在右上），
// 「向屏幕外滑动关闭」的方向须随镜像翻转。方向判定走 useDirection 单一真相源。
// reka 2.11 把 swipeDirection 收到 provider 粒度，与全局位置一致，正好一一对应。
const { isRtl } = useDirection()

const swipeDirection = computed<'left' | 'right' | 'up' | 'down'>(() => {
  const base = pos.value.endsWith('-left') ? 'left' : 'right'
  return isRtl.value ? (base === 'left' ? 'right' : 'left') : base
})

// 替代 Nuxt 的「仅客户端渲染」包裹组件（同 Dialog）：provider / viewport / collection 依赖
// document，SSR 不渲染，客户端挂载后再渲染，行为与原包裹组件一致，不引入 Nuxt 依赖。
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <ToastProvider
    v-if="mounted"
    :toast-manager="manager"
    :duration="props.duration"
    :swipe-direction="swipeDirection"
    label="Notification"
  >
    <ToastList :position="pos" :max-count="maxCount" :unstyled="props.unstyled" />

    <!-- 宿主属性透传到 viewport（ToastProvider 是 renderless，viewport 才是落 DOM 的容器根） -->
    <ToastViewport v-bind="$attrs" :class="[skin('h-toast-viewport'), skin(`h-toast-viewport--${pos}`)]" />
  </ToastProvider>
</template>