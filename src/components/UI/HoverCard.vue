<script setup lang="ts">
/**
 * UIHoverCard（基于 reka-ui）
 *
 * 契约同 Button：只输出语义类名（h-hover-card-content / h-hover-card-trigger），
 * 视觉全在 styles/themes/components/ui/_hovercard.scss；z 轴令牌走 --h-hover-card-z
 * （默认 var(--h-z-popover)，见 themes/variables/components/ui/_hovercard.scss）。
 */
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'
import { computed, onMounted, ref } from 'vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 显示延迟 (ms) */
  openDelay?: number
  /** 隐藏延迟 (ms) */
  closeDelay?: number
  /** 弹出方向 */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** 与触发元素的间距 (px) */
  sideOffset?: number
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end'
  /**
   * 触发方式：
   * - hover：仅桌面悬停（触控设备忽略）
   * - auto/click：启用触控设备上的点击切换
   * 注：reka-ui HoverCard 本身为 hover 语义组件，click 仅影响触控设备。
   */
  trigger?: 'hover' | 'click' | 'auto'
  /**
   * 自定义 z-index，可传数字或 CSS 变量字符串。
   * 未传入时默认使用主题变量 `--h-z-popover`。
   */
  zIndex?: string | number
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  openDelay: 100,
  closeDelay: 50,
  side: 'top',
  sideOffset: 8,
  align: 'center',
  trigger: 'auto'
})

const { skin } = useSkin(() => props.unstyled)

const enableTouch = computed(() => props.trigger !== 'hover')

// 替代 Nuxt 的「仅客户端渲染」包裹组件（同 Dialog）：Portal 依赖 document，SSR 不渲染，挂载后再渲染。
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <HoverCardRoot v-if="mounted" :open-delay="props.openDelay" :close-delay="props.closeDelay"
    :enable-touch="enableTouch">
    <HoverCardTrigger as-child :class="skin('h-hover-card-trigger')">
      <slot />
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent v-bind="$attrs" :class="skin('h-hover-card-content')"
        :style="{ '--h-hover-card-z': props.zIndex }" :side="props.side" :side-offset="props.sideOffset"
        :align="props.align" :avoid-collisions="true" :collision-padding="8">
        <slot name="content" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>
