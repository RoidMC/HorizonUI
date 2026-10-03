<script setup lang="ts">
/**
 * HorizonUI · LayoutMain —— 主内容区。
 *
 * 默认不滚动（跟随外层文档流）；`scroll` 打开时自身滚动并 `overscroll-behavior: contain`
 * 阻止滚动链传导。`min-width/min-height: 0` 是 flex 嵌套滚动的必需项，已在库样式里带上。
 *
 * 语义标签需显式开启：`<UILayoutMain as="main">`。
 */
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** 是否在主区自身滚动 */
  scroll?: boolean
  as?: string | Component
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}>(), {
  scroll: false,
  as: 'div',
})

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <component :is="props.as" v-bind="$attrs" :class="skin('h-layout-main')"
    :data-scroll="props.scroll ? '' : undefined">
    <slot />
  </component>
</template>