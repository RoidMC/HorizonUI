<script setup lang="ts">
/**
 * HorizonUI · LayoutAside —— 侧栏槽位。
 *
 * 只做两件事：按 `width` 预留 flex 主轴宽度、允许子元素溢出（overflow: visible）。
 * **不提供**「折叠时推挤内容」的语义 —— 导航做成 fixed 浮层盖住内容，
 * 宽度由调用方按展开/收起态传入（通常绑到 CSS 变量），库不参与该判断。
 *
 * 语义标签需显式开启：`<UILayoutAside as="aside">`。
 */
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** 预留宽度（任意 CSS 长度，如 '4rem' / 'var(--h-nav-desktop-min-width)'）。不传则不预留 */
  width?: string
  as?: string | Component
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}>(), {
  width: undefined,
  as: 'div',
})

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <component :is="props.as" v-bind="$attrs" :class="skin('h-layout-aside')"
    :style="props.width ? { flexBasis: props.width } : undefined">
    <slot />
  </component>
</template>