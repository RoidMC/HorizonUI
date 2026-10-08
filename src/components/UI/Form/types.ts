// Form / Field 家族的共享类型。
//
// 语义与 reka-ui 的 FormRoot / FieldRoot 一一对应，但由本库自己声明：
// 对外 API 是库的契约，宿主不该直接依赖 reka 的类型（换实现或升 reka 时宿主不受影响）。

/** 校验时机：提交时（默认）/ 失焦时 / 输入时 */
export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange'

/**
 * 字段校验函数（对应 FieldRoot.validate）。
 * 返回非空的错误信息（一条或数组）即判定校验失败；返回空值即通过；允许返回 Promise 做异步校验。
 *
 * @param value      当前字段值
 * @param formValues 整张表单的值表（字段名 → 值），异步校验里可用于跨字段比对
 */
export type FieldValidator = (
  value: unknown,
  formValues: Record<string, unknown>
) =>
  | string
  | string[]
  | undefined
  | null
  | void
  | Promise<string | string[] | undefined | null | void>

/** 服务端错误表（对应 FormRoot.errors）：字段名 → 一条或多条消息 */
export type FormErrors = Record<string, string | string[]>