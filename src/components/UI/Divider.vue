<script setup lang="ts">
/**
 * HorizonUI · Divider —— 分隔线。
 *
 * 契约同 Button：只输出语义类名（h-divider / h-divider-line / h-divider-text），
 * 视觉全在 styles/themes/components/ui/_divider.scss；组件内不写样式块。
 *
 * 取色 / 粗细 / 间距仍可由 prop 覆盖，故走内联 style —— 但必须是 computed：
 * 原实现在 setup 里一次性算死，prop 变化后不响应。
 */
import { computed } from 'vue'
import { useSkin } from '../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  text?: string
  position?: 'left' | 'center' | 'right'
  color?: string
  textColor?: string
  thickness?: string
  margin?: string
  textPadding?: string
  fontSize?: string
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  position: 'center',
  color: 'var(--h-divider-color)',
  textColor: 'var(--h-divider-text-color)',
  thickness: 'var(--h-divider-thickness)',
  margin: 'var(--h-divider-margin)',
  textPadding: 'var(--h-divider-text-padding)',
  fontSize: 'var(--h-divider-text-font-size)'
})

const { skin } = useSkin(() => props.unstyled)

const lineStyle = computed(() => ({
  backgroundColor: props.color,
  height: props.thickness
}))

const textStyle = computed(() => ({
  color: props.textColor,
  padding: props.textPadding,
  fontSize: props.fontSize
}))

const dividerStyle = computed(() => ({ margin: props.margin }))
</script>

<template>
  <div v-bind="$attrs" :class="skin('h-divider')" :style="dividerStyle">
    <div v-if="props.position !== 'left'" :class="skin('h-divider-line')" :style="lineStyle" />
    <span v-if="props.text" :class="skin('h-divider-text')" :style="textStyle">
      {{ props.text }}
    </span>
    <div v-if="props.position !== 'right'" :class="skin('h-divider-line')" :style="lineStyle" />
  </div>
</template>
