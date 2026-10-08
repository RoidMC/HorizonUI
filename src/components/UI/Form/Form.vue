<script setup lang="ts">
// UIForm —— 表单容器（reka FormRoot 装配 + 语义类名 h-form）。
//
// 只做两件事：
//   1. 挂 h-form 语义类（皮肤在 themes/components/ui/_form.scss，令牌 --h-form-*）；
//   2. 把宿主的属性与事件原样透传给 FormRoot —— 不重新发明提交语义。
//
// 校验时机（validationMode）、服务端错误（errors）、提交时收集字段值（formSubmit）
// 全部由 reka 提供；本组件不额外做任何校验/收集逻辑，避免与 reka 的事实源分叉。
import { FormRoot } from 'reka-ui'
import { ref } from 'vue'
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'
import type { FormErrors, FormValidationMode } from './types'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 服务端错误表：字段名 → 消息。reka 会在提交后把焦点送到第一个出错字段 */
  errors?: FormErrors
  /** 默认校验时机，字段可用自己的 validationMode 覆盖 */
  validationMode?: FormValidationMode
  /** 根元素：默认语义 <form>；改标签用 as，包裹单个子元素用 asChild */
  as?: string | Component
  asChild?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  errors: undefined,
  validationMode: 'onSubmit',
  as: 'form',
  asChild: false
})

const { skin } = useSkin(() => props.unstyled)

// 转发 reka 暴露的 validate(name?)：不传 name 校验全部字段，返回是否全部通过。
const root = ref<InstanceType<typeof FormRoot> | null>(null)
defineExpose({ validate: (name?: string) => root.value?.validate(name) })
</script>

<template>
  <!-- 事件（@submit / @form-submit）走 $attrs 透传，由 reka 决定「何时算提交成功」，
       本组件不再插一层 emit —— 否则会改变 reka「有 onFormSubmit 才 preventDefault」的判定。 -->
  <FormRoot ref="root" v-bind="$attrs" :errors="props.errors" :validation-mode="props.validationMode" :as="props.as"
    :as-child="props.asChild" :class="skin('h-form')">
    <slot />
  </FormRoot>
</template>