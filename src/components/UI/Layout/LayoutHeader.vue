<script setup lang="ts">
/**
 * HorizonUI · LayoutHeader —— 顶部固定高度区（不参与伸缩）。
 * 语义标签需显式开启：`<UILayoutHeader as="header">`。
 */
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  as?: string | Component
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}>(), {
  as: 'div',
})

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <component :is="props.as" v-bind="$attrs" :class="skin('h-layout-header')">
    <slot />
  </component>
</template>