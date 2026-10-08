// useField —— 表单控件接入 UIField 上下文的唯一入口。
//
// 为什么需要单独一层：reka 的 `injectFieldRootContext()` 在没有 FieldRoot 祖先时**直接抛错**，
// 且它的 createContext 只把 `null` 当「合法的空」（传 `undefined` 照样抛）。于是每个控件都得写
// `injectFieldRootContext(null)` 做存在性探测 —— 这段知识只该有一份，就是这里。
//
// 两种控件形态，对应 reka 上游的两种做法，由 `control` 选项区分：
//
//  1) 原生取值控件（input / textarea / select）
//     把 reka 的 FieldControl 包在控件外层即可，id / name / aria / data 与注册全由它负责，
//     本组合式只需拿 `present` 与 `disabled`。（见 UIInput、UIFieldControl）
//
//  2) 自定义取值控件（checkbox / switch / 未来的 select）
//     控件自己就是语义节点，取值不是原生 `.value`（例：checkbox 的 `.value` 恒为 "on"，
//     照搬 FieldControl 会把 filled / 校验全算错），所以传 `control` 走手动注册：
//     自动注册 / 注销、转发 focus / blur、把值变更报给字段。
//     reka 自带的 `CheckboxRoot.vue` 就是这条路的参考实现。
//
// 无论哪条路，没有 UIField 祖先时全部退化为空操作，独立使用行为与以前完全一致。
import { injectFieldRootContext } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import type { ComputedRef } from 'vue'

/** 自定义取值控件向字段注册自己所需的描述（对应 reka 的 FieldControlRegistration）。 */
export interface FieldControlSpec {
  /** 控件元素：点标签聚焦、提交时聚焦第一个无效字段，都靠它 */
  element: () => HTMLElement | null | undefined
  /** 控件当前值：字段校验与表单值收集读它（允许是 boolean，不必是字符串） */
  getValue: () => unknown
  /** 该值是否算「已填」；不传按「非 null / undefined / '' / 空数组」判定 */
  isFilled?: (value: unknown) => boolean
  /** 原生取值控件提供它即走浏览器约束校验；不传则按 required + isFilled 推导 */
  validityElement?: () => HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null | undefined
}

export interface UseFieldOptions {
  /** 组件自身的 disabled（不含字段的）；与字段 disabled 取或后由返回值的 `disabled` 给出 */
  disabled?: () => boolean
  /** 传了才会注册控件（自定义取值控件用）；原生取值控件交给 FieldControl，不传 */
  control?: FieldControlSpec
}

export interface UseFieldReturn {
  /** 是否处在 UIField 上下文内 */
  present: ComputedRef<boolean>
  /** 合并后的禁用态：组件自身 disabled ∨ 字段 disabled */
  disabled: ComputedRef<boolean>
  /** 字段贡献到控件元素上的属性（id / name / required / aria-* / data-*）；无字段时为空对象，可直接 v-bind */
  controlAttrs: ComputedRef<Record<string, unknown>>
  /** 控件聚焦：驱动字段的 focused 状态 */
  onFocus: () => void
  /** 控件失焦：驱动 touched / filled，并在 onBlur 校验模式下触发校验 */
  onBlur: () => void
  /** 把值变更报给字段（校验 / 脏 / 填充）；自定义控件在自己的 change 里调用 */
  reportChange: (value: unknown) => void
  /** 只更新「已填」（父级驱动的值变化用，不算交互、不置脏） */
  reportFilled: (filled: boolean) => void
}

export function useField(options: UseFieldOptions = {}): UseFieldReturn {
  // null 兜底是硬要求：reka 的 createContext 只把 null 当合法的空，传 undefined 一样抛。
  const context = injectFieldRootContext(null)

  const present = computed(() => context !== null)

  const disabled = computed(() => Boolean(options.disabled?.() || context?.disabled.value))

  // 字段侧贴到控件上的属性：输出与 reka FieldControl 的 getBindings() 对齐，
  // 这样自定义控件拿到的东西和 FieldControl 包出来的完全一致，两条路不会走偏。
  const controlAttrs = computed<Record<string, unknown>>(() => {
    const ctx = context
    if (!ctx)
      return {}
    return {
      ...ctx.dataAttributes.value,
      id: ctx.fieldId.value,
      name: ctx.name.value,
      required: ctx.required.value || undefined,
      'aria-labelledby': ctx.labelId.value,
      'aria-describedby': ctx.describedBy.value,
      'aria-invalid': (ctx.invalid.value && !disabled.value) || undefined
    }
  })

  const onFocus = () => context?.handleControlFocus()
  const onBlur = () => context?.handleControlBlur()
  const reportChange = (value: unknown) => context?.handleControlInput({ value })
  const reportFilled = (filled: boolean) => context?.reportControlState({ filled })

  let unregister: (() => void) | undefined
  onMounted(() => {
    if (!context || !options.control)
      return
    unregister = context.registerControl({
      element: options.control.element,
      getValue: options.control.getValue,
      isFilled: options.control.isFilled,
      validityElement: options.control.validityElement
    })
  })
  onBeforeUnmount(() => unregister?.())

  return { present, disabled, controlAttrs, onFocus, onBlur, reportChange, reportFilled }
}