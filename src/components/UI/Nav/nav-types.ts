/**
 * HorizonUI · Nav 套件类型
 *
 * label / title 用 NavText（string | (() => string)）而不是裸 string：
 * 库不假设宿主的 i18n 方案（@nuxtjs/i18n / vue-i18n / 自己查表皆可），
 * 需要跟随语言实时更新的场景传 getter，静态文本直传字符串。
 */

/** 静态文本或求值函数（求值时机：每次渲染，语言/状态切换即时反映） */
export type NavText = string | (() => string)

/** 解析 NavText 为当前文本 */
export function resolveText(text: NavText | undefined): string {
  if (text === undefined) return ''
  return typeof text === 'function' ? text() : text
}

export interface NavSubItem {
  label: NavText
  href?: string
  icon?: string
  linkTarget?: string
  subItems?: NavSubItem[]
}

export interface NavItem {
  label: NavText
  icon: string
  href?: string
  linkTarget?: string
  subItems?: NavSubItem[]
}

/** Widget 操作按钮：图标 / 标题 / 点击回调均由调用方提供 */
export interface WidgetAction {
  key: string
  /** 按钮标题（悬浮提示 / 更多菜单文案） */
  title: NavText
  /** 静态图标名，或返回当前图标名的函数（用于需切换图标的按钮） */
  icon: string | (() => string)
  /** 点击回调；省略则仅展示 */
  onClick?: () => void
  /** 是否高亮（可选） */
  active?: () => boolean
}
