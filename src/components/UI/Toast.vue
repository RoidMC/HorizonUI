<script setup lang="ts">
// UIToast —— 通知卡片容器（reka-ui 装配）。
//
// 契约同 Button：只输出语义类名（h-toast* 全在 themes/components/ui/_toast.scss），
// 组件内不写样式块。皮肤早已用 `.h-toast-*` 命名，与组件类名一致，无需改名。
// 图标一律交给 HIcon；文案不写死中文 —— 库不下发 i18n。
import {
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastViewport,
} from 'reka-ui'
import { computed, onMounted, ref } from 'vue'
import { useToast } from '../../composables/useToast'
import type { ToastItem, ToastPosition } from '../../composables/useToast'
import { useDirection } from '../../composables/useDirection'
import HIcon from '../internal/HIcon.vue'
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

const { toasts, scheduleRemove, position: globalPosition, setPosition } = useToast()

// 若显式传了 position prop，用它初始化全局值
if (props.position) setPosition(props.position)

/** 实际生效位置（全局响应式，运行时可切换） */
const pos = computed<ToastPosition>(() => globalPosition.value)

// ⚠️ RTL：viewport 位置已用逻辑属性镜像（--top-left 在 RTL 下渲染在右上），
// 「向屏幕外滑动关闭」的方向须随镜像翻转。方向判定走 useDirection 单一真相源。
const { isRtl } = useDirection()

/** swipe 关闭方向随位置走：左侧位置向左滑，其余向右；RTL 下整体镜像 */
const swipeDirection = computed<'left' | 'right' | 'up' | 'down'>(() => {
  const base = pos.value.endsWith('-left') ? 'left' : 'right'
  return isRtl.value ? (base === 'left' ? 'right' : 'left') : base
})

const icons: Record<ToastItem['type'], string> = {
  default: 'tdesign:notification',
  success: 'tdesign:check-circle',
  error: 'tdesign:error-circle',
  warning: 'tdesign:error-triangle',
  info: 'tdesign:info-circle',
  loading: 'tdesign:loading',
}

const toForeground = (t: ToastItem): 'foreground' | 'background' =>
  t.type === 'error' || t.type === 'loading' ? 'foreground' : 'background'

// 单条卡片的类名：语义类名（unstyled 时为 undefined）+ 宿主自定义 t.class +
// 退出态修饰类。变体/状态都用修饰类，符合库约定。
const toastClass = (t: ToastItem) => [
  skin('h-toast'),
  skin(`h-toast--${t.type}`),
  skin(`h-toast--at-${pos.value}`),
  t.class,
  t.exiting ? skin('h-toast--exiting') : undefined,
]

// 替代 Nuxt 的「仅客户端渲染」包裹组件（同 Dialog）：viewport / provider 依赖 document，
// SSR 不渲染，客户端挂载后再渲染，行为与原包裹组件一致，不引入 Nuxt 依赖。
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <ToastProvider v-if="mounted" :duration="props.duration" :swipe-direction="swipeDirection"
    label="Notification">
    <ToastRoot
      v-for="t in toasts"
      :key="t.id"
      :open="t.open"
      :duration="t.duration"
      :type="toForeground(t)"
      :class="toastClass(t)"
      @update:open="(v: boolean) => !v && scheduleRemove(t.id)"
    >
      <div :class="skin('h-toast-main')">
        <span :class="[skin('h-toast-icon'), t.type === 'loading' ? skin('h-toast-spin') : undefined]">
          <HIcon :name="t.icon || icons[t.type]" />
        </span>

        <div :class="skin('h-toast-body')">
          <ToastTitle v-if="t.title" :class="skin('h-toast-title')">{{ t.title }}</ToastTitle>
          <ToastDescription v-if="t.description" :class="skin('h-toast-desc')">{{ t.description }}</ToastDescription>
        </div>
      </div>

      <div :class="skin('h-toast-footer')">
        <ToastAction
          v-if="t.action"
          :alt-text="t.action.label"
          :class="skin('h-toast-action')"
          @click="t.action.onClick()"
        >
          {{ t.action.label }}
        </ToastAction>

        <ToastClose :class="skin('h-toast-close')" aria-label="Close">
          <HIcon name="tdesign:close" />
        </ToastClose>
      </div>
    </ToastRoot>

    <!-- 宿主属性透传到 viewport（ToastProvider 是 renderless，viewport 才是落 DOM 的容器根） -->
    <ToastViewport v-bind="$attrs" :class="[skin('h-toast-viewport'), skin(`h-toast-viewport--${pos}`)]" />
  </ToastProvider>
</template>
