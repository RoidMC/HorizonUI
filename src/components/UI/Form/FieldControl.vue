<script setup lang="ts">
// UIFieldControl —— 字段控件（reka FieldControl 装配 + 语义类名 h-field-control）。
//
// 默认渲染原生 <input>：reka 自动接线 id / name / required / disabled、
// aria-labelledby（标签）、aria-describedby（描述与错误）、aria-invalid，
// 并把字段的 data-* 状态打到控件上。皮肤在 themes/components/ui/_form.scss。
//
// ⚠️ 与 UIInput 的分工：本组件是「只画控件本体」的裸控件（无图标、无前后缀、无包装层）。
//    要图标或前后缀就用 UIInput —— 它内部接的是同一套字段上下文，
//    放进 UIField 里会自动获得同样的 id / aria 接线与校验，两者不是二选一。
//    但别把 UIInput 塞进本组件的 asChild：UIInput 的根节点是外层 div 而非 input，
//    id / aria / name 会落到 div 上，标签关联随之失效。
//    自定义取值控件（如 UICheckbox，取值不是原生 .value）不要走本组件，
//    改用 composables/useField 的自定义控件路径 —— 那条路才是所有表单控件的共用底层。
import { FieldControl } from 'reka-ui'
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 控件 id；不传则由字段生成 */
  id?: string
  /** 受控值；不传则非受控（用 defaultValue / 原生输入） */
  modelValue?: string
  defaultValue?: string
  as?: string | Component
  asChild?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

// modelValue 刻意不给默认值：reka 以「是否 === undefined」判断受控/非受控。
const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  modelValue: undefined,
  defaultValue: undefined,
  as: 'input',
  asChild: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { skin } = useSkin(() => props.unstyled)
</script>

<template>
  <!-- type / placeholder / name / required / disabled 等未声明属性经 $attrs 透传，
       由 reka 合并进控件（它会与字段上下文的 required/disabled 取或）。 -->
  <FieldControl v-bind="$attrs" :id="props.id" :model-value="props.modelValue" :default-value="props.defaultValue"
    :as="props.as" :as-child="props.asChild" :class="skin('h-field-control')"
    @update:model-value="emit('update:modelValue', $event)">
    <slot />
  </FieldControl>
</template>