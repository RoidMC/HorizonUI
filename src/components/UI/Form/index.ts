// Form 套件出口。
//
// 一组协同工作的表单原语：容器（UIForm）+ 字段作用域（UIField）及其标签 / 控件 /
// 说明 / 错误 / 状态出口。校验时机与错误收集全部由 reka-ui 提供，
// 本库只负责语义类名与皮肤（themes/components/ui/_form.scss）。
//
// 典型用法：
//   <UIForm :errors="serverErrors" @form-submit="onSubmit">
//     <UIField name="email" required :validate="v => (v ? '' : '请填写邮箱')">
//       <UIFieldLabel>邮箱</UIFieldLabel>
//       <UIFieldControl v-model="email" type="email" placeholder="you@example.com" />
//       <UIFieldDescription>仅用于登录通知</UIFieldDescription>
//       <UIFieldError />
//     </UIField>
//   </UIForm>
export { default as UIForm } from './Form.vue'
export { default as UIField } from './Field.vue'
export { default as UIFieldLabel } from './FieldLabel.vue'
export { default as UIFieldControl } from './FieldControl.vue'
export { default as UIFieldDescription } from './FieldDescription.vue'
export { default as UIFieldError } from './FieldError.vue'
export { default as UIFieldValidity } from './FieldValidity.vue'

export type { FormValidationMode, FieldValidator, FormErrors } from './types'