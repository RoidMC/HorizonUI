<script setup lang="ts">
// UIFieldLabel —— 字段标签（reka FieldLabel 装配 + 语义类名 h-field-label）。
//
// 默认渲染原生 <label>：reka 自动把 for 指到同字段内控件的 id，点击标签即聚焦控件，
// 读屏同时经 aria-labelledby 关联。皮肤在 themes/components/ui/_form.scss。
import { FieldLabel } from 'reka-ui'
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 关掉原生 <label> 语义（如 as 换成 div）后，点击标签由 JS 聚焦控件 */
  nativeLabel?: boolean
  /** 显式指定 for；不传则自动指向同字段控件 id */
  for?: string
  as?: string | Component
  asChild?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  nativeLabel: true,
  for: undefined,
  as: 'label',
  asChild: false
})

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <FieldLabel v-bind="$attrs" :native-label="props.nativeLabel" :for="props.for" :as="props.as"
    :as-child="props.asChild" :class="skin('h-field-label')">
    <slot />
  </FieldLabel>
</template>