/**
 * HorizonUI · 库内置图标集
 *
 * 库不内置图标集 —— 那是宿主的事（见 config.ts 的 icon 注入）。但库自己的组件
 * 总得有几个图标能用（例如 Dialog 的关闭按钮），否则宿主一旦没注入渲染器，
 * 库组件就成了「没图标的空壳」。所以这里把 assets/imgs 下的 SVG 编成一个小集合。
 *
 * 形状与 Iconify JSON 集合一致：`{ prefix, width, height, icons: { name: { body } } }`，
 * 键名沿用 `prefix:name` 的拼法 —— 于是 HIcon 可以「先查本集合、查不到再丢给宿主渲染器」，
 * 两边零命名分歧。文件名 `tdesign--close.svg` 也是 Iconify 下载 SVG 时的默认命名（prefix--name）。
 *
 * 为什么存 `body` 而不是 URL：`<img src="*.svg">` 里的 SVG 不继承宿主的 `color`，
 * `stroke="currentColor"` 会退化成初始色（浅色主题下就是黑）。存 body 让 HIcon 能内联成
 * `<svg>`，`currentColor` 才真正跟随主题色。所以这里用 `?raw` 读源码、剥掉外层 <svg> 取内部。
 *
 * 新增一个内置图标：把 SVG 丢进本目录 → 下面加一行 → 完成（shims.d.ts 已声明 *.svg?raw）。
 */

import closeRaw from './tdesign--close.svg?raw'
import fileUnknownRaw from './tdesign--file-unknown.svg?raw'
import infoCircleRaw from './tdesign--info-circle.svg?raw'

/** Iconify 集合里单个图标的形状 */
export interface HorizonIcon {
  /** SVG 内部内容（不含外层 <svg>），由 HIcon 内联渲染 */
  body: string
}

/** Iconify 集合形状（只保留库实际用到的字段） */
export interface HorizonIconSet {
  prefix: string
  width: number
  height: number
  icons: Record<string, HorizonIcon>
}

/** 从整段 SVG 源码里剥出 <svg> 的内部内容 —— Iconify 的 body 就是这一段 */
function toBody(svg: string): string {
  return svg
    .replace(/^\s*<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
}

export const HORIZON_ICONS: HorizonIconSet = {
  prefix: 'tdesign',
  width: 24,
  height: 24,
  icons: {
    close: { body: toBody(closeRaw) },
    'file-unknown': { body: toBody(fileUnknownRaw) },
    'info-circle': { body: toBody(infoCircleRaw) },
  },
}

/** `prefix:name` → 图标；前缀不匹配或名字不存在时返回 undefined */
export function getHorizonIcon(name: string): HorizonIcon | undefined {
  const index = name.indexOf(':')
  if (index < 0) return undefined
  if (name.slice(0, index) !== HORIZON_ICONS.prefix) return undefined
  return HORIZON_ICONS.icons[name.slice(index + 1)]
}

/** HIcon 的最后兜底：名字解析不出来时显示的占位图标（file-unknown 的 body） */
export const ICON_FALLBACK_BODY: string = HORIZON_ICONS.icons['file-unknown'].body