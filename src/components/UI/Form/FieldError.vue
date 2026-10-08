<script setup lang="ts">
// UIFieldError —— 字段错误提示（reka FieldError 装配 + 语义类名 h-field-error）。
//
// reka 在字段无效时渲染它、有效时卸载（Presence），并把它的 id 注册进控件的
// aria-describedby；多条消息默认渲染 <ul>/<li>，单条渲染纯文本。
// 想自定义展示用默认插槽，插槽参数 { errors } 是消息数组。
import { FieldError } from 'reka-ui'
import { useSlots } from 'vue'
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  id?: string
  /** true=常显；false=常隐；ValidityState 键名=仅当该约束失败时显示（如 'valueMissing'）；不传=字段无效时显示 */
  match?: boolean | keyof ValidityState
  /** 强制常驻（不做 Presence 卸载），配合自定义插槽做自己的显隐动画 */
  forceMount?: boolean
  as?: string | Component
  asChild?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  match: undefined,
  forceMount: false,
  as: 'div',
  asChild: false
})

const slots = useSlots()
const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <!-- 只在宿主给了默认插槽时才覆盖：reka 的默认渲染（单条纯文本 / 多条 ul）比我们复刻的可靠。 -->
  <FieldError v-bind="$attrs" :id="props.id" :match="props.match" :force-mount="props.forceMount" :as="props.as"
    :as-child="props.asChild" :class="skin('h-field-error')">
    <template v-if="slots.default" #default="{ errors }">
      <slot :errors="errors" />
    </template>
  </FieldError>
</template>