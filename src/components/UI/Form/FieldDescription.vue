<script setup lang="ts">
// UIFieldDescription —— 字段说明（reka FieldDescription 装配 + 语义类名 h-field-description）。
//
// reka 注册它的 id 到控件的 aria-describedby，读屏会把说明与控件一起念出来。
// 默认渲染 <p>；皮肤在 themes/components/ui/_form.scss。
import { FieldDescription } from 'reka-ui'
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  id?: string
  as?: string | Component
  asChild?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  as: 'p',
  asChild: false
})

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <FieldDescription v-bind="$attrs" :id="props.id" :as="props.as" :as-child="props.asChild"
    :class="skin('h-field-description')">
    <slot />
  </FieldDescription>
</template>