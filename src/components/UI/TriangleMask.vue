<script setup lang="ts">
import { computed } from 'vue'
import { useDirection } from '../../composables/useDirection'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  /**
   * 角落位置。⚠️ left / right 按「逻辑语义」解释（同 Toast 约定）：
   *   left  = 阅读起始侧（inline-start）
   *   right = 阅读结束侧（inline-end）
   * LTR 下与物理左右完全一致；RTL 下自动镜像——如 'top-right' 会渲染在物理左上角。
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size?: string
  backgroundColor?: string
  cursor?: string
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right',
  size: 'var(--h-triangle-mask-size)',
  backgroundColor: 'var(--h-triangle-mask-bg)',
  cursor: 'var(--h-triangle-mask-cursor)'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const { skin } = useSkin(() => props.unstyled)

// ⚠️ RTL 适配：定位走逻辑属性（inset-inline-*）随 dir 自动镜像；
// 但 clip-path 的 polygon 百分比恒按物理坐标系（从左数）解析、无逻辑语义，
// 必须按镜像后实际所在的物理侧取形状——二者配套，缺一则三角形会「贴在左边、尖朝右侧」。
// 方向判定走 useDirection 单一真相源（运行时可切换 locale）。
const { isRtl } = useDirection()

const clipPaths: Record<string, string> = {
  'top-left': 'polygon(0 0, 100% 0, 0 100%)',
  'top-right': 'polygon(100% 0, 100% 100%, 0 0)',
  'bottom-left': 'polygon(0 0, 0 100%, 100% 100%)',
  'bottom-right': 'polygon(100% 0, 100% 100%, 0 100%)'
}

const maskStyle = computed(() => {
  const [vertical, horizontal] = props.position.split('-') as ['top' | 'bottom', 'left' | 'right']
  // 定位：left → inline-start / right → inline-end
  const inline = horizontal === 'left' ? 'start' : 'end'
  // 形状：按镜像后实际渲染的物理侧取 polygon
  const physical = isRtl.value ? (horizontal === 'left' ? 'right' : 'left') : horizontal

  return {
    width: props.size,
    height: props.size,
    backgroundColor: props.backgroundColor,
    clipPath: clipPaths[`${vertical}-${physical}`],
    cursor: props.cursor,
    // 块轴（top/bottom）不受阅读方向影响，无需镜像
    [`inset-block-${vertical === 'top' ? 'start' : 'end'}`]: '0',
    [`inset-inline-${inline}`]: '0'
  }
})

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<template>
  <div v-bind="$attrs" :class="skin('h-triangle-mask')" :style="maskStyle" @click="handleClick">
    <div :class="skin('h-triangle-mask-content')">
      <slot />
    </div>
  </div>
</template>
