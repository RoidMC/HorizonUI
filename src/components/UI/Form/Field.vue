<script setup lang="ts">
// UIField —— 单个字段的作用域（reka FieldRoot 装配 + 语义类名 h-field）。
//
// 一次装配提供：标签/描述/错误与控件的 aria 接线、脏/触碰/填充/聚焦状态、
// 校验时机与错误收集。视觉在 themes/components/ui/_form.scss。
//
// 校验结果体现在根节点的 data-* 上（data-invalid / data-valid / data-dirty /
// data-touched / data-filled / data-focused / data-disabled），皮肤据此标红控件。
import { FieldRoot } from 'reka-ui'
import { ref } from 'vue'
import type { Component } from 'vue'
import { useSkin } from '../../../composables/useUnstyled'
import type { FieldValidator, FormValidationMode } from './types'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 字段名：提交时用于把值收进表单值表，也是服务端错误表的键 */
  name?: string
  disabled?: boolean
  /** 必填：未填时校验为 valueMissing（提交/失焦时给出原生提示） */
  required?: boolean
  /** 外部强制无效（与服务端错误、校验结果取或） */
  invalid?: boolean
  /** 受控脏状态；不传则由控件交互自动判定 */
  dirty?: boolean
  /** 受控触碰状态；不传则由控件失焦自动判定 */
  touched?: boolean
  /** 字段级校验函数；返回错误信息即失败，支持异步 */
  validate?: FieldValidator
  /** 覆盖表单级校验时机 */
  validationMode?: FormValidationMode
  /** 输入校验去抖（毫秒），onChange 模式下生效 */
  validationDebounceTime?: number
  as?: string | Component
  asChild?: boolean
  /** 单实例覆盖全局皮肤开关；不传则跟随 createHorizon({ unstyled }) */
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  name: undefined,
  disabled: false,
  required: false,
  invalid: undefined,
  dirty: undefined,
  touched: undefined,
  validate: undefined,
  validationMode: undefined,
  validationDebounceTime: undefined,
  as: 'div',
  asChild: false
})

const { skin } = useSkin(() => props.unstyled)

// 转发 reka 暴露的 validate()：立即校验本字段并返回是否通过。
const root = ref<InstanceType<typeof FieldRoot> | null>(null)
defineExpose({ validate: () => root.value?.validate() })
</script>

<template>
  <FieldRoot ref="root" v-bind="$attrs" :name="props.name" :disabled="props.disabled" :required="props.required"
    :invalid="props.invalid" :dirty="props.dirty" :touched="props.touched" :validate="props.validate"
    :validation-mode="props.validationMode" :validation-debounce-time="props.validationDebounceTime" :as="props.as"
    :as-child="props.asChild" :class="skin('h-field')">
    <slot />
  </FieldRoot>
</template>