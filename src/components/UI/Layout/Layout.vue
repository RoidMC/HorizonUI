<script setup lang="ts">
/**
 * HorizonUI · Layout —— 页面骨架的 flex 容器。
 *
 * 契约（与 Button 一致）：
 *   1. 只输出语义类名 h-layout 与 data-* 状态（data-direction），样式在
 *      styles/themes/components/ui/_layout.scss，组件内不写 <style>。
 *   2. unstyled 时不输出类名，DOM 结构与 data-* 保留。
 *   3. 不依赖 Nuxt：根元素默认 div，语义标签通过 `as` 显式开启。
 *
 * 刻意不做 Ant `Sider` 那套「折叠时推挤内容」：本库的 Aside 只负责
 * 预留宽度并允许子元素浮层溢出（见 UILayoutAside）。
 */
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** 主轴方向：row = 侧栏 + 内容横排；column = 头 / 主 / 尾纵排（默认） */
  direction?: 'row' | 'column'
  /** 根元素：原生标签名或组件 */
  as?: string | Component
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}>(), {
  direction: 'column',
  as: 'div',
})

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <component :is="props.as" v-bind="$attrs" :class="skin('h-layout')" :data-direction="props.direction">
    <slot />
  </component>
</template>